'use client'

import { Suspense, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

function PayContent() {
  const params = useSearchParams()
  const router = useRouter()
  const bidId = params?.get('bidId') || ''
  const carId = params?.get('carId') || ''

  const publishableKey = process.env.NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY || ''
  const amountHalalas = 50000
  const description = 'رسوم الالتزام 500 ريال'

  const callbackUrl = useMemo(() => {
    const base = typeof window !== 'undefined' ? window.location.origin : ''
    const callbackParams = new URLSearchParams({ bid_id: bidId, car_id: carId })
    return `${base}/api/moyasar/verify?${callbackParams.toString()}`
  }, [bidId, carId])

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
          <div className="rounded-md bg-gray-50 p-4 text-sm text-gray-700">
            رسوم الالتزام الثابتة: 500 ريال
          </div>

          <form action="https://api.moyasar.com/v1/payments.html" method="POST">
            <input type="hidden" name="callback_url" value={callbackUrl} />
            <input type="hidden" name="publishable_api_key" value={publishableKey} />
            <input type="hidden" name="amount" value={amountHalalas} />
            <input type="hidden" name="currency" value="SAR" />
            <input type="hidden" name="description" value={description} />
            <input type="hidden" name="metadata[bid_id]" value={bidId} />
            <input type="hidden" name="metadata[car_configuration_id]" value={carId} />
            <input type="hidden" name="metadata[fee]" value="commitment_fee" />

            <Button type="submit" className="w-full">
              الدفع عبر ميسّر
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function PayPage() {
  return (
    <Suspense fallback={null}>
      <PayContent />
    </Suspense>
  )
}
