'use client'

import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowLeft,
  BadgePercent,
  Calendar,
  Eye,
  Gauge,
  MapPin,
  ShieldCheck
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CarFallbackVisual } from '@/components/car-fallback-visual'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
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

  const specs = [
    { label: 'السنة', value: config.year, icon: Calendar },
    { label: 'الفئة', value: localizeVehicleText(config.trim || config.variant) || 'قياسي', icon: Gauge },
    { label: 'اللون', value: localizeVehicleText(config.color) || 'حسب التوفر', icon: ShieldCheck },
    { label: 'المنشأ', value: localizeVehicleText(config.origin_locale) || 'غير محدد', icon: MapPin }
  ]
  const title = vehicleTitle(config)
  const trimLabel = localizeVehicleText(config.trim || config.variant) || 'مواصفات وكالة'

  return (
    <Card
      className={cn(
        'group overflow-hidden rounded-[1.75rem] border border-white/70 bg-white shadow-[0_22px_46px_-38px_rgba(16,37,40,0.52)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_30px_58px_-38px_rgba(16,37,40,0.68)]',
        isApplied && 'ring-2 ring-primary/70 ring-offset-2 ring-offset-background'
      )}
    >
      <CardHeader className="p-0">
        <div className="relative h-60 overflow-hidden">
          {mainImage ? (
            <Image
              src={mainImage}
              alt={title}
              width={700}
              height={460}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <CarFallbackVisual config={config} showBadge={false} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#102528]/80 via-[#102528]/10 to-transparent" />

          <div className="absolute right-4 top-4 flex flex-col items-start gap-2">
            {isApplied && (
              <Badge className="rounded-full border-0 bg-primary px-3 py-1.5 text-white shadow-sm">
                تم التقديم
              </Badge>
            )}
            <Badge className="rounded-full border-0 bg-white/90 px-3 py-1.5 text-[#102528] shadow-sm backdrop-blur">
              متاح للمزايدة
            </Badge>
          </div>

          <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3 text-white">
            <div>
              <h3 className="text-2xl font-black leading-tight">
                {title}
              </h3>
              <p className="mt-1 text-sm font-medium text-white/70">
                {trimLabel} · {config.year}
              </p>
            </div>
            <div className="rounded-2xl bg-white/15 px-3 py-2 text-left backdrop-blur">
              <div className="text-xs text-white/60">سعر الوكالة</div>
              <div className="text-base font-black">{formatCurrencySar(config.msrp)}</div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-5">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {specs.map((spec) => {
            const Icon = spec.icon
            return (
              <div key={spec.label} className="rounded-2xl bg-[#f1f7f7] p-3">
                <Icon className="mb-2 h-4 w-4 text-primary" />
                <div className="text-[11px] font-bold text-muted-foreground">{spec.label}</div>
                <div className="mt-1 truncate text-sm font-black text-[#102528]">{spec.value}</div>
              </div>
            )
          })}
        </div>

        <div className="rounded-3xl border border-[#d8e7e7] bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-muted-foreground">سعر الوكالة</p>
              <p className="mt-1 text-2xl font-black text-[#102528]">{formatCurrencySar(config.msrp)}</p>
            </div>
            <BadgePercent className="h-11 w-11 rounded-2xl bg-amber-100 p-2.5 text-amber-700" />
          </div>
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-primary/10 px-3 py-2 text-sm">
            <span className="font-bold text-[#31595d]">رسوم الالتزام</span>
            <span className="font-black text-primary">500 ر.س</span>
          </div>
        </div>

        {showBidStats && (
          <div className="rounded-3xl bg-[#102528] p-4 text-sm text-white">
            <div className="flex items-center justify-between">
              <span className="text-white/60">حالة الطلب</span>
              <span className="font-black">جاهز للعروض</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/12">
              <div className="h-full w-2/3 rounded-full bg-primary" />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-white/60">
              <span>نشاط السوق</span>
              <span>مخزون موثّق</span>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="p-5 pt-0">
        <Button asChild className="h-12 w-full rounded-2xl text-base">
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
