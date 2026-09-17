'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import {
  Activity,
  BadgeCheck,
  Building2,
  Car,
  FileText,
  Gavel,
  Handshake,
  History,
  Layers,
  LifeBuoy,
  Package,
  Receipt,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { User } from '@/lib/supabase'
import { RESOURCE_ORDER, RESOURCES, ResourceKey } from '@/lib/admin-console/resources'
import { OverviewPanel } from './overview-panel'
import { ResourcePanel } from './resource-panel'
import { AuditPanel } from './audit-panel'

type View = 'overview' | 'audit' | ResourceKey

const ICONS: Record<ResourceKey, LucideIcon> = {
  bids: Gavel,
  deals: Handshake,
  listings: Car,
  inventory: Package,
  configurations: Layers,
  specs: FileText,
  users: Users,
  dealers: Building2,
  dealer_applications: BadgeCheck,
  commitment_fees: Receipt,
  support_tickets: LifeBuoy,
}

export interface OpenResourceOptions {
  status?: string
  filters?: Record<string, string>
}

export function AdminConsole({ user }: { user: User }) {
  const [view, setView] = useState<View>('overview')
  const [preset, setPreset] = useState<OpenResourceOptions & { nonce: number }>({ nonce: 0 })

  const openResource = (key: ResourceKey, options: OpenResourceOptions = {}) => {
    setPreset((prev) => ({ ...options, nonce: prev.nonce + 1 }))
    setView(key)
  }

  const nav: { key: View; label: string; icon: LucideIcon }[] = [
    { key: 'overview', label: 'المراقبة', icon: Activity },
    ...RESOURCE_ORDER.map((key) => ({ key, label: RESOURCES[key].label, icon: ICONS[key] })),
    { key: 'audit', label: 'سجل التدقيق', icon: History },
  ]

  return (
    <div className="page space-y-6" dir="rtl">
      <PageHeader
        eyebrow={`مرحباً، ${user.full_name}`}
        title="الإدارة"
        description="كل الإعلانات والعروض والصفقات والحسابات في مكان واحد."
      />

      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        <nav aria-label="أقسام الإدارة" className="lg:w-48 lg:shrink-0">
          <ul className="flex gap-1 overflow-x-auto border-b border-border pb-2 lg:sticky lg:top-20 lg:flex-col lg:overflow-visible lg:border-b-0 lg:pb-0">
            {nav.map((item) => {
              const Icon = item.icon
              const active = view === item.key
              return (
                <li key={item.key} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => (item.key === 'overview' || item.key === 'audit' ? setView(item.key) : openResource(item.key))}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex h-9 w-full items-center gap-2 whitespace-nowrap rounded-md px-2.5 text-sm transition-colors',
                      active ? 'bg-primary/10 font-bold text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        <main className="min-w-0 flex-1">
          {view === 'overview' && <OverviewPanel onOpen={openResource} />}
          {view === 'audit' && <AuditPanel />}
          {view !== 'overview' && view !== 'audit' && (
            <ResourcePanel
              key={`${view}-${preset.nonce}`}
              resource={RESOURCES[view]}
              currentUserId={user.id}
              initialStatus={preset.status}
              initialFilters={preset.filters}
            />
          )}
        </main>
      </div>
    </div>
  )
}
