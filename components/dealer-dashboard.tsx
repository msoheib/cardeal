'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/status-badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { archiveDealerInventoryListing, getDealerInventory, getDealerOpportunities, restoreDealerInventoryListing } from '@/lib/cars'
import { acceptBid, getDealsByDealer } from '@/lib/deals' // Use singular acceptBid
import { localizeVehicleText, vehicleTitle } from '@/lib/arabic-display'
import { formatCurrencySar, formatGregorianDate, formatGregorianTime } from '@/lib/format'
import { signOut } from '@/lib/auth'
import { toArabicError } from '@/lib/arabic-errors'
import { supabase, User, Deal, DealerListing } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import {
  Car as CarIcon,
  TrendingUp,
  LogOut,
  PlusCircle,
  AlertCircle,
  Clock,
  DollarSign,
  Lock,
  Phone,
  CheckCircle,
  Eye,
  Pencil,
  Archive,
  RotateCcw
} from 'lucide-react'

interface DealerDashboardProps {
  user: User
}

export function DealerDashboard({ user }: DealerDashboardProps) {
  const [inventory, setInventory] = useState<DealerListing[]>([])
  const [opportunities, setOpportunities] = useState<any[]>([]) // Pending bids
  const [deals, setDeals] = useState<Deal[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [inventoryView, setInventoryView] = useState<'current' | 'archived'>('current')
  const [archiveCandidate, setArchiveCandidate] = useState<DealerListing | null>(null)
  const { toast } = useToast()

  const loadDashboardData = async () => {
    // Get dealer info first
    const { data: dealerData } = await supabase
      .from('dealers')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!dealerData) {
      return
    }

    const dealerId = dealerData.id

    // 1. Load Inventory
    const { data: invData } = await getDealerInventory(dealerId)
    if (invData) setInventory(invData as any)

    // 2. Load Opportunities (Pending Bids)
    const { data: oppsData } = await getDealerOpportunities(dealerId)
    if (oppsData) setOpportunities(oppsData)

    // 3. Load Deals
    const { data: dealsData } = await getDealsByDealer(dealerId)
    if (dealsData) setDeals(dealsData)

  }

  useEffect(() => {
    loadDashboardData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id])

  const handleAcceptBid = async (bidId: string, amount: number) => {
    setIsProcessing(true)
    const result = await acceptBid(bidId)
    setIsProcessing(false)

    if (result.error) {
      toast({
        title: "خطأ",
        description: typeof result.error === 'string' ? result.error : 'فشل قبول العرض',
        variant: "destructive"
      })
    } else {
      toast({
        title: "تم قبول العرض!",
        description: `تم قبول العرض بقيمة ${formatCurrencySar(amount)}. بانتظار موافقة المشتري لإظهار بيانات التواصل.`,
        variant: "default"
      })
      // Refresh data to move from opportunities to deals
      loadDashboardData()
    }
  }

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/'
  }

  const refreshInventory = async () => {
    const { data: dealerData } = await supabase
      .from('dealers')
      .select('id')
      .eq('user_id', user.id)
      .single()
    if (!dealerData) return
    const { data: invData } = await getDealerInventory(dealerData.id)
    if (invData) setInventory(invData)
  }

  const handleArchive = async () => {
    if (!archiveCandidate) return
    setIsProcessing(true)
    const result = await archiveDealerInventoryListing(archiveCandidate.id)
    setIsProcessing(false)
    setArchiveCandidate(null)
    if (result.error) {
      toast({ title: 'تعذر إزالة الإعلان', description: toArabicDashboardError(result.error), variant: 'destructive' })
      return
    }
    toast({ title: 'تمت إزالة الإعلان', description: 'تم إخفاؤه من السوق ويمكن استعادته من تبويب المؤرشف.' })
    await refreshInventory()
  }

  const handleRestore = async (item: DealerListing) => {
    setIsProcessing(true)
    const result = await restoreDealerInventoryListing(item.id)
    setIsProcessing(false)
    if (result.error) {
      toast({ title: 'تعذر استعادة الإعلان', description: toArabicDashboardError(result.error), variant: 'destructive' })
      return
    }
    toast({ title: 'تمت استعادة الإعلان', description: 'عاد الإعلان إلى المخزون الحالي.' })
    await refreshInventory()
  }

  return (
    <div className="bg-gray-50 min-h-screen" dir="rtl">
      <main className="container mx-auto px-4 py-8 space-y-6">
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">لوحة التحكم (تاجر)</h1>
            <p className="text-sm text-gray-600">مرحباً، {user.full_name}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/cars">
              <Button variant="outline" size="sm">
                <CarIcon className="w-4 h-4 ml-2" />
                تصفح السوق
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 ml-2" />
              خروج
            </Button>
          </div>
          </CardContent>
        </Card>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <Card>
                <CardContent className="p-6 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">فرص البيع (مزايدات)</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-1">{opportunities.length}</h3>
                    </div>
                    <AlertCircle className="w-8 h-8 text-orange-500" />
                </CardContent>
             </Card>
             <Card>
                <CardContent className="p-6 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">سياراتي المعروضة</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-1">{inventory.filter((item) => item.status !== 'hidden').length}</h3>
                    </div>
                    <CarIcon className="w-8 h-8 text-brand" />
                </CardContent>
             </Card>
             <Card>
                <CardContent className="p-6 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">طلبات قيد التتبع</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-1">{deals.length}</h3>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-500" />
                </CardContent>
             </Card>
        </div>

        <Tabs defaultValue="opportunities" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="opportunities" className="relative">
                    فرص البيع
                    {opportunities.length > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                            {opportunities.length}
                        </span>
                    )}
                </TabsTrigger>
                <TabsTrigger value="inventory">المخزون</TabsTrigger>
                <TabsTrigger value="deals">تتبع الطلبات</TabsTrigger>
            </TabsList>

            {/* Opportunities (Pending Bids) */}
            <TabsContent value="opportunities" className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">عروض الشراء المتاحة</h2>
                    <p className="text-sm text-gray-500">الأسبقية لمن يقبل العرض أولاً</p>
                </div>

                {opportunities.length === 0 ? (
                    <Card>
                        <CardContent className="p-12 text-center text-gray-500">
                            <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <p>لا توجد عروض شراء معلقة حالياً.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {opportunities.map((bid) => {
                            const config = bid.configuration
                            return (
                                <Card key={bid.id} className="overflow-hidden border-l-4 border-l-orange-500">
                                    <div className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className="bg-orange-100 p-3 rounded-full">
                                                <DollarSign className="w-6 h-6 text-orange-600" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg text-gray-900">
                                                    عرض بقيمة {formatCurrencySar(bid.bid_price)}
                                                </h3>
                                                <p className="text-sm text-gray-600">
                                                    على سيارة: {vehicleTitle(config)} - {localizeVehicleText(config.trim)}
                                                </p>
                                                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                                    <span>قبل {formatGregorianTime(bid.created_at)}</span>
                                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full">رسوم الالتزام مدفوعة</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                             <div className="text-left">
                                                <p className="text-xs text-gray-500">صافي العرض المقدر</p>
                                                <p className="font-bold text-gray-900">{formatCurrencySar(bid.net_offer_amount || bid.bid_price - 500)}</p>
                                             </div>
                                             <Button 
                                                onClick={() => handleAcceptBid(bid.id, bid.bid_price)} 
                                                disabled={isProcessing}
                                                className="bg-green-600 hover:bg-green-700 text-white min-w-[120px]"
                                             >
                                                {isProcessing ? 'جاري القبول...' : 'قبول العرض'}
                                             </Button>
                                        </div>
                                    </div>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </TabsContent>

            {/* Inventory */}
            <TabsContent value="inventory" className="space-y-4">
                 <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">المخزون الحالي</h2>
                    <Link href="/dealer/cars/add">
                        <Button>
                            <PlusCircle className="w-4 h-4 ml-2" />
                            إضافة سيارة
                        </Button>
                    </Link>
                </div>

                <div className="flex gap-2 border-b pb-2">
                    <Button type="button" size="sm" variant={inventoryView === 'current' ? 'default' : 'outline'} onClick={() => setInventoryView('current')}>
                        الحالي ({inventory.filter((item) => item.status !== 'hidden').length})
                    </Button>
                    <Button type="button" size="sm" variant={inventoryView === 'archived' ? 'default' : 'outline'} onClick={() => setInventoryView('archived')}>
                        المؤرشف ({inventory.filter((item) => item.status === 'hidden').length})
                    </Button>
                </div>

                {(() => {
                    const visibleInventory = inventory.filter((item) => inventoryView === 'archived' ? item.status === 'hidden' : item.status !== 'hidden')
                    return visibleInventory.length === 0 ? (
                    <Card><CardContent className="p-8 text-center text-gray-500">{inventoryView === 'archived' ? 'لا توجد إعلانات مؤرشفة.' : 'لا يوجد مخزون حالياً.'}</CardContent></Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {visibleInventory.map((item) => (
                            <Card key={item.id} className="flex flex-col">
                                <CardHeader className="p-4 pb-0">
                                    <div className="flex justify-between items-start">
                                        <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>
                                            {item.status === 'active' ? 'نشط' : 'مؤرشف'}
                                        </Badge>
                                        {item.inventory.reduce((sum, row) => sum + row.quantity, 0) === 0 && <Badge variant="destructive">نفذت الكمية</Badge>}
                                    </div>
                                    <CardTitle className="mt-2 text-lg">
                                        {vehicleTitle(item.specification || {})}
                                    </CardTitle>
                                    <CardDescription>{localizeVehicleText(item.specification?.trim)}</CardDescription>
                                </CardHeader>
                                <CardContent className="p-4 pt-4 flex-1 flex flex-col justify-end">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-sm text-gray-500">الإجمالي: {item.inventory.reduce((sum, row) => sum + row.quantity, 0)}</span>
                                        <span className="font-bold text-primary">{formatCurrencySar(item.agency_price)}</span>
                                    </div>
                                    <div className="mb-4 flex flex-wrap gap-2">
                                      {item.inventory.filter((row) => row.quantity > 0).map((row) => (
                                        <Badge key={row.id} variant="outline">
                                          {localizeVehicleText(row.configuration?.color)}: {row.quantity}
                                        </Badge>
                                      ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <Link href={`/cars/${item.listing_spec_id}`} className="flex-1">
                                            <Button variant="outline" className="w-full"><Eye className="ml-2 h-4 w-4" />عرض</Button>
                                        </Link>
                                        <Link href={`/dealer/cars/${item.id}/edit`}>
                                            <Button variant="outline" size="icon" aria-label="تعديل"><Pencil className="h-4 w-4" /></Button>
                                        </Link>
                                        {inventoryView === 'archived' ? (
                                            <Button type="button" variant="outline" size="icon" aria-label="استعادة" onClick={() => handleRestore(item)} disabled={isProcessing}><RotateCcw className="h-4 w-4" /></Button>
                                        ) : (
                                            <Button type="button" variant="outline" size="icon" aria-label="إزالة" onClick={() => setArchiveCandidate(item)} disabled={isProcessing}><Archive className="h-4 w-4" /></Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )})()}
            </TabsContent>

            {/* Deals */}
            <TabsContent value="deals" className="space-y-4">
                <h2 className="text-xl font-semibold">تتبع طلبات المشترين</h2>
                {deals.length === 0 ? (
                    <Card><CardContent className="p-8 text-center text-gray-500">لا توجد طلبات مقبولة بعد.</CardContent></Card>
                ) : (
                    <div className="space-y-4">
                        {deals.map(deal => {
                            const config = (deal as any).configuration
                            const buyer = (deal as any).buyer
                            const isApproved = deal.status === 'completed'
                            const trackingSteps = [
                                { label: 'قبلت العرض', done: true },
                                { label: 'موافقة المشتري', done: isApproved },
                                { label: 'التواصل الخارجي', done: isApproved }
                            ]

                            return (
                                <Card key={deal.id}>
                                    <CardContent className="p-6 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="font-bold text-gray-900">
                                                    {vehicleTitle(config || {})} - {localizeVehicleText(config?.trim)}
                                                </h3>
                                                <p className="text-sm text-gray-500">بتاريخ {formatGregorianDate(deal.created_at)}</p>
                                            </div>
                                            <div className="text-left">
                                                <p className="font-bold text-primary">{formatCurrencySar(deal.final_price)}</p>
                                                <StatusBadge kind="deal" status={deal.status} />
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
                                            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                                                <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                                                    <Phone className="h-4 w-4" />
                                                    معلومات المشتري
                                                </h4>
                                                <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                                                    <div>
                                                        <span className="text-gray-600">الاسم: </span>
                                                        <span className="font-medium">{buyer?.full_name || 'غير متوفر'}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-600">الجوال: </span>
                                                        <span className="font-medium" dir="ltr">{buyer?.phone || buyer?.email || 'غير متوفر'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                                                <div className="flex items-start gap-3">
                                                    <Lock className="mt-0.5 h-4 w-4 text-amber-700" />
                                                    <div>
                                                        <h4 className="font-semibold text-amber-950">بيانات التواصل مخفية</h4>
                                                        <p className="mt-1 text-sm text-amber-900">
                                                            سيظهر اسم المشتري ورقم الجوال بعد موافقته على العرض. ينتهي التتبع داخل المنصة عند هذه الموافقة.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
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
      <Dialog open={Boolean(archiveCandidate)} onOpenChange={(open) => !open && setArchiveCandidate(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>إزالة الإعلان من المخزون؟</DialogTitle>
            <DialogDescription>سيتم إخفاء الإعلان من السوق دون حذف تاريخه أو كميته. يمكنك استعادته لاحقاً من تبويب المؤرشف.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setArchiveCandidate(null)}>إلغاء</Button>
            <Button type="button" variant="destructive" onClick={handleArchive} disabled={isProcessing}>{isProcessing ? 'جاري الإزالة...' : 'إزالة الإعلان'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function toArabicDashboardError(error: unknown) {
  return toArabicError(error, 'تعذر إتمام الإجراء. حاول مرة أخرى أو تواصل مع الدعم.')
}
