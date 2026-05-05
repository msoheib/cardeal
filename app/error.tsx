'use client'

type ErrorPageProps = {
  reset: () => void
}

export default function ErrorPage({ reset }: ErrorPageProps) {
  return (
    <main className="min-h-screen bg-background px-4 py-16" dir="rtl">
      <div className="mx-auto flex max-w-xl flex-col items-center text-center">
        <span className="mb-4 rounded-full bg-destructive/10 px-4 py-2 text-sm font-semibold text-destructive">
          خطأ
        </span>
        <h1 className="text-3xl font-bold text-foreground md:text-4xl">
          حدث خطأ أثناء تحميل الصفحة
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          يرجى إعادة المحاولة. إذا استمرت المشكلة، عد للرئيسية ثم حاول من جديد.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-8 inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
        >
          إعادة المحاولة
        </button>
      </div>
    </main>
  )
}
