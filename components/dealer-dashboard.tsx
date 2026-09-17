'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/status-badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty-state'
import { Stat, StatGroup } from '@/components/ui/stat'
import { PageHeader } from '@/components/layout/page-header'
import { archiveDealerInventoryListing, getDealerInventory, getDealerOpportunities, restoreDealerInventoryListing } from '@/lib/cars'
import { acceptBid, getDealsByDealer } from '@/lib/deals' // Use singular acceptBid
import { localizeVehicleText, vehicleTitle } from '@/lib/arabic-display'
import { formatCurrencySar, formatGregorianDate, formatGregorianTime, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { signOut } from '@/lib/auth'
import { toArabicError } from '@/lib/arabic-errors'
import { supabase, User, Deal, DealerListing } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import {
  Car as CarIcon,
  TrendingUp,
  LogOut,
  PlusCircle,
  Clock,
  Lock,
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

  const activeListings = inventory.filter((item) => item.status !== 'hidden')
  const archivedListings = inventory.filter((item) => item.status === 'hidden')
  const visibleInventory = inventoryView === 'archived' ? archivedListings : activeListings
  const dealsAwaitingBuyer = deals.filter((deal) => deal.status === 'pending_payment')
  const stockOf = (item: DealerListing) => item.inventory.reduce((sum, row) => sum + row.quantity, 0)

  return (
    <div className="page space-y-6">
      <PageHeader
        eyebrow={`مرحباً، ${user.full_name}`}
        title="لوحة التاجر"
        description="اقبل العروض المدفوعة على سياراتك، وأدر مخزونك، وتابع الصفقات."
        actions={
          <>
            <Button asChild size="sm">
              <Link href="/dealer/cars/add"><PlusCircle className="h-4 w-4" />إضافة سيارة</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/cars"><CarIcon className="h-4 w-4" />السوق</Link>
            </Button>
            <Button size="sm" variant="ghost" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />خروج
            </Button>
          </>
        }
      />

      <StatGroup columns={4}>
        <Stat label="عروض تنتظر قبولك" value={formatNumber(opportunities.length)} tone={opportunities.length ? 'warning' : 'default'} hint="الأسبقية لمن يقبل أولاً" />
        <Stat label="إعلانات نشطة" value={formatNumber(activeListings.length)} />
        <Stat label="بانتظار تأكيد المشتري" value={formatNumber(dealsAwaitingBuyer.length)} />
        <Stat label="كل الصفقات" value={formatNumber(deals.length)} />
      </StatGroup>

      <Tabs defaultValue="opportunities">
        <TabsList>
          <TabsTrigger value="opportunities">العروض <span className="num ms-1 text-muted-foreground">{formatNumber(opportunities.length)}</span></TabsTrigger>
          <TabsTrigger value="inventory">المخزون <span className="num ms-1 text-muted-foreground">{formatNumber(activeListings.length)}</span></TabsTrigger>
          <TabsTrigger value="deals">الصفقات <span className="num ms-1 text-muted-foreground">{formatNumber(deals.length)}</span></TabsTrigger>
        </TabsList>

        <TabsContent value="opportunities" className="mt-4">
          <div className="surface overflow-hidden">
            {opportunities.length === 0 ? (
              <EmptyState icon={Clock} title="لا توجد عروض جديدة" description="تظهر هنا العروض المدفوعة على السيارات الموجودة في مخزونك." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>السيارة</TableHead>
                    <TableHead className="text-end">العرض</TableHead>
                    <TableHead className="text-end">الصافي لك</TableHead>
                    <TableHead>الوقت</TableHead>
                    <TableHead className="w-32"><span className="sr-only">إجراء</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {opportunities.map((bid) => {
                    const config = bid.configuration
                    return (
                      <TableRow key={bid.id}>
                        <TableCell>
                          <span className="font-medium text-foreground">{vehicleTitle(config)}</span>
                          <span className="block text-xs text-muted-foreground">{[localizeVehicleText(config.trim), localizeVehicleText(config.color)].filter(Boolean).join(' · ')}</span>
                        </TableCell>
                        <TableCell className="text-end font-bold text-foreground">{formatCurrencySar(bid.bid_price)}</TableCell>
                        <TableCell className="text-end text-muted-foreground">{formatCurrencySar(bid.net_offer_amount || bid.bid_price - 500)}</TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{formatGregorianDate(bid.created_at)} {formatGregorianTime(bid.created_at)}</TableCell>
                        <TableCell className="text-end">
                          <Button size="sm" onClick={() => handleAcceptBid(bid.id, bid.bid_price)} disabled={isProcessing}>
                            {isProcessing ? 'جاري القبول...' : 'قبول العرض'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="mt-4 space-y-3">
          <div className="inline-flex rounded-md border border-border bg-card p-0.5 text-sm" role="group" aria-label="عرض المخزون">
            {([['current', `الحالي (${formatNumber(activeListings.length)})`], ['archived', `المؤرشف (${formatNumber(archivedListings.length)})`]] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setInventoryView(key)}
                aria-pressed={inventoryView === key}
                className={cn('h-8 rounded-sm px-3', inventoryView === key ? 'bg-muted font-bold text-foreground' : 'text-muted-foreground hover:text-foreground')}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="surface overflow-hidden">
            {visibleInventory.length === 0 ? (
              <EmptyState
                icon={CarIcon}
                title={inventoryView === 'archived' ? 'لا توجد إعلانات مؤرشفة' : 'لا يوجد مخزون حالياً'}
                action={inventoryView === 'current' ? <Button asChild size="sm"><Link href="/dealer/cars/add">إضافة سيارة</Link></Button> : undefined}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>السيارة</TableHead>
                    <TableHead>الألوان والكميات</TableHead>
                    <TableHead className="text-end">المخزون</TableHead>
                    <TableHead className="text-end">سعر الوكالة</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="w-32"><span className="sr-only">إجراءات</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleInventory.map((item) => {
                    const stock = stockOf(item)
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <span className="font-medium text-foreground">{vehicleTitle(item.specification || {})}</span>
                          <span className="block text-xs text-muted-foreground">{localizeVehicleText(item.specification?.trim)}</span>
                        </TableCell>
                        <TableCell className="max-w-[260px]">
                          <span className="block truncate text-muted-foreground">
                            {item.inventory.filter((row) => row.quantity > 0).map((row) => `${localizeVehicleText(row.configuration?.color)} ${row.quantity}`).join(' · ') || '—'}
                          </span>
                        </TableCell>
                        <TableCell className="text-end font-medium text-foreground">{formatNumber(stock)}</TableCell>
                        <TableCell className="text-end font-medium text-foreground">{formatCurrencySar(item.agency_price)}</TableCell>
                        <TableCell>
                          {item.status === 'hidden' ? (
                            <Badge className="border-transparent bg-status-neutral text-status-neutral-foreground hover:bg-status-neutral">مؤرشف</Badge>
                          ) : stock === 0 ? (
                            <Badge className="border-transparent bg-status-danger text-status-danger-foreground hover:bg-status-danger">نفدت الكمية</Badge>
                          ) : (
                            <Badge className="border-transparent bg-status-success text-status-success-foreground hover:bg-status-success">نشط</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button asChild variant="ghost" size="icon" aria-label="عرض في السوق"><Link href={`/cars/${item.listing_spec_id}`}><Eye className="h-4 w-4" /></Link></Button>
                            <Button asChild variant="ghost" size="icon" aria-label="تعديل"><Link href={`/dealer/cars/${item.id}/edit`}><Pencil className="h-4 w-4" /></Link></Button>
                            {inventoryView === 'archived' ? (
                              <Button type="button" variant="ghost" size="icon" aria-label="استعادة" onClick={() => handleRestore(item)} disabled={isProcessing}><RotateCcw className="h-4 w-4" /></Button>
                            ) : (
                              <Button type="button" variant="ghost" size="icon" aria-label="أرشفة" onClick={() => setArchiveCandidate(item)} disabled={isProcessing}><Archive className="h-4 w-4" /></Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="deals" className="mt-4">
          <div className="surface overflow-hidden">
            {deals.length === 0 ? (
              <EmptyState icon={TrendingUp} title="لا توجد صفقات بعد" description="عندما تقبل عرضاً يظهر هنا حتى يؤكده المشتري." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>السيارة</TableHead>
                    <TableHead className="text-end">السعر</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>المشتري</TableHead>
                    <TableHead>التاريخ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deals.map((deal) => {
                    const config = (deal as any).configuration
                    const buyer = (deal as any).buyer
                    const isApproved = deal.status === 'completed'
                    return (
                      <TableRow key={deal.id}>
                        <TableCell>
                          <span className="font-medium text-foreground">{vehicleTitle(config || {})}</span>
                          <span className="block text-xs text-muted-foreground">{[localizeVehicleText(config?.trim), localizeVehicleText(config?.color)].filter(Boolean).join(' · ')}</span>
                        </TableCell>
                        <TableCell className="text-end font-bold text-foreground">{formatCurrencySar(deal.final_price)}</TableCell>
                        <TableCell><StatusBadge kind="deal" status={deal.status} /></TableCell>
                        <TableCell>
                          {isApproved ? (
                            <>
                              <span className="font-medium text-foreground">{buyer?.full_name || 'غير متوفر'}</span>
                              <span className="block text-xs text-muted-foreground" dir="ltr">{buyer?.phone || buyer?.email || ''}</span>
                            </>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground"><Lock className="h-3.5 w-3.5" />تظهر بعد تأكيد المشتري</span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{formatGregorianDate(deal.created_at)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(archiveCandidate)} onOpenChange={(open) => !open && setArchiveCandidate(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>أرشفة الإعلان؟</DialogTitle>
            <DialogDescription>يُخفى الإعلان من السوق دون حذف تاريخه أو كميته، ويمكنك استعادته من «المؤرشف».</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="destructive" onClick={handleArchive} disabled={isProcessing}>{isProcessing ? 'جاري الأرشفة...' : 'أرشفة'}</Button>
            <Button type="button" variant="outline" onClick={() => setArchiveCandidate(null)}>إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function toArabicDashboardError(error: unknown) {
  return toArabicError(error, 'تعذر إتمام الإجراء. حاول مرة أخرى أو تواصل مع الدعم.')
}
