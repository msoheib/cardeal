'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Car, LayoutDashboard, RefreshCw, Search, SlidersHorizontal, X } from 'lucide-react'

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

      setAppliedConfigIds(
        data
          ? Array.from(new Set(data.map((bid) => bid.car_configuration_id).filter(Boolean))) as string[]
          : []
      )
    } catch (error) {
      console.error('تعذر تحميل السيارات التي تم التقديم عليها', error)
    }
  }, [])

  useEffect(() => {
    loadMakes()
    loadOrigins()
    loadApplied()
  }, [loadApplied, loadMakes, loadOrigins])

  useEffect(() => {
    const handle = setTimeout(loadCars, 350)
    return () => clearTimeout(handle)
  }, [loadCars])

  const { appliedConfigs, remainingConfigs } = useMemo(() => {
    if (configs.length === 0) return { appliedConfigs: [], remainingConfigs: [] }
    const appliedSet = new Set(appliedConfigIds)
    return configs.reduce(
      (result, config) => {
        if (appliedSet.has(config.id)) result.appliedConfigs.push(config)
        else result.remainingConfigs.push(config)
        return result
      },
      { appliedConfigs: [] as CarConfiguration[], remainingConfigs: [] as CarConfiguration[] }
    )
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
    <div className={cn('bg-background text-foreground', showDashboardLink ? 'min-h-screen' : 'rounded-2xl py-2')}>
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-primary">
              <Car className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">السيارات المتاحة</h1>
              <p className="text-sm text-muted-foreground">اختر السيارة ثم قدّم عرضك برسوم التزام ثابتة.</p>
            </div>
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-full px-3 py-1.5 text-muted-foreground">تجار موثّقون</Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1.5 text-muted-foreground">رسوم 500 ر.س</Badge>
            {showDashboardLink && (
              <Button asChild variant="outline" className="rounded-xl bg-card">
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
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="max-w-3xl text-2xl font-bold leading-tight text-foreground sm:text-3xl">
                قارن السيارات، راقب السعر، وابدأ العرض من شاشة واحدة.
              </h2>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                الصفحة تعرض السيارات التي يمكن تقديم عروض عليها الآن، مع فصل السيارات التي سبق وقدّمت عليها حتى لا تضيع بين النتائج.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-sm">
              <div>
                <div className="text-2xl font-bold text-foreground">{formattedRemainingCount}</div>
                <div className="mt-1 text-muted-foreground">متاحة</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{formatNumber(appliedConfigs.length)}</div>
                <div className="mt-1 text-muted-foreground">ضمن عروضك</div>
              </div>
              <Button type="button" variant="outline" onClick={loadCars} className="rounded-xl bg-background">
                <RefreshCw className="ml-2 h-4 w-4" />
                تحديث
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto flex flex-col items-start gap-6 px-4 py-8 lg:flex-row">
        <aside className="w-full shrink-0 lg:sticky lg:top-28 lg:w-[330px]">
          <Card className="overflow-hidden rounded-2xl border-border bg-card shadow-sm">
            <CardHeader className="border-b border-border bg-card">
              <CardTitle className="flex items-center justify-between text-base text-foreground">
                <span className="flex items-center gap-2">
                  <SlidersHorizontal className="h-5 w-5 text-primary" />
                  فلترة السوق
                </span>
                {hasFilters && (
                  <Button type="button" variant="ghost" size="sm" onClick={clearFilters} className="rounded-xl text-muted-foreground">
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
                  className="h-11 rounded-xl bg-background pr-11"
                />
              </div>

              <FilterSelect
                label="الماركة"
                value={filters.make}
                placeholder="اختر الماركة"
                allLabel="جميع الماركات"
                options={makes}
                onValueChange={(make) => setFilters((current) => ({ ...current, make }))}
              />

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">نطاق السعر</label>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <Input
                    type="number"
                    placeholder="الأدنى"
                    value={filters.priceFrom}
                    onChange={(event) => setFilters((current) => ({ ...current, priceFrom: event.target.value }))}
                    className="h-11 rounded-xl bg-background"
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input
                    type="number"
                    placeholder="الأعلى"
                    value={filters.priceTo}
                    onChange={(event) => setFilters((current) => ({ ...current, priceTo: event.target.value }))}
                    className="h-11 rounded-xl bg-background"
                  />
                </div>
              </div>

              <FilterSelect
                label="منشأ السيارة"
                value={filters.origin_locale}
                placeholder="اختر المنشأ"
                allLabel="جميع المناشئ"
                options={origins}
                onValueChange={(origin_locale) => setFilters((current) => ({ ...current, origin_locale }))}
              />

              {hasFilters && (
                <div className="flex flex-wrap gap-2">
                  {activeFilters.map((item) => (
                    <Badge key={item} variant="secondary" className="rounded-full px-3 py-1">{item}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </aside>

        <main className="w-full flex-1 space-y-6">
          {appliedConfigs.length > 0 && (
            <section className="space-y-4 rounded-2xl border border-primary/25 bg-card p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-foreground">سياراتك الحالية</h2>
                  <p className="mt-1 text-sm text-muted-foreground">نتائج لديك عليها عرض نشط أو مقبول.</p>
                </div>
                <Badge className="w-fit rounded-full border-0 bg-primary px-4 py-2 text-white">
                  {formatNumber(appliedConfigs.length)} سيارة
                </Badge>
              </div>
              <CarGrid configs={appliedConfigs} applied />
            </section>
          )}

          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {isLoading ? 'جاري تجهيز السيارات...' : `${formattedRemainingCount} سيارة متاحة`}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">سعر الوكالة، الفئة، اللون، المنشأ، وحالة التقديم.</p>
            </div>
            <Button type="button" variant="outline" onClick={loadCars} className="w-full rounded-xl bg-card sm:w-auto">
              <RefreshCw className="ml-2 h-4 w-4" />
              تحديث النتائج
            </Button>
          </div>

          {isLoading ? (
            <LoadingCards />
          ) : configs.length === 0 ? (
            <EmptyState hasFilters={hasFilters} onClear={clearFilters} />
          ) : remainingConfigs.length > 0 ? (
            <CarGrid configs={remainingConfigs} />
          ) : (
            <Card className="rounded-2xl border-border bg-card py-14 text-center">
              <CardContent>
                <Car className="mx-auto mb-4 h-10 w-10 text-primary" />
                <h2 className="text-xl font-bold text-foreground">كل النتائج ضمن سياراتك الحالية</h2>
                <p className="mx-auto mt-2 max-w-md text-muted-foreground">غيّر الفلاتر أو ارجع لاحقاً عند إضافة مخزون جديد.</p>
                <Button asChild variant="outline" className="mt-5 rounded-xl bg-card">
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

function FilterSelect({
  label,
  value,
  placeholder,
  allLabel,
  options,
  onValueChange
}: {
  label: string
  value: string
  placeholder: string
  allLabel: string
  options: string[]
  onValueChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-foreground">{label}</label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-11 rounded-xl bg-background">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{allLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option} value={option}>{localizeVehicleText(option)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function CarGrid({ configs, applied = false }: { configs: CarConfiguration[]; applied?: boolean }) {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {configs.map((config) => (
        <CarCard key={config.id} config={config} showBidStats isApplied={applied} />
      ))}
    </div>
  )
}

function LoadingCards() {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <Card key={index} className="overflow-hidden rounded-2xl border-border bg-card">
          <div className="h-52 animate-pulse bg-muted" />
          <CardContent className="space-y-4 p-5">
            <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
            <div className="h-20 animate-pulse rounded-xl bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function EmptyState({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  return (
    <Card className="rounded-2xl border-dashed border-border bg-card py-14 text-center">
      <CardContent>
        <Search className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
        <h2 className="mb-2 text-xl font-bold text-foreground">لا توجد نتائج</h2>
        <p className="mx-auto max-w-md leading-7 text-muted-foreground">
          لم نعثر على سيارات تطابق خيارات البحث الحالية. جرّب توسيع نطاق السعر أو إزالة الفلاتر.
        </p>
        {hasFilters && (
          <Button onClick={onClear} className="mt-5 rounded-xl">مسح الفلاتر</Button>
        )}
      </CardContent>
    </Card>
  )
}
