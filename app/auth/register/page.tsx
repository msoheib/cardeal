'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AuthShell } from '@/components/layout/auth-shell'
import { resendVerification, signUp } from '@/lib/auth'
import { toArabicError } from '@/lib/arabic-errors'
import { getSafeRedirectPath } from '@/lib/redirect'
import { cn } from '@/lib/utils'
import { Loader2, MailCheck } from 'lucide-react'

function RegisterContent() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    userType: 'buyer' as 'buyer' | 'dealer'
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  // Set when Supabase requires email confirmation: no session comes back.
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resendNote, setResendNote] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectUrl = searchParams?.get('redirect')
  const safeRedirectUrl = getSafeRedirectPath(redirectUrl)
  // Merchants continue to the application form; everyone else to their destination.
  const nextPath = formData.userType === 'dealer' ? '/dealer/apply?from=register' : safeRedirectUrl

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('كلمات المرور غير متطابقة')
      setIsLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
      setIsLoading(false)
      return
    }

    const { data, error: signUpError } = await signUp(
      formData.email,
      formData.password,
      formData.fullName,
      formData.phone || undefined,
      nextPath
    )

    if (signUpError) {
      setError(toArabicError(signUpError, 'تعذر إنشاء الحساب. تحقق من البيانات وحاول مرة أخرى.'))
    } else if (data?.session) {
      // Email confirmation is off: the account is usable right away.
      router.push(nextPath)
    } else {
      setAwaitingConfirmation(true)
    }

    setIsLoading(false)
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleResend = async () => {
    setIsResending(true)
    setResendNote('')
    const { error: resendError } = await resendVerification(formData.email, nextPath)
    setIsResending(false)
    setResendNote(resendError
      ? toArabicError(resendError, 'تعذر إعادة الإرسال. حاول بعد قليل.')
      : 'أرسلنا الرابط مرة أخرى.')
  }

  const accountTypes = [
    { value: 'buyer', label: 'مشتري', hint: 'أقدّم عروضاً على السيارات' },
    { value: 'dealer', label: 'تاجر / معرض', hint: 'أعرض سيارات وأقبل العروض' },
  ] as const

  if (awaitingConfirmation) {
    return (
      <AuthShell
        title="تحقق من بريدك"
        description="أرسلنا رابط تفعيل لتأكيد بريدك الإلكتروني."
        footer={<Link href="/auth/login" className="font-medium text-primary hover:underline">العودة لتسجيل الدخول</Link>}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <MailCheck className="h-6 w-6 text-primary" aria-hidden />
          <p className="text-sm">
            افتح الرابط المرسل إلى <span dir="ltr" className="font-medium text-foreground">{formData.email}</span> لتفعيل حسابك، ثم سجّل الدخول.
          </p>
          <p className="text-xs">لم يصلك شيء؟ تحقق من مجلد الرسائل غير المرغوب فيها.</p>
          {resendNote && <p className="text-xs font-medium text-foreground">{resendNote}</p>}
          <Button variant="outline" size="sm" onClick={handleResend} disabled={isResending}>
            {isResending ? <><Loader2 className="h-4 w-4 animate-spin" />جاري الإرسال...</> : 'إعادة إرسال الرابط'}
          </Button>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="إنشاء حساب"
      description="حساب واحد لتقديم العروض ومتابعة الصفقات."
      footer={
        <>
          لديك حساب؟{' '}
          <Link href={`/auth/login${redirectUrl ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`} className="font-medium text-primary hover:underline">
            تسجيل الدخول
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

        <fieldset className="space-y-1.5">
          <legend className="mb-1.5 text-sm font-medium text-foreground">نوع الحساب</legend>
          <RadioGroup
            value={formData.userType}
            onValueChange={(value) => handleInputChange('userType', value)}
            className="grid grid-cols-2 gap-2"
          >
            {accountTypes.map((type) => (
              <Label
                key={type.value}
                htmlFor={`type-${type.value}`}
                className={cn(
                  'flex cursor-pointer flex-col gap-0.5 rounded-md border p-3 transition-colors',
                  formData.userType === type.value ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-input hover:bg-muted/50'
                )}
              >
                <span className="flex items-center gap-2 text-sm font-bold">
                  <RadioGroupItem value={type.value} id={`type-${type.value}`} />
                  {type.label}
                </span>
                <span className="text-xs font-normal text-muted-foreground">{type.hint}</span>
              </Label>
            ))}
          </RadioGroup>
        </fieldset>

        <div className="space-y-1.5">
          <Label htmlFor="fullName">الاسم الكامل</Label>
          <Input id="fullName" type="text" autoComplete="name" value={formData.fullName} onChange={(e) => handleInputChange('fullName', e.target.value)} required />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">البريد الإلكتروني</Label>
          <Input id="email" type="email" autoComplete="email" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} placeholder="name@example.com" required dir="ltr" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">رقم الجوال <span className="font-normal text-muted-foreground">(اختياري)</span></Label>
          <Input id="phone" type="tel" autoComplete="tel" value={formData.phone} onChange={(e) => handleInputChange('phone', e.target.value)} placeholder="05X XXX XXXX" dir="ltr" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="password">كلمة المرور</Label>
            <Input id="password" type="password" autoComplete="new-password" value={formData.password} onChange={(e) => handleInputChange('password', e.target.value)} required minLength={6} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">تأكيدها</Label>
            <Input id="confirmPassword" type="password" autoComplete="new-password" value={formData.confirmPassword} onChange={(e) => handleInputChange('confirmPassword', e.target.value)} required minLength={6} />
          </div>
        </div>
        <p className="-mt-2 text-xs">6 أحرف على الأقل.</p>

        {formData.userType === 'dealer' && (
          <p className="rounded-md bg-muted p-3 text-xs leading-5">
            يُنشأ حسابك كمشتري، وبعد إرسال بيانات المنشأة تتحول الصلاحيات إلى تاجر فور اعتماد الإدارة للطلب.
          </p>
        )}

        <p className="text-xs leading-5">
          بإنشاء الحساب فإنك توافق على{' '}
          <Link href="/terms" className="font-medium text-primary hover:underline">الشروط والأحكام</Link>{' '}
          و{' '}
          <Link href="/privacy" className="font-medium text-primary hover:underline">سياسة الخصوصية</Link>.
        </p>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" />جاري إنشاء الحساب...</> : 'إنشاء الحساب'}
        </Button>
      </form>
    </AuthShell>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterContent />
    </Suspense>
  )
}
