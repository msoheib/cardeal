'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Loader2 } from 'lucide-react'

interface MoyasarCheckoutProps {
  amountHalalas: number
  description: string
  bidId: string
  carId: string
  listingId: string
}

declare global {
  interface Window {
    Moyasar?: any
  }
}

const SDK_ID = 'moyasar-sdk'
const SDK_SRC = 'https://cdn.jsdelivr.net/npm/moyasar-payment-form@2.1.1/dist/moyasar.umd.min.js'

let sdkPromise: Promise<void> | null = null

/**
 * Resolves once window.Moyasar exists. Shared across mounts: a component that
 * opens while the script is still downloading waits for that same load instead
 * of assuming the SDK is ready because the <script> tag is already in the DOM.
 */
function loadMoyasarSdk(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.Moyasar) return Promise.resolve()
  if (sdkPromise) return sdkPromise

  sdkPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(SDK_ID) as HTMLScriptElement | null
    const script = existing ?? document.createElement('script')
    const onLoad = () => (window.Moyasar ? resolve() : reject(new Error('moyasar sdk loaded without global')))
    const onError = () => {
      sdkPromise = null
      script.remove()
      reject(new Error('moyasar sdk failed to load'))
    }

    script.addEventListener('load', onLoad, { once: true })
    script.addEventListener('error', onError, { once: true })

    if (!existing) {
      script.id = SDK_ID
      script.src = SDK_SRC
      script.async = true
      document.body.appendChild(script)
    }
  })

  return sdkPromise
}

export default function MoyasarCheckout({ amountHalalas, description, bidId, carId, listingId }: MoyasarCheckoutProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const publishableKey = process.env.NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY

  useEffect(() => {
    if (!publishableKey || publishableKey === 'pk_test_YOUR_PUBLISHABLE_KEY_HERE') {
      setError('مفتاح الدفع غير مُعدّ. يرجى التواصل مع الدعم الفني.')
      return
    }

    let cancelled = false
    loadMoyasarSdk()
      .then(() => { if (!cancelled) setReady(true) })
      .catch(() => { if (!cancelled) setError('تعذر تحميل نموذج الدفع.') })

    return () => { cancelled = true }
  }, [publishableKey])

  useEffect(() => {
    if (!ready || !hostRef.current || !window.Moyasar || !publishableKey) return
    const host = hostRef.current

    try {
      // Mount into an inner node so Moyasar never touches the React-owned host.
      const mount = document.createElement('div')
      const formClass = `mysr-form-${bidId}`
      mount.className = formClass
      host.replaceChildren(mount)

      const origin = window.location.origin
      const callback = `${origin}/api/moyasar/verify?bid_id=${encodeURIComponent(
        bidId
      )}&car_id=${encodeURIComponent(carId)}&listing_id=${encodeURIComponent(listingId)}`

      window.Moyasar.init({
        element: `.${formClass}`,
        amount: amountHalalas,
        currency: 'SAR',
        description,
        metadata: {
          bid_id: bidId,
          car_configuration_id: carId,
          listing_spec_id: listingId,
          fee: 'commitment_fee'
        },
        publishable_api_key: publishableKey,
        callback_url: callback,
        supported_networks: ['visa', 'mastercard', 'mada'],
        methods: ['creditcard'],
        language: 'ar'
      })

      // If the SDK mounted nothing, fall back rather than showing an empty box.
      const timer = window.setTimeout(() => {
        if (mount.childElementCount === 0) setError('تعذر عرض نموذج الدفع.')
      }, 4000)
      return () => {
        window.clearTimeout(timer)
        host.replaceChildren()
      }
    } catch (err) {
      console.error('خطأ في تهيئة نموذج الدفع:', err)
      setError('تعذر عرض نموذج الدفع.')
    }

    return () => { host.replaceChildren() }
  }, [ready, amountHalalas, description, bidId, carId, listingId, publishableKey])

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="space-y-2">
          <p>{error}</p>
          <Button asChild size="sm" variant="outline">
            <Link href={`/pay?bidId=${encodeURIComponent(bidId)}&carId=${encodeURIComponent(carId)}`}>
              افتح صفحة الدفع الآمنة
            </Link>
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/moyasar-payment-form@2.1.1/dist/moyasar.css"
      />
      <div ref={hostRef} className="min-h-[200px]" />
      {!ready && (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          جاري تحميل نموذج الدفع...
        </div>
      )}
    </div>
  )
}
