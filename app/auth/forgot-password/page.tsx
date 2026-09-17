'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, MailCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AuthShell } from '@/components/layout/auth-shell'
import { requestPasswordReset } from '@/lib/auth'
import { toArabicError } from '@/lib/arabic-errors'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsLoading(true)
    setError('')

    const { error: resetError } = await requestPasswordReset(
      email.trim(),
      `${window.location.origin}/auth/reset-password`
    )
    setIsLoading(false)

    // Don't reveal whether the address has an account; only surface real failures
    // (rate limiting, network, misconfigured redirect).
    if (resetError) {
      setError(toArabicError(resetError, 'تعذر إرسال رابط الاستعادة. حاول مرة أخرى بعد قليل.'))
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <AuthShell
        title="تحقق من بريدك"
        description="إن كان لديك حساب بهذا البريد فسيصلك رابط لتعيين كلمة مرور جديدة."
        footer={<Link href="/auth/login" className="font-medium text-primary hover:underline">العودة لتسجيل الدخول</Link>}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <MailCheck className="h-6 w-6 text-primary" aria-hidden />
          <p className="text-sm">
            أرسلنا الرابط إلى <span dir="ltr" className="font-medium text-foreground">{email}</span>. الرابط صالح لفترة محدودة.
          </p>
          <p className="text-xs">لم يصلك شيء؟ تحقق من مجلد الرسائل غير المرغوب فيها، أو</p>
          <Button variant="outline" size="sm" onClick={() => setSent(false)}>جرّب بريداً آخر</Button>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="استعادة كلمة المرور"
      description="أدخل بريدك وسنرسل لك رابطاً لتعيين كلمة مرور جديدة."
      footer={<Link href="/auth/login" className="font-medium text-primary hover:underline">العودة لتسجيل الدخول</Link>}
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
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@example.com"
            required
            dir="ltr"
          />
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" />جاري الإرسال...</> : 'إرسال رابط الاستعادة'}
        </Button>
      </form>
    </AuthShell>
  )
}
