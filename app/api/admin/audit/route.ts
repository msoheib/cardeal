import { NextRequest, NextResponse } from 'next/server'
import { dbError, handleAdminError, requireAdmin } from '@/lib/server/admin-console'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { db } = await requireAdmin(req)
    const { data, error } = await db
      .from('admin_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) {
      // 42P01 / PGRST205: the audit migration has not been applied yet.
      if (error.code === '42P01' || error.code === 'PGRST205') return NextResponse.json({ rows: [], missing: true })
      throw dbError(error)
    }

    const adminIds = Array.from(new Set((data || []).map((row: { admin_id: string }) => row.admin_id)))
    const { data: admins } = adminIds.length
      ? await db.from('users').select('id, full_name, email').in('id', adminIds)
      : { data: [] }
    const names = new Map((admins || []).map((a: { id: string; full_name: string; email: string }) => [a.id, a.full_name || a.email]))

    return NextResponse.json({
      rows: (data || []).map((row: Record<string, any>) => ({ ...row, _admin: names.get(row.admin_id) || '' })),
      missing: false,
    })
  } catch (err) {
    return handleAdminError(err)
  }
}
