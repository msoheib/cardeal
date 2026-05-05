'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  BadgePercent,
  Car,
  Filter,
  LayoutDashboard,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  X
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CarCard } from '@/components/car-card'
import { localizeVehicleText } from '@/lib/arabic-display'
import { formatNumber } from '@/lib/format'
import { getCurrentUser } from '@/lib/auth'
import { getAvailableConfigurations, getCarMakes, getCarOrigins } from '@/lib/cars'
import { CarConfiguration, supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface FiltersState {
  make: string
  origin_locale: string
  priceFrom: string
  priceTo: string
  search: string
}

export interface CarsBrowseContentProps {
  showDashboardLink?: boolean
}

const defaultFilters: FiltersState = {
  make: 'all',
  origin_locale: 'all',
  priceFrom: '',
  priceTo: '',
  search: ''
}

export function CarsBrowseContent({ showDashboardLink = true }: CarsBrowseContentProps) {
  const [configs, setConfigs] = useState<CarConfiguration[]>([])
  const [makes, setMakes] = useState<string[]>([])
  const [origins, setOrigins] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [appliedConfigIds, setAppliedConfigIds] = useState<string[]>([])
  const [filters, setFilters] = useState<FiltersState>(defaultFilters)

  const loadCars = useCallback(async () => {
    setIsLoading(true)

    const filtersToApply: Record<string, string | number> = {}

    if (filters.make !== 'all') filtersToApply.make = filters.make
    if (filters.origin_locale !== 'all') filtersToApply.origin_locale = filters.origin_locale
    if (filters.priceFrom) filtersToApply.priceFrom = parseInt(filters.priceFrom, 10)
    if (filters.priceTo) filtersToApply.priceTo = parseInt(filters.priceTo, 10)
    if (filters.search) filtersToApply.search = filters.search

    const { data } = await getAvailableConfigurations(filtersToApply)
    setConfigs(data ?? [])
    setIsLoading(false)
  }, [filters])

  const loadMakes = useCallback(async () => {
    const { data } = await getCarMakes()
    if (data) setMakes(data)
  }, [])

  const loadOrigins = useCallback(async () => {
    const { data } = await getCarOrigins()
    if (data) setOrigins(data)
  }, [])

  const loadApplied = useCallback(async () => {
    try {
      const user = await getCurrentUser()
      if (!user) {
        setAppliedConfigIds([])
        return
      }

      const { data } = await supabase
        .from('bids')
        .select('car_configuration_id, status')
        .eq('buyer_id', user.id)
        .in('status', ['pending', 'accepted'])

      if (data) {
        const ids = Array.from(
          new Set(data.map((bid) => bid.car_configuration_id).filter(Boolean))
        )
        setAppliedConfigIds(ids as string[])
      }
    } catch (error) {
      console.error('تعذر تحميل السيارات التي تم التقديم عليها', error)
    }
  }, [])

  useEffect(() => {
    loadMakes()
  }, [loadMakes])

  useEffect(() => {
    loadOrigins()
  }, [loadOrigins])

  useEffect(() => {
    loadApplied()
  }, [loadApplied])

  useEffect(() => {
    const handle = setTimeout(loadCars, 350)
    return () => clearTimeout(handle)
  }, [loadCars])

  const { appliedConfigs, remainingConfigs } = useMemo(() => {
    if (configs.length === 0) return { appliedConfigs: [], remainingConfigs: [] }
    if (appliedConfigIds.length === 0) {
      return { appliedConfigs: [], remainingConfigs: [...configs] }
    }

    const appliedSet = new Set(appliedConfigIds)
    const applied: CarConfiguration[] = []
    const remaining: CarConfiguration[] = []

    configs.forEach((config) => {
      if (appliedSet.has(config.id)) applied.push(config)
      else remaining.push(config)
    })

    return { appliedConfigs: applied, remainingConfigs: remaining }
  }, [configs, appliedConfigIds])

  const activeFilters = useMemo(() => {
    const items: string[] = []
    if (filters.search) items.push(`بحث: ${filters.search}`)
    if (filters.make !== 'all') items.push(`الماركة: ${localizeVehicleText(filters.make)}`)
    if (filters.origin_locale !== 'all') items.push(`المنشأ: ${localizeVehicleText(filters.origin_locale)}`)
    if (filters.priceFrom) items.push(`من ${formatNumber(Number(filters.priceFrom))} ر.س`)
    if (filters.priceTo) items.push(`إلى ${formatNumber(Number(filters.priceTo))} ر.س`)
    return items
  }, [filters])

  const hasFilters = activeFilters.length > 0
  const formattedRemainingCount = formatNumber(remainingConfigs.length)

  const clearFilters = () => setFilters(defaultFilters)

  return (
    <div
      className={cn(
        'app-gradient-bg text-foreground',
        showDashboardLink ? 'min-h-screen' : 'rounded-[2rem] py-2'
      )}
    >
      <header className="sticky top-0 z-50 border-b border-white/70 bg-white/80 backdrop-blur-xl">
        <div className="container mx-auto flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#102528] text-white">
              <Car className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-black tracking-tight text-[#102528]">
                السيارات المتاحة
              </h1>
              <p className="text-sm font-medium text-muted-foreground">
                اختر السيارة ثم قدّم عرضك برسوم التزام ثابتة.
              </p>
            </div>
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <Badge className="rounded-full border-0 bg-primary/12 px-4 py-2 text-primary hover:bg-primary/12">
              <ShieldCheck className="ml-2 h-4 w-4" />
              تجار موثّقون
            </Badge>
            <Badge className="rounded-full border-0 bg-amber-100 px-4 py-2 text-amber-800 hover:bg-amber-100">
              <BadgePercent className="ml-2 h-4 w-4" />
              رسوم 500 ر.س
            </Badge>
            {showDashboardLink && (
              <Button asChild variant="outline" className="rounded-full bg-white/80">
                <Link href="/dashboard">
                  <LayoutDashboard className="ml-2 h-4 w-4" />
                  لوحة التحكم
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <section className="container mx-auto px-4 pt-8">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-[#102528] p-6 text-white shadow-[0_32px_70px_-48px_rgba(16,37,40,0.75)] md:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_15%,rgba(20,184,166,0.32),transparent_26%),radial-gradient(circle_at_84%_20%,rgba(245,158,11,0.28),transparent_28%)]" />
          <div className="relative grid gap-8 lg:grid-cols-[1fr_380px] lg:items-end">
            <div>
              <p className="text-sm font-bold text-white/60">سوق مباشر للمخزون المعتمد</p>
              <h2 className="mt-3 max-w-3xl text-3xl font-black leading-tight text-white sm:text-4xl">
                قارن السيارات، راقب السعر، وابدأ العرض من شاشة واحدة.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/70">
                الصفحة تعرض السيارات التي يمكن تقديم عروض عليها الآن، مع فصل
                السيارات التي سبق وقدّمت عليها حتى لا تضيع بين النتائج.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-3xl bg-white/10 p-4 backdrop-blur">
                <div className="text-2xl font-black">{formattedRemainingCount}</div>
                <div className="mt-1 text-xs text-white/60">متاحة</div>
              </div>
              <div className="rounded-3xl bg-white/10 p-4 backdrop-blur">
                <div className="text-2xl font-black">{formatNumber(appliedConfigs.length)}</div>
                <div className="mt-1 text-xs text-white/60">ضمن عروضك</div>
              </div>
              <button
                type="button"
                onClick={loadCars}
                className="rounded-3xl bg-white px-4 py-3 text-right text-[#102528] transition hover:-translate-y-0.5"
              >
                <RefreshCw className="mb-2 h-5 w-5" />
                <span className="block text-xs font-black">تحديث</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto flex flex-col items-start gap-7 px-4 py-8 lg:flex-row">
        <aside className="w-full shrink-0 lg:sticky lg:top-28 lg:w-[350px]">
          <Card className="overflow-hidden rounded-[1.75rem] border-white/70 bg-white/90 shadow-[0_24px_48px_-40px_rgba(16,37,40,0.48)] backdrop-blur">
            <CardHeader className="border-b border-[#d8e7e7] bg-white/70">
              <CardTitle className="flex items-center justify-between text-[#102528]">
                <span className="flex items-center gap-2">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                    <SlidersHorizontal className="h-5 w-5" />
                  </span>
                  فلترة السوق
                </span>
                {hasFilters && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="rounded-full text-muted-foreground"
                  >
                    <X className="ml-1 h-4 w-4" />
                    مسح
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 p-5">
              <div className="relative">
                <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="ابحث بالماركة أو الموديل"
                  value={filters.search}
                  onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                  className="h-12 rounded-2xl border-[#c9dcde] bg-white pr-11 text-base"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-[#102528]">الماركة</label>
                <Select
                  value={filters.make}
                  onValueChange={(value) => setFilters((current) => ({ ...current, make: value }))}
                >
                  <SelectTrigger className="h-12 rounded-2xl border-[#c9dcde] bg-white">
                    <SelectValue placeholder="اختر الماركة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الماركات</SelectItem>
                    {makes.map((make) => (
                      <SelectItem key={make} value={make}>
                        {localizeVehicleText(make)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-[#102528]">نطاق السعر</label>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <Input
                    type="number"
                    placeholder="الأدنى"
                    value={filters.priceFrom}
                    onChange={(event) => setFilters((current) => ({ ...current, priceFrom: event.target.value }))}
                    className="h-12 rounded-2xl border-[#c9dcde] bg-white"
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input
                    type="number"
                    placeholder="الأعلى"
                    value={filters.priceTo}
                    onChange={(event) => setFilters((current) => ({ ...current, priceTo: event.target.value }))}
                    className="h-12 rounded-2xl border-[#c9dcde] bg-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-[#102528]">منشأ السيارة</label>
                <Select
                  value={filters.origin_locale}
                  onValueChange={(value) => setFilters((current) => ({ ...current, origin_locale: value }))}
                >
                  <SelectTrigger className="h-12 rounded-2xl border-[#c9dcde] bg-white">
                    <SelectValue placeholder="اختر المنشأ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع المناشئ</SelectItem>
                    {origins.map((origin) => (
                      <SelectItem key={origin} value={origin}>
                        {localizeVehicleText(origin)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {hasFilters && (
                <div className="flex flex-wrap gap-2">
                  {activeFilters.map((item) => (
                    <Badge key={item} variant="secondary" className="rounded-full px-3 py-1">
                      {item}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="rounded-3xl bg-[#102528] p-4 text-white">
                <div className="flex items-center gap-3">
                  <Filter className="h-9 w-9 rounded-2xl bg-white/12 p-2" />
                  <div>
                    <p className="text-sm font-black">فلترة بدون تسجيل</p>
                    <p className="mt-1 text-xs leading-5 text-white/60">
                      تسجيل الدخول مطلوب فقط عند تقديم العرض أو متابعة الطلب.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>

        <main className="w-full flex-1 space-y-7">
          {appliedConfigs.length > 0 && (
            <section className="space-y-4 rounded-[1.75rem] border border-primary/20 bg-primary/10 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-black text-[#102528]">سياراتك الحالية</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    نتائج لديك عليها عرض نشط أو مقبول.
                  </p>
                </div>
                <Badge className="w-fit rounded-full border-0 bg-primary px-4 py-2 text-white">
                  {formatNumber(appliedConfigs.length)} سيارة
                </Badge>
              </div>
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {appliedConfigs.map((config) => (
                  <CarCard key={`applied-${config.id}`} config={config} showBidStats isApplied />
                ))}
              </div>
            </section>
          )}

          <div className="flex flex-col gap-4 rounded-[1.75rem] border border-white/70 bg-white/80 p-5 shadow-[0_22px_44px_-38px_rgba(16,37,40,0.42)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-primary">نتائج السوق</p>
              <h2 className="mt-1 text-2xl font-black text-[#102528]">
                {isLoading ? 'جاري تجهيز السيارات...' : `${formattedRemainingCount} سيارة متاحة`}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                تعرض البطاقات سعر الوكالة، المواصفات المختصرة، وحالة التقديم.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={loadCars}
              className="w-full rounded-full bg-white sm:w-auto"
            >
              <RefreshCw className="ml-2 h-4 w-4" />
              تحديث النتائج
            </Button>
          </div>

          {isLoading ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, index) => (
                <Card key={index} className="overflow-hidden rounded-[1.75rem] border-white/70 bg-white/80">
                  <div className="h-56 animate-pulse bg-[#dce9e9]" />
                  <CardContent className="space-y-4 p-5">
                    <div className="h-5 w-3/4 animate-pulse rounded bg-[#dce9e9]" />
                    <div className="h-4 w-1/2 animate-pulse rounded bg-[#dce9e9]" />
                    <div className="h-20 animate-pulse rounded-3xl bg-[#dce9e9]" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : configs.length === 0 ? (
            <Card className="rounded-[2rem] border-dashed border-[#bfd5d6] bg-white/80 py-16 text-center">
              <CardContent>
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/12 text-primary">
                  <Search className="h-8 w-8" />
                </div>
                <h2 className="mb-2 text-2xl font-black text-[#102528]">لا توجد نتائج</h2>
                <p className="mx-auto max-w-md leading-7 text-muted-foreground">
                  لم نعثر على سيارات تطابق خيارات البحث الحالية. جرّب توسيع نطاق
                  السعر أو إزالة الفلاتر.
                </p>
                <div className="mx-auto mt-7 grid max-w-2xl gap-3 text-right sm:grid-cols-3">
                  {['وسّع نطاق السعر', 'جرّب ماركة أخرى', 'حدّث النتائج'].map((item) => (
                    <div key={item} className="rounded-2xl bg-[#f1f7f7] p-4 text-sm font-black text-[#102528]">
                      {item}
                    </div>
                  ))}
                </div>
                {hasFilters && (
                  <Button onClick={clearFilters} className="mt-5 rounded-full">
                    مسح الفلاتر
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : remainingConfigs.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {remainingConfigs.map((config) => (
                <CarCard key={config.id} config={config} showBidStats />
              ))}
            </div>
          ) : (
            <Card className="rounded-[2rem] border-white/70 bg-white/80 py-14 text-center">
              <CardContent>
                <Car className="mx-auto mb-4 h-12 w-12 text-primary" />
                <h2 className="text-xl font-black text-[#102528]">كل النتائج ضمن سياراتك الحالية</h2>
                <p className="mx-auto mt-2 max-w-md text-muted-foreground">
                  غيّر الفلاتر أو ارجع لاحقاً عند إضافة مخزون جديد.
                </p>
                <Button asChild variant="outline" className="mt-5 rounded-full bg-white">
                  <Link href="/dashboard">
                    متابعة طلباتي
                    <ArrowLeft className="mr-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  )
}
