'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'

export default function PayPage() {
  const params = useSearchParams()
  const router = useRouter()
  const bidId = params.get('bidId') || ''
  const carId = params.get('carId') || ''

  const [feeOption, setFeeOption] = useState<'full' | 'minimal'>('full')
  const publishableKey = process.env.NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY || ''

  const amountHalalas = useMemo(() => {
    // full = 500 + 15% VAT = 575 SAR => 57500 halalas
    // minimal = 35 SAR => 3500 halalas
    return feeOption === 'full' ? 57500 : 3500
  }, [feeOption])

  const description = useMemo(() => {
    return feeOption === 'full' ? 'Commitment Fee 500 SAR + 15% VAT' : 'Commitment Fee 35 SAR'
  }, [feeOption])

  const callbackUrl = useMemo(() => {
    // This API route will verify payment server-side and then redirect to result page
    const base = typeof window !== 'undefined' ? window.location.origin : ''
    const params = new URLSearchParams({ bid_id: bidId, car_id: carId, amount: String(amountHalalas), fee: feeOption })
    return `${base}/api/moyasar/verify?${params.toString()}`
  }, [bidId, carId, amountHalalas, feeOption])

  // If required params missing, bounce back
  if (!bidId || !carId) {
    if (typeof window !== 'undefined') router.replace('/')
    return null
  }

  return (
    <div className="container mx-auto max-w-xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>إتمام الدفع</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm text-gray-600">اختر قيمة رسوم الالتزام:</p>
            <RadioGroup value={feeOption} onValueChange={(v) => setFeeOption(v as any)}>
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <RadioGroupItem id="opt-full" value="full" />
                <Label htmlFor="opt-full">500 + 15% ضريبة القيمة المضافة = 575 ريال</Label>
              </div>
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <RadioGroupItem id="opt-min" value="minimal" />
                <Label htmlFor="opt-min">35 ريال</Label>
              </div>
            </RadioGroup>
          </div>

          <form action="https://api.moyasar.com/v1/payments.html" method="POST">
            <input type="hidden" name="callback_url" value={callbackUrl} />
            <input type="hidden" name="publishable_api_key" value={publishableKey} />
            <input type="hidden" name="amount" value={amountHalalas} />
            <input type="hidden" name="currency" value="SAR" />
            <input type="hidden" name="description" value={description} />
            {/* Optional metadata */}
            <input type="hidden" name="metadata[bid_id]" value={bidId} />
            <input type="hidden" name="metadata[car_id]" value={carId} />
            <input type="hidden" name="metadata[fee]" value={feeOption} />

            <Button type="submit" className="w-full">الدفع عبر Moyasar</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}


