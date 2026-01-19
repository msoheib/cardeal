'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Eye, Calendar } from 'lucide-react'

import { CarConfiguration } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'

interface CarCardProps {
  config: CarConfiguration
  showBidStats?: boolean
  isApplied?: boolean
}

export function CarCard({ config, showBidStats = false, isApplied = false }: CarCardProps) {
  const formatPrice = (price: number) =>
    new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price)

  const mainImage =
    config.images && config.images.length > 0
      ? config.images[0]
      : 'https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=400'

  return (
    <Card
      className={cn(
        'group overflow-hidden border border-border/60 bg-white/95 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_26px_40px_-34px_rgba(33,86,91,0.55)]',
        isApplied && 'ring-2 ring-primary/70 ring-offset-2 ring-offset-background'
      )}
    >
      <CardHeader className="p-0">
        <div className="relative h-48 overflow-hidden">
          <Image
            src={mainImage}
            alt={`${config.make} ${config.model}`}
            width={400}
            height={240}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute right-3 top-3 flex flex-col items-end gap-2">
            {isApplied && (
              <Badge className="border-0 bg-emerald-500 text-white shadow-sm">
                تم التقديم
              </Badge>
            )}
            <Badge className="border-0 bg-secondary text-foreground shadow-sm">
                 متاح للمزايدة
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 p-5">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-foreground transition-colors group-hover:text-primary">
            {config.make} {config.model}
          </h3>
          {config.trim && <p className="text-sm text-muted-foreground">{config.trim} {config.variant}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>{config.year}</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">سعر الوكالة (MSRP)</span>
            <span className="text-lg font-bold text-foreground">{formatPrice(config.msrp)}</span>
          </div>
        </div>

        {showBidStats && (
          <div className="rounded-2xl bg-primary/10 p-4 text-sm text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>آخر العروض المقدمة</span>
              <span className="font-semibold text-primary">-- عرضاً</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span>متوسط العرض الحالي</span>
              <span className="font-semibold text-primary">--</span>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="p-5 pt-0">
        <div className="w-full space-y-3">
          <Button asChild size="sm" className="w-full justify-center">
            <Link href={`/cars/${config.id}`} className="flex items-center justify-center gap-2">
              <Eye className="h-4 w-4" />
              عرض التفاصيل وتقديم عرض
            </Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}

