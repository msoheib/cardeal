'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertCircle, ArrowRight, CheckCircle, Loader2 } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/page-header'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toArabicError } from '@/lib/arabic-errors'
import { getCurrentUser } from '@/lib/auth'
import { supabase, User } from '@/lib/supabase'

type DealerApplication = {
  id: string
  status: 'pending' | 'approved' | 'rejected'
  company_name: string
  commercial_registration: string
  city: string
  contact_info: { phone?: string; email?: string }
  rejection_reason?: string | null
}

export default function DealerApplyPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [application, setApplication] = useState<DealerApplication | null>(null)
  const [isChecking, setIsChecking] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    companyName: '',
    commercialRegistration: '',
    city: '',
    phone: '',
    email: ''
  })

  useEffect(() => {
    const loadApplication = async () => {
      const currentUser = await getCurrentUser()

      if (!currentUser) {
        router.push('/auth/login?redirect=/dealer/apply')
        return
      }

      if (currentUser.user_type === 'dealer') {
        router.push('/dashboard')
        return
      }

      setUser(currentUser)
      setFormData((current) => ({
        ...current,
        phone: currentUser.phone || '',
        email: currentUser.email || ''
      }))

      const { data } = await supabase
        .from('dealer_applications')
        .select('*')
        .eq('user_id', currentUser.id)
        .maybeSingle()

      if (data) {
        const existing = data as DealerApplication
        setApplication(existing)
        setFormData({
          companyName: existing.company_name,
          commercialRegistration: existing.commercial_registration,
          city: existing.city,
          phone: existing.contact_info?.phone || currentUser.phone || '',
          email: existing.contact_info?.email || currentUser.email || ''
        })
      }

      setIsChecking(false)
    }

    loadApplication()
  }, [router])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!user) return

    setIsSubmitting(true)
    setError('')

    const payload = {
      user_id: user.id,
      company_name: formData.companyName.trim(),
      commercial_registration: formData.commercialRegistration.trim(),
      city: formData.city.trim(),
      contact_info: {
        phone: formData.phone.trim(),
        email: formData.email.trim()
      },
      status: 'pending',
      rejection_reason: null,
      reviewed_by: null,
      reviewed_at: null
    }

    const request = application
      ? supabase
          .from('dealer_applications')
          .update(payload)
          .eq('id', application.id)
          .select()
          .single()
      : supabase
          .from('dealer_applications')
          .insert(payload)
          .select()
          .single()

    const { data, error: submitError } = await request

    if (submitError) {
      setError(toArabicError(submitError, 'تعذر إرسال طلب الاعتماد. يرجى المحاولة مرة أخرى.'))
    } else if (data) {
      setApplication(data as DealerApplication)
    }

    setIsSubmitting(false)
  }

  if (isChecking) {
    return (
      <div className="page flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const locked = application?.status === 'pending' || application?.status === 'approved'

  return (
    <div className="page-narrow space-y-6">
      <PageHeader
        eyebrow={<Link href="/dashboard" className="inline-flex items-center gap-1 hover:text-foreground"><ArrowRight className="h-3.5 w-3.5" />لوحة التحكم</Link>}
        title="طلب اعتماد تاجر"
        description="بعد مراجعة بياناتك تُفعَّل صلاحيات إضافة المخزون وقبول العروض."
      />
      <div>
        <Card>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-5 pt-5">
              {application?.status === 'pending' && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>طلبك قيد المراجعة</AlertTitle>
                  <AlertDescription>سيظهر حساب التاجر بعد موافقة الإدارة.</AlertDescription>
                </Alert>
              )}

              {application?.status === 'approved' && (
                <Alert className="border-transparent bg-status-success text-status-success-foreground">
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>تمت الموافقة</AlertTitle>
                  <AlertDescription>يمكنك استخدام لوحة تحكم التاجر الآن.</AlertDescription>
                </Alert>
              )}

              {application?.status === 'rejected' && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>تم رفض الطلب</AlertTitle>
                  <AlertDescription>{application.rejection_reason || 'يمكنك تعديل البيانات وإرسال الطلب مرة أخرى.'}</AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="companyName">اسم الشركة</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(event) => setFormData({ ...formData, companyName: event.target.value })}
                    disabled={locked}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commercialRegistration">السجل التجاري</Label>
                  <Input
                    id="commercialRegistration"
                    value={formData.commercialRegistration}
                    onChange={(event) => setFormData({ ...formData, commercialRegistration: event.target.value })}
                    disabled={locked}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="city">المدينة</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(event) => setFormData({ ...formData, city: event.target.value })}
                    disabled={locked}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">رقم التواصل</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
                    disabled={locked}
                    dir="ltr"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">البريد التجاري</Label>
                <Input
                  id="email"
                  value={formData.email}
                  onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                  disabled={locked}
                  dir="ltr"
                  type="email"
                />
              </div>

            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={locked || isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'إرسال طلب الاعتماد'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
