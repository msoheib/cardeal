import Link from 'next/link'

const links = [
  { href: '/cars', label: 'السوق' },
  { href: '/dealer/apply', label: 'انضم كتاجر' },
  { href: '/terms', label: 'الشروط والأحكام' },
  { href: '/privacy', label: 'سياسة الخصوصية' },
]

export function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-border bg-card">
      <div className="container flex flex-col gap-3 py-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm">
          <span className="font-bold text-foreground">كار ديل</span> · سوق سيارات بعروض موثوقة
        </p>
        <nav aria-label="روابط الموقع">
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            {links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-foreground">{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  )
}
