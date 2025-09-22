'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { BidInput } from '@/components/bid-input'
import { BidLeaderboard } from '@/components/bid-leaderboard'
import { Car, Bid } from '@/lib/supabase'
import { getCarById, getCarBids } from '@/lib/cars'
import { getCurrentUser } from '@/lib/auth'
import { 
  ArrowRight, 
  Calendar, 
  MapPin, 
  Gauge, 
  Fuel, 
  Settings,
  Shield,
  Phone,
  MessageCircle,
  Star,
  Verified,
  Clock,
  Users
} from 'lucide-react'

export default function CarDetailPage() {
  const params = useParams()
  const carId = params.id as string
  
  const [car, setCar] = useState<Car | null>(null)
  const [bids, setBids] = useState<Bid[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [currentUserBid, setCurrentUserBid] = useState<number | undefined>()
  const [isLoading, setIsLoading] = useState(true)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  const dealerRatingDisplay =
    typeof car?.dealer?.rating === 'number'
      ? car.dealer.rating.toFixed(1)
      : '-'

  const dealerSalesDisplay =
    typeof car?.dealer?.total_sales === 'number'
      ? car.dealer.total_sales.toLocaleString('ar-SA')
      : '-'


  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price)
  }

  const loadCarData = async () => {
    setIsLoading(true)
    
    // Load car details
    const { data: carData, error: carError } = await getCarById(carId)
    if (carData) {
      setCar(carData)
    }

    // Load current user
    const user = await getCurrentUser()
    setCurrentUser(user)

    // Load bids
    const { data: bidsData } = await getCarBids(carId)
    if (bidsData) {
      setBids(bidsData)
      
      // Find current user's bid
      if (user) {
        const userBid = bidsData.find(bid => bid.buyer_id === user.id)
        if (userBid) {
          setCurrentUserBid(userBid.bid_price)
        }
      }
    }

    setIsLoading(false)
  }

  useEffect(() => {
    if (carId) {
      loadCarData()
    }
  }, [carId])

  const handleBidPlaced = (bidPrice: number) => {
    setCurrentUserBid(bidPrice)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="h-96 bg-gray-200 rounded-lg"></div>
                <div className="grid grid-cols-4 gap-2">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="h-24 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
              <div className="space-y-6">
                <div className="h-40 bg-gray-200 rounded-lg"></div>
                <div className="h-60 bg-gray-200 rounded-lg"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!car) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">السيارة غير موجودة</h1>
          <Link href="/">
            <Button>العودة للرئيسية</Button>
          </Link>
        </div>
      </div>
    )
  }

  const images = car.images?.length > 0 ? car.images : [
    'https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1719648/pexels-photo-1719648.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/2127733/pexels-photo-2127733.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1638459/pexels-photo-1638459.jpeg?auto=compress&cs=tinysrgb&w=800'
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ArrowRight className="w-4 h-4" />
              العودة للسيارات
            </Link>
            
            <div className="flex items-center gap-4">
              {!currentUser && (
                <>
                  <Link href="/auth/login">
                    <Button variant="outline" size="sm">تسجيل الدخول</Button>
                  </Link>
                  <Link href="/auth/register">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700">
                      حساب جديد
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Car title and basic info */}
            <div>
              <div className="flex items-center gap-4 mb-4">
                <h1 className="text-3xl font-bold text-gray-900">
                  {car.make} {car.model}
                </h1>
                {car.featured && (
                  <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black">
                    مميز
                  </Badge>
                )}
                {car.available_quantity < car.original_quantity && (
                  <Badge variant="destructive">
                    {car.available_quantity} متبقي
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-6 text-gray-600 mb-4">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{car.year}</span>
                </div>
                {car.dealer && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{car.dealer.city}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>منذ {new Date(car.created_at).toLocaleDateString('ar-SA')}</span>
                </div>
              </div>

              {car.variant && (
                <p className="text-lg text-gray-700 mb-4">{car.variant}</p>
              )}
            </div>

            {/* Image gallery */}
            <Card>
              <CardContent className="p-0">
                <div className="relative">
                  <Image
                    src={images[selectedImageIndex]}
                    alt={`${car.make} ${car.model}`}
                    width={800}
                    height={500}
                    className="w-full h-[500px] object-cover rounded-t-lg"
                  />
                  
                  {/* Image navigation */}
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                    <div className="flex gap-2 bg-black/50 rounded-lg p-2">
                      {images.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedImageIndex(index)}
                          className={`w-3 h-3 rounded-full transition-colors ${
                            selectedImageIndex === index ? 'bg-white' : 'bg-white/50'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Thumbnail strip */}
                <div className="grid grid-cols-4 gap-2 p-4">
                  {images.slice(0, 4).map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`relative rounded-lg overflow-hidden ${
                        selectedImageIndex === index ? 'ring-2 ring-green-500' : ''
                      }`}
                    >
                      <Image
                        src={image}
                        alt={`صورة ${index + 1}`}
                        width={200}
                        height={150}
                        className="w-full h-24 object-cover hover:scale-105 transition-transform"
                      />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Specifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  المواصفات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <div>
                      <div className="text-sm text-gray-500">السنة</div>
                      <div className="font-medium">{car.year}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-gray-500" />
                    <div>
                      <div className="text-sm text-gray-500">المحرك</div>
                      <div className="font-medium">
                        {car.specifications?.engine || 'غير محدد'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Fuel className="w-4 h-4 text-gray-500" />
                    <div>
                      <div className="text-sm text-gray-500">نوع الوقود</div>
                      <div className="font-medium">
                        {car.specifications?.fuel_type || 'بنزين'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-gray-500" />
                    <div>
                      <div className="text-sm text-gray-500">ناقل الحركة</div>
                      <div className="font-medium">
                        {car.specifications?.transmission || 'أوتوماتيك'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-500" />
                    <div>
                      <div className="text-sm text-gray-500">عدد المقاعد</div>
                      <div className="font-medium">
                        {car.specifications?.seats || '5'} مقاعد
                      </div>
                    </div>
                  </div>
                </div>

                {car.description && (
                  <>
                    <Separator className="my-4" />
                    <div>
                      <h4 className="font-medium mb-2">الوصف</h4>
                      <p className="text-gray-700 leading-relaxed">{car.description}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Dealer info */}
            {car.dealer && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    معلومات التاجر
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-4">
                    {car.dealer.logo_url && (
                      <Image
                        src={car.dealer.logo_url}
                        alt={car.dealer.company_name}
                        width={80}
                        height={80}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                    )}
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold">{car.dealer.company_name}</h3>
                        {car.dealer.verified && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Verified className="w-3 h-3" />
                            معتمد
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>{car.dealer.city}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span>{dealerRatingDisplay}</span>
                        </div>
                        <div className="text-gray-500">
                          {dealerSalesDisplay} عملية بيع
                        </div>
                      </div>

                      {car.dealer.description && (
                        <p className="text-gray-700 text-sm mb-4">{car.dealer.description}</p>
                      )}

                      <div className="flex gap-3">
                        <Button variant="outline" size="sm">
                          <Phone className="w-4 h-4 mr-2" />
                          اتصال
                        </Button>
                        <Button variant="outline" size="sm">
                          <MessageCircle className="w-4 h-4 mr-2" />
                          واتساب
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Price info */}
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="text-center text-2xl">
                  سعر الوكالة: {formatPrice(car.wakala_price)}
                </CardTitle>
                {car.min_bid_price && (
                  <p className="text-center text-sm text-gray-600">
                    الحد الأدنى للمزايدة: {formatPrice(car.min_bid_price)}
                  </p>
                )}
              </CardHeader>
            </Card>

            {/* Bid input */}
            <BidInput
              carId={car.id}
              wakalaPrice={car.wakala_price}
              minBidPrice={car.min_bid_price}
              currentUserBid={currentUserBid}
              onBidPlaced={handleBidPlaced}
              userId={currentUser?.id}
            />

            {/* Bid leaderboard */}
            <BidLeaderboard
              carId={car.id}
              wakalaPrice={car.wakala_price}
              currentUserBid={currentUserBid}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
