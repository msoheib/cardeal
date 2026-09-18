'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Car, CircleUserRound, LayoutDashboard, Loader2, LogIn, LogOut, Menu, Store, UserPlus, Users } from 'lucide-react'

import { signOut } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

const navItems = [
  { href: '/', label: 'الرئيسية', match: (path: string) => path === '/', icon: Car },
  { href: '/cars', label: 'السوق', match: (path: string) => path.startsWith('/cars'), icon: Store },
  { href: '/dashboard', label: 'لوحة التحكم', match: (path: string) => path.startsWith('/dashboard'), icon: LayoutDashboard },
  { href: '/dealer/apply', label: 'الموردون', match: (path: string) => path.startsWith('/dealer'), icon: Users }
]

export function AppNavbar() {
  const pathname = usePathname() || '/'
  const router = useRouter()
  const isAuth = pathname.startsWith('/auth')
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    // INITIAL_SESSION restores the header on reload; subsequent events keep it
    // in sync with login/logout elsewhere without a separate profile request.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsSignedIn(Boolean(session?.user))
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    if (isSigningOut) return
    setIsSigningOut(true)

    try {
      const { error } = await signOut()
      if (error) throw error

      setIsMenuOpen(false)
      router.replace('/')
      router.refresh()
    } catch {
      toast({
        variant: 'destructive',
        title: 'تعذر تسجيل الخروج',
        description: 'يرجى المحاولة مرة أخرى.'
      })
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <header className="sticky top-0 z-[80] w-full border-b border-white/10 bg-ink text-white">
      <div className="container flex h-14 items-center justify-between gap-6">
        <Link href="/" className="flex min-w-0 shrink-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand text-white">
            <Car className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-bold leading-5">كار ديل</span>
            <span className="hidden truncate text-[11px] leading-4 text-white/60 sm:block">سوق سيارات بعروض موثوقة</span>
          </span>
        </Link>

        <nav className="hidden flex-1 items-center gap-1 lg:flex" aria-label="التنقل الرئيسي">
          {navItems.map((item) => {
            const active = item.match(pathname)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'relative inline-flex h-14 shrink-0 items-center px-3 text-sm transition-colors',
                  active
                    ? 'font-bold text-white after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-brand'
                    : 'text-white/70 hover:text-white'
                )}
                aria-current={active ? 'page' : undefined}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          {isSignedIn === null ? (
            <div role="status" className="flex h-9 w-44 items-center justify-center text-white/65">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span className="sr-only">جاري تحميل الحساب...</span>
            </div>
          ) : isSignedIn ? (
            <>
              <Link href="/dashboard" className="inline-flex h-9 items-center gap-2 rounded-md bg-white px-3 text-sm font-medium text-ink transition-colors hover:bg-white/90">
                <CircleUserRound className="h-4 w-4" />
                حسابي
              </Link>
              <Button type="button" variant="ghost" onClick={handleSignOut} disabled={isSigningOut} className="h-9 gap-2 px-3 text-sm text-white/80 hover:bg-white/10 hover:text-white">
                <LogOut className="h-4 w-4" />
                {isSigningOut ? 'جاري الخروج...' : 'تسجيل الخروج'}
              </Button>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className={cn(
                  'inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm transition-colors',
                  isAuth ? 'bg-white/15 font-medium text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'
                )}
              >
                <LogIn className="h-4 w-4" />
                دخول
              </Link>
              <Link
                href="/auth/register"
                className="hidden h-9 items-center gap-2 rounded-md bg-white px-3 text-sm font-medium text-ink transition-colors hover:bg-white/90 sm:inline-flex"
              >
                <UserPlus className="h-4 w-4" />
                إنشاء حساب
              </Link>
            </>
          )}
        </div>

        <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <SheetTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="shrink-0 text-white hover:bg-white/10 hover:text-white lg:hidden" aria-label="فتح قائمة التنقل">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[min(88vw,360px)]" dir="rtl">
            <SheetHeader><SheetTitle>كار ديل</SheetTitle><SheetDescription className="sr-only">قائمة التنقل الرئيسية</SheetDescription></SheetHeader>
            <nav className="mt-6 flex flex-col gap-1" aria-label="التنقل الرئيسي للجوال">
              {navItems.map((item) => {
                const Icon = item.icon
                const active = item.match(pathname)
                return (
                  <Link key={item.href} href={item.href} onClick={() => setIsMenuOpen(false)} className={cn('flex h-11 items-center gap-3 rounded-md px-3 text-sm', active ? 'bg-primary/10 font-bold text-primary' : 'text-foreground hover:bg-muted')} aria-current={active ? 'page' : undefined}>
                    <Icon className="h-4 w-4" />{item.label}
                  </Link>
                )
              })}
            </nav>
            <div className="mt-6 grid gap-2 border-t pt-4">
              {isSignedIn === null ? (
                <div role="status" className="flex h-10 items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  جاري تحميل الحساب...
                </div>
              ) : isSignedIn ? (
                <>
                  <Button asChild><Link href="/dashboard" onClick={() => setIsMenuOpen(false)}><CircleUserRound className="h-4 w-4" />حسابي</Link></Button>
                  <Button type="button" variant="outline" onClick={handleSignOut} disabled={isSigningOut}>
                    <LogOut className="h-4 w-4" />{isSigningOut ? 'جاري الخروج...' : 'تسجيل الخروج'}
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild variant={isAuth ? 'default' : 'outline'}><Link href="/auth/login" onClick={() => setIsMenuOpen(false)}><LogIn className="h-4 w-4" />دخول</Link></Button>
                  <Button asChild><Link href="/auth/register" onClick={() => setIsMenuOpen(false)}><UserPlus className="h-4 w-4" />إنشاء حساب</Link></Button>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
