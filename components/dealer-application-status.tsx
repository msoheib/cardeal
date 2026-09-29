'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Building2, CheckCircle, Clock, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

type ApplicationStatus = 'pending' | 'approved' | 'rejected'

interface DealerApplication {
  id: string
  status: ApplicationStatus
  company_name: string
  rejection_reason: string | null
}

/**
 * The signed-in user's own dealer application, if any. Row-level security scopes
 * the query to the caller, so a buyer with no application simply gets nothing.
 */
export function DealerApplicationStatus({ userId, className }: { userId: string; className?: string }) {
  const [application, setApplication] = useState<DealerApplication | null | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('dealer_applications')
      .select('id, status, company_name, rejection_reason')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => { if (!cancelled) setApplication((data as DealerApplication) ?? null) })
    return () => { cancelled = true }
  }, [userId])

  if (application === undefined) return null

  if (!application) {
    return (
      <p className={cn('flex flex-wrap items-center gap-2 text-sm', className)}>
        <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        تملك معرضاً أو وكالة؟
        <Link href="/dealer/apply" className="font-medium text-primary hover:underline">قدّم طلب حساب تاجر</Link>
      </p>
    )
  }

  if (application.status === 'pending') {
    return (
      <div className={cn('flex flex-col gap-3 rounded-md bg-status-warning p-3 sm:flex-row sm:items-center sm:justify-between', className)}>
        <p className="flex gap-2 text-sm text-status-warning-foreground">
          <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          طلب حساب التاجر «{application.company_name}» قيد المراجعة. يبقى حسابك مشترياً حتى تعتمده الإدارة.
        </p>
        <Button asChild size="sm" variant="outline" className="shrink-0">
          <Link href="/dealer/apply">عرض الطلب</Link>
        </Button>
      </div>
    )
  }

  if (application.status === 'rejected') {
    return (
      <div className={cn('flex flex-col gap-3 rounded-md bg-status-danger p-3 sm:flex-row sm:items-center sm:justify-between', className)}>
        <p className="flex gap-2 text-sm text-status-danger-foreground">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {application.rejection_reason
            ? `تم رفض طلب حساب التاجر: ${application.rejection_reason}`
            : 'تم رفض طلب حساب التاجر. يمكنك تعديل البيانات وإعادة الإرسال.'}
        </p>
        <Button asChild size="sm" variant="outline" className="shrink-0">
          <Link href="/dealer/apply">تعديل وإعادة الإرسال</Link>
        </Button>
      </div>
    )
  }

  return (
    <p className={cn('flex items-center gap-2 text-sm text-status-success-foreground', className)}>
      <CheckCircle className="h-4 w-4 shrink-0" aria-hidden />
      تم اعتماد حساب التاجر «{application.company_name}».
    </p>
  )
}
