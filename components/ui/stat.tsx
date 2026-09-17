import * as React from 'react'
import { cn } from '@/lib/utils'

export type StatTone = 'default' | 'warning' | 'danger' | 'success'

const TONE: Record<StatTone, string> = {
  default: 'bg-transparent',
  warning: 'bg-status-warning',
  danger: 'bg-status-danger',
  success: 'bg-status-success',
}

interface StatProps {
  label: React.ReactNode
  value: React.ReactNode
  hint?: React.ReactNode
  tone?: StatTone
  onClick?: () => void
  className?: string
}

/** One metric cell. Place several inside <StatGroup> to get a single bordered strip. */
export function Stat({ label, value, hint, tone = 'default', onClick, className }: StatProps) {
  const body = (
    <>
      <span className="block text-xs font-medium text-muted-foreground">{label}</span>
      <span className="num mt-1 block text-xl font-bold leading-7 text-foreground">{value}</span>
      {hint && <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>}
    </>
  )
  const classes = cn('block w-full p-4 text-start', TONE[tone], className)
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(classes, 'transition-colors hover:bg-muted/60')}>
        {body}
      </button>
    )
  }
  return <div className={classes}>{body}</div>
}

/** Stats laid out as one card with hairline dividers instead of a wall of separate cards. */
export function StatGroup({ children, columns = 4, className }: { children: React.ReactNode; columns?: 2 | 3 | 4 | 5; className?: string }) {
  const cols = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
    5: 'sm:grid-cols-3 lg:grid-cols-5',
  }[columns]
  return (
    <div className={cn('surface grid grid-cols-2 gap-px overflow-hidden bg-border', cols, className)}>
      {React.Children.map(children, (child) => child && <div className="bg-card">{child}</div>)}
    </div>
  )
}
