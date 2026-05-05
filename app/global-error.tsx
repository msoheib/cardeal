'use client'

import Link from 'next/link'

type GlobalErrorProps = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ reset }: GlobalErrorProps) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen bg-[#f4f7f7] text-[#2d3b3f]">
        <main className="flex min-h-screen items-center justify-center px-4 py-16">
          <div className="w-full max-w-xl rounded-[1.2rem] border border-[#cbdcdd] bg-white p-8 text-center shadow-sm">
            <span className="mb-4 inline-flex rounded-full bg-[#e5f2f2] px-4 py-2 text-sm font-semibold text-[#38a6a4]">
              خطأ
            </span>
            <h1 className="text-3xl font-bold">
              تعذر تحميل الصفحة
            </h1>
            <p className="mt-3 text-base text-[#5f7175]">
              حدث خطأ غير متوقع. يمكنك إعادة المحاولة أو الرجوع للرئيسية.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={reset}
                className="inline-flex h-11 items-center justify-center rounded-full bg-[#38a6a4] px-6 text-sm font-semibold text-white transition hover:bg-[#2f9290]"
              >
                إعادة المحاولة
              </button>
              <Link
                href="/"
                className="inline-flex h-11 items-center justify-center rounded-full border border-[#cbdcdd] px-6 text-sm font-semibold text-[#2d3b3f] transition hover:bg-[#eef5f5]"
              >
                العودة للرئيسية
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  )
}
