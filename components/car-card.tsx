'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Eye } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CarFallbackVisual } from '@/components/car-fallback-visual'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { localizeVehicleText, vehicleTitle } from '@/lib/arabic-display'
import { formatCurrencySar } from '@/lib/format'
import { CarConfiguration } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface CarCardProps {
  config: CarConfiguration
  showBidStats?: boolean
  isApplied?: boolean
}

export function CarCard({ config, showBidStats = false, isApplied = false }: CarCardProps) {
  const mainImage = config.images && config.images.length > 0 ? config.images[0] : null
  const title = vehicleTitle(config)
  const trimLabel = localizeVehicleText(config.trim || config.variant) || 'قياسي'
  const colorLabel = localizeVehicleText(config.color) || 'حسب التوفر'
  const originLabel = localizeVehicleText(config.origin_locale) || 'غير محدد'

  const specs = [
    ['السنة', config.year],
    ['الفئة', trimLabel],
    ['اللون', colorLabel],
    ['المنشأ', originLabel]
  ]

  return (
    <Card
      className={cn(
        'group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-colors hover:border-primary/45',
        isApplied && 'border-primary/60 ring-1 ring-primary/35'
      )}
    >
      <div className="relative h-52 overflow-hidden border-b border-border bg-muted">
        {mainImage ? (
          <Image
            src={mainImage}
            alt={title}
            width={700}
            height={460}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <CarFallbackVisual config={config} showBadge={false} className="min-h-0" />
        )}
      </div>

      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-xl font-bold leading-7 text-foreground">{title}</h3>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {trimLabel} · {colorLabel} · {originLabel}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            {isApplied && (
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
                تم التقديم
              </Badge>
            )}
            <Badge variant="outline" className="rounded-full border-primary/35 px-3 py-1 text-xs text-primary">
              متاح للمزايدة
            </Badge>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-y border-border py-4 text-sm">
          {specs.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="mt-1 truncate font-semibold text-foreground">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">سعر الوكالة</span>
            <span className="text-lg font-bold text-foreground">{formatCurrencySar(config.msrp)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">رسوم الالتزام</span>
            <span className="font-bold text-primary">500 ر.س</span>
          </div>
          {showBidStats && (
            <div className="flex items-center justify-between gap-4 rounded-xl bg-muted px-3 py-2 text-sm">
              <span className="text-muted-foreground">حالة الطلب</span>
              <span className="font-semibold text-foreground">جاهز للعروض</span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="p-5 pt-0">
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
