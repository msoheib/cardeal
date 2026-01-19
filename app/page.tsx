'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
		<div className="min-h-screen bg-[#f6f8f9] text-[#0f172a]">
			<header className="border-b bg-white/90 backdrop-blur">
				<div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
					<div className="text-lg font-extrabold tracking-tight">منصّة المزاد الجماعي</div>
					<div className="flex items-center gap-3">
						<Button asChild variant="ghost" className="rounded-full">
							<Link href="/auth/register">إنشاء حساب</Link>
						</Button>
						<Button asChild className="rounded-full bg-[#14b8a6] hover:bg-[#0ea5a3]">
							<Link href="/auth/login">دخول</Link>
                </Button>
                </div>
            </div>
          </header>

			<main className="mx-auto flex max-w-6xl flex-col items-center justify-center px-4 py-20 text-center">
				<h1 className="text-3xl font-extrabold text-[#0b1220] sm:text-4xl">للشراء الجماعي بالمزايدة</h1>
				<p className="mt-4 max-w-2xl text-[#475569]">
					استكشف السيارات المتاحة وقارن الأسعار. سجّل دخولك فقط عند رغبتك في تقديم عرض.
				</p>
				<div className="mt-8 flex flex-wrap items-center justify-center gap-4">
					<Button asChild size="lg" className="rounded-full bg-[#14b8a6] hover:bg-[#0ea5a3] px-8">
						<Link href="/cars">تصفح السيارات</Link>
					</Button>
				</div>
				<div className="mt-10 w-full rounded-3xl border border-dashed border-[#cbd5e1] bg-white p-10 text-right">
					<div className="text-sm text-[#64748b]">تصفح بدون تسجيل</div>
					<div className="mt-2 text-base text-[#0f172a]">
						استعرض جميع السيارات المتاحة، قارن الأسعار، وشاهد أفضل العروض — بدون الحاجة لإنشاء حساب.
                </div>
              </div>
          </main>
    </div>
  )
}