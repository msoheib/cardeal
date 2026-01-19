'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CarConfiguration, supabase } from '@/lib/supabase'
import { getAvailableConfigurations, getCarMakes } from '@/lib/cars'
import { getCurrentUser } from '@/lib/auth'
import { CarCard } from '@/components/car-card'
import { Search, Filter } from 'lucide-react'

interface FiltersState {
  make: string
  priceFrom: string
  priceTo: string
  search: string
}

export interface CarsBrowseContentProps {
  showDashboardLink?: boolean
}

export function CarsBrowseContent({ showDashboardLink = true }: CarsBrowseContentProps) {
  const [configs, setConfigs] = useState<CarConfiguration[]>([])
  const [makes, setMakes] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [appliedConfigIds, setAppliedConfigIds] = useState<string[]>([])
  const [filters, setFilters] = useState<FiltersState>({
    make: 'all',
    priceFrom: '',
    priceTo: '',
    search: '',
  })

  const loadCars = async () => {
    setIsLoading(true)
    const filtersToApply: any = {}

    if (filters.make !== 'all') filtersToApply.make = filters.make
    if (filters.priceFrom) filtersToApply.priceFrom = parseInt(filters.priceFrom, 10)
    if (filters.priceTo) filtersToApply.priceTo = parseInt(filters.priceTo, 10)
    if (filters.search) filtersToApply.search = filters.search

    const { data } = await getAvailableConfigurations(filtersToApply)
    if (data) {
      setConfigs(data)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const loadApplied = async () => {
      try {
        const user = await getCurrentUser()
        if (!user) {
          setAppliedConfigIds([])
          return
        }

        const { data, error } = await supabase
          .from('bids')
          .select('car_configuration_id, status')
          .eq('buyer_id', user.id)
          .in('status', ['pending', 'accepted']) 
        
        if (data) {
          const ids = Array.from(new Set(data.map((b: any) => b.car_configuration_id).filter(Boolean)))
          setAppliedConfigIds(ids as string[])
        }
      } catch (error) {
        console.error('Failed to load applied', error)
      }
    }
    loadApplied()
  }, [])

  useEffect(() => {
    const handle = setTimeout(loadCars, 400)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks-exhaustive-deps
  }, [filters])

  const { appliedConfigs, remainingConfigs } = useMemo(() => {
    if (configs.length === 0) return { appliedConfigs: [], remainingConfigs: [] }
    
    if (appliedConfigIds.length === 0) return { appliedConfigs: [], remainingConfigs: [...configs] }

    const appliedSet = new Set(appliedConfigIds)
    const applied: CarConfiguration[] = []
    const remaining: CarConfiguration[] = []
    
    configs.forEach(c => {
        if (appliedSet.has(c.id)) applied.push(c)
        else remaining.push(c)
    })
    
    return { appliedConfigs: applied, remainingConfigs: remaining }
  }, [configs, appliedConfigIds])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Persistent Header */}
      <header className="sticky top-0 z-50 border-b bg-white shadow-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">تصفح السيارات المتاحة</h1>
            <p className="text-sm text-gray-600">ابحث عن السيارات المناسبة وقم بتقديم عروضك فوراً</p>
          </div>
          {showDashboardLink && (
            <Link href="/dashboard">
              <Button variant="outline">العودة للوحة التحكم</Button>
            </Link>
          )}
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8 items-start">
        {/* Sidebar Filters - Sticky on Desktop */}
        <aside className="w-full lg:w-80 shrink-0 lg:sticky lg:top-24 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                أدوات التصفية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="ابحث بالماركة..."
                  value={filters.search}
                  onChange={(event) => setFilters({ ...filters, search: event.target.value })}
                  className="pr-10"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">الماركة</label>
                <Select
                  value={filters.make}
                  onValueChange={(value) => setFilters({ ...filters, make: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الماركة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الماركات</SelectItem>
                    {makes.map((make) => (
                      <SelectItem key={make} value={make}>
                        {make}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="dates-y-2">
                <label className="text-sm font-medium">نطاق السعر</label>
                <div className="flex items-center gap-2">
                   <Input
                    type="number"
                    placeholder="الأدنى"
                    value={filters.priceFrom}
                    onChange={(event) => setFilters({ ...filters, priceFrom: event.target.value })}
                  />
                  <span className="text-gray-400">-</span>
                  <Input
                    type="number"
                    placeholder="الأعلى"
                    value={filters.priceTo}
                    onChange={(event) => setFilters({ ...filters, priceTo: event.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>

        {/* Main Content */}
        <main className="flex-1 w-full">
          {/* Applied Cars Section */}
          {!isLoading && appliedConfigs.length > 0 && (
            <section className="mb-8 space-y-4 bg-blue-50/50 p-6 rounded-xl border border-blue-100">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-blue-900">سياراتك الحالية</h2>
                  <p className="text-sm text-blue-600">السيارات التي قمت بتقديم عروض عليها</p>
                </div>
                <span className="bg-blue-200 text-blue-800 px-3 py-1 rounded-full text-xs font-bold">
                  {appliedConfigs.length} سيارة
                </span>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {appliedConfigs.map((config) => (
                  <CarCard key={`applied-${config.id}`} config={config} showBidStats isApplied />
                ))}
              </div>
            </section>
          )}

          {/* Results Header */}
          <div className="mb-6 flex items-center justify-between">
             <h2 className="text-lg font-bold text-gray-800">
                {isLoading ? 'جاري التحميل...' : `${remainingConfigs.length} سيارة متاحة`}
             </h2>
             {/* Sort could go here */}
          </div>

          {/* Listings Grid */}
          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <Card key={item} className="animate-pulse">
                  <div className="h-48 rounded-t-lg bg-gray-200" />
                  <CardContent className="space-y-3 p-4">
                    <div className="h-4 w-3/4 rounded bg-gray-200" />
                    <div className="h-4 w-1/2 rounded bg-gray-200" />
                    <div className="h-8 rounded bg-gray-200" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : configs.length === 0 ? (
            <Card className="py-16 text-center bg-gray-50 border-dashed">
              <CardContent>
                <div className="mx-auto w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <h2 className="mb-2 text-xl font-semibold text-gray-900">لا توجد نتائج</h2>
                <p className="text-gray-600">لم نعثر على سيارات تطابق خيارات البحث الحالية.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {remainingConfigs.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {remainingConfigs.map((config) => (
                    <CarCard key={config.id} config={config} showBidStats />
                  ))}
                </div>
              ) : (
                 // If all cars are applied to
                 appliedConfigs.length === 0 && (
                   <div className="text-center py-12 text-gray-500">لا توجد سيارات متاحة حالياً.</div>
                 )
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}


