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
  const title = vehicleTitle(config)

  return (
    <div
      role="img"
      aria-label={`${title} - لا توجد صورة بعد`}
      className={cn('flex h-full w-full flex-col items-center justify-center gap-2 bg-muted text-muted-foreground', className)}
    >
      <svg
        viewBox="0 0 64 28"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn('opacity-40', isDetail ? 'w-32' : 'w-20')}
        aria-hidden="true"
      >
        <path d="M3 21h58M7 21l4.5-8c1-1.8 2.8-3 4.9-3h24.2c2.3 0 4.4 1 5.8 2.8L53 21" />
        <circle cx="17" cy="22" r="3.5" />
        <circle cx="47" cy="22" r="3.5" />
      </svg>
      <span className={cn('font-medium', isDetail ? 'text-sm' : 'text-xs')}>لا توجد صورة بعد</span>
    </div>
  )
}
