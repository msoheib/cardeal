'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, Check, CheckCircle, Clock, Loader2, Lock, Palette, Tag } from 'lucide-react'
import { placeBid } from '@/lib/cars'
import { toArabicError } from '@/lib/arabic-errors'
import { formatCurrencySar } from '@/lib/format'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import MoyasarCheckout from '@/components/moyasar-checkout'
import { useToast } from '@/hooks/use-toast'
import { Input } from '@/components/ui/input'
import { AvailableColorStock } from '@/lib/supabase'
import { localizeVehicleText } from '@/lib/arabic-display'
import { cn } from '@/lib/utils'

interface BidInputProps {
  configId: string
  listingId: string
  vehicleName?: string
  colors: AvailableColorStock[]
  msrp: number
  currentUserBid?: number
  onBidPlaced?: (bidPrice: number) => void
  userId?: string
  locked?: boolean
  priceSlots?: number[] // Aggregated slots from dealers
  resumeBid?: { id: string; configId: string; price?: number } // Unpaid bid to reopen checkout for
}

const RESERVATION_FEE_SAR = 500
const RESERVATION_FEE_HALALAS = RESERVATION_FEE_SAR * 100

const HOW_IT_WORKS = [
  'اختر اللون وحدد قيمة عرضك.',
  `ادفع ${formatCurrencySar(RESERVATION_FEE_SAR)} رسوم التزام تُخصم من سعر السيارة.`,
  'يُرسل عرضك للتجار الموثّقين، وأول تاجر يقبل يتواصل معك.',
]

const CHECKOUT_STEPS = ['العرض', 'الدفع', 'التاجر']

function SecurePaymentNote({ className }: { className?: string }) {
  return (
    <p className={cn('flex items-center justify-center gap-2 text-xs text-muted-foreground', className)}>
      <Lock className="h-3.5 w-3.5 shrink-0" />
      دفع آمن عبر ميسّر · مدى · Visa · Mastercard
    </p>
  )
}

export function BidInput({
  configId,
  listingId,
  vehicleName,
  colors,
  msrp,
  currentUserBid,
  onBidPlaced,
  userId,
  locked,
  priceSlots = [],
  resumeBid
}: BidInputProps) {
  const pathname = usePathname()
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState<string>(msrp.toString())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const { toast } = useToast()
  const [showPayModal, setShowPayModal] = useState(false)
  const [createdBidId, setCreatedBidId] = useState<string>('')
  const [selectedConfigId, setSelectedConfigId] = useState(colors.length === 1 ? colors[0].configuration_id : configId)
  const resumedBidRef = useRef<string | null>(null)

  useEffect(() => {
    if (!resumeBid || resumedBidRef.current === resumeBid.id) return
    resumedBidRef.current = resumeBid.id
    setSelectedConfigId(resumeBid.configId)
    if (resumeBid.price) setCustomAmount(resumeBid.price.toString())
    setCreatedBidId(resumeBid.id)
    setShowPayModal(true)
  }, [resumeBid])

  // For guests, show a login prompt instead of the bid form
  if (!userId) {
    return (
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-brand" />
            قدّم عرضك
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-baseline justify-between rounded-xl bg-muted/60 p-4">
            <span className="text-sm text-muted-foreground">سعر الوكالة</span>
            <span className="text-2xl font-extrabold text-foreground">{formatCurrencySar(msrp)}</span>
          </div>
          <Alert className="border-transparent bg-status-warning text-status-warning-foreground">
            <AlertTriangle className="h-4 w-4 !text-status-warning-foreground" />
            <AlertDescription>سجّل الدخول لتقديم عرضك وحجز السيارة.</AlertDescription>
          </Alert>
          <div className="flex gap-2">
            <Button asChild className="h-11 flex-1 rounded-xl">
              <Link href={`/auth/login?redirect=${encodeURIComponent(pathname || '')}`}>تسجيل الدخول</Link>
            </Button>
            <Button asChild variant="outline" className="h-11 flex-1 rounded-xl">
              <Link href={`/auth/register?redirect=${encodeURIComponent(pathname || '')}`}>إنشاء حساب</Link>
            </Button>
          </div>
          <HowItWorks />
        </CardContent>
      </Card>
    )
  }

  const hasSlots = priceSlots && priceSlots.length > 0
  const hasUnpaidBid = Boolean(currentUserBid) && !locked
  const selectedColor = colors.find((color) => color.configuration_id === selectedConfigId)?.color

  // Bid Value Logic
  const bidValue = selectedSlot ?? (customAmount ? parseInt(customAmount) : 0)

  // Offer must be > Reservation Fee (500)
  const isValidBid = bidValue > RESERVATION_FEE_SAR && Boolean(selectedConfigId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isValidBid) {
      setError(!selectedConfigId ? 'اختر اللون المطلوب قبل تقديم العرض' : `يجب أن يكون العرض أعلى من رسوم الالتزام (${RESERVATION_FEE_SAR} ريال)`)
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      // Logic: Place Bid -> Get ID -> Pay
      const { data, error: bidError } = await placeBid({
        car_configuration_id: selectedConfigId,
        amount: bidValue,
        buyer_id: userId
      })

      if (bidError) {
        setError(toArabicError(bidError, 'لم نتمكن من تسجيل العرض، حاول مرة أخرى.'))
        toast({
          title: 'خطأ',
          description: 'لم نتمكن من تسجيل العرض، حاول مرة أخرى',
          variant: 'destructive'
        })
      } else {
        setCreatedBidId(data.id)
        setShowPayModal(true)
        onBidPlaced?.(bidValue)
      }
    } catch {
      setError('حدث خطأ غير متوقع')
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitLabel = locked
    ? 'تم تأكيد الحجز'
    : hasUnpaidBid
      ? 'تحديث العرض وإكمال الدفع'
      : `قدّم عرضك وادفع ${formatCurrencySar(RESERVATION_FEE_SAR)}`

  return (
    <Card className="rounded-2xl lg:shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-brand" />
          قدّم عرضك
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">سعر الوكالة</span>
          <span className="text-2xl font-extrabold text-foreground">{formatCurrencySar(msrp)}</span>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2"><Palette className="h-4 w-4 text-brand" />اختر اللون المطلوب *</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {colors.map((color) => (
              <button
                key={color.configuration_id}
                type="button"
                onClick={() => { setSelectedConfigId(color.configuration_id); setError('') }}
                disabled={locked || isSubmitting}
                className={cn(
                  'flex min-h-12 items-center justify-between rounded-xl border px-3 py-2 text-right transition-colors disabled:opacity-60',
                  selectedConfigId === color.configuration_id
                    ? 'border-2 border-primary bg-primary/5'
                    : 'border-border bg-background hover:border-primary/50'
                )}
                aria-pressed={selectedConfigId === color.configuration_id}
              >
                <span className="font-semibold text-foreground">{localizeVehicleText(color.color)}</span>
                <span className="text-xs text-muted-foreground">{color.available_quantity} متاح</span>
              </button>
            ))}
          </div>
        </div>

        {currentUserBid && (
          <Alert className={cn('border-transparent', locked ? 'bg-status-success text-status-success-foreground' : 'bg-status-warning text-status-warning-foreground')}>
            {locked
              ? <CheckCircle className="h-4 w-4 !text-status-success-foreground" />
              : <Clock className="h-4 w-4 !text-status-warning-foreground" />}
            <AlertDescription>
              عرضك الحالي: <strong>{formatCurrencySar(currentUserBid)}</strong>
              {locked ? ' · تم دفع الرسوم' : ' · بانتظار دفع رسوم الالتزام'}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="offer-amount">قيمة عرضك</Label>
            <div className="relative">
              <Input
                id="offer-amount"
                type="number"
                inputMode="numeric"
                placeholder="أدخل المبلغ"
                className="h-12 rounded-xl pl-14 text-lg font-bold"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value)
                  setSelectedSlot(null)
                }}
                disabled={locked || isSubmitting}
              />
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">ر.س</span>
            </div>
          </div>

          {hasSlots && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">أو اختر من خيارات التاجر السريعة:</Label>
              <div className="flex flex-wrap gap-2">
                {priceSlots.map(slot => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => {
                      setSelectedSlot(slot)
                      setCustomAmount(slot.toString())
                    }}
                    disabled={locked || isSubmitting}
                    className={cn(
                      'min-h-9 rounded-full border px-3 py-1 text-sm',
                      selectedSlot === slot
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background text-foreground hover:border-primary'
                    )}
                  >
                    {formatCurrencySar(slot)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between rounded-xl bg-muted/60 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground">رسوم الالتزام</p>
              <p className="text-xs text-muted-foreground">شاملة الضريبة، وتُخصم من السعر النهائي</p>
            </div>
            <span className="text-lg font-extrabold text-primary">{formatCurrencySar(RESERVATION_FEE_SAR)}</span>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="h-12 w-full rounded-xl text-base font-bold"
            disabled={locked || !isValidBid || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                جاري المعالجة...
              </>
            ) : submitLabel}
          </Button>
          <SecurePaymentNote />
        </form>

        <HowItWorks />
      </CardContent>

      <Dialog open={showPayModal} onOpenChange={setShowPayModal}>
        <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto" dir="rtl">
          <DialogHeader className="text-right sm:text-right">
            <DialogTitle>تأكيد العرض ودفع الرسوم</DialogTitle>
            <DialogDescription>
              ادفع رسوم الالتزام ليُرسل عرضك إلى التجار الموثّقين.
            </DialogDescription>
          </DialogHeader>

          <ol className="flex items-center gap-2" aria-label="خطوات الحجز">
            {CHECKOUT_STEPS.map((step, index) => (
              <li key={step} className="flex flex-1 items-center gap-2" aria-current={index === 1 ? 'step' : undefined}>
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                    index === 0 && 'bg-primary text-primary-foreground',
                    index === 1 && 'bg-ink text-white',
                    index === 2 && 'bg-muted text-muted-foreground'
                  )}
                >
                  {index === 0 ? <Check className="h-4 w-4" /> : index + 1}
                </span>
                <span className={cn('text-sm', index === 2 ? 'text-muted-foreground' : 'font-semibold text-foreground')}>{step}</span>
              </li>
            ))}
          </ol>

          <div className="space-y-2 rounded-xl border border-border p-4 text-sm">
            {vehicleName && (
              <p className="font-bold text-foreground">
                {vehicleName}{selectedColor ? ` · ${localizeVehicleText(selectedColor)}` : ''}
              </p>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">سعر الوكالة</span>
              <span className="text-foreground">{formatCurrencySar(msrp)}</span>
            </div>
            {bidValue > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">عرضك</span>
                <span className="font-bold text-foreground">{formatCurrencySar(bidValue)}</span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-border pt-2">
              <span className="font-semibold text-foreground">المطلوب الآن</span>
              <span className="text-xl font-extrabold text-primary">{formatCurrencySar(RESERVATION_FEE_SAR)}</span>
            </div>
          </div>

          {createdBidId && (
            <MoyasarCheckout
              amountHalalas={RESERVATION_FEE_HALALAS}
              description={`رسوم الالتزام للعرض رقم ${createdBidId}`}
              bidId={createdBidId}
              carId={selectedConfigId}
              listingId={listingId}
            />
          )}

          <div className="flex gap-3 rounded-xl bg-status-success p-3 text-xs leading-6 text-status-success-foreground">
            <Lock className="mt-1 h-4 w-4 shrink-0" />
            <p className="text-status-success-foreground">
              دفع آمن عبر ميسّر، ولا نحتفظ ببيانات بطاقتك. تُخصم الرسوم من سعر السيارة النهائي، ولا تُسترد إذا قبل التاجر عرضك ثم انسحبت.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function HowItWorks() {
  return (
    <div className="space-y-3 rounded-xl border border-border p-4">
      <p className="text-sm font-bold text-foreground">كيف يتم الشراء؟</p>
      <ol className="space-y-2">
        {HOW_IT_WORKS.map((step, index) => (
          <li key={step} className="flex items-start gap-3 text-sm">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-status-success text-xs font-bold text-status-success-foreground">
              {index + 1}
            </span>
            <span className="leading-6 text-muted-foreground">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
