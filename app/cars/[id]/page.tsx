'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { BidInput } from '@/components/bid-input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { supabase, CarConfiguration, Bid, Deal } from '@/lib/supabase'
import { getConfigById, getConfigBids } from '@/lib/cars'
import { getCurrentUser } from '@/lib/auth'
import { 
  ArrowRight, 
  Calendar, 
  MapPin, 
  Gauge, 
  Fuel, 
  Settings,
  Shield,
  Clock,
  Users,
  Building2,
  CheckCircle2,
  TrendingUp
} from 'lucide-react'

// Extended type for Inventory with Dealer info
interface InventoryItem {
  id: string
  quantity: number
  status: string
  dealer: {
    company_name: string
    city: string
    verified: boolean
  }
}

export default function CarDetailPage() {
  const params = useParams()
  const configId = params.id as string
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [config, setConfig] = useState<CarConfiguration | null>(null)
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [bids, setBids] = useState<Bid[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [currentUserBid, setCurrentUserBid] = useState<number | undefined>()
  const [isBidLocked, setIsBidLocked] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showPayResult, setShowPayResult] = useState(false)
  const [payStatus, setPayStatus] = useState<'success' | 'failed' | 'error' | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [confirmedDeals, setConfirmedDeals] = useState<Deal[]>([])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price)
  }

  const loadData = async () => {
    setIsLoading(true)
    
    // 1. Load Config
    const { data: configData } = await getConfigById(configId)
    if (configData) {
      setConfig(configData)
    }

    // 2. Load Inventory (Dealers who have this)
    const { data: invData } = await supabase
        .from('dealer_inventory')
        .select(`
            id, quantity, status,
            dealer:dealers(company_name, city, verified)
        `)
        .eq('car_configuration_id', configId)
        .eq('status', 'active')
        .gt('quantity', 0)
    
    if (invData) {
        setInventory(invData as any)
    }

    // 3. Load User & Bids
    const user = await getCurrentUser()
    setCurrentUser(user)

    const { data: bidsData } = await getConfigBids(configId)
    if (bidsData) {
      setBids(bidsData)
      if (user) {
        const userBid = bidsData.find(bid => bid.buyer_id === user.id)
        if (userBid) {
          setCurrentUserBid(userBid.bid_price)
          setIsBidLocked(Boolean(userBid.commitment_fee_paid))
        }
      }
    }

    // 4. Load Confirmed Deals for this config (for leaderboard)
    const { data: dealsData } = await supabase
      .from('deals')
      .select('id, final_price, status, created_at')
      .eq('car_configuration_id', configId)
      .order('final_price', { ascending: true })
    
    if (dealsData) {
      setConfirmedDeals(dealsData as any)
    }

    setIsLoading(false)
  }

  useEffect(() => {
    if (configId) {
      loadData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configId])

  // Watch for payment status in query
  useEffect(() => {
    const status = searchParams?.get('pay') as 'success' | 'failed' | 'error' | null
    if (status) {
      setPayStatus(status)
      setShowPayResult(true)
    }
  }, [searchParams])

  const closePayResult = () => {
    setShowPayResult(false)
    setPayStatus(null)
    const url = new URL(window.location.href)
    url.searchParams.delete('pay')
    router.replace(url.pathname + url.search)
    loadData()
  }

  const handleBidPlaced = (bidPrice: number) => {
    setCurrentUserBid(bidPrice)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
          <div className="container mx-auto space-y-6 animate-pulse">
            <div className="h-8 bg-gray-200 w-1/4 rounded"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               <div className="col-span-2 h-96 bg-gray-200 rounded"></div>
               <div className="h-96 bg-gray-200 rounded"></div>
            </div>
          </div>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">السيارة غير موجودة</h1>
          <Link href="/cars">
            <Button>العودة للسيارات</Button>
          </Link>
        </div>
      </div>
    )
  }

  const totalQuantity = inventory.reduce((sum, item) => sum + item.quantity, 0)
  const dealerCount = inventory.length
  
  // Use config images or fallback
  const images = config.images?.length > 0 ? config.images : [
    'https://images.pexels.com/photos/170811/pexels-photo-170811.jpeg?auto=compress&cs=tinysrgb&w=800'
  ]

  return (
    <div className="min-h-screen bg-gray-50 text-right" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/cars" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ArrowRight className="w-4 h-4" />
              <span>العودة للسيارات</span>
            </Link>
            
            {!currentUser && (
               <Link href="/auth/login">
                  <Button variant="outline" size="sm">تسجيل الدخول</Button>
               </Link>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content (Right) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Title & Stats */}
            <div>
               <div className="flex items-center gap-3 mb-2">
                 <h1 className="text-3xl font-bold text-gray-900">
                   {config.make} {config.model} {config.year}
                 </h1>
                 <Badge variant="outline" className="text-sm">
                    {config.trim}
                 </Badge>
               </div>
               <div className="flex items-center gap-4 text-gray-600">
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-none">
                     متاح {totalQuantity} سيارة
                  </Badge>
                  <span className="text-sm">لدى {dealerCount} وكلاء</span>
               </div>
            </div>

            {/* Image Gallery */}
            <Card className="overflow-hidden border-0 shadow-lg">
               <div className="relative h-[400px] w-full bg-gray-100">
                  <Image
                    src={images[selectedImageIndex]}
                    alt={`${config.make} ${config.model}`}
                    fill
                    className="object-cover"
                  />
               </div>
               {images.length > 1 && (
                 <div className="flex gap-2 p-4 overflow-x-auto">
                    {images.map((img, idx) => (
                       <button 
                         key={idx}
                         onClick={() => setSelectedImageIndex(idx)}
                         className={`relative w-20 h-14 rounded-md overflow-hidden border-2 transition-all ${
                             selectedImageIndex === idx ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100'
                         }`}
                       >
                         <Image src={img} alt="thumbnail" fill className="object-cover" />
                       </button>
                    ))}
                 </div>
               )}
            </Card>

            {/* Specifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-gray-500" />
                  المواصفات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                   <div className="space-y-1">
                      <span className="text-xs text-gray-500 flex items-center gap-1"><Calendar className="w-3 h-3"/> السنة</span>
                      <p className="font-medium">{config.year}</p>
                   </div>
                   <div className="space-y-1">
                      <span className="text-xs text-gray-500 flex items-center gap-1"><Gauge className="w-3 h-3"/> المحرك</span>
                      <p className="font-medium">{config.specifications?.engine || '-'}</p>
                   </div>
                   <div className="space-y-1">
                      <span className="text-xs text-gray-500 flex items-center gap-1"><Fuel className="w-3 h-3"/> الوقود</span>
                      <p className="font-medium">{config.specifications?.fuel_type || 'بنزين'}</p>
                   </div>
                   <div className="space-y-1">
                      <span className="text-xs text-gray-500 flex items-center gap-1"><Settings className="w-3 h-3"/> القير</span>
                      <p className="font-medium">{config.specifications?.transmission || 'أوتوماتيك'}</p>
                   </div>
                </div>
                {config.description && (
                   <>
                     <Separator className="my-4" />
                     <p className="text-gray-600 leading-relaxed">{config.description}</p>
                   </>
                )}
              </CardContent>
            </Card>

            {/* Availability Info - No dealer names shown */}
            <Card>
               <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-gray-500" />
                    التوفر
                 </CardTitle>
               </CardHeader>
               <CardContent>
                  <div className="text-center py-4">
                     <div className="text-3xl font-bold text-green-600">{totalQuantity}</div>
                     <div className="text-sm text-gray-500">سيارة متاحة من {dealerCount} تاجر</div>
                     <p className="text-xs text-gray-400 mt-2">
                        ستظهر معلومات التاجر بعد قبول عرضك
                     </p>
                  </div>
               </CardContent>
            </Card>

          </div>

          {/* Sidebar (Left) */}
          <div className="space-y-6">
            
            {/* Bid Input Card */}
            <BidInput
               configId={config.id}
               msrp={config.msrp}
               currentUserBid={currentUserBid}
               userId={currentUser?.id}
               locked={isBidLocked}
               onBidPlaced={handleBidPlaced}
               // Note: We could aggregate price_slots from inventory if needed
               priceSlots={[]} 
            />

            {/* Recent Activity / Stats */}
            <Card>
               <CardHeader>
                  <CardTitle className="text-sm text-gray-500 uppercase tracking-wider">نشاط العروض</CardTitle>
               </CardHeader>
               <CardContent>
                  <div className="text-center py-2">
                     <div className="text-3xl font-bold text-gray-900">{bids.length}</div>
                     <div className="text-sm text-gray-500">عرض مقدم حتى الآن</div>
                  </div>
               </CardContent>
            </Card>

            {/* Leaderboard 1: Top Confirmed Sales (Lowest Price) */}
            <Card>
               <CardHeader>
                  <CardTitle className="text-sm text-gray-500 uppercase tracking-wider flex items-center gap-2">
                     <TrendingUp className="w-4 h-4" />
                     أفضل الصفقات المؤكدة
                  </CardTitle>
               </CardHeader>
               <CardContent>
                  {confirmedDeals.length === 0 ? (
                     <div className="text-center text-gray-400 text-sm py-4">لا توجد صفقات مؤكدة بعد</div>
                  ) : (
                     <div className="space-y-2">
                        {confirmedDeals.slice(0, 5).map((deal, idx) => (
                           <div key={deal.id} className="flex justify-between items-center text-sm p-2 bg-green-50 rounded-md">
                              <span className="text-gray-600 flex items-center gap-2">
                                 <span className="w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                                 صفقة مؤكدة
                              </span>
                              <span className="font-bold text-green-700">{formatPrice(deal.final_price)}</span>
                           </div>
                        ))}
                     </div>
                  )}
               </CardContent>
            </Card>

            {/* Leaderboard 2: All Buyer Offers */}
            <Card>
               <CardHeader>
                  <CardTitle className="text-sm text-gray-500 uppercase tracking-wider flex items-center gap-2">
                     <Users className="w-4 h-4" />
                     جميع العروض المقدمة
                  </CardTitle>
               </CardHeader>
               <CardContent>
                  {bids.length === 0 ? (
                     <div className="text-center text-gray-400 text-sm py-4">كن أول من يقدم عرضاً!</div>
                  ) : (
                     <div className="space-y-2">
                        {bids.slice(0, 10).map((bid, idx) => (
                           <div key={bid.id} className={`flex justify-between items-center text-sm p-2 rounded-md ${
                              bid.status === 'accepted' ? 'bg-green-50' : bid.status === 'pending' && bid.commitment_fee_paid ? 'bg-blue-50' : 'bg-gray-50'
                           }`}>
                              <span className="text-gray-600 flex items-center gap-2">
                                 <span className="w-5 h-5 bg-gray-400 text-white rounded-full flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                                 {bid.buyer_id === currentUser?.id ? 'أنت' : 'مزايد'}
                                 {bid.status === 'accepted' && <Badge className="text-xs bg-green-100 text-green-700">مقبول</Badge>}
                                 {bid.status === 'pending' && bid.commitment_fee_paid && <Badge className="text-xs bg-blue-100 text-blue-700">مؤكد</Badge>}
                              </span>
                              <span className="font-medium">{formatPrice(bid.bid_price)}</span>
                           </div>
                        ))}
                     </div>
                  )}
               </CardContent>
            </Card>

          </div>

        </div>
      </div>

      {/* Payment Result Dialog */}
      <Dialog open={showPayResult} onOpenChange={(o)=>{ if(!o) closePayResult() }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {payStatus === 'success' ? 'تم الدفع بنجاح' : payStatus === 'failed' ? 'فشل الدفع' : 'حدث خطأ'}
            </DialogTitle>
            <DialogDescription>
              {payStatus === 'success'
                ? 'تم تأكيد عرضك بنجاح. سيتم إشعار الوكلاء فوراً.'
                : payStatus === 'failed'
                ? 'تعذر إتمام عملية الدفع. يرجى المحاولة مرة أخرى.'
                : 'حدث خطأ أثناء التحقق من عملية الدفع.'}
            </DialogDescription>
          </DialogHeader>
          <div className="pt-2">
            <button onClick={closePayResult} className="w-full rounded-md bg-primary px-4 py-2 text-white hover:bg-primary/90">حسناً</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}


