import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, BadgeCheck, CreditCard, Search, ShieldCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { LatestListings } from '@/components/latest-listings'

const steps = [
  { icon: Search, title: 'اختر السيارة', description: 'تصفّح المخزون المتاح وقارن سعر الوكالة والمواصفات.' },
  { icon: CreditCard, title: 'قدّم عرضك', description: 'حدد سعرك وادفع 500 ر.س رسوم التزام تُخصم من سعر السيارة.' },
  { icon: BadgeCheck, title: 'يقبل التاجر', description: 'يصل عرضك للتجار الموثّقين، وأول من يقبل يتواصل معك.' },
]

const assurances = [
  'تجار موثّقون بسجل تجاري',
  'رسوم ثابتة ومعلنة مسبقاً',
  'دفع آمن عبر ميسّر',
  'بيانات التواصل بعد القبول فقط',
]

export default function HomePage() {
  return (
    <main className="bg-background">
      <section className="border-b border-border bg-card">
        <div className="container grid gap-10 py-10 lg:grid-cols-2 lg:items-center lg:py-16">
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-sm font-medium text-primary">سوق سيارات جديدة بعروض مباشرة</p>
              <h1 className="text-3xl font-extrabold leading-[1.25] text-ink sm:text-4xl">
                قدّم سعرك على السيارة، ودع التجار الموثّقين يتنافسون على قبوله.
              </h1>
              <p className="max-w-xl text-base leading-7">
                قارن سعر الوكالة، وأرسل عرضك برسوم التزام ثابتة. لا مساومة ولا زيارات قبل أن يقبل تاجر عرضك.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/cars">
                  تصفّح السيارات المتاحة
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/dealer/apply">انضم كتاجر</Link>
              </Button>
            </div>

            <ul className="grid gap-2 text-sm sm:grid-cols-2">
              {assurances.map((item) => (
                <li key={item} className="flex items-center gap-2 text-foreground">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-muted">
            <Image
              src="https://images.pexels.com/photos/1402787/pexels-photo-1402787.jpeg?auto=compress&cs=tinysrgb&w=1200"
              alt="سيارة معروضة على منصة كار ديل"
              fill
              priority
              sizes="(min-width: 1024px) 560px, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      <section className="container py-10 lg:py-14">
        <h2 className="section-title mb-4">كيف يعمل كار ديل؟</h2>
        <ol className="surface grid divide-y divide-border md:grid-cols-3 md:divide-x md:divide-y-0 md:divide-x-reverse">
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <li key={step.title} className="flex gap-4 p-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="eyebrow">الخطوة {index + 1}</p>
                  <h3 className="mt-0.5 text-base font-bold">{step.title}</h3>
                  <p className="mt-1 text-sm leading-6">{step.description}</p>
                </div>
              </li>
            )
          })}
        </ol>
      </section>

      <section className="container pb-14">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="section-title">أحدث السيارات المتاحة</h2>
            <p className="text-sm">من مخزون التجار الموثّقين الآن.</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/cars">
              كل السيارات
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <LatestListings />
      </section>
    </main>
  )
}
