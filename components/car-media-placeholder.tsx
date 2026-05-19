import { localizeVehicleText, vehicleTitle } from '@/lib/arabic-display'
import { cn } from '@/lib/utils'

type CarMediaConfig = {
  make?: string | null
  model?: string | null
  year?: number | string | null
  trim?: string | null
  variant?: string | null
  color?: string | null
  origin_locale?: string | null
}

type CarMediaPlaceholderProps = {
  config: CarMediaConfig
  variant?: 'card' | 'detail'
  className?: string
}

const colorSwatches: Record<string, string> = {
  أبيض: '#f8fafc',
  'أبيض لؤلؤي': '#f7f3e8',
  أسود: '#111827',
  فضي: '#cbd5e1',
  رمادي: '#64748b',
  أحمر: '#dc2626',
  أزرق: '#2563eb',
  بني: '#8b5e3c',
  ذهبي: '#d6a84f',
  أخضر: '#15803d'
}

export function getVehicleSwatch(color?: string | null) {
  const label = localizeVehicleText(color)
  return colorSwatches[label] || '#38a6a4'
}

export function CarMediaPlaceholder({ config, variant = 'card', className }: CarMediaPlaceholderProps) {
  const isDetail = variant === 'detail'
  const colorLabel = localizeVehicleText(config.color) || 'حسب التوفر'
  const trimLabel = localizeVehicleText(config.trim || config.variant) || 'قياسي'
  const originLabel = localizeVehicleText(config.origin_locale) || 'غير محدد'
  const swatchColor = getVehicleSwatch(config.color)
  const title = vehicleTitle(config)

  return (
    <div
      className={cn(
        'flex h-full w-full items-center justify-center bg-muted text-center',
        isDetail ? 'min-h-[22rem] p-8' : 'p-5',
        className
      )}
    >
      <div className="flex max-w-md flex-col items-center gap-3">
        <span
          className={cn('rounded-full border border-border shadow-sm', isDetail ? 'h-14 w-14' : 'h-11 w-11')}
          style={{ backgroundColor: swatchColor }}
          aria-label={`لون السيارة ${colorLabel}`}
        />
        <div>
          <p className={cn('font-semibold text-foreground', isDetail ? 'text-lg' : 'text-sm')}>صورة غير متاحة</p>
          {isDetail ? (
            <>
              <h2 className="mt-3 text-2xl font-bold text-foreground sm:text-3xl">{title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {trimLabel} · {colorLabel} · {originLabel}
              </p>
            </>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">سيتم عرض صور المورد عند توفرها</p>
          )}
        </div>
      </div>
    </div>
  )
}
