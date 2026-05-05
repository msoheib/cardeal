import Link from 'next/link'

export default function Custom500() {
  return (
    <main
      dir="rtl"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 16px',
        background: '#f4f7f7',
        color: '#2d3b3f',
        fontFamily: 'Tajawal, Segoe UI, Tahoma, sans-serif'
      }}
    >
      <section
        style={{
          width: '100%',
          maxWidth: 560,
          textAlign: 'center',
          background: '#ffffff',
          border: '1px solid #cbdcdd',
          borderRadius: 24,
          padding: 32
        }}
      >
        <strong
          style={{
            display: 'inline-flex',
            borderRadius: 999,
            background: '#e5f2f2',
            color: '#38a6a4',
            padding: '8px 16px',
            fontSize: 14
          }}
        >
          خطأ
        </strong>
        <h1 style={{ margin: '20px 0 12px', fontSize: 32, lineHeight: 1.25 }}>
          تعذر تحميل الصفحة
        </h1>
        <p style={{ margin: 0, color: '#5f7175', lineHeight: 1.8 }}>
          حدث خطأ غير متوقع في الخادم. يرجى تحديث الصفحة أو العودة للرئيسية.
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 44,
            marginTop: 28,
            borderRadius: 999,
            background: '#38a6a4',
            color: '#ffffff',
            padding: '0 24px',
            fontWeight: 700,
            textDecoration: 'none'
          }}
        >
          العودة للرئيسية
        </Link>
      </section>
    </main>
  )
}
