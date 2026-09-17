'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { FieldDef, ResourceDef } from '@/lib/admin-console/resources'

const EMPTY = '__empty__'

function toFormValue(field: FieldDef, value: unknown): string | boolean {
  if (field.type === 'boolean') return Boolean(value)
  if (value === null || value === undefined) return ''
  if (field.type === 'list') return Array.isArray(value) ? value.join('\n') : String(value)
  if (field.type === 'json') return JSON.stringify(value, null, 2)
  if (field.type === 'datetime') {
    const d = new Date(String(value))
    if (Number.isNaN(d.getTime())) return ''
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
  return String(value)
}

interface RecordDialogProps {
  resource: ResourceDef
  record: Record<string, any> | null
  mode: 'create' | 'edit'
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: Record<string, unknown>) => Promise<void>
}

export function RecordDialog({ resource, record, mode, open, onOpenChange, onSubmit }: RecordDialogProps) {
  const [form, setForm] = useState<Record<string, string | boolean>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fields = resource.fields.filter((f) => mode === 'create' ? !f.readOnly : true)

  useEffect(() => {
    if (!open) return
    setError('')
    setForm(Object.fromEntries(fields.map((f) => [f.key, toFormValue(f, record?.[f.key])])))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, record, mode, resource.key])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const values: Record<string, unknown> = {}
      for (const field of fields) {
        if (field.readOnly || (mode === 'edit' && field.createOnly)) continue
        const current = form[field.key]
        const original = toFormValue(field, record?.[field.key])
        // In edit mode only send what changed, so untouched columns are never rewritten.
        if (mode === 'edit' && current === original) continue
        if (mode === 'create' && current === '' && !field.required) continue
        // datetime-local is the admin's local time; send an absolute instant.
        values[field.key] = field.type === 'datetime' && current ? new Date(String(current)).toISOString() : current
      }
      if (mode === 'edit' && Object.keys(values).length === 0) {
        onOpenChange(false)
        return
      }
      await onSubmit(values)
      onOpenChange(false)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto" dir="rtl">
        <DialogHeader className="text-right sm:text-right">
          <DialogTitle>{mode === 'create' ? `إضافة إلى ${resource.label}` : `تعديل سجل · ${resource.label}`}</DialogTitle>
          <DialogDescription>
            {record?.id ? <span dir="ltr" className="font-mono text-xs">{record.id}</span> : resource.description}
          </DialogDescription>
        </DialogHeader>

        <form id="admin-record-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          {fields.map((field) => {
            const disabled = saving || field.readOnly || (mode === 'edit' && field.createOnly)
            const id = `field-${field.key}`
            const wide = ['textarea', 'json', 'list'].includes(field.type)
            const value = form[field.key]
            return (
              <div key={field.key} className={wide ? 'space-y-1.5 sm:col-span-2' : 'space-y-1.5'}>
                <Label htmlFor={id}>
                  {field.label}{field.required && mode === 'create' ? ' *' : ''}
                </Label>
                {field.type === 'boolean' ? (
                  <div className="flex h-10 items-center">
                    <Switch id={id} checked={Boolean(value)} disabled={disabled} onCheckedChange={(checked) => setForm((f) => ({ ...f, [field.key]: checked }))} />
                  </div>
                ) : field.type === 'enum' ? (
                  <Select
                    value={value ? String(value) : EMPTY}
                    disabled={disabled}
                    onValueChange={(next) => setForm((f) => ({ ...f, [field.key]: next === EMPTY ? '' : next }))}
                  >
                    <SelectTrigger id={id}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {!field.required && <SelectItem value={EMPTY}>—</SelectItem>}
                      {field.options?.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : wide ? (
                  <Textarea
                    id={id}
                    dir={field.type === 'json' || field.type === 'list' ? 'ltr' : 'rtl'}
                    className={field.type === 'json' ? 'min-h-28 font-mono text-xs' : 'min-h-24'}
                    value={String(value ?? '')}
                    disabled={disabled}
                    onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                  />
                ) : (
                  <Input
                    id={id}
                    type={field.type === 'number' ? 'number' : field.type === 'datetime' ? 'datetime-local' : 'text'}
                    dir={field.type === 'uuid' ? 'ltr' : undefined}
                    className={field.type === 'uuid' ? 'font-mono text-xs' : undefined}
                    step={field.type === 'number' ? 'any' : undefined}
                    value={String(value ?? '')}
                    disabled={disabled}
                    onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                  />
                )}
              </div>
            )
          })}
        </form>

        {error && <p role="alert" className="rounded-xl bg-status-danger p-3 text-sm text-status-danger-foreground">{error}</p>}

        <DialogFooter className="gap-2 sm:justify-start">
          <Button type="submit" form="admin-record-form" disabled={saving} className="rounded-xl">
            {saving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            {mode === 'create' ? 'إضافة' : 'حفظ التعديلات'}
          </Button>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">إلغاء</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
