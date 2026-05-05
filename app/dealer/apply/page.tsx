'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertCircle, ArrowRight, CheckCircle, Loader2 } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
      setError(submitError.message)
    } else if (data) {
      setApplication(data as DealerApplication)
    }

    setIsSubmitting(false)
  }

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const locked = application?.status === 'pending' || application?.status === 'approved'

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8" dir="rtl">
      <div className="mx-auto max-w-2xl">
        <Link href="/dashboard" className="mb-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
          <ArrowRight className="h-4 w-4" />
          العودة للوحة التحكم
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>طلب اعتماد تاجر</CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-5">
              {application?.status === 'pending' && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>طلبك قيد المراجعة</AlertTitle>
                  <AlertDescription>سيظهر حساب التاجر بعد موافقة الإدارة.</AlertDescription>
                </Alert>
              )}

              {application?.status === 'approved' && (
                <Alert className="border-green-200 bg-green-50 text-green-900">
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

              <Textarea
                disabled
                value="تتم مراجعة بيانات التاجر قبل تفعيل صلاحيات إضافة المخزون وقبول العروض."
              />
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
