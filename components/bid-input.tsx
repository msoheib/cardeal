'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { DollarSign, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'
import { placeBid } from '@/lib/cars'
import { useToast } from '@/hooks/use-toast'

interface BidInputProps {
  carId: string
  wakalaPrice: number
  minBidPrice?: number
  currentUserBid?: number
  onBidPlaced?: (bidPrice: number) => void
  userId?: string
}

export function BidInput({ 
  carId, 
  wakalaPrice, 
  minBidPrice, 
  currentUserBid, 
  onBidPlaced,
  userId 
}: BidInputProps) {
  const [bidAmount, setBidAmount] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const { toast } = useToast()

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price)
  }

  const bidValue = parseFloat(bidAmount) || 0
  const savings = wakalaPrice - bidValue
  const isValidBid = bidValue > 0 && bidValue < wakalaPrice && (!minBidPrice || bidValue >= minBidPrice)

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
      setError('يرجى إدخال مبلغ مزايدة صحيح')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const { data, error: bidError } = await placeBid(carId, bidValue, userId)
      
      if (bidError) {
        setError(bidError as string)
        toast({
          title: "خطأ في المزايدة",
          description: bidError as string,
          variant: "destructive"
        })
      } else {
        // Simulate commitment fee payment for demo
        const paymentReference = `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        
        // In a real app, this would integrate with a payment gateway
        // For demo purposes, we'll simulate successful payment
        const { processCommitmentFee } = await import('@/lib/deals')
        await processCommitmentFee(data.id, paymentReference)
        
        toast({
          title: "تم وضع المزايدة بنجاح",
          description: `تم وضع مزايدتك بقيمة ${formatPrice(bidValue)} ودفع رسوم الالتزام 500 ريال`,
          variant: "default"
        })
        setBidAmount('')
        onBidPlaced?.(bidValue)
      }
    } catch (err) {
      setError('حدث خطأ أثناء وضع المزايدة')
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء وضع المزايدة",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-600" />
          ضع مزايدتك
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current bid display */}
        {currentUserBid && (
          <Alert>
            <CheckCircle className="w-4 h-4" />
            <AlertDescription>
              مزايدتك الحالية: <strong>{formatPrice(currentUserBid)}</strong>
            </AlertDescription>
          </Alert>
        )}

        {/* Price context */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">سعر الوكالة</span>
            <span className="text-lg font-bold text-gray-900">
              {formatPrice(wakalaPrice)}
            </span>
          </div>
          
          {minBidPrice && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">الحد الأدنى للمزايدة</span>
              <span className="text-sm font-medium text-green-600">
                {formatPrice(minBidPrice)}
              </span>
            </div>
          )}
        </div>

        {/* Bid form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bid-amount">مبلغ المزايدة (ريال سعودي)</Label>
            <Input
              id="bid-amount"
              type="number"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              placeholder="أدخل مبلغ المزايدة"
              min={minBidPrice || 1}
              max={wakalaPrice - 1}
              step="500"
              className="text-lg"
              dir="ltr"
            />
          </div>

          {/* Bid feedback */}
          {bidValue > 0 && (
            <div className="space-y-2">
              {isValidBid ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex justify-between items-center text-green-700">
                    <span className="text-sm font-medium">الوفر المتوقع</span>
                    <span className="text-lg font-bold">{formatPrice(savings)}</span>
                  </div>
                  <div className="text-xs text-green-600 mt-1">
                    نسبة الوفر: {((savings / wakalaPrice) * 100).toFixed(1)}%
                  </div>
                </div>
              ) : (
                <Alert variant="destructive">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>
                    {bidValue >= wakalaPrice 
                      ? 'المزايدة يجب أن تكون أقل من سعر الوكالة'
                      : minBidPrice && bidValue < minBidPrice
                      ? `الحد الأدنى للمزايدة هو ${formatPrice(minBidPrice)}`
                      : 'يرجى إدخال مبلغ صحيح'}
                  </AlertDescription>
                </Alert>
              )}
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
            className="w-full bg-green-600 hover:bg-green-700"
            disabled={!isValidBid || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                جاري وضع المزايدة...
              </>
            ) : currentUserBid ? (
              'تحديث المزايدة'
            ) : (
              'وضع المزايدة'
            )}
          </Button>
        </form>

        {/* Commitment fee notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center mt-0.5">
              <span className="text-white text-xs font-bold">ℹ</span>
            </div>
            <div className="text-blue-700">
              <p className="text-sm font-medium mb-1">رسوم الالتزام - 500 ريال</p>
              <ul className="text-xs space-y-1">
                <li>• تُدفع عند قبول مزايدتك</li>
                <li>• تُخصم من المبلغ النهائي عند إتمام الصفقة</li>
                <li>• تُسترد في حالة عدم إتمام الصفقة</li>
                <li>• تضمن جدية المزايدين</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}