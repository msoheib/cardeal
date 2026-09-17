'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Check, Download, Loader2, Pencil, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { adminFetch } from '@/lib/admin-console/client'
import { ColumnDef, FieldDef, optionLabel, ResourceDef } from '@/lib/admin-console/resources'
import { formatCurrencySar, formatGregorianDate, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { AdminStatus } from './admin-status'
import { RecordDialog } from './record-dialog'

type Row = Record<string, any>
const ALL = '__all__'
const BOOL_OPTIONS = [{ value: 'true', label: 'نعم' }, { value: 'false', label: 'لا' }]

interface ListResponse { rows: Row[]; total: number; page: number; pageSize: number }
interface MutationResponse { updated?: number; deleted?: number; failures?: string[]; audited?: boolean }

type Confirm =
  | { kind: 'delete'; ids: string[] }
  | { kind: 'bulk-set'; ids: string[]; field: FieldDef; value: string }
  | { kind: 'review'; ids: string[]; action: 'approve' | 'reject' }

interface ResourcePanelProps {
  resource: ResourceDef
  currentUserId: string
  initialStatus?: string
  initialFilters?: Record<string, string>
}

export function ResourcePanel({ resource, currentUserId, initialStatus, initialFilters }: ResourcePanelProps) {
  const { toast } = useToast()
  const [rows, setRows] = useState<Row[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState(initialStatus || ALL)
  const [filters, setFilters] = useState<Record<string, string>>(initialFilters || {})
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: resource.defaultOrder, dir: 'desc' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<{ mode: 'create' | 'edit'; record: Row | null } | null>(null)
  const [confirm, setConfirm] = useState<Confirm | null>(null)
  const [busy, setBusy] = useState(false)
  const [bulkField, setBulkField] = useState('')
  const [bulkValue, setBulkValue] = useState('')
  const [rejectReason, setRejectReason] = useState('')

  const statusField = resource.fields.find((f) => f.key === resource.statusField)
  const statusOptions = statusField?.type === 'boolean' ? BOOL_OPTIONS : statusField?.options || []
  const bulkFields = resource.fields.filter((f) => !f.readOnly && !f.createOnly && (f.type === 'enum' || f.type === 'boolean'))
  const activeBulkField = bulkFields.find((f) => f.key === bulkField)
  const isApplications = resource.key === 'dealer_applications'

  const queryString = useCallback((extra: Record<string, string> = {}) => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), sort: sort.key, dir: sort.dir, ...extra })
    if (search) params.set('search', search)
    if (status !== ALL) params.set('status', status)
    for (const [key, value] of Object.entries(filters)) params.set(`f.${key}`, value)
    return params.toString()
  }, [page, pageSize, sort, search, status, filters])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await adminFetch<ListResponse>(`${resource.key}?${queryString()}`)
      setRows(res.rows)
      setTotal(res.total)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [resource.key, queryString])

  useEffect(() => { load() }, [load])

  // Debounced search; any filter change returns to page 1 and clears the selection.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350)
    return () => clearTimeout(t)
  }, [searchInput])
  useEffect(() => { setPage(1); setSelected(new Set()) }, [search, status, filters, pageSize])

  const pageIds = rows.map((r) => r.id as string)
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id))
  const pages = Math.max(1, Math.ceil(total / pageSize))

  const toggleAllOnPage = (checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      pageIds.forEach((id) => (checked ? next.add(id) : next.delete(id)))
      return next
    })
  }

  const toggleOne = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const selectAllMatching = async () => {
    try {
      const res = await adminFetch<{ ids: string[] }>(`${resource.key}?${queryString({ idsOnly: '1' })}`)
      setSelected(new Set(res.ids))
      if (res.ids.length < total) toast({ title: `تم تحديد أول ${formatNumber(res.ids.length)} سجل`, description: 'الحد الأقصى للعملية الجماعية 500 سجل.' })
    } catch (err) {
      toast({ title: 'تعذر التحديد', description: (err as Error).message, variant: 'destructive' })
    }
  }

  const report = (title: string, res: MutationResponse) => {
    const failures = res.failures || []
    toast({
      title,
      description: [
        failures.length ? `تعذر ${failures.length}: ${failures.slice(0, 2).join(' · ')}` : '',
        res.audited === false ? 'تنبيه: لم يُسجَّل في سجل التدقيق (طبّق ملف الترحيل).' : '',
      ].filter(Boolean).join('\n') || undefined,
      variant: failures.length ? 'destructive' : 'default',
    })
  }

  const runConfirm = async () => {
    if (!confirm) return
    setBusy(true)
    try {
      if (confirm.kind === 'delete') {
        const res = await adminFetch<MutationResponse>(resource.key, { method: 'DELETE', body: { ids: confirm.ids } })
        report(`تم حذف ${formatNumber(res.deleted || 0)} سجل`, res)
      } else if (confirm.kind === 'bulk-set') {
        const value = confirm.field.type === 'boolean' ? confirm.value === 'true' : confirm.value
        const res = await adminFetch<MutationResponse>(resource.key, { method: 'PATCH', body: { ids: confirm.ids, values: { [confirm.field.key]: value } } })
        report(`تم تحديث ${formatNumber(res.updated || 0)} سجل`, res)
        setBulkField('')
        setBulkValue('')
      } else {
        const res = await adminFetch<MutationResponse>(resource.key, {
          method: 'PATCH',
          body: { ids: confirm.ids, action: confirm.action, reason: rejectReason },
        })
        report(`${confirm.action === 'approve' ? 'تم اعتماد' : 'تم رفض'} ${formatNumber(res.updated || 0)} طلب`, res)
        setRejectReason('')
      }
      setSelected(new Set())
      setConfirm(null)
      await load()
    } catch (err) {
      toast({ title: 'تعذر تنفيذ العملية', description: (err as Error).message, variant: 'destructive' })
    } finally {
      setBusy(false)
    }
  }

  const saveRecord = async (values: Record<string, unknown>) => {
    if (!editing) return
    if (editing.mode === 'create') {
      const res = await adminFetch<MutationResponse>(resource.key, { method: 'POST', body: { values } })
      report('تمت الإضافة', res)
    } else {
      const res = await adminFetch<MutationResponse>(resource.key, { method: 'PATCH', body: { ids: [editing.record!.id], values } })
      report('تم حفظ التعديلات', res)
    }
    await load()
  }

  const exportCsv = () => {
    const cols = resource.columns
    const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const lines = [
      ['id', ...cols.map((c) => c.label)].map(escape).join(','),
      ...rows.map((row) => [row.id, ...cols.map((c) => plainValue(resource, c, row[c.key]))].map(escape).join(',')),
    ]
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${resource.key}-page-${page}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const toggleSort = (column: ColumnDef) => {
    if (column.key.startsWith('_')) return
    setSort((current) => ({ key: column.key, dir: current.key === column.key && current.dir === 'desc' ? 'asc' : 'desc' }))
  }

  const filterChips = useMemo(() => Object.entries(filters).map(([key, value]) => {
    const field = resource.fields.find((f) => f.key === key)
    const label = field?.type === 'boolean' ? (value === 'true' ? 'نعم' : 'لا') : optionLabel(resource, key, value)
    return { key, text: `${field?.label || key}: ${label}` }
  }), [filters, resource])

  const selectedIds = Array.from(selected)

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground">{resource.label}</h2>
          <p className="text-sm">{resource.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={load} disabled={loading} className="rounded-xl">
            <RefreshCw className={cn('ml-2 h-4 w-4', loading && 'animate-spin')} />تحديث
          </Button>
          <Button variant="outline" onClick={exportCsv} disabled={rows.length === 0} className="rounded-xl">
            <Download className="ml-2 h-4 w-4" />تصدير الصفحة
          </Button>
          {resource.canCreate && (
            <Button onClick={() => setEditing({ mode: 'create', record: null })} className="rounded-xl">
              <Plus className="ml-2 h-4 w-4" />إضافة
            </Button>
          )}
        </div>
      </div>

      <Card className="rounded-2xl">
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
          {resource.searchColumns.length > 0 && (
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="بحث..." aria-label={`بحث في ${resource.label}`} className="h-10 rounded-xl pr-9" />
            </div>
          )}
          {statusField && (
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-10 rounded-xl md:w-56" aria-label="تصفية حسب الحالة"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>كل الحالات</SelectItem>
                {statusOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {filterChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => setFilters((f) => { const next = { ...f }; delete next[chip.key]; return next })}
              className="flex min-h-9 items-center gap-1 rounded-full bg-status-success px-3 text-sm font-semibold text-status-success-foreground"
            >
              {chip.text}<X className="h-3.5 w-3.5" /><span className="sr-only">إزالة الفلتر</span>
            </button>
          ))}
        </CardContent>
      </Card>

      {selected.size > 0 && (
        <div className="sticky top-2 z-20 flex flex-col gap-3 rounded-2xl border border-primary/30 bg-card p-3 shadow-lg lg:flex-row lg:items-center">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge className="bg-primary text-primary-foreground">{formatNumber(selected.size)} محدد</Badge>
            {selected.size < total && (
              <button type="button" onClick={selectAllMatching} className="font-semibold text-primary hover:underline">
                تحديد كل النتائج ({formatNumber(Math.min(total, 500))})
              </button>
            )}
            <button type="button" onClick={() => setSelected(new Set())} className="text-muted-foreground hover:underline">إلغاء التحديد</button>
          </div>

          <div className="flex flex-1 flex-wrap items-center gap-2 lg:justify-end">
            {isApplications && (
              <>
                <Button size="sm" onClick={() => setConfirm({ kind: 'review', ids: selectedIds, action: 'approve' })} className="rounded-xl">
                  <Check className="ml-1 h-4 w-4" />اعتماد
                </Button>
                <Button size="sm" variant="outline" onClick={() => setConfirm({ kind: 'review', ids: selectedIds, action: 'reject' })} className="rounded-xl">
                  <X className="ml-1 h-4 w-4" />رفض
                </Button>
              </>
            )}
            {bulkFields.length > 0 && (
              <>
                <Select value={bulkField} onValueChange={(v) => { setBulkField(v); setBulkValue('') }}>
                  <SelectTrigger className="h-9 w-44 rounded-xl" aria-label="الحقل المراد تعيينه"><SelectValue placeholder="تعيين حقل..." /></SelectTrigger>
                  <SelectContent>{bulkFields.map((f) => <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}</SelectContent>
                </Select>
                {activeBulkField && (
                  <Select value={bulkValue} onValueChange={setBulkValue}>
                    <SelectTrigger className="h-9 w-40 rounded-xl" aria-label="القيمة الجديدة"><SelectValue placeholder="القيمة..." /></SelectTrigger>
                    <SelectContent>
                      {(activeBulkField.type === 'boolean' ? BOOL_OPTIONS : activeBulkField.options || []).map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!activeBulkField || !bulkValue}
                  onClick={() => activeBulkField && setConfirm({ kind: 'bulk-set', ids: selectedIds, field: activeBulkField, value: bulkValue })}
                  className="rounded-xl"
                >
                  تطبيق
                </Button>
              </>
            )}
            {resource.canDelete && (
              <Button size="sm" variant="destructive" onClick={() => setConfirm({ kind: 'delete', ids: selectedIds })} className="rounded-xl">
                <Trash2 className="ml-1 h-4 w-4" />حذف
              </Button>
            )}
          </div>
        </div>
      )}

      <Card className="overflow-hidden rounded-2xl">
        {error ? (
          <CardContent className="flex flex-col items-start gap-3 p-6">
            <p className="font-semibold text-status-danger-foreground">{error}</p>
            <Button variant="outline" onClick={load}>إعادة المحاولة</Button>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={allOnPageSelected} onCheckedChange={(c) => toggleAllOnPage(Boolean(c))} aria-label="تحديد كل الصفحة" />
                  </TableHead>
                  {resource.columns.map((column) => {
                    const sortable = !column.key.startsWith('_')
                    return (
                      <TableHead key={column.key} className="whitespace-nowrap text-right">
                        {sortable ? (
                          <button type="button" onClick={() => toggleSort(column)} className="inline-flex items-center gap-1 font-semibold hover:text-foreground">
                            {column.label}
                            {sort.key === column.key && (sort.dir === 'desc' ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />)}
                          </button>
                        ) : column.label}
                      </TableHead>
                    )
                  })}
                  <TableHead className="w-24 text-right">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && rows.length === 0 ? (
                  <TableRow><TableCell colSpan={resource.columns.length + 2} className="py-10 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </TableCell></TableRow>
                ) : rows.length === 0 ? (
                  <TableRow><TableCell colSpan={resource.columns.length + 2} className="py-10 text-center text-muted-foreground">لا توجد سجلات مطابقة.</TableCell></TableRow>
                ) : rows.map((row) => (
                  <TableRow key={row.id} data-state={selected.has(row.id) ? 'selected' : undefined} className={cn(loading && 'opacity-60')}>
                    <TableCell>
                      <Checkbox checked={selected.has(row.id)} onCheckedChange={(c) => toggleOne(row.id, Boolean(c))} aria-label="تحديد السجل" />
                    </TableCell>
                    {resource.columns.map((column) => (
                      <TableCell key={column.key} className="max-w-[240px]">
                        <CellValue resource={resource} column={column} value={row[column.key]} />
                      </TableCell>
                    ))}
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" aria-label="تعديل" onClick={() => setEditing({ mode: 'edit', record: row })}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {resource.canDelete && !(resource.key === 'users' && row.id === currentUserId) && (
                          <Button size="icon" variant="ghost" aria-label="حذف" onClick={() => setConfirm({ kind: 'delete', ids: [row.id] })}>
                            <Trash2 className="h-4 w-4 text-status-danger-foreground" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-border p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span>{formatNumber(total)} سجل · صفحة {formatNumber(page)} من {formatNumber(pages)}</span>
          <div className="flex items-center gap-2">
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="h-9 w-24 rounded-xl" aria-label="عدد السجلات في الصفحة"><SelectValue /></SelectTrigger>
              <SelectContent>{[25, 50, 100, 200].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)} className="rounded-xl">السابق</Button>
            <Button size="sm" variant="outline" disabled={page >= pages || loading} onClick={() => setPage((p) => p + 1)} className="rounded-xl">التالي</Button>
          </div>
        </div>
      </Card>

      {editing && (
        <RecordDialog
          resource={resource}
          record={editing.record}
          mode={editing.mode}
          open
          onOpenChange={(open) => { if (!open) setEditing(null) }}
          onSubmit={saveRecord}
        />
      )}

      <AlertDialog open={Boolean(confirm)} onOpenChange={(open) => { if (!open && !busy) setConfirm(null) }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader className="text-right sm:text-right">
            <AlertDialogTitle>{confirmTitle(confirm, resource)}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                {confirm?.kind === 'delete' && (
                  <p>
                    الحذف نهائي ولا يمكن التراجع عنه.
                    {resource.key === 'users' && ' حذف المستخدم يحذف حساب الدخول وكل عروضه وصفقاته وملفه كتاجر.'}
                    {resource.key === 'listings' && ' قد يحذف أيضاً مخزون الألوان المرتبط بالإعلان.'}
                  </p>
                )}
                {confirm?.kind === 'bulk-set' && (
                  <p>سيتم تعيين «{confirm.field.label}» إلى «{confirm.field.type === 'boolean' ? (confirm.value === 'true' ? 'نعم' : 'لا') : optionLabel(resource, confirm.field.key, confirm.value)}».</p>
                )}
                {confirm?.kind === 'review' && confirm.action === 'reject' && (
                  <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="سبب الرفض (يظهر للتاجر)" aria-label="سبب الرفض" />
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start">
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); runConfirm() }}
              disabled={busy}
              className={cn(confirm?.kind === 'delete' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90')}
            >
              {busy && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              تأكيد
            </AlertDialogAction>
            <AlertDialogCancel disabled={busy}>إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function confirmTitle(confirm: Confirm | null, resource: ResourceDef) {
  if (!confirm) return ''
  const n = formatNumber(confirm.ids.length)
  if (confirm.kind === 'delete') return `حذف ${n} من ${resource.label}؟`
  if (confirm.kind === 'bulk-set') return `تحديث ${n} سجل؟`
  return confirm.action === 'approve' ? `اعتماد ${n} طلب تاجر؟` : `رفض ${n} طلب تاجر؟`
}

function plainValue(resource: ResourceDef, column: ColumnDef, value: unknown) {
  if (value === null || value === undefined) return ''
  if (column.kind === 'boolean') return value ? 'نعم' : 'لا'
  if (column.kind === 'status') return optionLabel(resource, column.key, value)
  return String(value)
}

function CellValue({ resource, column, value }: { resource: ResourceDef; column: ColumnDef; value: unknown }) {
  if (value === null || value === undefined || value === '') return <span className="text-muted-foreground">—</span>
  switch (column.kind) {
    case 'money':
      return <span className="whitespace-nowrap font-semibold text-foreground">{formatCurrencySar(Number(value))}</span>
    case 'date':
      return <span className="whitespace-nowrap">{formatGregorianDate(String(value))}</span>
    case 'boolean':
      return value
        ? <Badge className="border-transparent bg-status-success text-status-success-foreground hover:bg-status-success">نعم</Badge>
        : <Badge className="border-transparent bg-status-neutral text-status-neutral-foreground hover:bg-status-neutral">لا</Badge>
    case 'status':
      return <AdminStatus resource={resource} field={column.key} value={value} />
    case 'id':
      return <span dir="ltr" className="block truncate font-mono text-xs" title={String(value)}>{String(value)}</span>
    default:
      return <span className="block truncate text-foreground" title={String(value)}>{String(value)}</span>
  }
}
