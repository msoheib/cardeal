'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CheckCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AuthShell } from '@/components/layout/auth-shell'
import { updatePassword } from '@/lib/auth'
import { toArabicError } from '@/lib/arabic-errors'
import { supabase } from '@/lib/supabase'

const MIN_LENGTH = 6

function ResetPasswordContent() {
  const router = useRouter()
  const [state, setState] = useState<'checking' | 'ready' | 'invalid' | 'done'>('checking')
  const [linkError, setLinkError] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const resolveSession = async () => {
      const url = new URL(window.location.href)
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
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError && !cancelled) { setLinkError(exchangeError.message); setState('invalid'); return }
      }

      const { data } = await supabase.auth.getSession()
      if (cancelled) return
      setState(data.session ? 'ready' : 'invalid')
      // Keep the tokens out of the address bar once they are in the session.
      if (data.session) window.history.replaceState({}, '', '/auth/reset-password')
    }

    // A recovery session can also land through the auth listener.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && !cancelled) setState((current) => (current === 'done' ? current : 'ready'))
    })

    resolveSession()
    return () => { cancelled = true; subscription.unsubscribe() }
  }, [])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين.')
      return
    }
    setIsSaving(true)
    setError('')

    const { error: updateError } = await updatePassword(password)
    setIsSaving(false)

    if (updateError) {
      setError(toArabicError(updateError, 'تعذر تحديث كلمة المرور. اطلب رابطاً جديداً وحاول مرة أخرى.'))
      return
    }
    setState('done')
  }

  if (state === 'checking') {
    return (
      <AuthShell title="استعادة كلمة المرور" description="جاري التحقق من الرابط...">
        <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      </AuthShell>
    )
  }

  if (state === 'invalid') {
    return (
      <AuthShell
        title="الرابط غير صالح"
        description="انتهت صلاحية الرابط أو سبق استخدامه."
        footer={<Link href="/auth/login" className="font-medium text-primary hover:underline">العودة لتسجيل الدخول</Link>}
      >
        <div className="space-y-4">
          {linkError && <Alert variant="destructive"><AlertDescription dir="ltr" className="text-start">{linkError}</AlertDescription></Alert>}
          <Button asChild className="w-full"><Link href="/auth/forgot-password">اطلب رابطاً جديداً</Link></Button>
        </div>
      </AuthShell>
    )
  }

  if (state === 'done') {
    return (
      <AuthShell title="تم تحديث كلمة المرور" description="يمكنك الآن استخدام كلمة المرور الجديدة.">
        <div className="flex flex-col items-center gap-3 text-center">
          <CheckCircle className="h-6 w-6 text-primary" aria-hidden />
          <Button className="w-full" onClick={() => router.push('/dashboard')}>الذهاب إلى لوحة التحكم</Button>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="تعيين كلمة مرور جديدة" description={`اختر كلمة مرور من ${MIN_LENGTH} أحرف على الأقل.`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

        <div className="space-y-1.5">
          <Label htmlFor="password">كلمة المرور الجديدة</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={MIN_LENGTH}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            minLength={MIN_LENGTH}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isSaving}>
          {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" />جاري الحفظ...</> : 'حفظ كلمة المرور'}
        </Button>
      </form>
    </AuthShell>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  )
}
