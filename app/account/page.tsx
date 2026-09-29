'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { KeyRound, Loader2, LogOut, MailCheck, MailWarning } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader, Section } from '@/components/layout/page-header'
import { DealerApplicationStatus } from '@/components/dealer-application-status'
import { useToast } from '@/hooks/use-toast'
import { getCurrentUser, resendVerification, signOut, updateProfile } from '@/lib/auth'
import { toArabicError } from '@/lib/arabic-errors'
import { formatGregorianDate } from '@/lib/format'
import { supabase, User } from '@/lib/supabase'

const ROLE_LABELS: Record<string, string> = {
  buyer: 'مشتري',
  dealer: 'تاجر',
  admin: 'مدير',
}

export default function AccountPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [emailVerified, setEmailVerified] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [form, setForm] = useState({ full_name: '', phone: '' })

  useEffect(() => {
    const load = async () => {
      const [profile, { data: authData }] = await Promise.all([getCurrentUser(), supabase.auth.getUser()])
      if (!profile) {
        router.replace('/auth/login?redirect=/account')
        return
      }
      setUser(profile)
      setForm({ full_name: profile.full_name || '', phone: profile.phone || '' })
      setEmailVerified(Boolean(authData.user?.email_confirmed_at))
      setIsLoading(false)
    }
    load()
  }, [router])

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!user) return
    setIsSaving(true)
    const { data, error } = await updateProfile(user.id, {
      full_name: form.full_name.trim(),
      phone: form.phone.trim() || undefined,
    })
    setIsSaving(false)

    if (error) {
      toast({ title: 'تعذر حفظ البيانات', description: toArabicError(error, 'حاول مرة أخرى.'), variant: 'destructive' })
      return
    }
    if (data) setUser(data as User)
    toast({ title: 'تم حفظ بياناتك' })
  }

  const handleResend = async () => {
    if (!user?.email) return
    setIsResending(true)
    const { error } = await resendVerification(user.email)
    setIsResending(false)
    toast(error
      ? { title: 'تعذر إرسال رسالة التحقق', description: toArabicError(error, 'حاول مرة أخرى بعد قليل.'), variant: 'destructive' }
      : { title: 'أرسلنا رابط التحقق', description: 'تحقق من بريدك الإلكتروني.' })
  }

  const handleSignOut = async () => {
    await signOut()
    router.replace('/')
  }

  if (isLoading || !user) {
    return (
      <div className="page flex min-h-[60vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        جاري تحميل حسابك...
      </div>
    )
  }

  return (
    <div className="page-narrow space-y-6">
      <PageHeader
        title="حسابي"
        description="بيانات حسابك وصلاحياته."
        actions={
          <Button size="sm" variant="ghost" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />تسجيل الخروج
          </Button>
        }
      />

      <Section title="معلومات الحساب">
        <dl className="surface divide-y divide-border text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <dt className="text-muted-foreground">البريد الإلكتروني</dt>
            <dd className="flex items-center gap-2">
              <span dir="ltr" className="font-medium text-foreground">{user.email || '—'}</span>
              {emailVerified ? (
                <Badge className="border-transparent bg-status-success text-status-success-foreground hover:bg-status-success">
                  <MailCheck className="h-3.5 w-3.5" />موثّق
                </Badge>
              ) : (
                <Badge className="border-transparent bg-status-warning text-status-warning-foreground hover:bg-status-warning">
                  <MailWarning className="h-3.5 w-3.5" />غير موثّق
                </Badge>
              )}
            </dd>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <dt className="text-muted-foreground">نوع الحساب</dt>
            <dd className="font-medium text-foreground">{ROLE_LABELS[user.user_type] || user.user_type}</dd>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <dt className="text-muted-foreground">تاريخ الانضمام</dt>
            <dd className="num font-medium text-foreground">{user.created_at ? formatGregorianDate(user.created_at) : '—'}</dd>
          </div>
        </dl>

        {!emailVerified && (
          <div className="flex flex-col gap-3 rounded-md bg-status-warning p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-status-warning-foreground">لم يتم تأكيد بريدك الإلكتروني بعد.</p>
            <Button size="sm" variant="outline" onClick={handleResend} disabled={isResending} className="shrink-0">
              {isResending ? <><Loader2 className="h-4 w-4 animate-spin" />جاري الإرسال...</> : 'إعادة إرسال رابط التحقق'}
            </Button>
          </div>
        )}
      </Section>

      <Section title="تعديل البيانات">
        <form onSubmit={handleSave} className="surface space-y-4 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="full_name">الاسم الكامل</Label>
            <Input
              id="full_name"
              value={form.full_name}
              onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">رقم الجوال</Label>
            <Input
              id="phone"
              type="tel"
              dir="ltr"
              placeholder="05X XXX XXXX"
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" />جاري الحفظ...</> : 'حفظ التعديلات'}
            </Button>
            <Button asChild type="button" variant="outline">
              <Link href="/auth/forgot-password"><KeyRound className="h-4 w-4" />تغيير كلمة المرور</Link>
            </Button>
          </div>
        </form>
      </Section>

      <Section title="حساب التاجر">
        <DealerApplicationStatus userId={user.id} />
      </Section>

      <Section title="لوحة التحكم">
        <p className="text-sm">
          تابع عروضك وصفقاتك من{' '}
          <Link href="/dashboard" className="font-medium text-primary hover:underline">لوحة التحكم</Link>.
        </p>
      </Section>
    </div>
  )
}
