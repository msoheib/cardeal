'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, getUserRole } from '@/lib/auth'
import { BuyerDashboard } from '@/components/buyer-dashboard'
import { DealerDashboard } from '@/components/dealer-dashboard'
import { AdminDashboard } from '@/components/admin-dashboard'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const loadUserData = async () => {
      const currentUser = await getCurrentUser()
      const role = await getUserRole()

      if (!currentUser) {
        router.push('/auth/login')
        return
      }

      setUser(currentUser)
      setUserRole(role)
      setIsLoading(false)
    }

    loadUserData()
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-green-600" />
            <span className="mr-3 text-lg">جاري التحميل...</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderDashboard = () => {
    switch (userRole) {
      case 'buyer':
        return <BuyerDashboard user={user} />
      case 'dealer':
        return <DealerDashboard user={user} />
      case 'admin':
        return <AdminDashboard user={user} />
      default:
        return (
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              نوع حساب غير صحيح
            </h2>
            <p className="text-gray-600">
              يرجى التواصل مع الدعم الفني
            </p>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {renderDashboard()}
    </div>
  )
}