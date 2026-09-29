'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CheckCircle, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AuthShell } from '@/components/layout/auth-shell'
import { getSafeRedirectPath } from '@/lib/redirect'
import { supabase } from '@/lib/supabase'

function ConfirmContent() {
  const router = useRouter()
  const [state, setState] = useState<'checking' | 'confirmed' | 'invalid'>('checking')
  const [linkError, setLinkError] = useState('')
  const [next, setNext] = useState('/dashboard')

  useEffect(() => {
    let cancelled = false

    const resolve = async () => {
      const url = new URL(window.location.href)
      setNext(getSafeRedirectPath(url.searchParams.get('next')))

      // Supabase reports expired or already-used links on the hash.
      const hash = new URLSearchParams(url.hash.replace(/^#/, ''))
      const failure = url.searchParams.get('error_description') || hash.get('error_description')
      if (failure) {
        if (!cancelled) { setLinkError(failure); setState('invalid') }
        return
      }

      // PKCE links arrive as ?code=…; implicit links put the tokens on the hash,
      // where the Supabase client picks them up on load.
      const code = url.searchParams.get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error && !cancelled) { setLinkError(error.message); setState('invalid'); return }
      }

      const { data } = await supabase.auth.getSession()
      if (cancelled) return
      setState(data.session ? 'confirmed' : 'invalid')
      if (data.session) window.history.replaceState({}, '', '/auth/confirm')
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && !cancelled) setState('confirmed')
    })

    resolve()
    return () => { cancelled = true; subscription.unsubscribe() }
  }, [])

  if (state === 'checking') {
    return (
      <AuthShell title="تأكيد البريد الإلكتروني" description="جاري التحقق من الرابط...">
        <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      </AuthShell>
    )
  }

  if (state === 'invalid') {
    return (
      <AuthShell
        title="الرابط غير صالح"
        description="انتهت صلاحية رابط التفعيل أو سبق استخدامه."
        footer={<Link href="/auth/login" className="font-medium text-primary hover:underline">العودة لتسجيل الدخول</Link>}
      >
        <div className="space-y-4">
          {linkError && <Alert variant="destructive"><AlertDescription dir="ltr" className="text-start">{linkError}</AlertDescription></Alert>}
          <p className="text-sm">إن كان حسابك غير مفعّل، سجّل الدخول واطلب إرسال رابط جديد من صفحة حسابك.</p>
          <Button asChild className="w-full"><Link href="/auth/login">تسجيل الدخول</Link></Button>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="تم تأكيد بريدك" description="حسابك جاهز للاستخدام.">
      <div className="flex flex-col items-center gap-3 text-center">
        <CheckCircle className="h-6 w-6 text-primary" aria-hidden />
        <Button className="w-full" onClick={() => router.push(next)}>المتابعة</Button>
      </div>
    </AuthShell>
  )
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmContent />
    </Suspense>
  )
}
