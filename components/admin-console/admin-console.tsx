'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Activity,
  BadgeCheck,
  Building2,
  Car,
  ClipboardList,
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
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="border-b border-border bg-card">
        <div className="container mx-auto flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-white">
              <ClipboardList className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-extrabold text-foreground">لوحة الإدارة الشاملة</h1>
              <p className="text-sm">كل الإعلانات والعروض والصفقات والحسابات في مكان واحد · {user.full_name}</p>
            </div>
          </div>
          <Link href="/dashboard" className="text-sm font-semibold text-primary hover:underline">
            اللوحة المختصرة
          </Link>
        </div>
      </div>

      <div className="container mx-auto flex flex-col gap-6 px-4 py-6 lg:flex-row">
        <nav aria-label="أقسام الإدارة" className="lg:w-56 lg:shrink-0">
          <ul className="flex gap-1 overflow-x-auto pb-1 lg:sticky lg:top-24 lg:flex-col lg:overflow-visible lg:pb-0">
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
                      'flex min-h-10 w-full items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm transition-colors',
                      active ? 'bg-primary font-bold text-primary-foreground' : 'text-foreground hover:bg-muted'
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
