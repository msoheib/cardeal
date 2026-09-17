'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { CarMediaPlaceholder } from '@/components/car-media-placeholder'
import { localizeVehicleText, vehicleTitle } from '@/lib/arabic-display'
import { formatCurrencySar } from '@/lib/format'
import { AvailableVehicleListing } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface CarCardProps {
  config: AvailableVehicleListing
  showBidStats?: boolean
  isApplied?: boolean
}

export function CarCard({ config, isApplied = false }: CarCardProps) {
  const mainImage = config.representative_images?.[0] ?? null
  const title = vehicleTitle(config)
  const meta = [
    config.year,
    localizeVehicleText(config.trim || config.variant),
    localizeVehicleText(config.origin_locale),
  ].filter(Boolean).join(' · ')
  const colors = config.colors.map((row) => localizeVehicleText(row.color)).filter(Boolean)

  return (
    <Link
      href={`/cars/${config.id}`}
      className={cn(
        'group flex flex-col overflow-hidden rounded-lg border bg-card transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isApplied ? 'border-primary/60' : 'border-border'
      )}
    >
      <div className="relative aspect-[16/10] overflow-hidden border-b border-border bg-muted">
        {mainImage ? (
          <Image
            src={mainImage}
            alt={title}
            fill
            sizes="(min-width: 1024px) 300px, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <CarMediaPlaceholder config={config} />
        )}
        {isApplied && (
          <Badge className="absolute start-2 top-2 border-transparent bg-primary text-primary-foreground hover:bg-primary">
            لديك عرض
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold leading-6 text-foreground">{title}</h3>
          <p className="mt-0.5 truncate text-sm">{meta}</p>
        </div>

        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xs text-muted-foreground">سعر الوكالة</span>
          <span className="num text-lg font-bold text-foreground">{formatCurrencySar(config.display_price)}</span>
        </div>

        <p className="truncate text-xs text-muted-foreground" title={colors.join('، ')}>
          {colors.length > 0 ? `${colors.length === 1 ? 'اللون' : `${colors.length} ألوان`}: ${colors.join('، ')}` : 'اللون حسب التوفر'}
        </p>
      </div>

      <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-sm">
        <span className="text-muted-foreground">احجز برسوم <span className="num font-medium text-foreground">500 ر.س</span></span>
        <span className="flex items-center gap-0.5 font-medium text-primary">
          التفاصيل
          <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        </span>
      </div>
    </Link>
  )
}
