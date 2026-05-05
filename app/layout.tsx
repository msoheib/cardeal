import './globals.css'
import type { Metadata } from 'next'
import { Tajawal } from 'next/font/google'
import { RealTimeProvider } from '@/components/ui/real-time-provider'
import { Toaster } from '@/components/ui/toaster'

const tajawal = Tajawal({
  subsets: ['arabic', 'latin'],
  weight: ['400', '700'],
  variable: '--font-tajawal'
})

export const metadata: Metadata = {
  title: 'كار ديل',
  description:
    'منصة مزايدة سيارات تتيح مقارنة الأسعار وتقديم العروض بثقة عبر تجار موثّقين.',
  keywords: ['سيارات', 'شراء سيارات', 'بيع سيارات', 'مزايدة سيارات', 'سوق سيارات']
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${tajawal.variable} font-sans antialiased`}>
        <RealTimeProvider>
          {children}
          <Toaster />
        </RealTimeProvider>
      </body>
    </html>
  )
}
