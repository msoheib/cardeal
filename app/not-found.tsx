import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <main className="page-narrow flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="eyebrow num">404</p>
      <h1 className="page-title mt-1">الصفحة غير موجودة</h1>
      <p className="mt-2 text-sm">الرابط غير صحيح أو لم يعد متاحاً.</p>
      <div className="mt-6 flex gap-2">
        <Button asChild><Link href="/cars">تصفح السيارات</Link></Button>
        <Button asChild variant="outline"><Link href="/">الرئيسية</Link></Button>
      </div>
    </main>
  )
}
