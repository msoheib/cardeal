'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getDealerInventory, getDealerOpportunities } from '@/lib/cars'
import { acceptBid, getDealsByDealer } from '@/lib/deals' // Use singular acceptBid
import { signOut } from '@/lib/auth'
import { supabase, User, CarConfiguration, Deal } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import {
  Car as CarIcon,
  TrendingUp,
  LogOut,
  Eye,
  Settings,
  CheckCircle,
  BarChart3,
  PlusCircle,
  AlertCircle,
  Clock,
  DollarSign
} from 'lucide-react'

interface DealerDashboardProps {
  user: User
}

// Extended types for UI
interface InventoryItem {
  id: string
  quantity: number
  status: string
  car_configuration_id: string
  configuration: CarConfiguration
  price_slots?: number[]
}

export function DealerDashboard({ user }: DealerDashboardProps) {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [opportunities, setOpportunities] = useState<any[]>([]) // Pending bids
  const [deals, setDeals] = useState<Deal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
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

    const dealerId = dealerData.id

    // 1. Load Inventory
    const { data: invData } = await getDealerInventory(dealerId)
    if (invData) setInventory(invData as any)

    // 2. Load Opportunities (Pending Bids)
    const { data: oppsData } = await getDealerOpportunities(dealerId)
    if (oppsData) setOpportunities(oppsData)

    // 3. Load Deals
    const { data: dealsData } = await getDealsByDealer(dealerId)
    if (dealsData) setDeals(dealsData)

    setIsLoading(false)
  }

  useEffect(() => {
    loadDashboardData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id])

  const handleAcceptBid = async (bidId: string, amount: number) => {
    const { data: dealerData } = await supabase.from('dealers').select('id').eq('user_id', user.id).single()
    if (!dealerData) return

    setIsProcessing(true)
    const result = await acceptBid(bidId, dealerData.id)
    setIsProcessing(false)

    if (result.error) {
      toast({
        title: "خطأ",
        description: typeof result.error === 'string' ? result.error : 'فشل قبول العرض',
        variant: "destructive"
      })
    } else {
      toast({
        title: "تم قبول العرض!",
        description: `تم قبول العرض بقيمة ${formatPrice(amount)} بنجاح.`,
        variant: "default"
      })
      // Refresh data to move from opportunities to deals
      loadDashboardData()
    }
  }

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/'
  }

  return (
    <div className="bg-gray-50 min-h-screen" dir="rtl">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">لوحة التحكم (تاجر)</h1>
            <p className="text-sm text-gray-600">مرحباً، {user.full_name}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/cars">
              <Button variant="outline" size="sm">
                <CarIcon className="w-4 h-4 ml-2" />
                تصفح السوق
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 ml-2" />
              خروج
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <Card>
                <CardContent className="p-6 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">فرص البيع (مزايدات)</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-1">{opportunities.length}</h3>
                    </div>
                    <AlertCircle className="w-8 h-8 text-orange-500" />
                </CardContent>
             </Card>
             <Card>
                <CardContent className="p-6 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">سياراتي المعروضة</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-1">{inventory.length}</h3>
                    </div>
                    <CarIcon className="w-8 h-8 text-blue-500" />
                </CardContent>
             </Card>
             <Card>
                <CardContent className="p-6 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">إجمالي المبيعات</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-1">{deals.length}</h3>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-500" />
                </CardContent>
             </Card>
        </div>

        <Tabs defaultValue="opportunities" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="opportunities" className="relative">
                    فرص البيع
                    {opportunities.length > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                            {opportunities.length}
                        </span>
                    )}
                </TabsTrigger>
                <TabsTrigger value="inventory">المخزون</TabsTrigger>
                <TabsTrigger value="deals">سجل الصفقات</TabsTrigger>
            </TabsList>

            {/* Opportunities (Pending Bids) */}
            <TabsContent value="opportunities" className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">عروض الشراء المتاحة</h2>
                    <p className="text-sm text-gray-500">الأسبقية لمن يقبل العرض أولاً</p>
                </div>

                {opportunities.length === 0 ? (
                    <Card>
                        <CardContent className="p-12 text-center text-gray-500">
                            <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <p>لا توجد عروض شراء معلقة حالياً.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {opportunities.map((bid) => {
                            const config = bid.configuration
                            return (
                                <Card key={bid.id} className="overflow-hidden border-l-4 border-l-orange-500">
                                    <div className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className="bg-orange-100 p-3 rounded-full">
                                                <DollarSign className="w-6 h-6 text-orange-600" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg text-gray-900">
                                                    عرض بقيمة {formatPrice(bid.bid_price)}
                                                </h3>
                                                <p className="text-sm text-gray-600">
                                                    على سيارة: {config.make} {config.model} {config.year} - {config.trim}
                                                </p>
                                                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                                    <span>قبل {new Date(bid.created_at).toLocaleTimeString('ar-SA')}</span>
                                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full">رسوم الالتزام مدفوعة</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                             <div className="text-left">
                                                <p className="text-xs text-gray-500">صافي العرض المقدر</p>
                                                <p className="font-bold text-gray-900">{formatPrice(bid.net_offer_amount || bid.bid_price - 500)}</p>
                                             </div>
                                             <Button 
                                                onClick={() => handleAcceptBid(bid.id, bid.bid_price)} 
                                                disabled={isProcessing}
                                                className="bg-green-600 hover:bg-green-700 text-white min-w-[120px]"
                                             >
                                                {isProcessing ? 'جاري القبول...' : 'قبول العرض'}
                                             </Button>
                                        </div>
                                    </div>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </TabsContent>

            {/* Inventory */}
            <TabsContent value="inventory" className="space-y-4">
                 <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">المخزون الحالي</h2>
                    <Link href="/dealer/cars/add">
                        <Button>
                            <PlusCircle className="w-4 h-4 ml-2" />
                            إضافة سيارة
                        </Button>
                    </Link>
                </div>
                
                {inventory.length === 0 ? (
                    <Card><CardContent className="p-8 text-center text-gray-500">لا يوجد مخزون حالياً.</CardContent></Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {inventory.map((item) => (
                            <Card key={item.id} className="flex flex-col">
                                <CardHeader className="p-4 pb-0">
                                    <div className="flex justify-between items-start">
                                        <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>
                                            {item.status === 'active' ? 'نشط' : item.status}
                                        </Badge>
                                        {item.quantity === 0 && <Badge variant="destructive">نفذت الكمية</Badge>}
                                    </div>
                                    <CardTitle className="mt-2 text-lg">
                                        {item.configuration.make} {item.configuration.model} {item.configuration.year}
                                    </CardTitle>
                                    <CardDescription>{item.configuration.trim}</CardDescription>
                                </CardHeader>
                                <CardContent className="p-4 pt-4 flex-1 flex flex-col justify-end">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-sm text-gray-500">الكمية: {item.quantity}</span>
                                        <span className="font-bold text-primary">{formatPrice(item.configuration.msrp)}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <Link href={`/cars/${item.car_configuration_id}`} className="flex-1">
                                            <Button variant="outline" className="w-full">عرض الصفحة</Button>
                                        </Link>
                                        {/* Future: Edit Quantity Button */}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </TabsContent>

            {/* Deals */}
            <TabsContent value="deals" className="space-y-4">
                <h2 className="text-xl font-semibold">سجل الصفقات</h2>
                {deals.length === 0 ? (
                    <Card><CardContent className="p-8 text-center text-gray-500">لا توجد صفقات سابقة.</CardContent></Card>
                ) : (
                    <div className="space-y-4">
                        {deals.map(deal => {
                            const config = (deal as any).configuration
                            const buyer = (deal as any).buyer
                            return (
                                <Card key={deal.id}>
                                    <CardContent className="p-6 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="font-bold text-gray-900">
                                                    {config?.make} {config?.model} {config?.year} - {config?.trim}
                                                </h3>
                                                <p className="text-sm text-gray-500">بتاريخ {new Date(deal.created_at).toLocaleDateString('ar-SA')}</p>
                                            </div>
                                            <div className="text-left">
                                                <p className="font-bold text-primary">{formatPrice(deal.final_price)}</p>
                                                <Badge variant={deal.status === 'completed' ? 'default' : 'secondary'}>
                                                    {deal.status === 'pending_payment' ? 'في انتظار الدفع' : deal.status === 'completed' ? 'مكتملة' : deal.status}
                                                </Badge>
                                            </div>
                                        </div>
                                        {/* Buyer Contact Info */}
                                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                                            <h4 className="font-semibold text-blue-900 mb-2">معلومات المشتري</h4>
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <span className="text-gray-600">الاسم: </span>
                                                    <span className="font-medium">{buyer?.full_name || 'غير متوفر'}</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-600">الجوال: </span>
                                                    <span className="font-medium" dir="ltr">{buyer?.phone || buyer?.email || 'غير متوفر'}</span>
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

