import * as React from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: React.ReactNode
  description?: React.ReactNode
  /** Small line above the title (breadcrumb, section name). */
  eyebrow?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

/** The one page header: title + optional description on the start side, actions on the end side. */
export function PageHeader({ title, description, eyebrow, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0 space-y-1">
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className="page-title">{title}</h1>
        {description && <p className="text-sm leading-6">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

interface SectionProps {
  title?: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
}

/** A titled block inside a page; no card chrome of its own. */
export function Section({ title, description, actions, children, className }: SectionProps) {
  return (
    <section className={cn('space-y-3', className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            {title && <h2 className="section-title">{title}</h2>}
            {description && <p className="text-sm">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  )
}
