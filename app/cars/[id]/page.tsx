'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Calendar, Gauge, MapPin, Palette, Settings } from 'lucide-react'
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
import { AvailableVehicleListing, Bid, User } from '@/lib/supabase'

function CarDetailContent() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawId = params?.id
  const listingId = Array.isArray(rawId) ? rawId[0] : rawId
  const [listing, setListing] = useState<AvailableVehicleListing | null>(null)
  const [bids, setBids] = useState<Bid[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [showPayResult, setShowPayResult] = useState(false)
  const [payStatus, setPayStatus] = useState<'success' | 'failed' | 'error' | null>(null)

  // silent: refresh data without swapping the page for the loader, which would
  // unmount BidInput and close its payment dialog.
  const loadData = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!listingId) { setIsLoading(false); return }
    if (!silent) setIsLoading(true)
    const listingResult = await getAvailableListingById(listingId)
    if (listingResult.canonicalId && listingResult.canonicalId !== listingId) {
      router.replace(`/cars/${listingResult.canonicalId}${window.location.search}`)
      return
    }
    const nextListing = listingResult.data
    setListing(nextListing)
    if (!nextListing) { setIsLoading(false); return }

    const configurationIds = nextListing.colors.map((color) => color.configuration_id)
    // RLS scopes bids to the viewer, so this is the buyer's own bids only.
    const [user, bidResult] = await Promise.all([
      getCurrentUser(),
      getListingBids(configurationIds),
    ])
    setCurrentUser(user)
    setBids((bidResult.data || []) as Bid[])
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
  const payBidId = searchParams?.get('pay_bid')
  const resumeBid = useMemo(() => {
    const bid = bids.find((b) => b.id === payBidId && b.buyer_id === currentUser?.id)
    return bid && bid.status === 'pending' && !bid.commitment_fee_paid && bid.car_configuration_id
      ? { id: bid.id, configId: bid.car_configuration_id, price: bid.bid_price }
      : undefined
  }, [bids, payBidId, currentUser?.id])

  if (isLoading) return <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">جاري تحميل السيارة...</div>
  if (!listing) return <div className="flex min-h-[60vh] items-center justify-center bg-gray-50 px-4"><div className="text-center"><h1 className="mb-4 text-2xl font-bold">السيارة غير موجودة أو غير متاحة</h1><Button asChild><Link href="/cars">العودة إلى السوق</Link></Button></div></div>

  const title = vehicleTitle(listing)
  const images = listing.images || []

  return (
    <div className="min-h-screen bg-gray-50 pb-28 text-right lg:pb-0" dir="rtl">
      <div className="container mx-auto px-4 py-8">
        <Link href="/cars" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowRight className="h-4 w-4" />العودة للسوق</Link>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <main className="space-y-6 lg:col-span-2">
            <div><div className="mb-2 flex flex-wrap items-center gap-3"><h1 className="text-3xl font-bold text-gray-900">{title}</h1><Badge variant="outline">{localizeVehicleText(listing.trim)}</Badge><Badge variant="secondary">{localizeVehicleText(listing.origin_locale)}</Badge></div><Badge className="border-0 bg-status-success text-status-success-foreground hover:bg-status-success">متاح {listing.available_quantity} سيارة</Badge></div>
            <Card className="overflow-hidden border-0 shadow-lg">
              <div className="relative h-60 w-full bg-gray-100 sm:h-[400px]">{images[selectedImageIndex] ? <Image src={images[selectedImageIndex]} alt={title} fill sizes="(min-width: 1024px) 66vw, 100vw" className="object-cover" /> : <CarMediaPlaceholder config={listing} variant="detail" />}</div>
              {images.length > 1 && <div className="flex gap-2 overflow-x-auto p-4">{images.map((image, index) => <button key={image} type="button" onClick={() => setSelectedImageIndex(index)} className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-md border-2 ${selectedImageIndex === index ? 'border-primary' : 'border-transparent opacity-70'}`} aria-label={`عرض الصورة ${index + 1}`}><Image src={image} alt="" fill sizes="80px" className="object-cover" /></button>)}</div>}
            </Card>
            <Card><CardHeader><CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5 text-primary" />الألوان المتاحة</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2">{listing.colors.map((color) => <div key={color.configuration_id} className="flex items-center justify-between rounded-xl border bg-muted/20 px-4 py-3"><span className="font-semibold">{localizeVehicleText(color.color)}</span><Badge variant="outline">{color.available_quantity} متاح</Badge></div>)}</CardContent></Card>
            <Card><CardHeader><CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5 text-gray-500" />المواصفات</CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 gap-4 md:grid-cols-4"><Spec icon={Calendar} label="سنة الصنع" value={listing.year} /><Spec icon={Gauge} label="الطراز / اسم الموديل" value={localizeVehicleText(listing.model)} /><Spec icon={Settings} label="مستوى التجهيز" value={localizeVehicleText(listing.variant)} /><Spec icon={MapPin} label="المنشأ" value={localizeVehicleText(listing.origin_locale)} /></div>{listing.description && <><Separator className="my-4" /><p className="leading-7 text-gray-600">{listing.description}</p></>}</CardContent></Card>
          </main>
          <aside id="reserve" className="scroll-mt-24 space-y-6 lg:sticky lg:top-24 lg:self-start">
            <BidInput vehicleName={title} configId={userBid?.car_configuration_id || ''} listingId={listing.id} colors={listing.colors} msrp={listing.display_price} currentUserBid={userBid?.bid_price} userId={currentUser?.id} locked={Boolean(userBid?.commitment_fee_paid)} onBidPlaced={() => loadData({ silent: true })} resumeBid={resumeBid} priceSlots={[]} />
          </aside>
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-6px_20px_rgba(16,41,43,0.08)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <div className="shrink-0">
            <p className="text-xs text-muted-foreground">{userBid?.commitment_fee_paid ? 'عرضك الحالي' : 'رسوم الالتزام'}</p>
            <p className="text-lg font-extrabold text-foreground">{formatCurrencySar(userBid?.commitment_fee_paid ? userBid.bid_price : 500)}</p>
          </div>
          {userBid?.commitment_fee_paid ? (
            <Button asChild variant="outline" className="h-12 flex-1 rounded-xl text-base font-bold"><Link href="/dashboard">تتبّع طلبك</Link></Button>
          ) : (
            <Button className="h-12 flex-1 rounded-xl text-base font-bold" onClick={() => document.getElementById('reserve')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
              {currentUser ? (userBid ? 'أكمل الحجز والدفع' : 'قدّم عرضك واحجز') : 'سجّل الدخول للحجز'}
            </Button>
          )}
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
