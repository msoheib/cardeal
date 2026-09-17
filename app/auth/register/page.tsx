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
import { signUp } from '@/lib/auth'
import { toArabicError } from '@/lib/arabic-errors'
import { getSafeRedirectPath } from '@/lib/redirect'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

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
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectUrl = searchParams?.get('redirect')
  const safeRedirectUrl = getSafeRedirectPath(redirectUrl)

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

    const { error: signUpError } = await signUp(
      formData.email,
      formData.password,
      formData.fullName,
      formData.phone || undefined
    )

    if (signUpError) {
      setError(toArabicError(signUpError, 'تعذر إنشاء الحساب. تحقق من البيانات وحاول مرة أخرى.'))
    } else {
      // Redirect to the original page or dashboard
      router.push(formData.userType === 'dealer' ? '/dealer/apply?from=register' : safeRedirectUrl)
    }

    setIsLoading(false)
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const accountTypes = [
    { value: 'buyer', label: 'مشتري', hint: 'أقدّم عروضاً على السيارات' },
    { value: 'dealer', label: 'تاجر / معرض', hint: 'أعرض سيارات وأقبل العروض' },
  ] as const

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
