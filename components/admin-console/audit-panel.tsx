'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { adminFetch } from '@/lib/admin-console/client'
import { isResourceKey, RESOURCES } from '@/lib/admin-console/resources'
import { formatGregorianDate, formatGregorianTime } from '@/lib/format'

const ACTIONS: Record<string, string> = {
  create: 'إضافة',
  update: 'تعديل',
  delete: 'حذف',
  approve: 'اعتماد',
  reject: 'رفض',
}

interface AuditRow {
  id: string
  action: string
  resource: string
  record_ids: string[]
  changes: unknown
  created_at: string
  _admin: string
}

export function AuditPanel() {
  const [rows, setRows] = useState<AuditRow[]>([])
  const [missing, setMissing] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminFetch<{ rows: AuditRow[]; missing: boolean }>('audit')
      .then((res) => { setRows(res.rows); setMissing(res.missing) })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>سجل التدقيق</CardTitle>
        <p className="text-sm">آخر 100 عملية تمت من لوحة الإدارة الشاملة.</p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 py-8 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />جاري التحميل...</div>
        ) : error ? (
          <p className="text-status-danger-foreground">{error}</p>
        ) : missing ? (
          <p className="rounded-md bg-status-warning p-4 text-sm text-status-warning-foreground">
            جدول سجل التدقيق غير موجود بعد. طبّق ملف الترحيل <span dir="ltr" className="font-mono">20260917140000_admin_audit_log.sql</span> ليبدأ تسجيل العمليات.
          </p>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm">لا توجد عمليات مسجلة بعد.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الوقت</TableHead>
                  <TableHead>المدير</TableHead>
                  <TableHead>العملية</TableHead>
                  <TableHead>القسم</TableHead>
                  <TableHead>السجلات</TableHead>
                  <TableHead>التغييرات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap">{formatGregorianDate(row.created_at)} {formatGregorianTime(row.created_at)}</TableCell>
                    <TableCell>{row._admin || '—'}</TableCell>
                    <TableCell>{ACTIONS[row.action] || row.action}</TableCell>
                    <TableCell>{isResourceKey(row.resource) ? RESOURCES[row.resource].label : row.resource}</TableCell>
                    <TableCell>{row.record_ids.length}</TableCell>
                    <TableCell>
                      {row.changes ? (
                        <code dir="ltr" className="block max-w-xs truncate text-xs" title={JSON.stringify(row.changes)}>
                          {JSON.stringify(row.changes)}
                        </code>
                      ) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
