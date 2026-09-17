'use client'

import { Button } from '@/components/ui/button'

type ErrorPageProps = {
  reset: () => void
}

export default function ErrorPage({ reset }: ErrorPageProps) {
  return (
    <main className="page-narrow flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="eyebrow">خطأ</p>
      <h1 className="page-title mt-1">تعذر تحميل الصفحة</h1>
      <p className="mt-2 text-sm">أعد المحاولة. إن استمرت المشكلة فارجع للرئيسية ثم حاول من جديد.</p>
      <Button type="button" onClick={reset} className="mt-6">إعادة المحاولة</Button>
    </main>
  )
}
