'use client'

import { Car } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Eye, MapPin, Calendar, Fuel } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

interface CarCardProps {
  car: Car
  showBidStats?: boolean
}

export function CarCard({ car, showBidStats = false }: CarCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price)
  }

  const mainImage = car.images && car.images.length > 0 
    ? car.images[0] 
    : `https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=400`

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-0 shadow-md">
      <CardHeader className="p-0">
        <div className="relative overflow-hidden rounded-t-lg">
          <Image
            src={mainImage}
            alt={`${car.make} ${car.model}`}
            width={400}
            height={240}
            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {car.featured && (
            <Badge className="absolute top-3 left-3 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black border-0">
              مميز
            </Badge>
          )}
          {car.available_quantity < car.original_quantity && (
            <Badge className="absolute top-3 right-3 bg-red-500 text-white border-0">
              {car.available_quantity} متبقي
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-4 space-y-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-green-600 transition-colors">
            {car.make} {car.model}
          </h3>
          <p className="text-sm text-gray-600">{car.variant}</p>
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{car.year}</span>
          </div>
          {car.dealer && (
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span>{car.dealer.city}</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">سعر الوكالة</span>
            <span className="text-lg font-bold text-gray-900">
              {formatPrice(car.wakala_price)}
            </span>
          </div>
          
          {car.min_bid_price && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">الحد الأدنى للمزايدة</span>
              <span className="text-sm font-medium text-green-600">
                {formatPrice(car.min_bid_price)}
              </span>
            </div>
          )}
        </div>

        {showBidStats && (
          <div className="bg-green-50 rounded-lg p-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">المزايدات النشطة</span>
              <span className="font-medium text-green-600">12 مزايدة</span>
            </div>
            <div className="flex justify-between items-center text-sm mt-1">
              <span className="text-gray-600">أعلى مزايدة</span>
              <span className="font-medium text-green-600">
                {formatPrice(car.wakala_price * 0.95)}
              </span>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <div className="w-full space-y-2">
          <Link href={`/cars/${car.id}`} className="block">
            <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
              <Eye className="w-4 h-4 mr-2" />
              عرض التفاصيل والمزايدة
            </Button>
          </Link>
          
          {car.dealer?.verified && (
            <div className="flex items-center justify-center gap-1 text-xs text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>تاجر معتمد</span>
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}