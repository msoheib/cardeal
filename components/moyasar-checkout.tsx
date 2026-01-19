'use client'

import { useEffect, useRef, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, Loader2 } from 'lucide-react'

interface MoyasarCheckoutProps {
  amountHalalas: number
  description: string
  bidId: string
  carId: string
}

declare global {
  interface Window {
    Moyasar?: any
  }
}

export default function MoyasarCheckout({ amountHalalas, description, bidId, carId }: MoyasarCheckoutProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const publishableKey = process.env.NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY

  useEffect(() => {
    // Check for API key first
    if (!publishableKey || publishableKey === 'pk_test_YOUR_PUBLISHABLE_KEY_HERE') {
      setError('مفتاح الدفع غير مُعدّ. يرجى التواصل مع الدعم الفني.')
      setLoading(false)
      return
    }

    let cancelled = false

    // load script once
    const existing = document.getElementById('moyasar-sdk')
    if (existing) {
      setReady(true)
      setLoading(false)
      return
    }

    const script = document.createElement('script')
    script.id = 'moyasar-sdk'
    script.src = 'https://cdn.jsdelivr.net/npm/moyasar-payment-form@2.1.1/dist/moyasar.umd.min.js'
    script.async = true
    script.onload = () => {
      if (!cancelled) {
        setReady(true)
        setLoading(false)
      }
    }
    script.onerror = () => {
      if (!cancelled) {
        setError('فشل تحميل نظام الدفع. يرجى المحاولة مرة أخرى.')
        setLoading(false)
      }
    }
    document.body.appendChild(script)

    return () => {
      cancelled = true
    }
  }, [publishableKey])

  useEffect(() => {
    if (!ready || !hostRef.current || !window.Moyasar || !publishableKey) return

    try {
      // Create an inner mount node so Moyasar never touches the React-owned host
      const mount = document.createElement('div')
      const formClass = `mysr-form-${bidId}`
      mount.className = formClass
      hostRef.current.replaceChildren(mount) // clear old children safely

      const origin = window.location.origin
      const callback = `${origin}/api/moyasar/verify?bid_id=${encodeURIComponent(
        bidId
      )}&car_id=${encodeURIComponent(carId)}&amount=${amountHalalas}&fee=full`

      window.Moyasar.init({
        element: `.${formClass}`,
        amount: amountHalalas,
        currency: 'SAR',
        description,
        publishable_api_key: publishableKey,
        callback_url: callback,
        supported_networks: ['visa', 'mastercard', 'mada'],
        methods: ['creditcard'],
        language: 'ar'
      })
    } catch (err) {
      console.error('Moyasar init error:', err)
      setError('حدث خطأ أثناء تحميل نموذج الدفع.')
    }

    // Cleanup: leave the host in place; just clear its children
    return () => {
      hostRef.current?.replaceChildren()
    }
  }, [ready, amountHalalas, description, bidId, carId, publishableKey])

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="mr-2 text-sm text-muted-foreground">جاري تحميل نظام الدفع...</span>
      </div>
    )
  }

  return (
    <div>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/moyasar-payment-form@2.1.1/dist/moyasar.css"
      />
      <div ref={hostRef} className="min-h-[200px]" />
    </div>
  )
}
