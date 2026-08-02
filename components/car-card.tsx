'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Calendar, Eye, MapPin, Palette, ShieldCheck, Tag } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { CarMediaPlaceholder } from '@/components/car-media-placeholder'
import { localizeVehicleText, vehicleTitle } from '@/lib/arabic-display'
import { formatCurrencySar } from '@/lib/format'
import { AvailableCarConfiguration, CarConfiguration } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface CarCardProps {
  config: CarConfiguration | AvailableCarConfiguration
  showBidStats?: boolean
  isApplied?: boolean
}

export function CarCard({ config, showBidStats = false, isApplied = false }: CarCardProps) {
  const availableConfig = config as AvailableCarConfiguration
  const listingImages = availableConfig.representative_images?.length
    ? availableConfig.representative_images
    : config.images
  const mainImage = listingImages && listingImages.length > 0 ? listingImages[0] : null
  const title = vehicleTitle(config)
  const trimLabel = localizeVehicleText(config.trim || config.variant) || 'قياسي'
  const colorLabel = localizeVehicleText(config.color) || 'حسب التوفر'
  const originLabel = localizeVehicleText(config.origin_locale) || 'غير محدد'

  const specs = [
    { label: 'السنة', value: config.year, icon: Calendar },
    { label: 'الفئة', value: trimLabel, icon: Tag },
    { label: 'اللون', value: colorLabel, icon: Palette },
    { label: 'المنشأ', value: originLabel, icon: MapPin }
  ]

  return (
    <Card
      className={cn(
        'group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-colors hover:border-primary/45',
        isApplied && 'border-primary/70 ring-1 ring-primary/30'
      )}
    >
      <div className="relative h-48 overflow-hidden border-b border-border bg-muted">
        {mainImage ? (
          <Image
            src={mainImage}
            alt={title}
            width={700}
            height={460}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <CarMediaPlaceholder config={config} />
        )}
      </div>

      <CardContent className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-xl font-bold leading-7 text-foreground">{title}</h3>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {trimLabel} · {colorLabel} · {originLabel}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            {isApplied && (
              <Badge variant="secondary" className="border-transparent bg-primary/10 px-3 py-1 text-xs text-primary">
                تم التقديم
              </Badge>
            )}
            <Badge variant="outline" className="border-primary/35 px-3 py-1 text-xs text-primary">
              متاح
            </Badge>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          {specs.map(({ label, value, icon: Icon }) => (
            <div key={label} className="min-w-0 rounded-xl border border-border bg-muted/30 px-3 py-2.5">
              <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Icon className="h-3.5 w-3.5 text-primary" />
                {label}
              </dt>
              <dd className="mt-1 truncate font-semibold text-foreground">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="space-y-3 border-t border-border pt-4">
          <div className="flex items-end justify-between gap-4">
            <span className="text-sm text-muted-foreground">سعر الوكالة</span>
            <span className="text-xl font-bold text-foreground">{formatCurrencySar(availableConfig.display_price ?? config.msrp)}</span>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/30 px-3 py-2.5">
            <span className="text-sm text-muted-foreground">رسوم الالتزام</span>
            <span className="font-bold text-primary">500 ر.س</span>
          </div>
          {showBidStats && (
            <div className="flex items-center gap-2 text-sm">
              <span className="flex items-center gap-1.5 font-semibold text-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                جاهز للعروض
              </span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button asChild className="h-11 w-full rounded-xl text-sm font-semibold">
          <Link href={`/cars/${config.id}`} className="flex items-center justify-center gap-2">
            <Eye className="h-4 w-4" />
            عرض التفاصيل وتقديم عرض
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
