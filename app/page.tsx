import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowLeft,
  BadgePercent,
  Car,
  CheckCircle2,
  ShieldCheck,
  Timer,
  TrendingUp
} from 'lucide-react'

import { Button } from '@/components/ui/button'

const heroMetrics = [
  { label: 'رسوم الالتزام', value: '500 ر.س', detail: 'ثابتة ومتحقق منها' },
  { label: 'طريقة الشراء', value: 'مزايدة', detail: 'عروض واضحة قبل القبول' },
  { label: 'الموردون', value: 'معتمدون', detail: 'تاجر موثّق قبل البيع' }
]

const journeySteps = [
  {
    icon: Car,
    title: 'اختر السيارة',
    description: 'تصفح المخزون المتاح حسب الماركة والسعر والمواصفات.'
  },
  {
    icon: BadgePercent,
    title: 'قدّم عرضك',
    description: 'ادفع رسوم الالتزام الثابتة ثم أرسل عرضك بثقة.'
  },
  {
    icon: ShieldCheck,
    title: 'انتظر قبول التاجر',
    description: 'يقبل التاجر العرض عند توفر المخزون وتظهر الصفقة في حسابك.'
  }
]

const featuredCars = [
  {
    name: 'تويوتا لاند كروزر',
    year: '2026',
    price: '312,000 ر.س',
    image:
      'https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=900'
  },
  {
    name: 'لكزس إل إكس',
    year: '2025',
    price: '428,000 ر.س',
    image:
      'https://images.pexels.com/photos/244206/pexels-photo-244206.jpeg?auto=compress&cs=tinysrgb&w=900'
  },
  {
    name: 'مرسيدس بنز جي إل إي',
    year: '2026',
    price: '386,000 ر.س',
    image:
      'https://images.pexels.com/photos/120049/pexels-photo-120049.jpeg?auto=compress&cs=tinysrgb&w=900'
  }
]

export default function HomePage() {
  return (
    <div className="min-h-screen app-gradient-bg text-foreground">
      <header className="sticky top-0 z-50 border-b border-white/70 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="group flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#15383b] text-white shadow-[0_18px_30px_-22px_rgba(21,56,59,0.7)] transition-transform group-hover:-translate-y-0.5">
              <Car className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-lg font-extrabold tracking-tight text-[#102528]">
                كار ديل
              </span>
              <span className="block text-xs font-medium text-muted-foreground">
                منصة مزايدة سيارات
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-semibold text-muted-foreground md:flex">
            <Link href="/cars" className="transition hover:text-foreground">
              السيارات
            </Link>
            <Link href="/dealer/apply" className="transition hover:text-foreground">
              طلب تاجر
            </Link>
            <Link href="/dashboard" className="transition hover:text-foreground">
              لوحة التحكم
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden rounded-full px-5 sm:inline-flex">
              <Link href="/auth/login">دخول</Link>
            </Button>
            <Button asChild className="rounded-full px-5 shadow-[0_16px_26px_-18px_rgba(20,184,166,0.9)]">
              <Link href="/cars">
                تصفّح السوق
                <ArrowLeft className="mr-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(20,184,166,0.18),transparent_30%),radial-gradient(circle_at_85%_10%,rgba(245,158,11,0.18),transparent_28%)]" />

          <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:py-16">
            <div className="space-y-8">
              <div className="space-y-5">
                <h1 className="max-w-3xl text-4xl font-black leading-[1.08] tracking-tight text-[#102528] sm:text-5xl lg:text-6xl">
                  سوق سيارات حيّ بعروض واضحة وتجار موثّقين.
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-[#51676b]">
                  تصفّح السيارات المتاحة، قارن سعر الوكالة، وقدّم عرضك برسوم
                  التزام ثابتة قبل أن ينتقل الطلب مباشرة للتاجر المناسب.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-14 rounded-full px-8 text-base">
                  <Link href="/cars">
                    ابدأ من السيارات المتاحة
                    <ArrowLeft className="mr-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-14 rounded-full border-[#b8d6d8] bg-white/80 px-8 text-base hover:bg-white"
                >
                  <Link href="/auth/register">إنشاء حساب</Link>
                </Button>
              </div>

              <div className="hidden gap-3 sm:grid sm:grid-cols-3">
                {heroMetrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-[0_22px_42px_-35px_rgba(19,43,49,0.45)] backdrop-blur"
                  >
                    <div className="text-xs font-bold text-muted-foreground">{metric.label}</div>
                    <div className="mt-2 text-2xl font-black text-[#102528]">{metric.value}</div>
                    <div className="mt-1 text-xs font-medium text-[#6b7f82]">{metric.detail}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-xl">
              <div className="absolute -right-6 top-10 hidden h-28 w-28 rounded-[2rem] bg-[#f6b342]/30 blur-2xl sm:block" />
              <div className="absolute -left-8 bottom-16 hidden h-36 w-36 rounded-full bg-primary/20 blur-3xl sm:block" />

              <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white p-3 shadow-[0_32px_70px_-42px_rgba(16,37,40,0.65)]">
                <div className="relative overflow-hidden rounded-[1.5rem]">
                  <Image
                    src="https://images.pexels.com/photos/1402787/pexels-photo-1402787.jpeg?auto=compress&cs=tinysrgb&w=1200"
                    alt="سيارة فاخرة معروضة في منصة كار ديل"
                    width={900}
                    height={650}
                    priority
                    className="h-[420px] w-full object-cover sm:h-[500px]"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#102528]/90 via-[#102528]/50 to-transparent p-5 text-white">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                      <div>
                        <p className="text-sm text-white/70">فرصة نشطة الآن</p>
                        <h2 className="mt-1 text-2xl font-black">جي إل إي 2026</h2>
                      </div>
                      <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
                        <p className="text-xs text-white/70">سعر الوكالة</p>
                        <p className="text-lg font-black">386,000 ر.س</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-5 right-4 w-[78%] rounded-3xl border border-white/80 bg-white/95 p-4 shadow-[0_24px_48px_-32px_rgba(16,37,40,0.6)] backdrop-blur sm:right-10 sm:w-72">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground">عرض مقترح</p>
                    <p className="mt-1 text-2xl font-black text-[#102528]">361,500 ر.س</p>
                  </div>
                  <TrendingUp className="h-9 w-9 rounded-2xl bg-primary/12 p-2 text-primary" />
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#dbe9e9]">
                  <div className="h-full w-[72%] rounded-full bg-primary" />
                </div>
              </div>

              <div className="absolute -top-4 left-4 rounded-3xl border border-white/80 bg-white/90 p-4 shadow-[0_20px_46px_-34px_rgba(16,37,40,0.55)] backdrop-blur sm:left-8">
                <div className="flex items-center gap-3">
                  <Timer className="h-10 w-10 rounded-2xl bg-amber-100 p-2 text-amber-700" />
                  <div>
                    <p className="text-xs font-bold text-muted-foreground">قبول سريع</p>
                    <p className="text-sm font-black text-[#102528]">حسب توفر المخزون</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="grid gap-4 lg:grid-cols-3">
            {journeySteps.map((step, index) => {
              const Icon = step.icon
              return (
                <div
                  key={step.title}
                  className="group rounded-[1.75rem] border border-white/70 bg-white/80 p-6 shadow-[0_22px_42px_-36px_rgba(19,43,49,0.42)] transition hover:-translate-y-1 hover:bg-white"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#102528] text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-primary">
                        0{index + 1}
                      </div>
                      <h2 className="mt-2 text-xl font-black text-[#102528]">{step.title}</h2>
                      <p className="mt-2 leading-7 text-[#64787b]">{step.description}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
          <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-[#102528]">
                سيارات تملأ السوق اليوم
              </h2>
              <p className="mt-2 max-w-2xl text-[#64787b]">
                بطاقات مختصرة تساعدك على الانتقال مباشرة إلى المخزون الفعلي.
              </p>
            </div>
            <Button asChild variant="outline" className="rounded-full bg-white/70">
              <Link href="/cars">
                عرض جميع السيارات
                <ArrowLeft className="mr-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {featuredCars.map((car) => (
              <Link
                key={car.name}
                href="/cars"
                className="group overflow-hidden rounded-[1.75rem] border border-white/70 bg-white shadow-[0_22px_46px_-38px_rgba(16,37,40,0.5)] transition hover:-translate-y-1 hover:shadow-[0_30px_58px_-38px_rgba(16,37,40,0.65)]"
              >
                <div className="relative h-56 overflow-hidden">
                  <Image
                    src={car.image}
                    alt={car.name}
                    width={700}
                    height={420}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#102528]/75 via-transparent to-transparent" />
                  <div className="absolute bottom-4 right-4 rounded-2xl bg-white/90 px-3 py-2 text-xs font-black text-[#102528] backdrop-blur">
                    {car.year}
                  </div>
                </div>
                <div className="flex items-center justify-between p-5">
                  <div>
                    <h3 className="text-lg font-black text-[#102528]">{car.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">يبدأ من {car.price}</p>
                  </div>
                  <CheckCircle2 className="h-7 w-7 text-primary" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
