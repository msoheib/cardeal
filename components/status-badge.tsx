import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type Tone = 'warning' | 'success' | 'danger' | 'neutral'

const TONE_CLASSES: Record<Tone, string> = {
  warning: 'bg-status-warning text-status-warning-foreground hover:bg-status-warning',
  success: 'bg-status-success text-status-success-foreground hover:bg-status-success',
  danger: 'bg-status-danger text-status-danger-foreground hover:bg-status-danger',
  neutral: 'bg-status-neutral text-status-neutral-foreground hover:bg-status-neutral',
}

type StatusKind = 'bid' | 'deal' | 'ticket' | 'listing' | 'application'

// One vocabulary for buyer, dealer and admin views. A deal in `pending_payment`
// is waiting on the buyer's confirmation, not on a payment (the fee is paid
// before dealers ever see the bid).
const LABELS: Record<StatusKind, Record<string, [string, Tone]>> = {
  bid: {
    pending: ['بانتظار قبول التاجر', 'warning'],
    accepted: ['مقبول', 'success'],
    rejected: ['مرفوض', 'danger'],
    cancelled: ['ملغى', 'neutral'],
    expired: ['منتهي', 'neutral'],
  },
  deal: {
    pending_payment: ['بانتظار تأكيد المشتري', 'warning'],
    completed: ['تمت الصفقة', 'success'],
    cancelled: ['ملغاة', 'danger'],
    refunded: ['مستردة', 'neutral'],
  },
  ticket: {
    open: ['مفتوحة', 'warning'],
    under_review: ['قيد المراجعة', 'warning'],
    approved: ['تمت الموافقة', 'success'],
    resolved: ['تم الحل', 'success'],
    rejected: ['مرفوضة', 'danger'],
    closed: ['مغلقة', 'neutral'],
  },
  listing: {
    active: ['نشط', 'success'],
    draft: ['مسودة', 'neutral'],
    pending: ['قيد المراجعة', 'warning'],
    inactive: ['غير نشط', 'neutral'],
    sold: ['مباع', 'neutral'],
    archived: ['مؤرشف', 'neutral'],
  },
  application: {
    pending: ['قيد المراجعة', 'warning'],
    approved: ['معتمد', 'success'],
    rejected: ['مرفوض', 'danger'],
  },
}

interface StatusBadgeProps {
  kind: StatusKind
  status: string | null | undefined
  /** Bids only: a pending bid whose commitment fee is still unpaid. */
  unpaid?: boolean
  /** Deals seen by the buyer read "بانتظار تأكيدك". */
  audience?: 'buyer'
  className?: string
}

export function StatusBadge({ kind, status, unpaid, audience, className }: StatusBadgeProps) {
  const [baseLabel, tone]: [string, Tone] = LABELS[kind][status || ''] || ['حالة غير معروفة', 'neutral']
  let label = baseLabel
  if (kind === 'bid' && status === 'pending' && unpaid) label = 'بانتظار الدفع'
  if (kind === 'deal' && status === 'pending_payment' && audience === 'buyer') label = 'بانتظار تأكيدك'

  return (
    <Badge className={cn('border-transparent font-semibold', TONE_CLASSES[tone], className)}>
      {label}
    </Badge>
  )
}
