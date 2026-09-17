'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/status-badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty-state'
import { Stat, StatGroup } from '@/components/ui/stat'
import { PageHeader } from '@/components/layout/page-header'
import { localizeVehicleText, vehicleTitle } from '@/lib/arabic-display'
import { formatCurrencySar, formatGregorianDate, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { approveReceivedOffer, getDealsByBuyer } from '@/lib/deals'
import {
  createSupportTicket,
  getTicketsByBuyer,
  SUPPORT_TICKET_REASONS,
  SupportTicketReason
} from '@/lib/tickets'
import { supabase, User, Deal, Bid } from '@/lib/supabase'
import { signOut } from '@/lib/auth'
import { useToast } from '@/hooks/use-toast'
import {
  Car,
  Building2,
  TrendingUp,
  Clock,
  CheckCircle,
  LogOut,
  RefreshCw,
  Lock,
  Loader2,
  LifeBuoy,
  CreditCard
} from 'lucide-react'

interface BuyerDashboardProps {
  user: User
}

export function BuyerDashboard({ user }: BuyerDashboardProps) {
  const [activeBids, setActiveBids] = useState<Bid[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [supportTickets, setSupportTickets] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [approvingDealId, setApprovingDealId] = useState<string | null>(null)
  const [ticketDeal, setTicketDeal] = useState<Deal | null>(null)
  const [ticketReason, setTicketReason] = useState<SupportTicketReason>('supplier_no_response')
  const [ticketDescription, setTicketDescription] = useState('')
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false)
  const { toast } = useToast()

  const loadDashboardData = async () => {
    setIsLoading(true)

    const { data: bidsData } = await supabase
      .from('bids')
      .select(`
        *,
        configuration:car_configurations(*)
      `)
      .eq('buyer_id', user.id)
      .in('status', ['pending', 'accepted'])
      .order('created_at', { ascending: false })

    if (bidsData) {
      setActiveBids(bidsData)
    }

    const { data: dealsData } = await getDealsByBuyer(user.id)
    if (dealsData) {
      setDeals(dealsData)
    }

    const { data: ticketsData } = await getTicketsByBuyer(user.id)
    if (ticketsData) {
      setSupportTickets(ticketsData)
    }

    setIsLoading(false)
  }

  useEffect(() => {
    loadDashboardData()

    const channel = supabase
      .channel(`buyer-dashboard-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bids', filter: `buyer_id=eq.${user.id}` },
        loadDashboardData
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deals', filter: `buyer_id=eq.${user.id}` },
        loadDashboardData
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_tickets', filter: `buyer_id=eq.${user.id}` },
        loadDashboardData
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user.id])

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/'
  }

  const handleApproveOffer = async (dealId: string) => {
    setApprovingDealId(dealId)
    const result = await approveReceivedOffer(dealId)
    setApprovingDealId(null)

    if (result.error) {
      toast({
        title: 'تعذر تأكيد العرض',
        description: typeof result.error === 'string' ? result.error : 'حاول مرة أخرى لاحقاً.',
        variant: 'destructive'
      })
      return
    }

    toast({
      title: 'تم تأكيد العرض',
      description: 'تم إظهار بيانات التواصل ويمكنك المتابعة خارج المنصة.',
      variant: 'default'
    })
    await loadDashboardData()
  }

  const handleCreateTicket = async () => {
    if (!ticketDeal) return

    setIsSubmittingTicket(true)
    const result = await createSupportTicket({
      dealId: ticketDeal.id,
      reason: ticketReason,
      description: ticketDescription
    })
    setIsSubmittingTicket(false)

    if (result.error) {
      toast({
        title: 'تعذر إرسال التذكرة',
        description: typeof result.error === 'string' ? result.error : 'حاول مرة أخرى لاحقاً.',
        variant: 'destructive'
      })
      return
    }

    toast({
      title: 'تم إرسال التذكرة',
      description: 'سيقوم فريق الإدارة بمراجعة الشكوى وطلب الاسترداد.',
      variant: 'default'
    })
    setTicketDeal(null)
    setTicketReason('supplier_no_response')
    setTicketDescription('')
    await loadDashboardData()
  }

  const unpaidBids = activeBids.filter((bid) => bid.status === 'pending' && !bid.commitment_fee_paid)
  const waitingBids = activeBids.filter((bid) => bid.status === 'pending' && bid.commitment_fee_paid)
  const dealsToConfirm = deals.filter((deal) => deal.status === 'pending_payment')
  const completedDeals = deals.filter((deal) => deal.status === 'completed')
  const payLink = (bid: Bid) => `/cars/${bid.car_configuration_id}?pay_bid=${bid.id}`

  return (
    <div className="page space-y-6">
      <PageHeader
        eyebrow={`مرحباً، ${user.full_name}`}
        title="طلباتي"
        description="تابع عروضك حتى يقبلها تاجر، ثم أكّد الصفقة لتظهر بيانات التواصل."
        actions={
          <>
            <Button asChild size="sm">
              <Link href="/cars"><Car className="h-4 w-4" />تصفح السيارات</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/dealer/apply"><Building2 className="h-4 w-4" />حساب تاجر</Link>
            </Button>
            <Button size="sm" variant="ghost" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />خروج
            </Button>
          </>
        }
      />

      <StatGroup>
        <Stat label="بانتظار الدفع" value={formatNumber(unpaidBids.length)} tone={unpaidBids.length ? 'warning' : 'default'} hint="أكمل دفع رسوم الالتزام" />
        <Stat label="بانتظار قبول التجار" value={formatNumber(waitingBids.length)} />
        <Stat label="بانتظار تأكيدك" value={formatNumber(dealsToConfirm.length)} tone={dealsToConfirm.length ? 'warning' : 'default'} hint="قبل تاجر عرضك" />
        <Stat label="صفقات مكتملة" value={formatNumber(completedDeals.length)} />
      </StatGroup>

      <Tabs defaultValue={dealsToConfirm.length ? 'deals' : 'bids'}>
        <div className="flex items-end justify-between gap-2">
          <TabsList>
            <TabsTrigger value="bids">العروض <span className="num ms-1 text-muted-foreground">{formatNumber(activeBids.length)}</span></TabsTrigger>
            <TabsTrigger value="deals">الصفقات <span className="num ms-1 text-muted-foreground">{formatNumber(deals.length)}</span></TabsTrigger>
          </TabsList>
          <Button variant="ghost" size="sm" onClick={loadDashboardData} disabled={isLoading}>
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            <span className="sr-only sm:not-sr-only">تحديث</span>
          </Button>
        </div>

        <TabsContent value="bids" className="mt-4">
          {isLoading && activeBids.length === 0 ? (
            <div className="surface h-40 animate-pulse bg-muted/40" aria-busy="true" />
          ) : activeBids.length === 0 ? (
            <div className="surface">
              <EmptyState
                icon={Clock}
                title="لا توجد عروض نشطة"
                description="اختر سيارة من السوق وقدّم سعرك."
                action={<Button asChild size="sm"><Link href="/cars">تصفح السيارات</Link></Button>}
              />
            </div>
          ) : (
            <div className="surface overflow-hidden">
              <Table className="hidden md:table">
                <TableHeader>
                  <TableRow>
                    <TableHead>السيارة</TableHead>
                    <TableHead className="text-end">عرضك</TableHead>
                    <TableHead className="text-end">سعر الوكالة</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead className="w-40"><span className="sr-only">إجراء</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeBids.map((bid) => {
                    const config = (bid as any).configuration
                    const unpaid = bid.status === 'pending' && !bid.commitment_fee_paid
                    return (
                      <TableRow key={bid.id}>
                        <TableCell className="font-medium text-foreground">
                          {vehicleTitle(config || {})}
                          {config?.color && <span className="block text-xs font-normal text-muted-foreground">{localizeVehicleText(config.color)}</span>}
                        </TableCell>
                        <TableCell className="text-end font-bold text-foreground">{formatCurrencySar(bid.bid_price)}</TableCell>
                        <TableCell className="text-end text-muted-foreground">{formatCurrencySar(config?.msrp || 0)}</TableCell>
                        <TableCell><StatusBadge kind="bid" status={bid.status} unpaid={!bid.commitment_fee_paid} /></TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{formatGregorianDate(bid.created_at)}</TableCell>
                        <TableCell className="text-end">
                          {unpaid ? (
                            <Button asChild size="sm"><Link href={payLink(bid)}><CreditCard className="h-4 w-4" />إكمال الدفع</Link></Button>
                          ) : (
                            <Button asChild size="sm" variant="ghost"><Link href={`/cars/${bid.car_configuration_id}`}>عرض السيارة</Link></Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              <ul className="divide-y divide-border md:hidden">
                {activeBids.map((bid) => {
                  const config = (bid as any).configuration
                  const unpaid = bid.status === 'pending' && !bid.commitment_fee_paid
                  return (
                    <li key={bid.id} className="space-y-2 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-bold text-foreground">{vehicleTitle(config || {})}</p>
                          <p className="text-xs">{localizeVehicleText(config?.color)} · {formatGregorianDate(bid.created_at)}</p>
                        </div>
                        <StatusBadge kind="bid" status={bid.status} unpaid={!bid.commitment_fee_paid} />
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">عرضك <span className="num font-bold text-foreground">{formatCurrencySar(bid.bid_price)}</span></span>
                        {unpaid ? (
                          <Button asChild size="sm"><Link href={payLink(bid)}>إكمال الدفع</Link></Button>
                        ) : (
                          <Button asChild size="sm" variant="ghost"><Link href={`/cars/${bid.car_configuration_id}`}>عرض</Link></Button>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </TabsContent>

        <TabsContent value="deals" className="mt-4 space-y-3">
          {deals.length === 0 ? (
            <div className="surface">
              <EmptyState
                icon={TrendingUp}
                title="لا توجد صفقات بعد"
                description="عندما يقبل تاجر عرضك تظهر الصفقة هنا لتأكيدها وإظهار بيانات التواصل."
              />
            </div>
          ) : (
            deals.map((deal) => {
              const config = (deal as any).configuration
              const dealer = deal.dealer as any
              const displayDealer = dealer || (deal as any).dealer_public
              const isApproved = deal.status === 'completed'
              const contactInfo = dealer?.contact_info || {}
              const dealTickets = supportTickets.filter((ticket) => ticket.deal_id === deal.id)
              const steps = [
                { label: 'أرسلت العرض', done: true },
                { label: 'قبله التاجر', done: true },
                { label: 'أكّدت الصفقة', done: isApproved },
              ]

              return (
                <article key={deal.id} className="surface">
                  <header className="flex flex-col gap-2 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-base font-bold">{vehicleTitle(config || {})}</h3>
                        <StatusBadge kind="deal" audience="buyer" status={deal.status} />
                      </div>
                      <p className="text-xs">{displayDealer?.company_name || 'تاجر موثّق'} · {formatGregorianDate(deal.created_at)}</p>
                    </div>
                    <div className="text-start sm:text-end">
                      <p className="text-xs text-muted-foreground">السعر النهائي</p>
                      <p className="num text-lg font-bold text-foreground">{formatCurrencySar(deal.final_price)}</p>
                    </div>
                  </header>

                  <div className="space-y-4 p-4">
                    <ol className="flex items-center gap-2 text-xs" aria-label="مراحل الصفقة">
                      {steps.map((step, index) => (
                        <li key={step.label} className="flex flex-1 items-center gap-2">
                          <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full', step.done ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground')}>
                            {step.done ? <CheckCircle className="h-3.5 w-3.5" /> : index + 1}
                          </span>
                          <span className={cn(step.done ? 'font-medium text-foreground' : 'text-muted-foreground')}>{step.label}</span>
                          {index < steps.length - 1 && <span className="hidden h-px flex-1 bg-border sm:block" />}
                        </li>
                      ))}
                    </ol>

                    {isApproved ? (
                      <>
                        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                          <div><dt className="text-xs text-muted-foreground">التاجر</dt><dd className="font-medium text-foreground">{displayDealer?.company_name || 'غير متوفر'}</dd></div>
                          <div><dt className="text-xs text-muted-foreground">الجوال</dt><dd className="font-medium text-foreground" dir="ltr">{contactInfo.phone || 'غير متوفر'}</dd></div>
                          <div><dt className="text-xs text-muted-foreground">المدينة</dt><dd className="font-medium text-foreground">{displayDealer?.city || 'غير متوفر'}</dd></div>
                          {contactInfo.email && <div><dt className="text-xs text-muted-foreground">البريد</dt><dd className="font-medium text-foreground" dir="ltr">{contactInfo.email}</dd></div>}
                        </dl>

                        {dealTickets.length > 0 && (
                          <ul className="divide-y divide-border rounded-md border border-border text-sm">
                            {dealTickets.map((ticket) => (
                              <li key={ticket.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                                <span className="text-foreground">{SUPPORT_TICKET_REASONS[ticket.reason as SupportTicketReason] || ticket.reason}</span>
                                <span className="flex items-center gap-2">
                                  <span className="num text-xs text-muted-foreground">{formatCurrencySar(ticket.requested_refund_amount || 0)}</span>
                                  <StatusBadge kind="ticket" status={ticket.status} />
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}

                        <Button variant="outline" size="sm" onClick={() => setTicketDeal(deal)}>
                          <LifeBuoy className="h-4 w-4" />
                          شكوى أو طلب استرداد
                        </Button>
                      </>
                    ) : (
                      <div className="flex flex-col gap-3 rounded-md bg-status-warning p-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="flex gap-2 text-sm text-status-warning-foreground">
                          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                          بيانات التواصل مخفية حتى تؤكد الصفقة. بعد التأكيد تتواصل مع التاجر مباشرة.
                        </p>
                        <Button size="sm" onClick={() => handleApproveOffer(deal.id)} disabled={approvingDealId === deal.id} className="shrink-0">
                          {approvingDealId === deal.id ? <><Loader2 className="h-4 w-4 animate-spin" />جاري التأكيد...</> : 'تأكيد الصفقة'}
                        </Button>
                      </div>
                    )}
                  </div>
                </article>
              )
            })
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(ticketDeal)} onOpenChange={(open) => {
        if (!open) {
          setTicketDeal(null)
          setTicketDescription('')
          setTicketReason('supplier_no_response')
        }
      }}>
        <DialogContent dir="rtl" className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>شكوى أو طلب استرداد</DialogTitle>
            <DialogDescription>صف المشكلة بوضوح. يُحدَّد مبلغ الاسترداد حسب سبب التذكرة.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ticket-reason">سبب التذكرة</Label>
              <Select value={ticketReason} onValueChange={(value) => setTicketReason(value as SupportTicketReason)}>
                <SelectTrigger id="ticket-reason"><SelectValue placeholder="اختر السبب" /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(SUPPORT_TICKET_REASONS) as SupportTicketReason[]).map((reason) => (
                    <SelectItem key={reason} value={reason}>{SUPPORT_TICKET_REASONS[reason]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs">
                {ticketReason === 'car_damaged'
                  ? `الاسترداد المطلوب: كامل مبلغ الصفقة ${formatCurrencySar(ticketDeal?.final_price || 0)}.`
                  : ticketReason === 'other'
                    ? 'شكوى عامة بدون مبلغ استرداد تلقائي.'
                    : 'الاسترداد المطلوب: رسوم الالتزام 500 ر.س.'}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ticket-description">تفاصيل المشكلة</Label>
              <Textarea
                id="ticket-description"
                value={ticketDescription}
                onChange={(event) => setTicketDescription(event.target.value)}
                placeholder="ما الذي حدث، ومتى تواصلت مع التاجر، وأي تفاصيل تساعد الإدارة."
                className="min-h-[120px]"
              />
              <p className="text-xs">10 أحرف على الأقل.</p>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleCreateTicket} disabled={isSubmittingTicket || ticketDescription.trim().length < 10}>
              {isSubmittingTicket ? <><Loader2 className="h-4 w-4 animate-spin" />جاري الإرسال...</> : 'إرسال التذكرة'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setTicketDeal(null)}>إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
