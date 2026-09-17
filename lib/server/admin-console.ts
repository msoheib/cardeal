import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { FieldDef, ResourceDef } from '@/lib/admin-console/resources'

export const MAX_BULK_IDS = 500
export const MAX_PAGE_SIZE = 200
const TABLES_WITHOUT_UPDATED_AT = new Set(['deals', 'commitment_fees'])
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export class AdminApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export interface AdminContext {
  db: SupabaseClient
  adminId: string
}

/** Verifies the bearer token belongs to a user whose profile role is `admin`. */
export async function requireAdmin(req: NextRequest): Promise<AdminContext> {
  const header = req.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) throw new AdminApiError(401, 'يجب تسجيل الدخول')

  const db = getSupabaseAdmin()
  const { data: authData, error: authError } = await db.auth.getUser(token)
  if (authError || !authData.user) throw new AdminApiError(401, 'انتهت الجلسة، سجّل الدخول مجدداً')

  const { data: profile, error: profileError } = await db
    .from('users')
    .select('user_type')
    .eq('id', authData.user.id)
    .maybeSingle()
  if (profileError) throw new AdminApiError(500, 'تعذر التحقق من الصلاحيات')
  if (profile?.user_type !== 'admin') throw new AdminApiError(403, 'هذه الصفحة للمدير فقط')

  return { db, adminId: authData.user.id }
}

export function handleAdminError(err: unknown) {
  if (err instanceof AdminApiError) {
    return NextResponse.json({ error: err.message }, { status: err.status })
  }
  console.error('admin_console_error', err)
  return NextResponse.json({ error: 'حدث خطأ غير متوقع' }, { status: 500 })
}

export function dbError(error: { message?: string; code?: string; details?: string } | null) {
  if (!error) return null
  // Surface constraint problems in plain Arabic; keep the Postgres detail for the admin.
  const byCode: Record<string, string> = {
    '23503': 'لا يمكن تنفيذ العملية: السجل مرتبط بسجلات أخرى أو يشير إلى سجل غير موجود.',
    '23505': 'يوجد سجل مطابق مسبقاً.',
    '23514': 'القيمة لا تحقق شروط الجدول.',
    '22P02': 'صيغة إحدى القيم غير صحيحة.',
  }
  const message = byCode[error.code || ''] || 'تعذر تنفيذ العملية على قاعدة البيانات.'
  return new AdminApiError(400, `${message}${error.details || error.message ? ` (${error.details || error.message})` : ''}`)
}

export function parseIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0) throw new AdminApiError(400, 'لم يتم تحديد أي سجل')
  if (value.length > MAX_BULK_IDS) throw new AdminApiError(400, `الحد الأقصى ${MAX_BULK_IDS} سجل في العملية الواحدة`)
  const ids = Array.from(new Set(value.map(String)))
  if (!ids.every((id) => UUID_RE.test(id))) throw new AdminApiError(400, 'معرّفات غير صالحة')
  return ids
}

function coerce(field: FieldDef, raw: unknown): unknown {
  if (raw === '' || raw === undefined) return field.required ? invalid(field, 'مطلوب') : null
  if (raw === null) return field.required ? invalid(field, 'مطلوب') : null
  switch (field.type) {
    case 'text':
    case 'textarea':
      return String(raw).slice(0, 5000)
    case 'number': {
      const n = typeof raw === 'number' ? raw : Number(String(raw).replace(/,/g, ''))
      return Number.isFinite(n) ? n : invalid(field, 'يجب أن تكون رقماً')
    }
    case 'boolean':
      if (typeof raw === 'boolean') return raw
      if (raw === 'true' || raw === 'false') return raw === 'true'
      return invalid(field, 'يجب أن تكون نعم/لا')
    case 'enum':
      return field.options?.some((o) => o.value === raw) ? raw : invalid(field, 'قيمة غير مسموحة')
    case 'uuid':
      return UUID_RE.test(String(raw)) ? String(raw) : invalid(field, 'معرّف غير صالح')
    case 'datetime': {
      const d = new Date(String(raw))
      return Number.isNaN(d.getTime()) ? invalid(field, 'تاريخ غير صالح') : d.toISOString()
    }
    case 'list': {
      const items = Array.isArray(raw) ? raw : String(raw).split(/\r?\n|,/)
      return items.map((item) => String(item).trim()).filter(Boolean)
    }
    case 'json':
      if (typeof raw === 'object') return raw
      try {
        return JSON.parse(String(raw))
      } catch {
        return invalid(field, 'JSON غير صالح')
      }
  }
}

function invalid(field: FieldDef, reason: string): never {
  throw new AdminApiError(400, `${field.label}: ${reason}`)
}

/** Keeps only declared, writable fields and coerces them to their column types. */
export function sanitizeValues(resource: ResourceDef, input: unknown, mode: 'create' | 'update') {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new AdminApiError(400, 'بيانات غير صالحة')
  const values = input as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const field of resource.fields) {
    if (field.readOnly) continue
    if (mode === 'update' && field.createOnly) continue
    if (!(field.key in values)) {
      if (mode === 'create' && field.required) invalid(field, 'مطلوب')
      continue
    }
    out[field.key] = coerce(field, values[field.key])
  }
  if (Object.keys(out).length === 0) throw new AdminApiError(400, 'لا توجد حقول قابلة للتعديل')

  // Keep the dealer-facing net amount in step with the gross bid.
  if (resource.key === 'bids' && typeof out.bid_price === 'number' && !('net_offer_amount' in values)) {
    const fee = typeof out.commitment_fee_amount === 'number' ? out.commitment_fee_amount : 500
    out.net_offer_amount = out.bid_price - fee
  }
  if (mode === 'update' && !TABLES_WITHOUT_UPDATED_AT.has(resource.table)) out.updated_at = new Date().toISOString()
  return out
}

/** Best-effort audit trail; the action still succeeds if the log table is missing. */
export async function writeAudit(
  ctx: AdminContext,
  entry: { action: string; resource: string; recordIds: string[]; changes?: unknown }
) {
  const { error } = await ctx.db.from('admin_audit_log').insert({
    admin_id: ctx.adminId,
    action: entry.action,
    resource: entry.resource,
    record_ids: entry.recordIds,
    changes: entry.changes ?? null,
  })
  if (error) {
    console.error('admin_audit_log_write_failed', error.message)
    return false
  }
  return true
}

export function escapeSearch(term: string) {
  // PostgREST `or=` syntax treats , ( ) as separators; drop them and wildcard chars.
  return term.replace(/[,()%_*\\]/g, ' ').trim().slice(0, 100)
}

type Row = Record<string, any>

async function lookup(db: SupabaseClient, table: string, ids: (string | null | undefined)[], columns: string) {
  const unique = Array.from(new Set(ids.filter((id): id is string => Boolean(id))))
  if (unique.length === 0) return new Map<string, Row>()
  const { data } = await db.from(table).select(columns).in('id', unique)
  return new Map(((data || []) as unknown as Row[]).map((row) => [row.id as string, row]))
}

const vehicleLabel = (c?: Row) => (c ? [c.make, c.model, c.year, c.color].filter(Boolean).join(' ') : '')

function minutesBetween(from?: string, to?: string) {
  if (!from || !to) return null
  const diff = (new Date(to).getTime() - new Date(from).getTime()) / 60000
  return diff >= 0 ? Math.round(diff) : null
}

export function formatDuration(minutes: number | null) {
  if (minutes === null) return ''
  if (minutes < 60) return `${minutes} د`
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)} س`
  return `${Math.round(minutes / 1440)} يوم`
}

/** Adds display-only `_` fields (names, vehicle, dealer response) to listed rows. */
export async function enrichRows(db: SupabaseClient, resource: ResourceDef, rows: Row[]) {
  if (rows.length === 0) return rows
  switch (resource.key) {
    case 'bids': {
      const [configs, buyers, dealsRes] = await Promise.all([
        lookup(db, 'car_configurations', rows.map((r) => r.car_configuration_id), 'id, make, model, year, color'),
        lookup(db, 'users', rows.map((r) => r.buyer_id), 'id, full_name, email'),
        db.from('deals').select('id, bid_id, status, created_at, dealer_id').in('bid_id', rows.map((r) => r.id)),
      ])
      const deals = (dealsRes.data || []) as Row[]
      const dealers = await lookup(db, 'dealers', deals.map((d) => d.dealer_id), 'id, company_name')
      const dealByBid = new Map(deals.map((d) => [d.bid_id, d]))
      return rows.map((r) => {
        const deal = dealByBid.get(r.id)
        const waiting = r.status === 'pending' ? (r.commitment_fee_paid ? 'بانتظار التجار' : 'بانتظار الدفع') : ''
        return {
          ...r,
          _vehicle: vehicleLabel(configs.get(r.car_configuration_id)),
          _buyer: buyers.get(r.buyer_id)?.full_name || buyers.get(r.buyer_id)?.email || '',
          _response: deal ? `قبله ${dealers.get(deal.dealer_id)?.company_name || 'تاجر'}` : waiting,
          _response_time: deal ? formatDuration(minutesBetween(r.created_at, deal.created_at)) : '',
          _deal_id: deal?.id || null,
        }
      })
    }
    case 'deals': {
      const [configs, buyers, dealers] = await Promise.all([
        lookup(db, 'car_configurations', rows.map((r) => r.car_configuration_id), 'id, make, model, year, color'),
        lookup(db, 'users', rows.map((r) => r.buyer_id), 'id, full_name, email'),
        lookup(db, 'dealers', rows.map((r) => r.dealer_id), 'id, company_name'),
      ])
      return rows.map((r) => ({
        ...r,
        _vehicle: vehicleLabel(configs.get(r.car_configuration_id)),
        _buyer: buyers.get(r.buyer_id)?.full_name || '',
        _dealer: dealers.get(r.dealer_id)?.company_name || '',
      }))
    }
    case 'listings': {
      const [specs, dealers, invRes] = await Promise.all([
        lookup(db, 'vehicle_listing_specs', rows.map((r) => r.listing_spec_id), 'id, make, model, year, trim'),
        lookup(db, 'dealers', rows.map((r) => r.dealer_id), 'id, company_name'),
        db.from('dealer_inventory').select('dealer_listing_id, quantity').in('dealer_listing_id', rows.map((r) => r.id)),
      ])
      const stock = new Map<string, { qty: number; colors: number }>()
      for (const item of (invRes.data || []) as Row[]) {
        const s = stock.get(item.dealer_listing_id) || { qty: 0, colors: 0 }
        stock.set(item.dealer_listing_id, { qty: s.qty + (item.quantity || 0), colors: s.colors + 1 })
      }
      return rows.map((r) => {
        const spec = specs.get(r.listing_spec_id)
        const s = stock.get(r.id)
        return {
          ...r,
          _spec: spec ? [spec.make, spec.model, spec.year, spec.trim].filter(Boolean).join(' ') : '',
          _dealer: dealers.get(r.dealer_id)?.company_name || '',
          _stock: s ? `${s.qty} سيارة · ${s.colors} لون` : '0',
        }
      })
    }
    case 'inventory': {
      const [configs, dealers] = await Promise.all([
        lookup(db, 'car_configurations', rows.map((r) => r.car_configuration_id), 'id, make, model, year, color'),
        lookup(db, 'dealers', rows.map((r) => r.dealer_id), 'id, company_name'),
      ])
      return rows.map((r) => ({
        ...r,
        _vehicle: vehicleLabel(configs.get(r.car_configuration_id)),
        _dealer: dealers.get(r.dealer_id)?.company_name || '',
      }))
    }
    case 'commitment_fees': {
      const buyers = await lookup(db, 'users', rows.map((r) => r.buyer_id), 'id, full_name, email')
      return rows.map((r) => ({ ...r, _buyer: buyers.get(r.buyer_id)?.full_name || '' }))
    }
    case 'support_tickets': {
      const [buyers, dealers] = await Promise.all([
        lookup(db, 'users', rows.map((r) => r.buyer_id), 'id, full_name'),
        lookup(db, 'dealers', rows.map((r) => r.dealer_id), 'id, company_name'),
      ])
      return rows.map((r) => ({
        ...r,
        _buyer: buyers.get(r.buyer_id)?.full_name || '',
        _dealer: dealers.get(r.dealer_id)?.company_name || '',
      }))
    }
    default:
      return rows
  }
}
