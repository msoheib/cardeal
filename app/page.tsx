'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CarCard } from '@/components/car-card'
import { Car } from '@/lib/supabase'
import { getCars, getCarMakes } from '@/lib/cars'
import { Search, Filter, Star, TrendingUp, Users, Shield } from 'lucide-react'

export default function HomePage() {
  const [cars, setCars] = useState<Car[]>([])
  const [makes, setMakes] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState({
    make: 'all',
    priceFrom: '',
    priceTo: '',
    search: ''
  })

  const loadCars = async () => {
    setIsLoading(true)
    const filtersToApply: any = {}
    
    const selectedMake = filters.make === 'all' ? '' : filters.make
    if (selectedMake) filtersToApply.make = selectedMake
    if (filters.priceFrom) filtersToApply.priceFrom = parseInt(filters.priceFrom)
    if (filters.priceTo) filtersToApply.priceTo = parseInt(filters.priceTo)

    const { data, error } = await getCars(filtersToApply)
    if (data) {
      let filteredCars = data
      if (filters.search) {
        filteredCars = data.filter(car => 
          car.make.toLowerCase().includes(filters.search.toLowerCase()) ||
          car.model.toLowerCase().includes(filters.search.toLowerCase())
        )
      }
      setCars(filteredCars)
    }
    setIsLoading(false)
  }

  const loadMakes = async () => {
    const { data } = await getCarMakes()
    if (data) setMakes(data)
  }

  useEffect(() => {
    loadCars()
    loadMakes()
  }, [])

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      loadCars()
    }, 500)

    return () => clearTimeout(debounceTimer)
  }, [filters])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-green-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">م</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">منصة المزايدات</h1>
                <p className="text-sm text-gray-600">وفر أكثر، ادفع أقل</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Link href="/auth/login">
                <Button variant="outline" size="sm">تسجيل الدخول</Button>
              </Link>
              <Link href="/auth/register">
                <Button size="sm" className="bg-green-600 hover:bg-green-700">
                  حساب جديد
                </Button>
              </Link>
              
              {/* Test Accounts Info */}
              <div className="hidden lg:flex items-center gap-2 text-xs text-gray-500 bg-gray-100 px-3 py-2 rounded">
                <span>حسابات تجريبية:</span>
                <span>buyer@test.com</span>
                <span>•</span>
                <span>dealer@test.com</span>
                <span>•</span>
                <span>admin@test.com</span>
                <span>(كلمة المرور: test123)</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 text-center">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              منصة المزايدات العكسية للسيارات
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              زايد على السيارات بأسعار أقل من الوكالة واحصل على أفضل العروض من التجار المعتمدين
            </p>
            
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <Card className="text-center">
                <CardContent className="p-6">
                  <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">15%</div>
                  <div className="text-sm text-gray-600">متوسط الوفر</div>
                </CardContent>
              </Card>
              
              <Card className="text-center">
                <CardContent className="p-6">
                  <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">10,000+</div>
                  <div className="text-sm text-gray-600">مشتري راضي</div>
                </CardContent>
              </Card>
              
              <Card className="text-center">
                <CardContent className="p-6">
                  <Shield className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">500+</div>
                  <div className="text-sm text-gray-600">تاجر معتمد</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Search and Filters */}
      <section className="pb-8">
        <div className="container mx-auto px-4">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                البحث والتصفية
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="البحث عن السيارة..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="pr-10"
                  />
                </div>
                
                <Select
                  value={filters.make}
                  onValueChange={(value) => setFilters({ ...filters, make: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="الماركة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الماركات</SelectItem>
                    {makes.map((make) => (
                      <SelectItem key={make} value={make}>{make}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  type="number"
                  placeholder="السعر من"
                  value={filters.priceFrom}
                  onChange={(e) => setFilters({ ...filters, priceFrom: e.target.value })}
                />

                <Input
                  type="number"
                  placeholder="السعر إلى"
                  value={filters.priceTo}
                  onChange={(e) => setFilters({ ...filters, priceTo: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Cars Grid */}
      <section className="pb-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-bold text-gray-900">
              السيارات المتاحة للمزايدة
            </h3>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              {cars.length} سيارة
            </Badge>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Card key={i} className="animate-pulse">
                  <div className="h-48 bg-gray-200 rounded-t-lg"></div>
                  <CardContent className="p-4 space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-8 bg-gray-200 rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : cars.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                لا توجد سيارات متطابقة
              </h3>
              <p className="text-gray-600">
                جرب تعديل معايير البحث للعثور على المزيد من السيارات
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {cars.map((car) => (
                <CarCard key={car.id} car={car} showBidStats />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
            كيف تعمل المنصة؟
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-green-600">1</span>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">
                اختر السيارة
              </h4>
              <p className="text-gray-600">
                تصفح السيارات المتاحة واختر ما يناسبك من الماركات والموديلات المختلفة
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">2</span>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">
                ضع مزايدتك
              </h4>
              <p className="text-gray-600">
                زايد بسعر أقل من سعر الوكالة وشاهد ترتيبك في قائمة المتصدرين
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-yellow-600">3</span>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">
                احصل على السيارة
              </h4>
              <p className="text-gray-600">
                عند قبول التاجر لمزايدتك، ادفع رسوم الالتزام واستلم سيارتك
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-green-600 to-green-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">م</span>
              </div>
              <span className="text-xl font-bold">منصة المزايدات</span>
            </div>
            <p className="text-gray-400 mb-6">
              المنصة الأولى للمزايدات العكسية للسيارات في المملكة العربية السعودية
            </p>
            <div className="flex justify-center gap-6">
              <Link href="/about" className="text-gray-400 hover:text-white">
                عن المنصة
              </Link>
              <Link href="/contact" className="text-gray-400 hover:text-white">
                اتصل بنا
              </Link>
              <Link href="/privacy" className="text-gray-400 hover:text-white">
                الخصوصية
              </Link>
              <Link href="/terms" className="text-gray-400 hover:text-white">
                الشروط
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}