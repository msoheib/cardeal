'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Car, LayoutDashboard, LogIn, Store, UserPlus, Users } from 'lucide-react'

import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: 'الرئيسية', match: (path: string) => path === '/', icon: Car },
  { href: '/cars', label: 'السوق', match: (path: string) => path.startsWith('/cars'), icon: Store },
  { href: '/dashboard', label: 'لوحة التحكم', match: (path: string) => path.startsWith('/dashboard'), icon: LayoutDashboard },
  { href: '/dealer/apply', label: 'الموردون', match: (path: string) => path.startsWith('/dealer'), icon: Users }
]

export function AppNavbar() {
  const pathname = usePathname() || '/'
  const isAuth = pathname.startsWith('/auth')

  return (
    <header className="sticky top-0 z-[80] w-full border-b border-[#1f4548] bg-[#102528] text-white shadow-sm">
      <div className="mx-auto flex min-h-[72px] w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#102528]">
            <Car className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-lg font-black leading-5">كار ديل</span>
            <span className="block truncate text-xs font-medium text-white/65">سوق سيارات بعروض موثوقة</span>
          </span>
        </Link>

        <nav className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0" aria-label="التنقل الرئيسي">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = item.match(pathname)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-bold transition-colors',
                  active
                    ? 'bg-white text-[#102528]'
                    : 'text-white/75 hover:bg-white/10 hover:text-white'
                )}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/auth/login"
            className={cn(
              'inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold transition-colors',
              isAuth ? 'bg-white text-[#102528]' : 'bg-white/10 text-white hover:bg-white/15'
            )}
          >
            <LogIn className="h-4 w-4" />
            دخول
          </Link>
          <Link
            href="/auth/register"
            className="hidden h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 sm:inline-flex"
          >
            <UserPlus className="h-4 w-4" />
            إنشاء حساب
          </Link>
        </div>
      </div>
    </header>
  )
}
