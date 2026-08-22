'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Car, LayoutDashboard, LogIn, Menu, Store, UserPlus, Users } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

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
      <div className="mx-auto flex min-h-[72px] w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#102528]">
            <Car className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-lg font-black leading-5">كار ديل</span>
            <span className="block truncate text-xs font-medium text-white/65">سوق سيارات بعروض موثوقة</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-2 lg:flex" aria-label="التنقل الرئيسي">
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

        <div className="hidden shrink-0 items-center gap-2 lg:flex">
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

        <Sheet>
          <SheetTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="shrink-0 text-white hover:bg-white/10 hover:text-white lg:hidden" aria-label="فتح قائمة التنقل">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[min(88vw,360px)]" dir="rtl">
            <SheetHeader className="text-right"><SheetTitle>التنقل الرئيسي</SheetTitle></SheetHeader>
            <nav className="mt-8 flex flex-col gap-2" aria-label="التنقل الرئيسي للجوال">
              {navItems.map((item) => {
                const Icon = item.icon
                const active = item.match(pathname)
                return (
                  <Link key={item.href} href={item.href} className={cn('flex h-12 items-center gap-3 rounded-xl px-4 font-bold', active ? 'bg-primary text-primary-foreground' : 'bg-muted/40 text-foreground hover:bg-muted')} aria-current={active ? 'page' : undefined}>
                    <Icon className="h-5 w-5" />{item.label}
                  </Link>
                )
              })}
            </nav>
            <div className="mt-6 grid gap-2 border-t pt-6">
              <Button asChild variant={isAuth ? 'default' : 'outline'}><Link href="/auth/login"><LogIn className="ml-2 h-4 w-4" />دخول</Link></Button>
              <Button asChild><Link href="/auth/register"><UserPlus className="ml-2 h-4 w-4" />إنشاء حساب</Link></Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
