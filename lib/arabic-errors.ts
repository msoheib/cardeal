const DEFAULT_ARABIC_ERROR = 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.'

const ERROR_TRANSLATIONS: Array<[RegExp, string]> = [
  [/invalid login credentials/i, 'البريد الإلكتروني أو كلمة المرور غير صحيحة.'],
  [/email not confirmed/i, 'يرجى تأكيد بريدك الإلكتروني قبل تسجيل الدخول.'],
  [/user already registered|already registered|already exists/i, 'هذا البريد الإلكتروني مسجل بالفعل.'],
  [/password.*weak|weak password/i, 'كلمة المرور ضعيفة. يرجى اختيار كلمة مرور أقوى.'],
  [/password.*at least|minimum password/i, 'كلمة المرور قصيرة جدا.'],
  [/rate limit|too many/i, 'تم تنفيذ محاولات كثيرة. يرجى الانتظار قليلا ثم المحاولة مرة أخرى.'],
  [/network|fetch failed|failed to fetch/i, 'تعذر الاتصال بالخادم. تحقق من اتصالك وحاول مرة أخرى.'],
  [/duplicate|23505/i, 'هذه البيانات موجودة بالفعل.'],
  [/row level security|permission denied|not authorized|unauthorized/i, 'ليست لديك صلاحية لتنفيذ هذا الإجراء.'],
  [/description_required/i, 'يرجى كتابة تفاصيل المشكلة بوضوح.'],
  [/deal_must_be_approved/i, 'يمكن رفع التذكرة بعد موافقتك على العرض وإتمام الطلب داخل المنصة.'],
  [/ticket_already_open/i, 'توجد تذكرة مفتوحة لهذا الطلب. يرجى انتظار مراجعة الإدارة.'],
  [/deal_not_found|ticket_not_found/i, 'لم يتم العثور على الطلب أو التذكرة المطلوبة.'],
  [/admin_required/i, 'هذا الإجراء متاح للإدارة فقط.'],
  [/not found|no rows/i, 'لم يتم العثور على البيانات المطلوبة.']
]

export function toArabicError(error: unknown, fallback = DEFAULT_ARABIC_ERROR) {
  const message =
    typeof error === 'string'
      ? error
      : error && typeof error === 'object' && 'message' in error
        ? String((error as { message?: unknown }).message || '')
        : ''

  if (!message) return fallback

  const hasArabic = /[\u0600-\u06FF]/.test(message)
  const hasEnglish = /[A-Za-z]{3,}/.test(message)
  if (hasArabic && !hasEnglish) return message

  const match = ERROR_TRANSLATIONS.find(([pattern]) => pattern.test(message))
  return match?.[1] || fallback
}
