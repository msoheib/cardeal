import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isResourceKey, RESOURCES, ResourceDef } from '@/lib/admin-console/resources'
import {
  AdminApiError,
  AdminContext,
  dbError,
  enrichRows,
  escapeSearch,
  handleAdminError,
  MAX_BULK_IDS,
  MAX_PAGE_SIZE,
  parseIds,
  requireAdmin,
  sanitizeValues,
  writeAudit,
} from '@/lib/server/admin-console'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ resource: string }> }

async function resolve(req: NextRequest, context: RouteContext): Promise<[AdminContext, ResourceDef]> {
  const { resource } = await context.params
  const ctx = await requireAdmin(req)
  if (!isResourceKey(resource)) throw new AdminApiError(404, 'مورد غير معروف')
  return [ctx, RESOURCES[resource]]
}

async function readJson(req: NextRequest) {
  try {
    return await req.json()
  } catch {
    throw new AdminApiError(400, 'بيانات الطلب غير صالحة')
  }
}

// List with search, status/field filters, sorting and pagination.
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const [ctx, resource] = await resolve(req, context)
    const params = req.nextUrl.searchParams
    const page = Math.max(1, Number(params.get('page')) || 1)
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(params.get('pageSize')) || 25))
    const sortable = new Set([resource.defaultOrder, 'created_at', ...resource.columns.map((c) => c.key).filter((k) => !k.startsWith('_'))])
    const sort = sortable.has(params.get('sort') || '') ? params.get('sort')! : resource.defaultOrder
    const ascending = params.get('dir') === 'asc'

    let query = ctx.db.from(resource.table).select('*', { count: 'exact' })

    const status = params.get('status')
    if (status && resource.statusField) query = query.eq(resource.statusField, status)

    // Exact filters on declared uuid/enum/boolean fields: ?f.buyer_id=...
    for (const field of resource.fields) {
      const value = params.get(`f.${field.key}`)
      if (value && ['uuid', 'enum', 'boolean'].includes(field.type)) query = query.eq(field.key, value)
    }
    const id = params.get('id')
    if (id) query = query.eq('id', id)

    const search = escapeSearch(params.get('search') || '')
    if (search && resource.searchColumns.length > 0) {
      query = query.or(resource.searchColumns.map((col) => `${col}.ilike.%${search}%`).join(','))
    }

    // "Select all matching" for bulk actions: ids only, capped at the bulk limit.
    if (params.get('idsOnly') === '1') {
      const { data, error } = await query.order(sort, { ascending }).range(0, MAX_BULK_IDS - 1)
      if (error) throw dbError(error)
      return NextResponse.json({ ids: (data || []).map((row: { id: string }) => row.id) })
    }

    const from = (page - 1) * pageSize
    const { data, error, count } = await query.order(sort, { ascending }).range(from, from + pageSize - 1)
    if (error) throw dbError(error)

    const rows = await enrichRows(ctx.db, resource, (data || []) as Record<string, any>[])
    return NextResponse.json({ rows, total: count ?? 0, page, pageSize })
  } catch (err) {
    return handleAdminError(err)
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const [ctx, resource] = await resolve(req, context)
    if (!resource.canCreate) throw new AdminApiError(405, 'لا يمكن إنشاء هذا النوع من هنا')
    const body = await readJson(req)
    const values = sanitizeValues(resource, body?.values, 'create')

    const { data, error } = await ctx.db.from(resource.table).insert(values).select().single()
    if (error) throw dbError(error)

    const audited = await writeAudit(ctx, { action: 'create', resource: resource.key, recordIds: [data.id], changes: values })
    return NextResponse.json({ row: data, audited }, { status: 201 })
  } catch (err) {
    return handleAdminError(err)
  }
}

// Bulk update: { ids, values } or, for dealer applications, { ids, action: 'approve' | 'reject', reason }.
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const [ctx, resource] = await resolve(req, context)
    const body = await readJson(req)
    const ids = parseIds(body?.ids)

    if (resource.key === 'dealer_applications' && body?.action) {
      return NextResponse.json(await reviewApplications(req, ctx, ids, body.action, body.reason))
    }

    const values = sanitizeValues(resource, body?.values, 'update')
    if (resource.key === 'users' && 'user_type' in values && ids.includes(ctx.adminId) && values.user_type !== 'admin') {
      throw new AdminApiError(400, 'لا يمكنك إزالة صلاحية المدير من حسابك')
    }

    const { data, error } = await ctx.db.from(resource.table).update(values).in('id', ids).select('id')
    if (error) throw dbError(error)

    const updatedIds = (data || []).map((row: { id: string }) => row.id)
    const audited = await writeAudit(ctx, { action: 'update', resource: resource.key, recordIds: updatedIds, changes: values })
    return NextResponse.json({ updated: updatedIds.length, audited })
  } catch (err) {
    return handleAdminError(err)
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const [ctx, resource] = await resolve(req, context)
    if (!resource.canDelete) throw new AdminApiError(405, 'لا يمكن حذف هذا النوع')
    const body = await readJson(req)
    const ids = parseIds(body?.ids)

    let deletedIds: string[] = []
    const failures: string[] = []

    if (resource.key === 'users') {
      if (ids.includes(ctx.adminId)) throw new AdminApiError(400, 'لا يمكنك حذف حسابك')
      // Profile first (its FKs cascade to bids, deals, dealer rows); if a restrictive FK
      // blocks it, the login is left intact. Then remove the auth account to end access.
      for (const id of ids) {
        const { error: profileError } = await ctx.db.from('users').delete().eq('id', id)
        if (profileError) {
          failures.push(`${id}: ${dbError(profileError)?.message}`)
          continue
        }
        const { error: authError } = await ctx.db.auth.admin.deleteUser(id)
        if (authError && authError.status !== 404) failures.push(`${id}: حُذف الملف ولم يُحذف حساب الدخول (${authError.message})`)
        deletedIds.push(id)
      }
    } else {
      const { data, error } = await ctx.db.from(resource.table).delete().in('id', ids).select('id')
      if (error) throw dbError(error)
      deletedIds = (data || []).map((row: { id: string }) => row.id)
    }

    const audited = deletedIds.length > 0
      ? await writeAudit(ctx, { action: 'delete', resource: resource.key, recordIds: deletedIds })
      : true
    return NextResponse.json({ deleted: deletedIds.length, failures, audited })
  } catch (err) {
    return handleAdminError(err)
  }
}

// The review RPCs check private.is_admin() against auth.uid(), so they run as the admin themself.
async function reviewApplications(req: NextRequest, ctx: AdminContext, ids: string[], action: unknown, reason: unknown) {
  if (action !== 'approve' && action !== 'reject') throw new AdminApiError(400, 'إجراء غير معروف')
  const asAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: req.headers.get('authorization') || '' } },
  })

  const done: string[] = []
  const failures: string[] = []
  for (const id of ids) {
    const { data, error } = action === 'approve'
      ? await asAdmin.rpc('approve_dealer_application', { p_application_id: id })
      : await asAdmin.rpc('reject_dealer_application', { p_application_id: id, p_rejection_reason: String(reason || '').slice(0, 1000) })
    if (error || data?.error) failures.push(`${id}: ${error?.message || data?.error}`)
    else done.push(id)
  }

  const audited = done.length > 0
    ? await writeAudit(ctx, { action, resource: 'dealer_applications', recordIds: done, changes: action === 'reject' ? { reason } : null })
    : true
  return { updated: done.length, failures, audited }
}
