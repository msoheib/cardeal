'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { vehicleTitle } from '@/lib/arabic-display'
import { formatCurrencySar, formatGregorianDate } from '@/lib/format'
import { approveReceivedOffer, getDealsByBuyer } from '@/lib/deals'
import {
  createSupportTicket,
  getTicketsByBuyer,
  SUPPORT_TICKET_REASONS,
  SUPPORT_TICKET_STATUSES,
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
  Eye,
  RefreshCw,
  Lock,
  Phone,
  Loader2,
  LifeBuoy
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
      .eq('status', 'accepted')
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">قيد الانتظار</Badge>
      case 'accepted':
        return <Badge className="bg-primary/10 text-primary">مقبولة</Badge>
      case 'rejected':
        return <Badge variant="destructive">مرفوضة</Badge>
      case 'expired':
        return <Badge variant="outline" className="text-gray-600">منتهية الصلاحية</Badge>
      case 'pending_payment':
        return <Badge className="bg-amber-100 text-amber-800">بانتظار موافقتك</Badge>
      case 'completed':
        return <Badge className="bg-primary/10 text-primary">تمت الموافقة</Badge>
      default:
        return <Badge variant="outline">حالة غير معروفة</Badge>
    }
  }

  const getTicketStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-amber-100 text-amber-800">مفتوحة</Badge>
      case 'under_review':
        return <Badge className="bg-blue-100 text-blue-800">قيد المراجعة</Badge>
      case 'approved':
        return <Badge className="bg-primary/10 text-primary">تمت الموافقة</Badge>
      case 'rejected':
        return <Badge variant="destructive">مرفوضة</Badge>
      case 'resolved':
        return <Badge className="bg-primary/10 text-primary">تم الحل</Badge>
      case 'closed':
        return <Badge variant="outline">مغلقة</Badge>
      default:
        return <Badge variant="outline">{SUPPORT_TICKET_STATUSES[status as keyof typeof SUPPORT_TICKET_STATUSES] || status}</Badge>
    }
  }

  return (
    <div className="bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">مرحبا، {user.full_name}</h1>
            <p className="text-sm text-gray-600">تابع مزايداتك وطلبات السيارات حتى موافقتك النهائية.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dealer/apply">
              <Button variant="outline" size="sm">
                <Building2 className="w-4 h-4 mr-2" />
                طلب حساب تاجر
              </Button>
            </Link>
            <Link href="/cars">
              <Button variant="outline" size="sm">
                <Car className="w-4 h-4 mr-2" />
                تصفح السيارات
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              تسجيل الخروج
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        <Tabs defaultValue="bids" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="bids">مزايداتي</TabsTrigger>
            <TabsTrigger value="deals">تتبع الطلبات</TabsTrigger>
          </TabsList>

          <TabsContent value="bids" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">المزايدات النشطة</h2>
              <Button variant="outline" size="sm" onClick={loadDashboardData}>
                <RefreshCw className="w-4 h-4 mr-2" />
                تحديث
              </Button>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : activeBids.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد مزايدات نشطة</h3>
                  <p className="text-gray-600 mb-4">ابدأ بتصفح السيارات ووضع مزايداتك.</p>
                  <Link href="/cars">
                    <Button>تصفح السيارات</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {activeBids.map((bid) => {
                  const config = (bid as any).configuration
                  return (
                    <Card key={bid.id}>
                      <CardContent className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-4 mb-2">
                              <h3 className="text-lg font-semibold">
                                {vehicleTitle(config || {})}
                              </h3>
                              {getStatusBadge(bid.status)}
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">مزايدتك:</span>
                                <div className="font-semibold text-primary">
                                  {formatCurrencySar(bid.bid_price)}
                                </div>
                              </div>
                              <div>
                                <span className="text-gray-600">سعر الوكالة:</span>
                                <div className="font-semibold">
                                  {formatCurrencySar(config?.msrp || 0)}
                                </div>
                              </div>
                              <div>
                                <span className="text-gray-600">الوفر المتوقع:</span>
                                <div className="font-semibold text-primary">
                                  {formatCurrencySar((config?.msrp || 0) - bid.bid_price)}
                                </div>
                              </div>
                              <div>
                                <span className="text-gray-600">رسوم الالتزام:</span>
                                <div className={`font-semibold ${bid.commitment_fee_paid ? 'text-primary' : 'text-red-600'}`}>
                                  {bid.commitment_fee_paid ? 'مدفوعة' : 'غير مدفوعة'}
                                </div>
                              </div>
                            </div>

                            {bid.status === 'accepted' && (
                              <Alert className="mt-4">
                                <CheckCircle className="w-4 h-4" />
                                <AlertDescription>تم قبول مزايدتك. راجع تتبع الطلبات لتأكيد العرض وإظهار بيانات التواصل.</AlertDescription>
                              </Alert>
                            )}
                          </div>

                          <div className="flex flex-col gap-2">
                            <Link href={`/cars/${bid.car_configuration_id}`}>
                              <Button variant="outline" size="sm">
                                <Eye className="w-4 h-4 mr-2" />
                                عرض التفاصيل
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="deals" className="space-y-4">
            <h2 className="text-xl font-semibold">تتبع طلبات السيارات</h2>

            {deals.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد طلبات قيد التتبع بعد</h3>
                  <p className="text-gray-600">عندما يقبل مورد مزايدتك سيظهر الطلب هنا لتأكيد العرض وإظهار بيانات التواصل.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {deals.map((deal) => {
                  const config = (deal as any).configuration
                  const dealer = deal.dealer as any
                  const publicDealer = (deal as any).dealer_public
                  const displayDealer = dealer || publicDealer
                  const isApproved = deal.status === 'completed'
                  const contactInfo = dealer?.contact_info || {}
                  const dealTickets = supportTickets.filter((ticket) => ticket.deal_id === deal.id)
                  const trackingSteps = [
                    { label: 'تم إرسال العرض', done: true },
                    { label: 'قبله المورد', done: true },
                    { label: 'موافقتك على العرض', done: isApproved }
                  ]

                  return (
                    <Card key={deal.id}>
                      <CardContent className="p-6 space-y-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <div className="flex items-center gap-3">
                              <h3 className="text-lg font-semibold">{vehicleTitle(config || {})}</h3>
                              {getStatusBadge(deal.status)}
                            </div>
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatGregorianDate(deal.created_at)}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 text-sm">
                          <div>
                            <span className="text-gray-600">السعر النهائي:</span>
                            <div className="font-semibold text-primary">{formatCurrencySar(deal.final_price)}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">حالة الصفقة:</span>
                            <div className="font-semibold">{getStatusBadge(deal.status)}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">الوفر المحقق:</span>
                            <div className="font-semibold text-primary">{formatCurrencySar((config?.msrp || 0) - deal.final_price)}</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                          {trackingSteps.map((step) => (
                            <div
                              key={step.label}
                              className={`rounded-lg border p-3 ${step.done ? 'border-primary/20 bg-primary/5' : 'border-amber-200 bg-amber-50'}`}
                            >
                              <div className="flex items-center gap-2 text-sm font-semibold">
                                {step.done ? (
                                  <CheckCircle className="h-4 w-4 text-primary" />
                                ) : (
                                  <Clock className="h-4 w-4 text-amber-600" />
                                )}
                                {step.label}
                              </div>
                              <p className="mt-1 text-xs text-gray-600">
                                {step.done ? 'مكتمل' : 'بانتظار الإجراء'}
                              </p>
                            </div>
                          ))}
                        </div>

                        {isApproved ? (
                          <div className="space-y-3">
                            <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <h4 className="font-semibold text-green-900 flex items-center gap-2">
                                  <Phone className="h-4 w-4" />
                                  معلومات المورد
                                </h4>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setTicketDeal(deal)}
                                  className="bg-white"
                                >
                                  <LifeBuoy className="ml-2 h-4 w-4" />
                                  شكوى أو طلب استرداد
                                </Button>
                              </div>
                              <div className="mt-3 grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
                                <div>
                                  <span className="text-gray-600">اسم الشركة: </span>
                                  <span className="font-medium">{displayDealer?.company_name || 'غير متوفر'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600">الجوال: </span>
                                  <span className="font-medium" dir="ltr">{contactInfo.phone || 'غير متوفر'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600">المدينة: </span>
                                  <span className="font-medium">{displayDealer?.city || 'غير متوفر'}</span>
                                </div>
                                {contactInfo.email && (
                                  <div>
                                    <span className="text-gray-600">البريد: </span>
                                    <span className="font-medium" dir="ltr">{contactInfo.email}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {dealTickets.length > 0 && (
                              <div className="rounded-lg border border-[#d8e7e7] bg-white p-4">
                                <h4 className="mb-3 font-semibold text-gray-900">تذاكر هذا الطلب</h4>
                                <div className="space-y-2">
                                  {dealTickets.map((ticket) => (
                                    <div key={ticket.id} className="flex flex-col gap-2 rounded-lg bg-gray-50 p-3 text-sm md:flex-row md:items-center md:justify-between">
                                      <div>
                                        <div className="font-semibold">
                                          {SUPPORT_TICKET_REASONS[ticket.reason as SupportTicketReason] || ticket.reason}
                                        </div>
                                        <div className="text-gray-600">
                                          طلب الاسترداد: {formatCurrencySar(ticket.requested_refund_amount || 0)}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {getTicketStatusBadge(ticket.status)}
                                        <span className="text-xs text-gray-500">
                                          {formatGregorianDate(ticket.created_at)}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <Alert className="border-amber-200 bg-amber-50">
                            <Lock className="h-4 w-4 text-amber-700" />
                            <AlertDescription className="flex flex-col gap-3 text-amber-950 md:flex-row md:items-center md:justify-between">
                              <span>
                                بيانات التواصل مخفية حتى توافق على العرض. بعد الموافقة ينتهي التتبع داخل المنصة ويمكنكم التواصل خارجياً عبر الجوال.
                              </span>
                              <Button
                                size="sm"
                                onClick={() => handleApproveOffer(deal.id)}
                                disabled={approvingDealId === deal.id}
                                className="shrink-0"
                              >
                                {approvingDealId === deal.id ? (
                                  <>
                                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                                    جاري التأكيد...
                                  </>
                                ) : (
                                  'الموافقة وإظهار التواصل'
                                )}
                              </Button>
                            </AlertDescription>
                          </Alert>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

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
            <DialogDescription>
              صف المشكلة بوضوح. ستحدد المنصة مبلغ الاسترداد تلقائياً حسب سبب التذكرة.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>سبب التذكرة</Label>
              <Select
                value={ticketReason}
                onValueChange={(value) => setTicketReason(value as SupportTicketReason)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر السبب" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(SUPPORT_TICKET_REASONS) as SupportTicketReason[]).map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {SUPPORT_TICKET_REASONS[reason]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">
              {ticketReason === 'car_damaged'
                ? `الاسترداد المطلوب لهذا السبب سيكون كامل مبلغ الصفقة: ${formatCurrencySar(ticketDeal?.final_price || 0)}.`
                : ticketReason === 'other'
                  ? 'هذه شكوى عامة بدون مبلغ استرداد تلقائي. يمكن للإدارة مراجعتها وتحديث حالتها.'
                  : 'الاسترداد المطلوب لهذا السبب سيكون رسوم الالتزام: 500 ر.س.'}
            </div>

            <div className="space-y-2">
              <Label>تفاصيل المشكلة</Label>
              <Textarea
                value={ticketDescription}
                onChange={(event) => setTicketDescription(event.target.value)}
                placeholder="اكتب ما حدث، تاريخ التواصل، وأي تفاصيل تساعد فريق الإدارة..."
                className="min-h-[120px]"
              />
              <p className="text-xs text-gray-500">الحد الأدنى 10 أحرف.</p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleCreateTicket}
                disabled={isSubmittingTicket || ticketDescription.trim().length < 10}
                className="flex-1"
              >
                {isSubmittingTicket ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري الإرسال...
                  </>
                ) : (
                  'إرسال التذكرة'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setTicketDeal(null)}
                className="flex-1"
              >
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
