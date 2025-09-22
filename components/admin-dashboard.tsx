'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { getAdminStats, getAllBids, getAllDeals, getPendingCars, approveCar, rejectCar, generateSalesReport } from '@/lib/admin'
import { signOut } from '@/lib/auth'
import { User } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { 
  Users, 
  Car, 
  TrendingUp, 
  DollarSign,
  LogOut,
  CheckCircle,
  XCircle,
  BarChart3,
  FileText,
  Shield
} from 'lucide-react'

interface AdminDashboardProps {
  user: User
}

export function AdminDashboard({ user }: AdminDashboardProps) {
  const [stats, setStats] = useState<any>(null)
  const [bids, setBids] = useState<any[]>([])
  const [deals, setDeals] = useState<any[]>([])
  const [pendingCars, setPendingCars] = useState<any[]>([])
  const [salesReport, setSalesReport] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price)
  }

  const loadAdminData = async () => {
    setIsLoading(true)
    
    // Load stats
    const { data: statsData } = await getAdminStats()
    if (statsData) {
      setStats(statsData)
    }

    // Load bids
    const { data: bidsData } = await getAllBids()
    if (bidsData) {
      setBids(bidsData)
    }

    // Load deals
    const { data: dealsData } = await getAllDeals()
    if (dealsData) {
      setDeals(dealsData)
    }

    // Load pending cars
    const { data: pendingCarsData } = await getPendingCars()
    if (pendingCarsData) {
      setPendingCars(pendingCarsData)
    }

    setIsLoading(false)
  }

  const handleApproveCar = async (carId: string) => {
    const { error } = await approveCar(carId)
    if (error) {
      toast({
        title: "خطأ",
        description: "فشل في الموافقة على السيارة",
        variant: "destructive"
      })
    } else {
      toast({
        title: "تم بنجاح",
        description: "تم الموافقة على السيارة",
        variant: "default"
      })
      loadAdminData()
    }
  }

  const handleRejectCar = async (carId: string) => {
    const { error } = await rejectCar(carId)
    if (error) {
      toast({
        title: "خطأ",
        description: "فشل في رفض السيارة",
        variant: "destructive"
      })
    } else {
      toast({
        title: "تم بنجاح",
        description: "تم رفض السيارة",
        variant: "default"
      })
      loadAdminData()
    }
  }

  const generateReport = async () => {
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - 1)
    const endDate = new Date()

    const { data } = await generateSalesReport(
      startDate.toISOString(),
      endDate.toISOString()
    )

    if (data) {
      setSalesReport(data)
    }
  }

  useEffect(() => {
    loadAdminData()
  }, [])

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/'
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">قيد الانتظار</Badge>
      case 'accepted':
        return <Badge className="bg-green-100 text-green-800">مقبولة</Badge>
      case 'rejected':
        return <Badge variant="destructive">مرفوضة</Badge>
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">مكتملة</Badge>
      case 'active':
        return <Badge className="bg-green-100 text-green-800">نشط</Badge>
      case 'draft':
        return <Badge variant="outline">مسودة</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل لوحة الإدارة...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-red-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  لوحة الإدارة
                </h1>
                <p className="text-gray-600">مرحباً، {user.full_name}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={generateReport}>
                <FileText className="w-4 h-4 mr-2" />
                تقرير المبيعات
              </Button>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                تسجيل الخروج
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">إجمالي المستخدمين</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {(stats?.users?.buyer || 0) + (stats?.users?.dealer || 0)}
                  </p>
                  <div className="text-xs text-gray-500 mt-1">
                    {stats?.users?.buyer || 0} مشتري • {stats?.users?.dealer || 0} تاجر
                  </div>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">إجمالي السيارات</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.totalCars || 0}</p>
                </div>
                <Car className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">المزايدات النشطة</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats?.activeBids || 0}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">رسوم الالتزام المحصلة</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatPrice(stats?.totalFeesCollected || 0)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
            <TabsTrigger value="cars">السيارات المعلقة</TabsTrigger>
            <TabsTrigger value="bids">المزايدات</TabsTrigger>
            <TabsTrigger value="deals">الصفقات</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>إحصائيات رسوم الالتزام</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>مدفوعة:</span>
                      <span className="font-semibold text-green-600">
                        {stats?.commitmentFees?.paid || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>مستردة:</span>
                      <span className="font-semibold text-blue-600">
                        {stats?.commitmentFees?.refunded || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>قيد الانتظار:</span>
                      <span className="font-semibold text-yellow-600">
                        {stats?.commitmentFees?.pending || 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>الأنشطة الأخيرة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm">
                      <div className="flex justify-between">
                        <span>صفقات مكتملة:</span>
                        <span className="font-semibold">{stats?.totalDeals || 0}</span>
                      </div>
                    </div>
                    <div className="text-sm">
                      <div className="flex justify-between">
                        <span>سيارات تحتاج موافقة:</span>
                        <span className="font-semibold text-orange-600">{pendingCars.length}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {salesReport && (
              <Card>
                <CardHeader>
                  <CardTitle>تقرير المبيعات - آخر 30 يوم</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {salesReport.summary.totalDeals}
                      </div>
                      <div className="text-sm text-gray-600">صفقة مكتملة</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {formatPrice(salesReport.summary.totalRevenue)}
                      </div>
                      <div className="text-sm text-gray-600">إجمالي الإيرادات</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {formatPrice(salesReport.summary.totalSavings)}
                      </div>
                      <div className="text-sm text-gray-600">إجمالي الوفر</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {formatPrice(salesReport.summary.averageDiscount)}
                      </div>
                      <div className="text-sm text-gray-600">متوسط الخصم</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="cars" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">السيارات المعلقة - تحتاج موافقة</h2>
              <Badge variant="secondary">{pendingCars.length} سيارة</Badge>
            </div>

            {pendingCars.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    لا توجد سيارات معلقة
                  </h3>
                  <p className="text-gray-600">
                    جميع السيارات تم مراجعتها والموافقة عليها
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pendingCars.map((car) => (
                  <Card key={car.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-2">
                            <h3 className="text-lg font-semibold">
                              {car.make} {car.model} {car.year}
                            </h3>
                            {getStatusBadge(car.status)}
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">التاجر:</span>
                              <div className="font-semibold">{car.dealer?.company_name}</div>
                            </div>
                            <div>
                              <span className="text-gray-600">سعر الوكالة:</span>
                              <div className="font-semibold">{formatPrice(car.wakala_price)}</div>
                            </div>
                            <div>
                              <span className="text-gray-600">الكمية:</span>
                              <div className="font-semibold">{car.original_quantity}</div>
                            </div>
                            <div>
                              <span className="text-gray-600">تاريخ الإضافة:</span>
                              <div className="font-semibold">
                                {new Date(car.created_at).toLocaleDateString('ar-SA')}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => handleApproveCar(car.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            موافقة
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleRejectCar(car.id)}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            رفض
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="bids" className="space-y-4">
            <h2 className="text-xl font-semibold">جميع المزايدات</h2>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>السيارة</TableHead>
                      <TableHead>المشتري</TableHead>
                      <TableHead>مبلغ المزايدة</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>التاريخ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bids.slice(0, 20).map((bid) => {
                      const car = bid.car as any
                      const buyer = bid.buyer as any
                      return (
                        <TableRow key={bid.id}>
                          <TableCell>
                            {car?.make} {car?.model} {car?.year}
                          </TableCell>
                          <TableCell>{buyer?.full_name}</TableCell>
                          <TableCell className="font-semibold">
                            {formatPrice(bid.bid_price)}
                          </TableCell>
                          <TableCell>{getStatusBadge(bid.status)}</TableCell>
                          <TableCell>
                            {new Date(bid.created_at).toLocaleDateString('ar-SA')}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deals" className="space-y-4">
            <h2 className="text-xl font-semibold">جميع الصفقات</h2>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>السيارة</TableHead>
                      <TableHead>التاجر</TableHead>
                      <TableHead>المشتري</TableHead>
                      <TableHead>السعر النهائي</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>التاريخ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deals.slice(0, 20).map((deal) => {
                      const car = deal.car as any
                      const dealer = deal.dealer as any
                      const buyer = deal.buyer as any
                      return (
                        <TableRow key={deal.id}>
                          <TableCell>
                            {car?.make} {car?.model} {car?.year}
                          </TableCell>
                          <TableCell>{dealer?.company_name}</TableCell>
                          <TableCell>{buyer?.full_name}</TableCell>
                          <TableCell className="font-semibold text-green-600">
                            {formatPrice(deal.final_price)}
                          </TableCell>
                          <TableCell>{getStatusBadge(deal.status)}</TableCell>
                          <TableCell>
                            {new Date(deal.created_at).toLocaleDateString('ar-SA')}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}