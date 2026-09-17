'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { AdminConsole } from '@/components/admin-console/admin-console'
import { getCurrentUser } from '@/lib/auth'
import { User } from '@/lib/supabase'

// Client-side gate for UX only; every /api/admin call re-checks the admin role on the server.
export default function AdminPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'denied'>('loading')

  useEffect(() => {
    getCurrentUser().then((current) => {
      if (!current) {
        router.replace('/auth/login?redirect=/admin')
        return
      }
      if (current.user_type !== 'admin') {
        setState('denied')
        return
      }
      setUser(current)
      setState('ready')
    })
  }, [router])

  if (state === 'loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        جاري التحقق من الصلاحيات...
      </div>
    )
  }

  if (state === 'denied' || !user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 px-4 text-center" dir="rtl">
        <h1 className="text-2xl font-bold">غير مصرح</h1>
        <p>لوحة الإدارة الشاملة متاحة لحسابات المدير فقط.</p>
      </div>
    )
  }

  return <AdminConsole user={user} />
}
