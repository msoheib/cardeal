import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-screen bg-background px-4 py-16" dir="rtl">
      <div className="mx-auto flex max-w-xl flex-col items-center text-center">
        <span className="mb-4 rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
          404
        </span>
        <h1 className="text-3xl font-bold text-foreground md:text-4xl">
          الصفحة غير موجودة
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          الرابط الذي تحاول فتحه غير صحيح أو لم يعد متاحا.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
        >
          العودة للرئيسية
        </Link>
      </div>
    </main>
  )
}
