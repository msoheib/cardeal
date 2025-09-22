'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getCars } from '@/lib/cars'
import { acceptBids, getDealsByDealer } from '@/lib/deals'
import { signOut } from '@/lib/auth'
import { supabase, User, Car, Deal } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { 
  Car as CarIcon, 
  TrendingUp, 
  Users, 
  DollarSign,
  LogOut,
  Eye,
  Settings,
  CheckCircle,
  BarChart3
} from 'lucide-react'

interface DealerDashboardProps {
  user: User
}

export function DealerDashboard({ user }: DealerDashboardProps) {
  const [cars, setCars] = useState<Car[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [selectedCar, setSelectedCar] = useState<Car | null>(null)
  const [bidData, setBidData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [acceptQuantity, setAcceptQuantity] = useState(1)
  const { toast } = useToast()

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
    
    // Get dealer info first
    const { data: dealerData } = await supabase
      .from('dealers')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!dealerData) {
      setIsLoading(false)
      return
    }

    // Load dealer's cars
    const { data: carsData } = await getCars({ dealerId: dealerData.id })
    if (carsData) {
      setCars(carsData)
    }

    // Load deals
    const { data: dealsData } = await getDealsByDealer(dealerData.id)
    if (dealsData) {
      setDeals(dealsData)
    }

    setIsLoading(false)
  }

  const loadBidData = async (carId: string) => {
    const { data } = await supabase
      .from('bid_aggregates')
      .select('*')
      .eq('car_id', carId)
      .order('bid_price', { ascending: false })

    setBidData(data || [])
  }

  useEffect(() => {
    loadDashboardData()
  }, [user.id])

  const handleAcceptBids = async (carId: string, bidPrice: number, quantity: number) => {
    const dealerData = await supabase
      .from('dealers')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!dealerData.data) return

    const { data, error } = await acceptBids(carId, bidPrice, quantity, dealerData.data.id)
    
    if (error) {
      toast({
        title: "خطأ",
        description: error as string,
        variant: "destructive"
      })
    } else {
      toast({
        title: "تم قبول المزايدات",
        description: `تم قبول ${data?.length} مزايدة بسعر ${formatPrice(bidPrice)}`,
        variant: "default"
      })
      loadDashboardData()
    }
  }

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/'
  }

  const stats = {
    totalCars: cars.length,
    activeCars: cars.filter(car => car.status === 'active').length,
    totalDeals: deals.length,
    completedDeals: deals.filter(deal => deal.status === 'completed').length,
    totalRevenue: deals
      .filter(deal => deal.status === 'completed')
      .reduce((sum, deal) => sum + deal.final_price, 0)
  }

  return (
    <div>
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                مرحباً، {user.full_name}
              </h1>
              <p className="text-gray-600">لوحة تحكم التاجر</p>
            </div>
            
            <div className="flex items-center gap-4">
              <Link href="/dealer/cars/add">
                <Button size="sm" className="bg-green-600 hover:bg-green-700">
                  <CarIcon className="w-4 h-4 mr-2" />
                  إضافة سيارة
                </Button>
              </Link>
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">إجمالي السيارات</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalCars}</p>
                </div>
                <CarIcon className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">السيارات النشطة</p>
                  <p className="text-2xl font-bold text-green-600">{stats.activeCars}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">إجمالي الصفقات</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.totalDeals}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">الصفقات المكتملة</p>
                  <p className="text-2xl font-bold text-green-600">{stats.completedDeals}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">إجمالي الإيرادات</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatPrice(stats.totalRevenue)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="cars" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="cars">سياراتي والمزايدات</TabsTrigger>
            <TabsTrigger value="deals">الصفقات</TabsTrigger>
          </TabsList>

          <TabsContent value="cars" className="space-y-4">
            <h2 className="text-xl font-semibold">السيارات والمزايدات</h2>

            {cars.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    لا توجد سيارات بعد
                  </h3>
                  <p className="text-gray-600 mb-4">
                    ابدأ بإضافة سياراتك لتلقي المزايدات
                  </p>
                  <Link href="/dealer/cars/add">
                    <Button>إضافة سيارة</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {cars.map((car) => (
                  <Card key={car.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold">
                            {car.make} {car.model} {car.year}
                          </h3>
                          <p className="text-gray-600">{car.variant}</p>
                          <p className="text-lg font-bold text-green-600 mt-2">
                            {formatPrice(car.wakala_price)}
                          </p>
                        </div>
                        <Badge 
                          variant={car.status === 'active' ? 'default' : 'secondary'}
                          className={car.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                        >
                          {car.status === 'active' ? 'نشط' : 'غير نشط'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                        <div>
                          <span className="text-gray-600">الكمية المتاحة:</span>
                          <div className="font-semibold">{car.available_quantity}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">الكمية الأصلية:</span>
                          <div className="font-semibold">{car.original_quantity}</div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Link href={`/cars/${car.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-2" />
                            عرض
                          </Button>
                        </Link>
                        
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm" 
                              onClick={() => {
                                setSelectedCar(car)
                                loadBidData(car.id)
                              }}
                            >
                              <BarChart3 className="w-4 h-4 mr-2" />
                              إدارة المزايدات
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl">
                            <DialogHeader>
                              <DialogTitle>
                                إدارة المزايدات - {selectedCar?.make} {selectedCar?.model}
                              </DialogTitle>
                            </DialogHeader>
                            
                            <div className="space-y-4">
                              <div className="bg-gray-50 p-4 rounded-lg">
                                <h4 className="font-semibold mb-2">معلومات السيارة</h4>
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-600">سعر الوكالة:</span>
                                    <div className="font-semibold">{formatPrice(selectedCar?.wakala_price || 0)}</div>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">الكمية المتاحة:</span>
                                    <div className="font-semibold">{selectedCar?.available_quantity}</div>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">إجمالي المزايدات:</span>
                                    <div className="font-semibold">
                                      {bidData.reduce((sum, bid) => sum + bid.bid_count, 0)}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div>
                                <h4 className="font-semibold mb-4">مستويات المزايدات</h4>
                                {bidData.length === 0 ? (
                                  <p className="text-gray-600 text-center py-8">
                                    لا توجد مزايدات على هذه السيارة بعد
                                  </p>
                                ) : (
                                  <div className="space-y-3">
                                    {bidData.map((bid, index) => (
                                      <div key={bid.id} className="flex items-center justify-between p-4 border rounded-lg">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-4">
                                            <div className="text-lg font-semibold">
                                              {formatPrice(bid.bid_price)}
                                            </div>
                                            <Badge variant="secondary">
                                              {bid.bid_count} مزايد
                                            </Badge>
                                            <div className="text-sm text-gray-600">
                                              إيراد محتمل: {formatPrice(bid.bid_price * bid.bid_count)}
                                            </div>
                                          </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-2">
                                          <Input
                                            type="number"
                                            min="1"
                                            max={Math.min(bid.bid_count, selectedCar?.available_quantity || 0)}
                                            value={acceptQuantity}
                                            onChange={(e) => setAcceptQuantity(parseInt(e.target.value) || 1)}
                                            className="w-20"
                                          />
                                          <Button
                                            size="sm"
                                            onClick={() => handleAcceptBids(selectedCar!.id, bid.bid_price, acceptQuantity)}
                                            disabled={acceptQuantity > Math.min(bid.bid_count, selectedCar?.available_quantity || 0)}
                                          >
                                            قبول
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="deals" className="space-y-4">
            <h2 className="text-xl font-semibold">الصفقات</h2>

            {deals.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    لا توجد صفقات بعد
                  </h3>
                  <p className="text-gray-600">
                    عندما تقبل المزايدات، ستظهر الصفقات هنا
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {deals.map((deal) => {
                  const car = deal.car as any
                  const buyer = deal.buyer as any
                  return (
                    <Card key={deal.id}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-4 mb-2">
                              <h3 className="text-lg font-semibold">
                                {car?.make} {car?.model} {car?.year}
                              </h3>
                              <Badge 
                                variant={deal.status === 'completed' ? 'default' : 'secondary'}
                                className={deal.status === 'completed' ? 'bg-green-100 text-green-800' : ''}
                              >
                                {deal.status === 'completed' ? 'مكتملة' : 'في انتظار الدفع'}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">المشتري:</span>
                                <div className="font-semibold">{buyer?.full_name}</div>
                              </div>
                              <div>
                                <span className="text-gray-600">السعر النهائي:</span>
                                <div className="font-semibold text-green-600">
                                  {formatPrice(deal.final_price)}
                                </div>
                              </div>
                              <div>
                                <span className="text-gray-600">تاريخ الصفقة:</span>
                                <div className="font-semibold">
                                  {new Date(deal.created_at).toLocaleDateString('ar-SA')}
                                </div>
                              </div>
                              <div>
                                <span className="text-gray-600">الكمية:</span>
                                <div className="font-semibold">{deal.quantity}</div>
                              </div>
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
      </div>
    </div>
  )
}