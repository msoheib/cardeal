import { Badge } from '@/components/ui/badge'
import { optionLabel, ResourceDef } from '@/lib/admin-console/resources'
import { cn } from '@/lib/utils'

const SUCCESS = new Set(['active', 'accepted', 'completed', 'paid', 'approved', 'resolved', 'applied_to_purchase', 'admin'])
const WARNING = new Set(['pending', 'pending_payment', 'open', 'under_review', 'dealer'])
const DANGER = new Set(['rejected', 'cancelled', 'car_damaged', 'car_not_received', 'supplier_no_response'])

export function AdminStatus({ resource, field, value }: { resource: ResourceDef; field: string; value: unknown }) {
  const key = String(value ?? '')
  const tone = SUCCESS.has(key)
    ? 'bg-status-success text-status-success-foreground'
    : WARNING.has(key)
      ? 'bg-status-warning text-status-warning-foreground'
      : DANGER.has(key)
        ? 'bg-status-danger text-status-danger-foreground'
        : 'bg-status-neutral text-status-neutral-foreground'
  return (
    <Badge className={cn('whitespace-nowrap border-transparent font-semibold hover:opacity-90', tone)}>
      {optionLabel(resource, field, value) || '—'}
    </Badge>
  )
}
