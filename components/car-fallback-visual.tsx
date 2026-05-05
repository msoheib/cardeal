'use client'

import { useId, type CSSProperties } from 'react'

import { Badge } from '@/components/ui/badge'
import { localizeVehicleText, vehicleTitle } from '@/lib/arabic-display'
import { cn } from '@/lib/utils'

type CarFallbackConfig = {
  make?: string | null
  model?: string | null
  year?: number | string | null
  trim?: string | null
  variant?: string | null
  color?: string | null
  origin_locale?: string | null
}

type CarFallbackVisualProps = {
  config: CarFallbackConfig
  variant?: 'card' | 'detail'
  showCaption?: boolean
  showBadge?: boolean
  className?: string
}

const paintByColor: Record<string, { base: string; light: string; dark: string; glow: string }> = {
  أبيض: { base: '#f8fafc', light: '#ffffff', dark: '#cbd5e1', glow: 'rgba(248,250,252,0.55)' },
  'أبيض لؤلؤي': { base: '#f7f3e8', light: '#ffffff', dark: '#d7cfbc', glow: 'rgba(255,255,255,0.58)' },
  أسود: { base: '#111827', light: '#374151', dark: '#020617', glow: 'rgba(17,24,39,0.42)' },
  فضي: { base: '#cbd5e1', light: '#f8fafc', dark: '#64748b', glow: 'rgba(203,213,225,0.45)' },
  رمادي: { base: '#64748b', light: '#94a3b8', dark: '#334155', glow: 'rgba(100,116,139,0.44)' },
  أحمر: { base: '#dc2626', light: '#f87171', dark: '#7f1d1d', glow: 'rgba(220,38,38,0.36)' },
  أزرق: { base: '#2563eb', light: '#60a5fa', dark: '#1e3a8a', glow: 'rgba(37,99,235,0.36)' },
  بني: { base: '#8b5e3c', light: '#c08457', dark: '#4a2f1f', glow: 'rgba(139,94,60,0.38)' },
  ذهبي: { base: '#d6a84f', light: '#f5d070', dark: '#8a6424', glow: 'rgba(214,168,79,0.42)' },
  أخضر: { base: '#15803d', light: '#4ade80', dark: '#064e3b', glow: 'rgba(21,128,61,0.34)' }
}

const colorAliases: Record<string, string> = {
  White: 'أبيض',
  'White Pearl': 'أبيض لؤلؤي',
  Pearl: 'أبيض لؤلؤي',
  Black: 'أسود',
  Silver: 'فضي',
  Gray: 'رمادي',
  Grey: 'رمادي',
  Red: 'أحمر',
  Blue: 'أزرق',
  Brown: 'بني',
  Gold: 'ذهبي',
  Green: 'أخضر'
}

function getPaint(color?: string | null) {
  const localized = localizeVehicleText(color)
  const key = localized || colorAliases[color || ''] || ''
  return paintByColor[key] || { base: '#38a6a4', light: '#86efdf', dark: '#164e53', glow: 'rgba(56,166,164,0.38)' }
}

function getBodyType(config: CarFallbackConfig) {
  const text = `${config.make || ''} ${config.model || ''}`.toLowerCase()
  const truckWords = ['hilux', 'هايلكس', 'truck', 'pickup']
  const suvWords = [
    'land cruiser',
    'patrol',
    'prado',
    'fortuner',
    'rav4',
    'lx',
    'gx',
    'rx',
    'nx',
    'gle',
    'cr-v',
    'x-trail',
    'pathfinder',
    'tucson',
    'santa fe',
    'palisade',
    'sportage',
    'sorento',
    'telluride',
    'جيب',
    'لاند',
    'باترول',
    'برادو',
    'فورتشنر',
    'راف',
    'جي إل إي',
    'سبورتاج'
  ]

  if (truckWords.some((word) => text.includes(word))) return 'truck'
  if (suvWords.some((word) => text.includes(word))) return 'suv'
  return 'sedan'
}

function BodyShape({
  bodyType,
  bodyGradientId
}: {
  bodyType: ReturnType<typeof getBodyType>
  bodyGradientId: string
}) {
  if (bodyType === 'truck') {
    return (
      <>
        <path d="M154 303C180 251 224 228 300 228H458L506 272H640C680 272 710 298 724 342L744 404H130L154 303Z" fill={`url(#${bodyGradientId})`} />
        <path d="M280 239H442L480 276H244C250 258 262 247 280 239Z" fill="rgba(255,255,255,0.34)" />
        <path d="M506 282H650L681 342H506V282Z" fill="rgba(2,6,23,0.22)" />
      </>
    )
  }

  if (bodyType === 'suv') {
    return (
      <>
        <path d="M135 326C154 258 205 222 282 214H548C618 214 680 262 707 330L735 400H113L135 326Z" fill={`url(#${bodyGradientId})`} />
        <path d="M268 231H540C579 232 617 253 644 290H220C231 257 247 239 268 231Z" fill="rgba(255,255,255,0.32)" />
        <path d="M537 241C577 246 608 265 630 290H537V241Z" fill="rgba(2,6,23,0.20)" />
      </>
    )
  }

  return (
    <>
      <path d="M119 342C148 286 209 259 302 253H490C580 253 653 285 712 350L746 400H105L119 342Z" fill={`url(#${bodyGradientId})`} />
      <path d="M303 264H486C541 265 584 285 621 322H225C245 291 270 272 303 264Z" fill="rgba(255,255,255,0.32)" />
      <path d="M485 270C531 276 566 293 594 322H485V270Z" fill="rgba(2,6,23,0.18)" />
    </>
  )
}

export function CarFallbackVisual({
  config,
  variant = 'card',
  showCaption = false,
  showBadge = true,
  className
}: CarFallbackVisualProps) {
  const svgId = useId().replace(/:/g, '')
  const bodyGradientId = `car-body-${svgId}`
  const wheelGradientId = `car-wheel-${svgId}`
  const paint = getPaint(config.color)
  const title = vehicleTitle(config)
  const trim = localizeVehicleText(config.trim || config.variant) || 'مواصفات وكالة'
  const color = localizeVehicleText(config.color) || 'لون حسب التوفر'
  const origin = localizeVehicleText(config.origin_locale) || 'منشأ غير محدد'
  const bodyType = getBodyType(config)
  const isDetail = variant === 'detail'

  return (
    <div
      className={cn(
        'relative flex h-full min-h-[15rem] w-full overflow-hidden bg-[#102528] text-white',
        isDetail ? 'items-end rounded-none p-6 md:p-8' : 'items-end p-5',
        className
      )}
      style={{
        '--paint-base': paint.base,
        '--paint-light': paint.light,
        '--paint-dark': paint.dark,
        '--paint-glow': paint.glow
      } as CSSProperties}
      aria-label={title}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 28% 16%, var(--paint-glow), transparent 34%), radial-gradient(circle at 86% 20%, rgba(245,158,11,0.24), transparent 30%), linear-gradient(135deg, #102528 0%, #17373b 48%, #0b1719 100%)'
        }}
      />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/42 to-transparent" />

      <svg
        viewBox="0 0 900 520"
        className={cn(
          'absolute left-1/2 top-1/2 w-[118%] -translate-x-1/2 -translate-y-1/2',
          isDetail ? 'max-w-[980px]' : 'max-w-[760px]'
        )}
        role="img"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={bodyGradientId} x1="160" x2="720" y1="220" y2="410" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--paint-light)" offset="0" />
            <stop stopColor="var(--paint-base)" offset="0.48" />
            <stop stopColor="var(--paint-dark)" offset="1" />
          </linearGradient>
          <radialGradient id={wheelGradientId} cx="50%" cy="50%" r="50%">
            <stop stopColor="#dbeafe" offset="0" />
            <stop stopColor="#475569" offset="0.32" />
            <stop stopColor="#020617" offset="0.74" />
          </radialGradient>
        </defs>

        <ellipse cx="450" cy="424" rx="330" ry="38" fill="rgba(0,0,0,0.26)" />
        <BodyShape bodyType={bodyType} bodyGradientId={bodyGradientId} />
        <path d="M126 360H735L746 400H105L126 360Z" fill="rgba(2,6,23,0.18)" />
        <path d="M210 304H628" stroke="rgba(255,255,255,0.30)" strokeWidth="8" strokeLinecap="round" />
        <path d="M143 351H205" stroke="#fde68a" strokeWidth="14" strokeLinecap="round" />
        <path d="M681 354H733" stroke="#fecaca" strokeWidth="14" strokeLinecap="round" />
        <circle cx="250" cy="400" r="58" fill={`url(#${wheelGradientId})`} />
        <circle cx="250" cy="400" r="24" fill="#e2e8f0" opacity="0.72" />
        <circle cx="620" cy="400" r="58" fill={`url(#${wheelGradientId})`} />
        <circle cx="620" cy="400" r="24" fill="#e2e8f0" opacity="0.72" />
      </svg>

      {showCaption ? (
        <div
          className={cn(
            'absolute z-10 min-w-0 text-right',
            isDetail ? 'right-6 top-6 max-w-[72%] md:right-8 md:top-8' : 'bottom-5 right-5 max-w-[78%]'
          )}
        >
          {showBadge && (
            <Badge className="mb-3 rounded-full border-white/20 bg-white/14 px-3 py-1 text-white backdrop-blur hover:bg-white/14">
              صورة تجريبية حسب المواصفات
            </Badge>
          )}
          <h3 className={cn('font-black leading-tight text-white drop-shadow-sm', isDetail ? 'text-3xl md:text-5xl' : 'text-2xl')}>
            {title}
          </h3>
          <p className={cn('mt-2 font-medium text-white/72', isDetail ? 'text-base' : 'text-sm')}>
            {trim} · {color} · {origin}
          </p>
        </div>
      ) : showBadge ? (
        <div className={cn('absolute z-10', isDetail ? 'right-6 top-6 md:right-8 md:top-8' : 'bottom-5 right-5')}>
          <Badge className="rounded-full border-white/20 bg-white/14 px-3 py-1 text-white backdrop-blur hover:bg-white/14">
            صورة تجريبية
          </Badge>
        </div>
      ) : null}

        <span
          className={cn(
            'absolute z-10 hidden h-12 w-12 shrink-0 rounded-2xl border border-white/30 shadow-lg sm:block',
            isDetail ? 'bottom-6 left-6 md:bottom-8 md:left-8' : 'bottom-5 left-5'
          )}
          style={{ background: `linear-gradient(135deg, ${paint.light}, ${paint.base} 52%, ${paint.dark})` }}
          aria-hidden="true"
        />
    </div>
  )
}
