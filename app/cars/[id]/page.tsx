'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Section } from '@/components/layout/page-header'
import { BidInput } from '@/components/bid-input'
import { CarMediaPlaceholder } from '@/components/car-media-placeholder'
import { localizeVehicleText, vehicleTitle } from '@/lib/arabic-display'
import { getAvailableListingById, getListingBids } from '@/lib/cars'
import { getCurrentUser } from '@/lib/auth'
import { formatCurrencySar } from '@/lib/format'
import { AvailableVehicleListing, Bid, User } from '@/lib/supabase'
import { cn } from '@/lib/utils'

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

  if (isLoading) {
    return (
      <div className="page flex min-h-[60vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        جاري تحميل السيارة...
      </div>
    )
  }
  if (!listing) {
    return (
      <div className="page">
        <div className="surface">
          <EmptyState
            title="السيارة غير موجودة أو غير متاحة"
            description="ربما بيعت أو أخفاها التاجر."
            action={<Button asChild size="sm"><Link href="/cars">العودة إلى السوق</Link></Button>}
          />
        </div>
      </div>
    )
  }

  const title = vehicleTitle(listing)
  const images = listing.images || []
  const colorNames = listing.colors.map((color) => localizeVehicleText(color.color)).filter(Boolean)
  const specs: [string, string | number][] = [
    ['الماركة', localizeVehicleText(listing.make)],
    ['الطراز', localizeVehicleText(listing.model)],
    ['سنة الصنع', listing.year],
    ['الفئة', localizeVehicleText(listing.trim)],
    ['مستوى التجهيز', localizeVehicleText(listing.variant)],
    ['المنشأ', localizeVehicleText(listing.origin_locale)],
    ['الألوان المتاحة', colorNames.join('، ')],
    ['الكمية المتاحة', `${listing.available_quantity} سيارة`],
  ]

  return (
    <div className="pb-28 lg:pb-0">
      <div className="page space-y-6">
        <nav aria-label="مسار التنقل" className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link href="/cars" className="hover:text-foreground">السوق</Link>
          <ChevronLeft className="h-4 w-4" aria-hidden />
          <span className="truncate text-foreground">{title}</span>
        </nav>

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <main className="min-w-0 space-y-6">
            <header className="space-y-2">
              <h1 className="page-title">{title}</h1>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-transparent bg-status-success text-status-success-foreground hover:bg-status-success">
                  متاح {listing.available_quantity}
                </Badge>
                {listing.trim && <Badge variant="outline">{localizeVehicleText(listing.trim)}</Badge>}
                {listing.origin_locale && <Badge variant="outline">{localizeVehicleText(listing.origin_locale)}</Badge>}
              </div>
            </header>

            <div className="space-y-2">
              <div className="relative aspect-[16/9] overflow-hidden rounded-lg border border-border bg-muted">
                {images[selectedImageIndex] ? (
                  <Image src={images[selectedImageIndex]} alt={title} fill priority sizes="(min-width: 1024px) 760px, 100vw" className="object-cover" />
                ) : (
                  <CarMediaPlaceholder config={listing} variant="detail" />
                )}
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {images.map((image, index) => (
                    <button
                      key={image}
                      type="button"
                      onClick={() => setSelectedImageIndex(index)}
                      aria-label={`عرض الصورة ${index + 1}`}
                      aria-pressed={selectedImageIndex === index}
                      className={cn(
                        'relative h-14 w-20 shrink-0 overflow-hidden rounded-md border-2',
                        selectedImageIndex === index ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100'
                      )}
                    >
                      <Image src={image} alt="" fill sizes="80px" className="object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Section title="المواصفات">
              <dl className="surface grid sm:grid-cols-2">
                {specs.map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4 border-b border-border px-4 py-3 text-sm sm:[&:nth-last-child(-n+2)]:border-b-0 [&:last-child]:border-b-0 sm:odd:border-e">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="text-end font-medium text-foreground">{value || '—'}</dd>
                  </div>
                ))}
              </dl>
            </Section>

            {listing.description && (
              <Section title="وصف التاجر">
                <p className="max-w-prose whitespace-pre-line text-sm leading-7 text-foreground">{listing.description}</p>
              </Section>
            )}
          </main>

          <aside id="reserve" className="scroll-mt-20 lg:sticky lg:top-20">
            <BidInput
              vehicleName={title}
              configId={userBid?.car_configuration_id || ''}
              listingId={listing.id}
              colors={listing.colors}
              msrp={listing.display_price}
              currentUserBid={userBid?.bid_price}
              userId={currentUser?.id}
              locked={Boolean(userBid?.commitment_fee_paid)}
              onBidPlaced={() => loadData({ silent: true })}
              resumeBid={resumeBid}
              priceSlots={[]}
            />
          </aside>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <div className="shrink-0">
            <p className="text-xs text-muted-foreground">{userBid?.commitment_fee_paid ? 'عرضك الحالي' : 'رسوم الالتزام'}</p>
            <p className="num text-base font-bold text-foreground">{formatCurrencySar(userBid?.commitment_fee_paid ? userBid.bid_price : 500)}</p>
          </div>
          {userBid?.commitment_fee_paid ? (
            <Button asChild variant="outline" size="lg" className="flex-1"><Link href="/dashboard">تتبّع طلبك</Link></Button>
          ) : (
            <Button size="lg" className="flex-1" onClick={() => document.getElementById('reserve')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
              {currentUser ? (userBid ? 'أكمل الحجز والدفع' : 'قدّم عرضك واحجز') : 'سجّل الدخول للحجز'}
            </Button>
          )}
        </div>
      </div>

      <Dialog open={showPayResult} onOpenChange={(open) => { if (!open) closePayResult() }}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{payStatus === 'success' ? 'تم الدفع بنجاح' : payStatus === 'failed' ? 'لم يكتمل الدفع' : 'تعذر التحقق من الدفع'}</DialogTitle>
            <DialogDescription>
              {payStatus === 'success'
                ? 'تم تأكيد عرضك وإرساله إلى التجار الموثّقين. تابع حالته من لوحة التحكم.'
                : payStatus === 'failed'
                  ? 'لم يتم خصم الرسوم. يمكنك المحاولة مرة أخرى من زر الحجز.'
                  : 'إذا خُصم المبلغ فسيظهر عرضك خلال دقائق. تواصل مع الدعم إن لم يظهر.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            {payStatus === 'success' && <Button asChild><Link href="/dashboard">متابعة طلبي</Link></Button>}
            <Button variant={payStatus === 'success' ? 'outline' : 'default'} onClick={closePayResult}>حسناً</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function CarDetailPage() {
  return <Suspense fallback={null}><CarDetailContent /></Suspense>
}
