import './globals.css';
import type { Metadata } from 'next';
import { Inter, Cairo } from 'next/font/google';
import { RealTimeProvider } from '@/components/ui/real-time-provider'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const cairo = Cairo({ subsets: ['arabic'], variable: '--font-cairo' });

export const metadata: Metadata = {
  title: 'منصة مزايدات السيارات - السعودية',
  description: 'منصة المزايدات العكسية للسيارات في المملكة العربية السعودية - وفر المال واحصل على أفضل الأسعار',
  keywords: 'مزايدات السيارات, سيارات السعودية, أسعار السيارات, وكالة السيارات',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${inter.variable} ${cairo.variable} font-sans antialiased`}>
        <RealTimeProvider>
          {children}
          <Toaster />
        </RealTimeProvider>
      </body>
    </html>
  );
}