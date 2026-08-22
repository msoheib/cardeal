'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Calendar, Gauge, MapPin, Palette, Settings, TrendingUp, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { BidInput } from '@/components/bid-input'
import { CarMediaPlaceholder } from '@/components/car-media-placeholder'
import { localizeVehicleText, vehicleTitle } from '@/lib/arabic-display'
import { getAvailableListingById, getListingBids } from '@/lib/cars'
import { getCurrentUser } from '@/lib/auth'
import { formatCurrencySar } from '@/lib/format'
import { AvailableVehicleListing, Bid, Deal, User, supabase } from '@/lib/supabase'

type ConfirmedDeal = Pick<Deal, 'id' | 'final_price' | 'status' | 'created_at'> & { car_configuration_id?: string | null }

function CarDetailContent() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawId = params?.id
  const listingId = Array.isArray(rawId) ? rawId[0] : rawId
  const [listing, setListing] = useState<AvailableVehicleListing | null>(null)
  const [bids, setBids] = useState<Bid[]>([])
  const [confirmedDeals, setConfirmedDeals] = useState<ConfirmedDeal[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [showPayResult, setShowPayResult] = useState(false)
  const [payStatus, setPayStatus] = useState<'success' | 'failed' | 'error' | null>(null)

  const loadData = useCallback(async () => {
    if (!listingId) { setIsLoading(false); return }
    setIsLoading(true)
    const listingResult = await getAvailableListingById(listingId)
    if (listingResult.canonicalId && listingResult.canonicalId !== listingId) {
      router.replace(`/cars/${listingResult.canonicalId}${window.location.search}`)
      return
    }
    const nextListing = listingResult.data
    setListing(nextListing)
    if (!nextListing) { setIsLoading(false); return }

    const configurationIds = nextListing.colors.map((color) => color.configuration_id)
    const [user, bidResult, dealResult] = await Promise.all([
      getCurrentUser(),
      getListingBids(configurationIds),
      supabase.from('deals').select('id, final_price, status, created_at, car_configuration_id').in('car_configuration_id', configurationIds).order('final_price', { ascending: true }),
    ])
    setCurrentUser(user)
    setBids((bidResult.data || []) as Bid[])
    setConfirmedDeals((dealResult.data || []) as ConfirmedDeal[])
    setIsLoading(false)
  }, [listingId, router])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => {
    const status = searchParams?.get('pay') as 'success' | 'failed' | 'error' | null
    if (status) { setPayStatus(status); setShowPayResult(true) }
  }, [searchParams])

  const closePayResult = () => {
    setShowPayResult(false)
    setPayStatus(null)
    const url = new URL(window.location.href)
    url.searchParams.delete('pay')
    router.replace(`${url.pathname}${url.search}`)
  }
  const userBid = useMemo(() => bids.find((bid) => bid.buyer_id === currentUser?.id), [bids, currentUser?.id])

  if (isLoading) return <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">جاري تحميل السيارة...</div>
  if (!listing) return <div className="flex min-h-[60vh] items-center justify-center bg-gray-50 px-4"><div className="text-center"><h1 className="mb-4 text-2xl font-bold">السيارة غير موجودة أو غير متاحة</h1><Button asChild><Link href="/cars">العودة إلى السوق</Link></Button></div></div>

  const title = vehicleTitle(listing)
  const images = listing.images || []
  const colorByConfiguration = new Map(listing.colors.map((color) => [color.configuration_id, color.color]))

  return (
    <div className="min-h-screen bg-gray-50 text-right" dir="rtl">
      <div className="container mx-auto px-4 py-8">
        <Link href="/cars" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowRight className="h-4 w-4" />العودة للسوق</Link>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <main className="space-y-6 lg:col-span-2">
            <div><div className="mb-2 flex flex-wrap items-center gap-3"><h1 className="text-3xl font-bold text-gray-900">{title}</h1><Badge variant="outline">{localizeVehicleText(listing.trim)}</Badge><Badge variant="secondary">{localizeVehicleText(listing.origin_locale)}</Badge></div><Badge className="border-0 bg-green-100 text-green-800 hover:bg-green-100">متاح {listing.available_quantity} سيارة</Badge></div>
            <Card className="overflow-hidden border-0 shadow-lg">
              <div className="relative h-[400px] w-full bg-gray-100">{images[selectedImageIndex] ? <Image src={images[selectedImageIndex]} alt={title} fill sizes="(min-width: 1024px) 66vw, 100vw" className="object-cover" /> : <CarMediaPlaceholder config={listing} variant="detail" />}</div>
              {images.length > 1 && <div className="flex gap-2 overflow-x-auto p-4">{images.map((image, index) => <button key={image} type="button" onClick={() => setSelectedImageIndex(index)} className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-md border-2 ${selectedImageIndex === index ? 'border-primary' : 'border-transparent opacity-70'}`} aria-label={`عرض الصورة ${index + 1}`}><Image src={image} alt="" fill sizes="80px" className="object-cover" /></button>)}</div>}
            </Card>
            <Card><CardHeader><CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5 text-primary" />الألوان المتاحة</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2">{listing.colors.map((color) => <div key={color.configuration_id} className="flex items-center justify-between rounded-xl border bg-muted/20 px-4 py-3"><span className="font-semibold">{localizeVehicleText(color.color)}</span><Badge variant="outline">{color.available_quantity} متاح</Badge></div>)}</CardContent></Card>
            <Card><CardHeader><CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5 text-gray-500" />المواصفات</CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 gap-4 md:grid-cols-4"><Spec icon={Calendar} label="سنة الصنع" value={listing.year} /><Spec icon={Gauge} label="الطراز / اسم الموديل" value={localizeVehicleText(listing.model)} /><Spec icon={Settings} label="مستوى التجهيز" value={localizeVehicleText(listing.variant)} /><Spec icon={MapPin} label="المنشأ" value={localizeVehicleText(listing.origin_locale)} /></div>{listing.description && <><Separator className="my-4" /><p className="leading-7 text-gray-600">{listing.description}</p></>}</CardContent></Card>
          </main>
          <aside className="space-y-6">
            <BidInput configId={userBid?.car_configuration_id || ''} listingId={listing.id} colors={listing.colors} msrp={listing.display_price} currentUserBid={userBid?.bid_price} userId={currentUser?.id} locked={Boolean(userBid?.commitment_fee_paid)} onBidPlaced={() => loadData()} priceSlots={[]} />
            <Card><CardHeader><CardTitle className="flex items-center gap-2 text-sm text-gray-500"><Users className="h-4 w-4" />العروض المقدمة</CardTitle></CardHeader><CardContent className="space-y-2">{bids.length === 0 ? <p className="py-4 text-center text-sm text-gray-400">كن أول من يقدم عرضاً</p> : bids.slice(0, 10).map((bid, index) => <div key={bid.id} className="flex items-center justify-between rounded-md bg-gray-50 p-2 text-sm"><span>{index + 1}. {localizeVehicleText(colorByConfiguration.get(bid.car_configuration_id || ''))}</span><span className="font-semibold">{formatCurrencySar(bid.bid_price)}</span></div>)}</CardContent></Card>
            <Card><CardHeader><CardTitle className="flex items-center gap-2 text-sm text-gray-500"><TrendingUp className="h-4 w-4" />أفضل الصفقات المؤكدة</CardTitle></CardHeader><CardContent>{confirmedDeals.length === 0 ? <p className="py-4 text-center text-sm text-gray-400">لا توجد صفقات مؤكدة بعد</p> : confirmedDeals.slice(0, 5).map((deal) => <div key={deal.id} className="mb-2 flex justify-between rounded-md bg-green-50 p-2 text-sm"><span>صفقة مؤكدة</span><span className="font-bold text-green-700">{formatCurrencySar(deal.final_price)}</span></div>)}</CardContent></Card>
          </aside>
        </div>
      </div>
      <Dialog open={showPayResult} onOpenChange={(open) => { if (!open) closePayResult() }}><DialogContent className="max-w-md" dir="rtl"><DialogHeader><DialogTitle>{payStatus === 'success' ? 'تم الدفع بنجاح' : payStatus === 'failed' ? 'فشل الدفع' : 'حدث خطأ'}</DialogTitle><DialogDescription>{payStatus === 'success' ? 'تم تأكيد عرضك بنجاح.' : payStatus === 'failed' ? 'تعذر إتمام عملية الدفع. يرجى المحاولة مرة أخرى.' : 'حدث خطأ أثناء التحقق من عملية الدفع.'}</DialogDescription></DialogHeader><Button onClick={closePayResult}>حسناً</Button></DialogContent></Dialog>
    </div>
  )
}

function Spec({ icon: Icon, label, value }: { icon: typeof Calendar; label: string; value: string | number }) {
  return <div className="rounded-xl border bg-muted/20 p-3"><span className="flex items-center gap-1 text-xs text-gray-500"><Icon className="h-3.5 w-3.5" />{label}</span><p className="mt-1 font-semibold">{value || '-'}</p></div>
}

export default function CarDetailPage() {
  return <Suspense fallback={null}><CarDetailContent /></Suspense>
}
