'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Stat, StatGroup, type StatTone } from '@/components/ui/stat'
import { Section } from '@/components/layout/page-header'
import { adminFetch } from '@/lib/admin-console/client'
import { ResourceKey, RESOURCES } from '@/lib/admin-console/resources'
import { formatCurrencySar, formatGregorianDate, formatGregorianTime, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { OpenResourceOptions } from './admin-console'
import { AdminStatus } from './admin-status'

interface Overview {
  users: { buyers: number; dealers: number; admins: number }
  dealers: { verified: number; unverified: number; applicationsPending: number }
  listings: { active: number; hidden: number }
  bids: { total: number; unpaid: number; awaitingDealer: number; stale: number; accepted: number; cancelled: number }
  deals: { awaitingBuyer: number; completed: number; cancelled: number; refunded: number }
  tickets: { open: number; underReview: number }
  fees: { paidCount: number; paidAmount: number; refundedAmount: number }
  avgDealerResponse: string
  staleHours: number
  activity: { id: string; resource: ResourceKey; at: string; title: string; amount: number | null; status: string; note: string }[]
}

type Tone = 'default' | 'warning' | 'danger'

interface Tile {
  label: string
  value: string
  hint?: string
  tone?: Tone
  open?: [ResourceKey, OpenResourceOptions?]
}

export function OverviewPanel({ onOpen }: { onOpen: (key: ResourceKey, options?: OpenResourceOptions) => void }) {
  const [data, setData] = useState<Overview | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await adminFetch<Overview>('overview'))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading && !data) {
    return <div className="flex items-center gap-2 py-16 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />جاري تحميل المؤشرات...</div>
  }
  if (error && !data) {
    return (
      <div className="surface flex flex-col items-start gap-3 p-5">
        <p className="font-medium text-status-danger-foreground">{error}</p>
        <Button variant="outline" size="sm" onClick={load}>إعادة المحاولة</Button>
      </div>
    )
  }
  if (!data) return null

  const attention: Tile[] = [
    { label: 'عروض بانتظار الدفع', value: formatNumber(data.bids.unpaid), hint: 'قدّم المشتري عرضاً ولم يدفع الرسوم', tone: data.bids.unpaid ? 'warning' : 'default', open: ['bids', { status: 'pending', filters: { commitment_fee_paid: 'false' } }] },
    { label: `عروض مدفوعة بلا رد منذ ${data.staleHours} ساعة`, value: formatNumber(data.bids.stale), hint: 'لم يقبلها أي تاجر بعد', tone: data.bids.stale ? 'danger' : 'default', open: ['bids', { status: 'pending', filters: { commitment_fee_paid: 'true' } }] },
    { label: 'صفقات بانتظار تأكيد المشتري', value: formatNumber(data.deals.awaitingBuyer), tone: data.deals.awaitingBuyer ? 'warning' : 'default', open: ['deals', { status: 'pending_payment' }] },
    { label: 'طلبات تجار للمراجعة', value: formatNumber(data.dealers.applicationsPending), tone: data.dealers.applicationsPending ? 'warning' : 'default', open: ['dealer_applications', { status: 'pending' }] },
    { label: 'تذاكر مفتوحة / قيد المراجعة', value: `${formatNumber(data.tickets.open)} / ${formatNumber(data.tickets.underReview)}`, tone: data.tickets.open ? 'danger' : 'default', open: ['support_tickets', { status: 'open' }] },
  ]

  const totals: Tile[] = [
    { label: 'كل العروض', value: formatNumber(data.bids.total), open: ['bids'] },
    { label: 'مدفوعة بانتظار التجار', value: formatNumber(data.bids.awaitingDealer), open: ['bids', { status: 'pending', filters: { commitment_fee_paid: 'true' } }] },
    { label: 'عروض مقبولة', value: formatNumber(data.bids.accepted), open: ['bids', { status: 'accepted' }] },
    { label: 'صفقات مكتملة', value: formatNumber(data.deals.completed), open: ['deals', { status: 'completed' }] },
    { label: 'متوسط زمن رد التاجر', value: data.avgDealerResponse || '—', hint: 'من إنشاء العرض إلى قبوله' },
    { label: 'رسوم محصّلة', value: formatCurrencySar(data.fees.paidAmount), hint: `${formatNumber(data.fees.paidCount)} عملية · مسترد ${formatCurrencySar(data.fees.refundedAmount)}`, open: ['commitment_fees'] },
    { label: 'إعلانات نشطة / مخفية', value: `${formatNumber(data.listings.active)} / ${formatNumber(data.listings.hidden)}`, open: ['listings'] },
    { label: 'تجار موثّقون / غير موثّقين', value: `${formatNumber(data.dealers.verified)} / ${formatNumber(data.dealers.unverified)}`, open: ['dealers'] },
    { label: 'مشترون · تجار · مدراء', value: `${formatNumber(data.users.buyers)} · ${formatNumber(data.users.dealers)} · ${formatNumber(data.users.admins)}`, open: ['users'] },
  ]

  const tone = (t?: Tone): StatTone => (t === 'warning' ? 'warning' : t === 'danger' ? 'danger' : 'default')
  const renderTiles = (tiles: Tile[]) =>
    tiles.map((tile) => (
      <Stat
        key={tile.label}
        label={tile.label}
        value={tile.value}
        hint={tile.hint}
        tone={tone(tile.tone)}
        onClick={tile.open ? () => onOpen(tile.open![0], tile.open![1]) : undefined}
      />
    ))

  return (
    <div className="space-y-6">
      <Section
        title="تحتاج انتباهك"
        description="اضغط أي رقم لفتح السجلات المطابقة."
        actions={
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            تحديث
          </Button>
        }
      >
        <StatGroup columns={5}>{renderTiles(attention)}</StatGroup>
      </Section>

      <Section title="الأرقام الإجمالية">
        <StatGroup columns={3}>{renderTiles(totals)}</StatGroup>
      </Section>

      <Section title="آخر النشاطات">
        <div className="surface overflow-hidden">
          {data.activity.length === 0 ? (
            <p className="p-6 text-center text-sm">لا توجد نشاطات بعد.</p>
          ) : (
            <ul className="divide-y divide-border">
              {data.activity.map((item) => (
                <li key={`${item.resource}-${item.id}`}>
                  <button
                    type="button"
                    onClick={() => onOpen(item.resource)}
                    className="flex w-full flex-col gap-1 px-4 py-3 text-start hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">{item.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {RESOURCES[item.resource].label} · {formatGregorianDate(item.at)} {formatGregorianTime(item.at)}{item.note ? ` · ${item.note}` : ''}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      {item.amount ? <span className="num text-sm font-bold text-foreground">{formatCurrencySar(Number(item.amount))}</span> : null}
                      <AdminStatus resource={RESOURCES[item.resource]} field="status" value={item.status} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Section>
    </div>
  )
}
