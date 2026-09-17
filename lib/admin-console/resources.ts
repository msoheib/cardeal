// Shared (client + server) definition of what the admin console can manage.
// The server only reads/writes the tables and columns declared here.

export type FieldType = 'text' | 'textarea' | 'number' | 'boolean' | 'enum' | 'uuid' | 'json' | 'list' | 'datetime'

export interface FieldDef {
  key: string
  label: string
  type: FieldType
  options?: { value: string; label: string }[]
  required?: boolean
  /** Only settable when creating a record. */
  createOnly?: boolean
  /** Shown but never written. */
  readOnly?: boolean
}

export interface ColumnDef {
  key: string
  label: string
  kind?: 'text' | 'money' | 'date' | 'boolean' | 'status' | 'id'
}

export interface ResourceDef {
  key: ResourceKey
  table: string
  label: string
  description: string
  searchColumns: string[]
  statusField?: string
  defaultOrder: string
  columns: ColumnDef[]
  fields: FieldDef[]
  canCreate: boolean
  canDelete: boolean
}

export type ResourceKey =
  | 'users'
  | 'dealers'
  | 'dealer_applications'
  | 'listings'
  | 'inventory'
  | 'specs'
  | 'configurations'
  | 'bids'
  | 'deals'
  | 'commitment_fees'
  | 'support_tickets'

const opts = (pairs: [string, string][]) => pairs.map(([value, label]) => ({ value, label }))

export const BID_STATUS = opts([['pending', 'قيد الانتظار'], ['accepted', 'مقبول'], ['rejected', 'مرفوض'], ['cancelled', 'ملغى'], ['expired', 'منتهي']])
export const DEAL_STATUS = opts([['pending_payment', 'بانتظار تأكيد المشتري'], ['completed', 'مكتملة'], ['cancelled', 'ملغاة'], ['refunded', 'مستردة']])
const USER_TYPE = opts([['buyer', 'مشتري'], ['dealer', 'تاجر'], ['admin', 'مدير']])
const LISTING_STATUS = opts([['active', 'نشط'], ['hidden', 'مخفي']])
const INVENTORY_STATUS = opts([['active', 'نشط'], ['hidden', 'مخفي'], ['out_of_stock', 'نفد']])
const FEE_STATUS = opts([['pending', 'قيد الانتظار'], ['paid', 'مدفوعة'], ['refunded', 'مستردة'], ['applied_to_purchase', 'مخصومة من الشراء']])
const APPLICATION_STATUS = opts([['pending', 'قيد المراجعة'], ['approved', 'معتمد'], ['rejected', 'مرفوض']])
const TICKET_STATUS = opts([['open', 'مفتوحة'], ['under_review', 'قيد المراجعة'], ['approved', 'تمت الموافقة'], ['rejected', 'مرفوضة'], ['resolved', 'تم الحل'], ['closed', 'مغلقة']])
const TICKET_REASON = opts([['supplier_no_response', 'عدم تجاوب المورد'], ['car_not_received', 'لم تُستلم السيارة'], ['car_damaged', 'السيارة متضررة'], ['other', 'أخرى']])
const REFUND_SCOPE = opts([['none', 'بدون'], ['commitment_fee', 'رسوم الالتزام'], ['full_amount', 'المبلغ كامل']])

const created: ColumnDef = { key: 'created_at', label: 'الإنشاء', kind: 'date' }

export const RESOURCES: Record<ResourceKey, ResourceDef> = {
  bids: {
    key: 'bids', table: 'bids', label: 'العروض', description: 'كل عرض مع حالة الدفع ورد التاجر.',
    searchColumns: ['payment_reference'], statusField: 'status', defaultOrder: 'created_at',
    columns: [
      { key: '_vehicle', label: 'السيارة' },
      { key: '_buyer', label: 'المشتري' },
      { key: 'bid_price', label: 'العرض', kind: 'money' },
      { key: 'status', label: 'الحالة', kind: 'status' },
      { key: 'commitment_fee_paid', label: 'الرسوم مدفوعة', kind: 'boolean' },
      { key: '_response', label: 'رد التاجر' },
      { key: '_response_time', label: 'زمن الرد' },
      created,
    ],
    fields: [
      { key: 'buyer_id', label: 'معرّف المشتري', type: 'uuid', required: true },
      { key: 'car_configuration_id', label: 'معرّف التكوين (اللون)', type: 'uuid', required: true },
      { key: 'bid_price', label: 'قيمة العرض', type: 'number', required: true },
      { key: 'net_offer_amount', label: 'صافي العرض للتاجر', type: 'number' },
      { key: 'status', label: 'الحالة', type: 'enum', options: BID_STATUS },
      { key: 'commitment_fee_paid', label: 'رسوم الالتزام مدفوعة', type: 'boolean' },
      { key: 'commitment_fee_amount', label: 'مبلغ الرسوم', type: 'number' },
      { key: 'payment_reference', label: 'مرجع الدفع', type: 'text' },
      { key: 'expires_at', label: 'ينتهي في', type: 'datetime' },
    ],
    canCreate: true, canDelete: true,
  },
  deals: {
    key: 'deals', table: 'deals', label: 'الصفقات', description: 'العروض التي قبلها التجار.',
    searchColumns: [], statusField: 'status', defaultOrder: 'created_at',
    columns: [
      { key: '_vehicle', label: 'السيارة' },
      { key: '_buyer', label: 'المشتري' },
      { key: '_dealer', label: 'التاجر' },
      { key: 'final_price', label: 'السعر', kind: 'money' },
      { key: 'status', label: 'الحالة', kind: 'status' },
      created,
    ],
    fields: [
      { key: 'bid_id', label: 'معرّف العرض', type: 'uuid' },
      { key: 'buyer_id', label: 'معرّف المشتري', type: 'uuid', required: true },
      { key: 'dealer_id', label: 'معرّف التاجر', type: 'uuid', required: true },
      { key: 'car_configuration_id', label: 'معرّف التكوين', type: 'uuid' },
      { key: 'final_price', label: 'السعر النهائي', type: 'number', required: true },
      { key: 'quantity', label: 'الكمية', type: 'number' },
      { key: 'status', label: 'الحالة', type: 'enum', options: DEAL_STATUS },
      { key: 'payment_due_date', label: 'موعد الدفع', type: 'datetime' },
      { key: 'completed_at', label: 'اكتملت في', type: 'datetime' },
    ],
    canCreate: true, canDelete: true,
  },
  listings: {
    key: 'listings', table: 'dealer_listings', label: 'الإعلانات', description: 'إعلانات التجار (إعلان واحد لكل مواصفة، بألوان متعددة).',
    searchColumns: ['listing_description'], statusField: 'status', defaultOrder: 'updated_at',
    columns: [
      { key: '_spec', label: 'المواصفة' },
      { key: '_dealer', label: 'التاجر' },
      { key: 'agency_price', label: 'سعر الوكالة', kind: 'money' },
      { key: '_stock', label: 'المخزون' },
      { key: 'status', label: 'الحالة', kind: 'status' },
      { key: 'updated_at', label: 'آخر تحديث', kind: 'date' },
    ],
    fields: [
      { key: 'dealer_id', label: 'معرّف التاجر', type: 'uuid', required: true },
      { key: 'listing_spec_id', label: 'معرّف المواصفة', type: 'uuid', required: true },
      { key: 'agency_price', label: 'سعر الوكالة', type: 'number', required: true },
      { key: 'status', label: 'الحالة', type: 'enum', options: LISTING_STATUS },
      { key: 'listing_description', label: 'الوصف', type: 'textarea' },
      { key: 'listing_images', label: 'روابط الصور (سطر لكل رابط)', type: 'list' },
    ],
    canCreate: true, canDelete: true,
  },
  inventory: {
    key: 'inventory', table: 'dealer_inventory', label: 'المخزون', description: 'كميات كل لون داخل الإعلانات.',
    searchColumns: ['listing_description'], statusField: 'status', defaultOrder: 'updated_at',
    columns: [
      { key: '_vehicle', label: 'السيارة / اللون' },
      { key: '_dealer', label: 'التاجر' },
      { key: 'quantity', label: 'الكمية' },
      { key: 'agency_price', label: 'السعر', kind: 'money' },
      { key: 'status', label: 'الحالة', kind: 'status' },
      { key: 'updated_at', label: 'آخر تحديث', kind: 'date' },
    ],
    fields: [
      { key: 'dealer_id', label: 'معرّف التاجر', type: 'uuid', required: true },
      { key: 'dealer_listing_id', label: 'معرّف الإعلان', type: 'uuid', required: true },
      { key: 'car_configuration_id', label: 'معرّف التكوين', type: 'uuid', required: true },
      { key: 'quantity', label: 'الكمية', type: 'number', required: true },
      { key: 'agency_price', label: 'سعر الوكالة', type: 'number', required: true },
      { key: 'status', label: 'الحالة', type: 'enum', options: INVENTORY_STATUS },
      { key: 'listing_description', label: 'الوصف', type: 'textarea' },
    ],
    canCreate: true, canDelete: true,
  },
  specs: {
    key: 'specs', table: 'vehicle_listing_specs', label: 'المواصفات', description: 'الماركة والطراز والسنة والفئة.',
    searchColumns: ['make', 'model', 'trim', 'variant'], defaultOrder: 'updated_at',
    columns: [
      { key: 'make', label: 'الماركة' }, { key: 'model', label: 'الطراز' }, { key: 'year', label: 'السنة' },
      { key: 'trim', label: 'الفئة' }, { key: 'variant', label: 'التجهيز' }, { key: 'origin_locale', label: 'المنشأ' }, created,
    ],
    fields: [
      { key: 'make', label: 'الماركة', type: 'text', required: true },
      { key: 'model', label: 'الطراز', type: 'text', required: true },
      { key: 'year', label: 'السنة', type: 'number', required: true },
      { key: 'trim', label: 'الفئة', type: 'text', required: true },
      { key: 'variant', label: 'مستوى التجهيز', type: 'text', required: true },
      { key: 'origin_locale', label: 'المنشأ', type: 'text', required: true },
    ],
    canCreate: true, canDelete: true,
  },
  configurations: {
    key: 'configurations', table: 'car_configurations', label: 'التكوينات (الألوان)', description: 'كل لون لمواصفة، وهو ما يُقدَّم عليه العرض.',
    searchColumns: ['make', 'model', 'color', 'trim'], defaultOrder: 'created_at',
    columns: [
      { key: 'make', label: 'الماركة' }, { key: 'model', label: 'الطراز' }, { key: 'year', label: 'السنة' },
      { key: 'color', label: 'اللون' }, { key: 'msrp', label: 'السعر', kind: 'money' }, created,
    ],
    fields: [
      { key: 'listing_spec_id', label: 'معرّف المواصفة', type: 'uuid', required: true },
      { key: 'make', label: 'الماركة', type: 'text', required: true },
      { key: 'model', label: 'الطراز', type: 'text', required: true },
      { key: 'year', label: 'السنة', type: 'number', required: true },
      { key: 'trim', label: 'الفئة', type: 'text' },
      { key: 'variant', label: 'مستوى التجهيز', type: 'text' },
      { key: 'color', label: 'اللون', type: 'text' },
      { key: 'origin_locale', label: 'المنشأ', type: 'text' },
      { key: 'msrp', label: 'سعر الوكالة', type: 'number', required: true },
      { key: 'description', label: 'الوصف', type: 'textarea' },
      { key: 'images', label: 'روابط الصور (سطر لكل رابط)', type: 'list' },
    ],
    canCreate: true, canDelete: true,
  },
  users: {
    key: 'users', table: 'users', label: 'المستخدمون', description: 'الحسابات والأدوار. الإنشاء يتم عبر التسجيل.',
    searchColumns: ['full_name', 'email', 'phone'], statusField: 'user_type', defaultOrder: 'created_at',
    columns: [
      { key: 'full_name', label: 'الاسم' }, { key: 'email', label: 'البريد' }, { key: 'phone', label: 'الجوال' },
      { key: 'user_type', label: 'الدور', kind: 'status' }, created,
    ],
    fields: [
      { key: 'full_name', label: 'الاسم', type: 'text', required: true },
      { key: 'email', label: 'البريد (الملف فقط)', type: 'text' },
      { key: 'phone', label: 'الجوال', type: 'text' },
      { key: 'user_type', label: 'الدور', type: 'enum', options: USER_TYPE },
      { key: 'preferred_language', label: 'اللغة', type: 'text' },
    ],
    canCreate: false, canDelete: true,
  },
  dealers: {
    key: 'dealers', table: 'dealers', label: 'التجار', description: 'ملفات التجار وحالة التوثيق.',
    searchColumns: ['company_name', 'commercial_registration', 'city'], statusField: 'verified', defaultOrder: 'created_at',
    columns: [
      { key: 'company_name', label: 'المنشأة' }, { key: 'city', label: 'المدينة' },
      { key: 'commercial_registration', label: 'السجل التجاري' },
      { key: 'verified', label: 'موثّق', kind: 'boolean' }, { key: 'total_sales', label: 'المبيعات' }, created,
    ],
    fields: [
      { key: 'user_id', label: 'معرّف المستخدم', type: 'uuid', required: true, createOnly: true },
      { key: 'company_name', label: 'اسم المنشأة', type: 'text', required: true },
      { key: 'commercial_registration', label: 'السجل التجاري', type: 'text', required: true },
      { key: 'city', label: 'المدينة', type: 'text', required: true },
      { key: 'verified', label: 'موثّق', type: 'boolean' },
      { key: 'description', label: 'الوصف', type: 'textarea' },
      { key: 'logo_url', label: 'رابط الشعار', type: 'text' },
      { key: 'rating', label: 'التقييم', type: 'number' },
      { key: 'total_sales', label: 'إجمالي المبيعات', type: 'number' },
      { key: 'contact_info', label: 'بيانات التواصل (JSON)', type: 'json' },
    ],
    canCreate: true, canDelete: true,
  },
  dealer_applications: {
    key: 'dealer_applications', table: 'dealer_applications', label: 'طلبات التجار', description: 'الاعتماد والرفض من هنا يستخدمان نفس إجراءات النظام.',
    searchColumns: ['company_name', 'commercial_registration', 'city'], statusField: 'status', defaultOrder: 'created_at',
    columns: [
      { key: 'company_name', label: 'المنشأة' }, { key: 'city', label: 'المدينة' },
      { key: 'commercial_registration', label: 'السجل التجاري' }, { key: 'status', label: 'الحالة', kind: 'status' }, created,
    ],
    fields: [
      { key: 'company_name', label: 'اسم المنشأة', type: 'text' },
      { key: 'commercial_registration', label: 'السجل التجاري', type: 'text' },
      { key: 'city', label: 'المدينة', type: 'text' },
      { key: 'rejection_reason', label: 'سبب الرفض', type: 'textarea' },
      { key: 'contact_info', label: 'بيانات التواصل (JSON)', type: 'json' },
      { key: 'status', label: 'الحالة (للعرض)', type: 'enum', options: APPLICATION_STATUS, readOnly: true },
    ],
    canCreate: false, canDelete: true,
  },
  commitment_fees: {
    key: 'commitment_fees', table: 'commitment_fees', label: 'رسوم الالتزام', description: 'مدفوعات ميسّر المرتبطة بالعروض.',
    searchColumns: ['transaction_reference', 'payment_method'], statusField: 'status', defaultOrder: 'created_at',
    columns: [
      { key: '_buyer', label: 'المشتري' }, { key: 'amount', label: 'المبلغ', kind: 'money' },
      { key: 'status', label: 'الحالة', kind: 'status' }, { key: 'transaction_reference', label: 'المرجع', kind: 'id' }, created,
    ],
    fields: [
      { key: 'bid_id', label: 'معرّف العرض', type: 'uuid', required: true },
      { key: 'buyer_id', label: 'معرّف المشتري', type: 'uuid', required: true },
      { key: 'amount', label: 'المبلغ', type: 'number', required: true },
      { key: 'status', label: 'الحالة', type: 'enum', options: FEE_STATUS },
      { key: 'payment_method', label: 'طريقة الدفع', type: 'text' },
      { key: 'transaction_reference', label: 'مرجع العملية', type: 'text' },
      { key: 'processed_at', label: 'عولجت في', type: 'datetime' },
    ],
    canCreate: true, canDelete: true,
  },
  support_tickets: {
    key: 'support_tickets', table: 'support_tickets', label: 'تذاكر الدعم', description: 'الشكاوى وطلبات الاسترداد.',
    searchColumns: ['description', 'admin_notes'], statusField: 'status', defaultOrder: 'created_at',
    columns: [
      { key: 'reason', label: 'السبب', kind: 'status' }, { key: '_buyer', label: 'المشتري' }, { key: '_dealer', label: 'التاجر' },
      { key: 'requested_refund_amount', label: 'الاسترداد المطلوب', kind: 'money' }, { key: 'status', label: 'الحالة', kind: 'status' }, created,
    ],
    fields: [
      { key: 'deal_id', label: 'معرّف الصفقة', type: 'uuid', required: true, createOnly: true },
      { key: 'buyer_id', label: 'معرّف المشتري', type: 'uuid', required: true, createOnly: true },
      { key: 'dealer_id', label: 'معرّف التاجر', type: 'uuid', required: true, createOnly: true },
      { key: 'reason', label: 'السبب', type: 'enum', options: TICKET_REASON, required: true },
      { key: 'status', label: 'الحالة', type: 'enum', options: TICKET_STATUS },
      { key: 'refund_scope', label: 'نطاق الاسترداد', type: 'enum', options: REFUND_SCOPE },
      { key: 'requested_refund_amount', label: 'مبلغ الاسترداد', type: 'number' },
      { key: 'description', label: 'الوصف', type: 'textarea', required: true },
      { key: 'admin_notes', label: 'ملاحظات الإدارة', type: 'textarea' },
    ],
    canCreate: true, canDelete: true,
  },
}

export const RESOURCE_ORDER: ResourceKey[] = [
  'bids', 'deals', 'listings', 'inventory', 'configurations', 'specs',
  'users', 'dealers', 'dealer_applications', 'commitment_fees', 'support_tickets',
]

export function isResourceKey(value: string): value is ResourceKey {
  return Object.prototype.hasOwnProperty.call(RESOURCES, value)
}

export function optionLabel(resource: ResourceDef, key: string, value: unknown) {
  const field = resource.fields.find((f) => f.key === key)
  return field?.options?.find((o) => o.value === value)?.label ?? String(value ?? '')
}
