'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, ArrowLeft, Building2, Car, ChevronDown, RefreshCw, Search, SlidersHorizontal, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader, Section } from '@/components/layout/page-header'
import { CarCard } from '@/components/car-card'
import { localizeVehicleText } from '@/lib/arabic-display'
import { formatNumber } from '@/lib/format'
import { getCurrentUser } from '@/lib/auth'
import { getAvailableConfigurations, getCarMakes, getCarOrigins } from '@/lib/cars'
import { AvailableVehicleListing, supabase } from '@/lib/supabase'
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
  const [configs, setConfigs] = useState<AvailableVehicleListing[]>([])
  const [makes, setMakes] = useState<string[]>([])
  const [origins, setOrigins] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [appliedConfigIds, setAppliedConfigIds] = useState<string[]>([])
  const [filters, setFilters] = useState<FiltersState>(defaultFilters)
  // Phones: only search is visible until the buyer opens the filters.
  const [filtersOpen, setFiltersOpen] = useState(false)

  const loadCars = useCallback(async () => {
    setIsLoading(true)
    const filtersToApply: Record<string, string | number> = {}
    if (filters.make !== 'all') filtersToApply.make = filters.make
    if (filters.origin_locale !== 'all') filtersToApply.origin_locale = filters.origin_locale
    if (filters.priceFrom) filtersToApply.priceFrom = parseInt(filters.priceFrom, 10)
    if (filters.priceTo) filtersToApply.priceTo = parseInt(filters.priceTo, 10)
    if (filters.search) filtersToApply.search = filters.search

    const { data, error } = await getAvailableConfigurations(filtersToApply)
    setLoadError(Boolean(error))
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
        .select('car_configuration_id, status, configuration:car_configurations(listing_spec_id)')
        .eq('buyer_id', user.id)
        .in('status', ['pending', 'accepted'])

      setAppliedConfigIds(
        data
          ? Array.from(new Set(data.map((bid: any) => bid.configuration?.listing_spec_id).filter(Boolean))) as string[]
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
      { appliedConfigs: [] as AvailableVehicleListing[], remainingConfigs: [] as AvailableVehicleListing[] }
    )
  }, [configs, appliedConfigIds])

  const activeFilters = useMemo(() => {
    const items: { key: keyof FiltersState; label: string }[] = []
    if (filters.search) items.push({ key: 'search', label: `بحث: ${filters.search}` })
    if (filters.make !== 'all') items.push({ key: 'make', label: localizeVehicleText(filters.make) })
    if (filters.origin_locale !== 'all') items.push({ key: 'origin_locale', label: localizeVehicleText(filters.origin_locale) })
    if (filters.priceFrom) items.push({ key: 'priceFrom', label: `من ${formatNumber(Number(filters.priceFrom))} ر.س` })
    if (filters.priceTo) items.push({ key: 'priceTo', label: `إلى ${formatNumber(Number(filters.priceTo))} ر.س` })
    return items
  }, [filters])

  const hasFilters = activeFilters.length > 0
  const clearFilters = () => setFilters(defaultFilters)
  const setFilter = <K extends keyof FiltersState>(key: K, value: FiltersState[K]) =>
    setFilters((current) => ({ ...current, [key]: value }))

  return (
    <div className={cn('page space-y-6', !showDashboardLink && 'py-0 lg:py-0')}>
      <PageHeader
        title="السوق"
        description="سيارات جديدة من تجار موثّقين. الأسعار ورسوم الالتزام معلنة قبل تقديم العرض."
        actions={
          <Button type="button" variant="outline" size="sm" onClick={loadCars} disabled={isLoading}>
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            تحديث
          </Button>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8">
        <aside className="space-y-4 lg:sticky lg:top-20">
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="ابحث بالماركة أو الطراز"
              aria-label="بحث سريع"
              value={filters.search}
              onChange={(event) => setFilter('search', event.target.value)}
              className="ps-9"
            />
          </div>

          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            aria-controls="market-filters"
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-card px-3 text-sm lg:hidden"
          >
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
              فلترة السوق
              {hasFilters && <span className="num rounded-sm bg-primary px-1.5 text-xs font-bold text-primary-foreground">{formatNumber(activeFilters.length)}</span>}
            </span>
            <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', filtersOpen && 'rotate-180')} />
          </button>

          <div id="market-filters" className={cn('space-y-4', !filtersOpen && 'hidden lg:block')}>
            <FilterSelect
              id="filter-make"
              label="الماركة"
              value={filters.make}
              allLabel="جميع الماركات"
              options={makes}
              onValueChange={(make) => setFilter('make', make)}
            />

            <fieldset>
              <legend className="mb-1.5 text-xs font-medium text-muted-foreground">نطاق السعر (ر.س)</legend>
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" inputMode="numeric" placeholder="من" aria-label="السعر الأدنى" value={filters.priceFrom} onChange={(event) => setFilter('priceFrom', event.target.value)} />
                <Input type="number" inputMode="numeric" placeholder="إلى" aria-label="السعر الأعلى" value={filters.priceTo} onChange={(event) => setFilter('priceTo', event.target.value)} />
              </div>
            </fieldset>

            <FilterSelect
              id="filter-origin"
              label="المنشأ"
              value={filters.origin_locale}
              allLabel="جميع المناشئ"
              options={origins}
              onValueChange={(origin_locale) => setFilter('origin_locale', origin_locale)}
            />

            <p className="flex gap-2 border-t border-border pt-4 text-xs leading-5">
              <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              كل الموردين موثّقون، وتظهر بيانات التواصل بعد قبول العرض فقط.
            </p>
          </div>
        </aside>

        <div className="min-w-0 space-y-6">
          {appliedConfigs.length > 0 && (
            <Section title={`سيارات لديك عليها عرض (${formatNumber(appliedConfigs.length)})`}>
              <CarGrid configs={appliedConfigs} applied />
            </Section>
          )}

          <Section>
            <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
              <p className="me-2 text-sm font-bold text-foreground">
                {isLoading ? 'جاري التحميل...' : `${formatNumber(remainingConfigs.length)} سيارة متاحة`}
              </p>
              {activeFilters.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilter(item.key, defaultFilters[item.key])}
                  className="inline-flex h-7 items-center gap-1 rounded-sm border border-border bg-card px-2 text-xs text-foreground hover:bg-muted"
                >
                  {item.label}
                  <X className="h-3 w-3" aria-hidden />
                  <span className="sr-only">إزالة</span>
                </button>
              ))}
              {hasFilters && (
                <Button type="button" variant="link" size="sm" onClick={clearFilters} className="text-xs">مسح الكل</Button>
              )}
            </div>

            {isLoading ? (
              <LoadingCards />
            ) : loadError ? (
              <div className="surface">
                <EmptyState
                  icon={AlertCircle}
                  title="السوق غير متاح مؤقتاً"
                  description="يجري تحديث الخدمة. حاول مرة أخرى بعد قليل."
                  action={<Button type="button" variant="outline" size="sm" onClick={loadCars}>إعادة المحاولة</Button>}
                />
              </div>
            ) : configs.length === 0 ? (
              <div className="surface">
                <EmptyState
                  icon={Search}
                  title="لا توجد نتائج"
                  description="لم نعثر على سيارات تطابق الخيارات الحالية. جرّب توسيع نطاق السعر أو إزالة الفلاتر."
                  action={hasFilters ? <Button size="sm" onClick={clearFilters}>مسح الفلاتر</Button> : undefined}
                />
              </div>
            ) : remainingConfigs.length > 0 ? (
              <CarGrid configs={remainingConfigs} />
            ) : (
              <div className="surface">
                <EmptyState
                  icon={Car}
                  title="كل النتائج ضمن سياراتك الحالية"
                  description="غيّر الفلاتر أو ارجع لاحقاً عند إضافة مخزون جديد."
                  action={
                    <Button asChild variant="outline" size="sm">
                      <Link href="/dashboard">متابعة طلباتي<ArrowLeft className="h-4 w-4" /></Link>
                    </Button>
                  }
                />
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  )
}

function FilterSelect({
  id,
  label,
  value,
  allLabel,
  options,
  onValueChange
}: {
  id: string
  label: string
  value: string
  allLabel: string
  options: string[]
  onValueChange: (value: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id={id}>
          <SelectValue />
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

function CarGrid({ configs, applied = false }: { configs: AvailableVehicleListing[]; applied?: boolean }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {configs.map((config) => (
        <CarCard key={config.id} config={config} isApplied={applied} />
      ))}
    </div>
  )
}

function LoadingCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="surface overflow-hidden">
          <div className="aspect-[16/10] animate-pulse bg-muted" />
          <div className="space-y-3 p-4">
            <div className="h-5 w-3/4 animate-pulse rounded-sm bg-muted" />
            <div className="h-4 w-1/2 animate-pulse rounded-sm bg-muted" />
            <div className="h-6 w-full animate-pulse rounded-sm bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}
