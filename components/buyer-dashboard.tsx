'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { getDealsByBuyer } from '@/lib/deals'
import { supabase, User, Deal, Bid } from '@/lib/supabase'
import { signOut } from '@/lib/auth'
import {
  Car,
  TrendingUp,
  Clock,
  CheckCircle,
  LogOut,
  Eye,
  RefreshCw
} from 'lucide-react'

interface BuyerDashboardProps {
  user: User
}

export function BuyerDashboard({ user }: BuyerDashboardProps) {
  const [activeBids, setActiveBids] = useState<Bid[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price)
  }

  const loadDashboardData = async () => {
    setIsLoading(true)

    const { data: bidsData } = await supabase
      .from('bids')
      .select(`
        *,
        configuration:car_configurations(*)
      `)
      .eq('buyer_id', user.id)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false })

    if (bidsData) {
      setActiveBids(bidsData)
    }

    const { data: dealsData } = await getDealsByBuyer(user.id)
    if (dealsData) {
      setDeals(dealsData)
    }

    setIsLoading(false)
  }

  useEffect(() => {
    loadDashboardData()

    const channel = supabase
      .channel(`buyer-dashboard-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bids', filter: `buyer_id=eq.${user.id}` },
        loadDashboardData
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deals', filter: `buyer_id=eq.${user.id}` },
        loadDashboardData
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user.id])

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/'
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">قيد الانتظار</Badge>
      case 'accepted':
        return <Badge className="bg-primary/10 text-primary">مقبولة</Badge>
      case 'rejected':
        return <Badge variant="destructive">مرفوضة</Badge>
      case 'expired':
        return <Badge variant="outline" className="text-gray-600">منتهية الصلاحية</Badge>
      case 'pending_payment':
        return <Badge className="bg-blue-100 text-blue-800">في انتظار الدفع</Badge>
      case 'completed':
        return <Badge className="bg-primary/10 text-primary">مكتملة</Badge>
      default:
        return <Badge variant="outline">حالة غير معروفة</Badge>
    }
  }

  return (
    <div className="bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">مرحبا، {user.full_name}</h1>
            <p className="text-sm text-gray-600">تابع مزايداتك وصفقاتك من هنا.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/cars">
              <Button variant="outline" size="sm">
                <Car className="w-4 h-4 mr-2" />
                تصفح السيارات
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              تسجيل الخروج
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        <Tabs defaultValue="bids" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="bids">مزايداتي</TabsTrigger>
            <TabsTrigger value="deals">صفقاتي</TabsTrigger>
          </TabsList>

          <TabsContent value="bids" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">المزايدات النشطة</h2>
              <Button variant="outline" size="sm" onClick={loadDashboardData}>
                <RefreshCw className="w-4 h-4 mr-2" />
                تحديث
              </Button>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : activeBids.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد مزايدات نشطة</h3>
                  <p className="text-gray-600 mb-4">ابدأ بتصفح السيارات ووضع مزايداتك.</p>
                  <Link href="/cars">
                    <Button>تصفح السيارات</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {activeBids.map((bid) => {
                  const config = (bid as any).configuration
                  return (
                    <Card key={bid.id}>
                      <CardContent className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-4 mb-2">
                              <h3 className="text-lg font-semibold">
                                {config?.make} {config?.model} {config?.year}
                              </h3>
                              {getStatusBadge(bid.status)}
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">مزايدتك:</span>
                                <div className="font-semibold text-primary">
                                  {formatPrice(bid.bid_price)}
                                </div>
                              </div>
                              <div>
                                <span className="text-gray-600">سعر الوكالة:</span>
                                <div className="font-semibold">
                                  {formatPrice(config?.msrp || 0)}
                                </div>
                              </div>
                              <div>
                                <span className="text-gray-600">الوفر المتوقع:</span>
                                <div className="font-semibold text-primary">
                                  {formatPrice((config?.msrp || 0) - bid.bid_price)}
                                </div>
                              </div>
                              <div>
                                <span className="text-gray-600">رسوم الالتزام:</span>
                                <div className={`font-semibold ${bid.commitment_fee_paid ? 'text-primary' : 'text-red-600'}`}>
                                  {bid.commitment_fee_paid ? 'مدفوعة' : 'غير مدفوعة'}
                                </div>
                              </div>
                            </div>

                            {bid.status === 'accepted' && (
                              <Alert className="mt-4">
                                <CheckCircle className="w-4 h-4" />
                                <AlertDescription>تم قبول مزايدتك! سنقوم بالتواصل معك لإكمال الإجراءات.</AlertDescription>
                              </Alert>
                            )}
                          </div>

                          <div className="flex flex-col gap-2">
                            <Link href={`/cars/${bid.car_configuration_id}`}>
                              <Button variant="outline" size="sm">
                                <Eye className="w-4 h-4 mr-2" />
                                عرض التفاصيل
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="deals" className="space-y-4">
            <h2 className="text-xl font-semibold">صفقاتي</h2>

            {deals.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد صفقات بعد</h3>
                  <p className="text-gray-600">عندما يتم قبول مزايدة وإكمالها ستظهر تفاصيل الصفقة هنا.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {deals.map((deal) => {
                  const config = (deal as any).configuration
                  const dealer = deal.dealer as any

                  return (
                    <Card key={deal.id}>
                      <CardContent className="p-6 space-y-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <div className="flex items-center gap-3">
                              <h3 className="text-lg font-semibold">{config?.make} {config?.model} {config?.year}</h3>
                              {getStatusBadge(deal.status)}
                            </div>
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(deal.created_at).toLocaleDateString('ar-SA')}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 text-sm">
                          <div>
                            <span className="text-gray-600">السعر النهائي:</span>
                            <div className="font-semibold text-primary">{formatPrice(deal.final_price)}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">حالة الصفقة:</span>
                            <div className="font-semibold">{getStatusBadge(deal.status)}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">الوفر المحقق:</span>
                            <div className="font-semibold text-primary">{formatPrice((config?.msrp || 0) - deal.final_price)}</div>
                          </div>
                        </div>

                        {/* Dealer Contact Info - Only visible after acceptance */}
                        <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                          <h4 className="font-semibold text-green-900 mb-2">معلومات التاجر</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">اسم الشركة: </span>
                              <span className="font-medium">{dealer?.company_name || 'غير متوفر'}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">الجوال: </span>
                              <span className="font-medium" dir="ltr">{dealer?.contact_info?.phone || 'غير متوفر'}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">المدينة: </span>
                              <span className="font-medium">{dealer?.city || 'غير متوفر'}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
