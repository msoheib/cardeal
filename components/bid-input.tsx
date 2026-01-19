'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { DollarSign, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'
import { placeBid } from '@/lib/cars'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import MoyasarCheckout from '@/components/moyasar-checkout'
import { useToast } from '@/hooks/use-toast'
import { Input } from '@/components/ui/input'

interface BidInputProps {
  configId: string
  msrp: number
  currentUserBid?: number
  onBidPlaced?: (bidPrice: number) => void
  userId?: string
  locked?: boolean
  priceSlots?: number[] // Aggregated slots from dealers
}

export function BidInput({
  configId,
  msrp,
  currentUserBid,
  onBidPlaced,
  userId,
  locked,
  priceSlots = []
}: BidInputProps) {
  const pathname = usePathname()
  
  // Format price helper (defined early for guest view)
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price)
  }

  // For guests, show a login prompt instead of the bid form
  if (!userId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            قدّم عرضك
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">سعر الوكالة (MSRP)</span>
              <span className="text-lg font-bold text-gray-900">{formatPrice(msrp)}</span>
            </div>
          </div>
          <Alert className="bg-amber-50 border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              يجب تسجيل الدخول لتقديم عرض
            </AlertDescription>
          </Alert>
          <div className="flex gap-2">
            <Button asChild className="flex-1">
              <Link href={`/auth/login?redirect=${encodeURIComponent(pathname || '')}`}>تسجيل الدخول</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href={`/auth/register?redirect=${encodeURIComponent(pathname || '')}`}>إنشاء حساب</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Authenticated user: show full bid form
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState<string>(msrp.toString())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const { toast } = useToast()
  const [showPayModal, setShowPayModal] = useState(false)
  const [createdBidId, setCreatedBidId] = useState<string>('')
  
  // Fee Calculation
  const RESERVATION_FEE_SAR = 500
  const VAT_RATE = 0
  const TOTAL_FEE_SAR = RESERVATION_FEE_SAR // 500
  const TOTAL_FEE_HALALAS = TOTAL_FEE_SAR * 100 // 50000

  const hasSlots = priceSlots && priceSlots.length > 0

  // Bid Value Logic
  const bidValue = selectedSlot ?? (customAmount ? parseInt(customAmount) : 0)
  
  // Validation
  // Offer must be > Reservation Fee (500)
  const isValidBid = bidValue > RESERVATION_FEE_SAR

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!userId) {
      toast({
        title: "يجب تسجيل الدخول",
        description: "يرجى تسجيل الدخول أولاً لوضع مزايدة",
        variant: "destructive"
      })
      return
    }

    if (!isValidBid) {
      setError(`يجب أن يكون العرض أعلى من رسوم الالتزام (${RESERVATION_FEE_SAR} ريال)`)
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      // Logic: Place Bid -> Get ID -> Pay
      const { data, error: bidError } = await placeBid({
        car_configuration_id: configId,
        amount: bidValue,
        buyer_id: userId
      })

      if (bidError) {
        setError(typeof bidError === 'string' ? bidError : (bidError as any).message || 'حدث خطأ')
        toast({
            title: "خطأ",
            description: "لم نتمكن من تسجيل العرض، حاول مرة أخرى",
            variant: "destructive"
        })
      } else {
        setCreatedBidId(data.id)
        setShowPayModal(true)
      }
    } catch (err) {
      setError('حدث خطأ غير متوقع')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary" />
          قدّم عرضك
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Context */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
           <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">سعر الوكالة (MSRP)</span>
            <span className="text-lg font-bold text-gray-900">
              {formatPrice(msrp)}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs text-blue-600">
             <span>رسوم الالتزام المطلوبة</span>
             <span className="font-bold">{formatPrice(TOTAL_FEE_SAR)} (شاملة الضريبة)</span>
          </div>
        </div>

        {currentUserBid && (
           <Alert className="bg-green-50 border-green-200">
             <CheckCircle className="w-4 h-4 text-green-600" />
             <AlertDescription className="text-green-800">
               عرضك الحالي: <strong>{formatPrice(currentUserBid)}</strong>
               {locked && <span> (مدفوع)</span>}
             </AlertDescription>
           </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Custom Amount Input */}
            <div className="space-y-2">
                <Label>قيمة العرض (ريال)</Label>
                <div className="relative">
                    <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input 
                        type="number" 
                        placeholder="أدخل المبلغ..." 
                        className="pr-10"
                        value={customAmount}
                        onChange={(e) => {
                            setCustomAmount(e.target.value)
                            setSelectedSlot(null)
                        }}
                        disabled={locked || isSubmitting}
                    />
                </div>
                <p className="text-xs text-gray-500">
                    سيتم خصم {RESERVATION_FEE_SAR} ريال كرسوم التزام من هذا العرض عند التقديم للتاجر.
                </p>
            </div>
            
            {hasSlots && (
                <div className="space-y-2">
                    <Label className="text-xs text-gray-400">أو اختر من خيارات التاجر السريعة:</Label>
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
                                className={`px-3 py-1 text-sm rounded-full border ${
                                    selectedSlot === slot 
                                    ? 'bg-primary text-white border-primary' 
                                    : 'bg-white text-gray-700 border-gray-200 hover:border-primary'
                                }`}
                            >
                                {formatPrice(slot)}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90"
                disabled={locked || !isValidBid || isSubmitting}
            >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    جاري المعالجة...
                  </>
                ) : currentUserBid ? (
                  locked ? 'تم تأكيد الحجز' : 'تحديث الحجز'
                ) : (
                  'احجز الآن (ادفع الرسوم)'
                )}
            </Button>
        </form>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800 space-y-1">
             <p className="font-semibold">كيف يعمل النظام؟</p>
             <p>1. تقدم عرضك وتدفع رسوم الالتزام ({formatPrice(TOTAL_FEE_SAR)}).</p>
             <p>2. يتم بث عرضك لجميع الوكلاء الذين يملكون هذه السيارة.</p>
             <p>3. أول وكيل يقبل العرض يفوز بالصفقة.</p>
             <p>4. يتم البيع والشراء بالأولوية.</p>
        </div>

      </CardContent>

      <Dialog open={showPayModal} onOpenChange={setShowPayModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>تأكيد العرض ودفع الرسوم</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <DialogDescription>
              لتأكيد جديتك، يرجى دفع رسوم الالتزام. المبلغ غير مسترد في حال قبول التاجر لعرضك وانسحابك، ولكنه يخصم من قيمة السيارة النهائية.
            </DialogDescription>
            
            <div className="bg-gray-100 p-4 rounded-md flex justify-between items-center">
                <span>المبلغ المطلوب:</span>
                <span className="font-bold text-lg">{formatPrice(TOTAL_FEE_SAR)}</span>
            </div>

            {createdBidId && (
              <MoyasarCheckout
                amountHalalas={TOTAL_FEE_HALALAS}
                description={`Commitment Fee for Offer #${createdBidId}`}
                bidId={createdBidId}
                carId={configId} // Passing Config ID to ensure redirect works
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}


