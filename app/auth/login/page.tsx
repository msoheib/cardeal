'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AuthShell } from '@/components/layout/auth-shell'
import { signIn } from '@/lib/auth'
import { toArabicError } from '@/lib/arabic-errors'
import { getSafeRedirectPath } from '@/lib/redirect'
import { Loader2 } from 'lucide-react'

function LoginContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectUrl = searchParams?.get('redirect')
  const safeRedirectUrl = getSafeRedirectPath(redirectUrl)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    const { error: signInError } = await signIn(email, password)

    if (signInError) {
      setError(toArabicError(signInError, 'تعذر تسجيل الدخول. تحقق من البيانات وحاول مرة أخرى.'))
    } else {
      // Redirect to the original page or dashboard
      router.push(safeRedirectUrl)
    }

    setIsLoading(false)
  }

  return (
    <AuthShell
      title="تسجيل الدخول"
      description="ادخل إلى حسابك لمتابعة عروضك وصفقاتك."
      footer={
        <>
          ليس لديك حساب؟{' '}
          <Link href={`/auth/register${redirectUrl ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`} className="font-medium text-primary hover:underline">
            إنشاء حساب
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="email">البريد الإلكتروني</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            required
            dir="ltr"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <Label htmlFor="password">كلمة المرور</Label>
            <Link href="/auth/forgot-password" className="text-xs font-medium text-primary hover:underline">نسيت كلمة المرور؟</Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" />جاري الدخول...</> : 'دخول'}
        </Button>
      </form>
    </AuthShell>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  )
}
