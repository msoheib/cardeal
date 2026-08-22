import { z } from 'zod'
import { DealerVehicleFormValue, VehicleMake, VehicleModel } from './supabase'

export const CUSTOM_TRIM_VALUE = '__custom_trim__'
export const CUSTOM_COLOR_VALUE = '__custom_color__'

const isValidCatalogValue = (value: string) => !/^موديلات\s*[:：]/i.test(value.trim())

export const dealerVehicleSchema = z.object({
  make: z.string().trim().min(1, 'الماركة مطلوبة').max(120).refine(isValidCatalogValue, 'اسم الماركة غير صالح'),
  model: z.string().trim().min(1, 'الطراز / اسم الموديل مطلوب').max(120).refine(isValidCatalogValue, 'اسم الطراز غير صالح'),
  year: z.number().int().min(1900).max(2100),
  trim: z.string().trim().min(1, 'الفئة مطلوبة').max(120),
  origin_locale: z.string().trim().min(1, 'المنشأ مطلوب').max(80),
  variant: z.string().trim().min(1, 'مستوى التجهيز مطلوب').max(80),
  agencyPrice: z.number().finite().positive().max(9_999_999_999),
  colors: z.array(z.object({
    color: z.string().trim().min(1, 'اسم اللون مطلوب').max(120),
    quantity: z.number().int('كمية اللون يجب أن تكون عدداً صحيحاً').positive('كمية اللون يجب أن تكون أكبر من صفر').max(100_000),
  })).min(1, 'أضف لوناً واحداً على الأقل').max(50).superRefine((rows, context) => {
    const seen = new Set<string>()
    let total = 0
    rows.forEach((row, index) => {
      const key = normalizeVehicleText(row.color).toLocaleLowerCase('ar')
      if (seen.has(key)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: 'لا يمكن تكرار اللون نفسه', path: [index, 'color'] })
      }
      seen.add(key)
      total += row.quantity
    })
    if (total > 100_000) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'إجمالي الكمية يتجاوز الحد المسموح', path: [] })
    }
  }),
  description: z.string().max(5_000),
  images: z.array(z.string().max(4_096)).max(5),
})

export const dealerVehicleFormDefaults: DealerVehicleFormValue = {
  make: '',
  model: '',
  year: new Date().getFullYear(),
  trim: '',
  origin_locale: '',
  variant: 'ستاندر',
  agencyPrice: 0,
  colors: [{ color: '', quantity: 1 }],
  description: '',
  images: [],
}

export const variantOptions = [
  { value: 'ستاندر', label: 'ستاندر (Standard)' },
  { value: 'نصف فل', label: 'نصف فل (Half Full)' },
  { value: 'فل كامل', label: 'فل كامل (Full)' },
  { value: 'أخرى', label: 'أخرى (Other)' },
]

export const legacyVariantValues = [
  'الفئة العليا',
  'الفئة المتوسطة',
  'الفئة الأساسية',
]

export const trimOptions = [
  'قياسي',
  'GL',
  'GLX',
  'XLE',
  'Limited',
  'Sport',
  'Platinum',
  'Titanium',
  'كامل المواصفات',
]

export const colorOptions = [
  'أبيض',
  'أبيض لؤلؤي',
  'أسود',
  'أسود لؤلؤي',
  'فضي',
  'رمادي',
  'رمادي معدني',
  'أحمر',
  'أزرق',
  'بني',
  'ذهبي',
  'أخضر',
  'برتقالي',
  'بيج',
]

export const originOptions = [
  'سعودي',
  'خليجي',
  'وارد أمريكي',
  'وارد أوروبي',
  'وارد ياباني',
  'وارد كوري',
  'وارد صيني',
]

export const yearOptions = Array.from(
  { length: 14 },
  (_, index) => new Date().getFullYear() + 1 - index,
)

export function normalizeVehicleText(value: string) {
  return value
    .replace(/\s+/g, ' ')
    .replace(/\s*([,/|+&])\s*/g, ' $1 ')
    .trim()
}

export function normalizeDealerVehicleValue(value: DealerVehicleFormValue): DealerVehicleFormValue {
  return {
    ...value,
    make: normalizeVehicleText(value.make),
    model: normalizeVehicleText(value.model),
    trim: normalizeVehicleText(value.trim),
    colors: value.colors.map((row) => ({
      color: normalizeVehicleText(row.color),
      quantity: row.quantity,
    })),
    origin_locale: normalizeVehicleText(value.origin_locale),
    variant: normalizeVehicleText(value.variant),
    description: value.description.trim(),
    images: value.images.slice(0, 5),
  }
}

export function makeSearchText(make: VehicleMake) {
  return [make.name_ar, make.name_en, make.origin_country, make.slug]
    .filter(Boolean)
    .join(' ')
}

export function modelSearchText(model: VehicleModel) {
  return [model.name_ar, model.name_en, model.slug].filter(Boolean).join(' ')
}

export function sortVehicleMakes(makes: VehicleMake[]) {
  const arabic = new Intl.Collator('ar-SA', { sensitivity: 'base' })
  const english = new Intl.Collator('en', { sensitivity: 'base' })
  return [...makes].sort((left, right) => {
    const arabicOrder = arabic.compare(left.name_ar || '', right.name_ar || '')
    return arabicOrder || english.compare(left.name_en || '', right.name_en || '')
  })
}

export function initialsForVehicle(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length > 1) return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase()
  return name.trim().slice(0, 2).toUpperCase() || '؟'
}

export function priorityMakeLogo(slug: string) {
  const normalizedSlug = slug.toLocaleLowerCase().replace(/[_\s]+/g, '-')
  const aliases: Record<string, string> = {
    mercedes: 'mercedes-benz',
    mercedesbenz: 'mercedes-benz',
    'landrover': 'land-rover',
    'land-rover': 'land-rover',
  }
  const priority = new Set([
    'toyota', 'nissan', 'hyundai', 'kia', 'lexus', 'ford', 'chevrolet',
    'gmc', 'mazda', 'honda', 'mercedes-benz', 'bmw', 'audi', 'volkswagen',
    'land-rover', 'mg', 'changan', 'geely', 'byd', 'haval',
  ])
  const assetSlug = aliases[normalizedSlug] || normalizedSlug
  return priority.has(assetSlug) ? `/vehicle-makes/${assetSlug}.svg` : null
}
