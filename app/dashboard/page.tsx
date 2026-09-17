'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { User } from '@/lib/supabase'
import { BuyerDashboard } from '@/components/buyer-dashboard'
import { DealerDashboard } from '@/components/dealer-dashboard'
import { AdminConsole } from '@/components/admin-console/admin-console'
import { EmptyState } from '@/components/ui/empty-state'

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    getCurrentUser().then((currentUser) => {
      if (!currentUser) {
        router.push('/auth/login?redirect=/dashboard')
        return
      }
      setUser(currentUser)
      setIsLoading(false)
    })
  }, [router])

  if (isLoading || !user) {
    return (
      <div className="page flex min-h-[60vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        جاري تحميل لوحة التحكم...
      </div>
    )
  }

  switch (user.user_type) {
    case 'buyer':
      return <BuyerDashboard user={user} />
    case 'dealer':
      return <DealerDashboard user={user} />
    case 'admin':
      return <AdminConsole user={user} />
    default:
      return (
        <div className="page">
          <div className="surface">
            <EmptyState
              title="تعذّر تحديد نوع حسابك"
              description="سجّل الدخول من جديد أو تواصل مع فريق الدعم."
            />
          </div>
        </div>
      )
  }
}
