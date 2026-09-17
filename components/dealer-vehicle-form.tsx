'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { AlertCircle, ArrowRight, Car, Loader2, Plus, Trash2 } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ImageUpload } from '@/components/image-upload'
import { SearchableVehicleField, SearchableVehicleOption } from '@/components/searchable-vehicle-field'
import {
  CUSTOM_COLOR_VALUE,
  CUSTOM_TRIM_VALUE,
  colorOptions,
  dealerVehicleFormDefaults,
  dealerVehicleSchema,
  initialsForVehicle,
  legacyVariantValues,
  makeSearchText,
  modelSearchText,
  normalizeDealerVehicleValue,
  priorityMakeLogo,
  sortVehicleMakes,
  trimOptions,
  variantOptions,
  yearOptions,
  originOptions,
} from '@/lib/dealer-vehicle-form'
import {
  getDealerInventoryItem,
  getVehicleMakes,
  getVehicleModels,
  saveDealerInventoryListing,
} from '@/lib/cars'
import { toArabicError } from '@/lib/arabic-errors'
import { getCurrentUser, getUserRole } from '@/lib/auth'
import { DealerListing, supabase, VehicleMake, VehicleModel } from '@/lib/supabase'

const CUSTOM_MAKE_VALUE = '__custom_make__'
const CUSTOM_MODEL_VALUE = '__custom_model__'

interface DealerVehicleFormProps {
  inventoryId?: string
}

interface FormState {
  make: string
  model: string
  year: string
  trim: string
  origin_locale: string
  variant: string
  agencyPrice: string
  colors: Array<{ color: string; quantity: string; manual: boolean }>
  description: string
}

function emptyForm(): FormState {
  return {
    make: dealerVehicleFormDefaults.make,
    model: dealerVehicleFormDefaults.model,
    year: String(dealerVehicleFormDefaults.year),
    trim: dealerVehicleFormDefaults.trim,
    origin_locale: dealerVehicleFormDefaults.origin_locale,
    variant: dealerVehicleFormDefaults.variant,
    agencyPrice: '',
    colors: dealerVehicleFormDefaults.colors.map((row) => ({
      color: row.color,
      quantity: String(row.quantity),
      manual: false,
    })),
    description: dealerVehicleFormDefaults.description,
  }
}

function formFromListing(listing: DealerListing): FormState {
  const spec = listing.specification
  const activeColors = listing.inventory.filter((item) => item.quantity > 0)
  return {
    make: spec?.make || '',
    model: spec?.model || '',
    year: String(spec?.year || new Date().getFullYear()),
    trim: spec?.trim || '',
    origin_locale: spec?.origin_locale || '',
    variant: spec?.variant || 'أخرى',
    agencyPrice: String(listing.agency_price || ''),
    colors: (activeColors.length ? activeColors : listing.inventory.slice(0, 1)).map((item) => ({
      color: item.configuration?.color || '',
      quantity: String(Math.max(1, item.quantity || 1)),
      manual: !colorOptions.includes(item.configuration?.color || ''),
    })),
    description: listing.listing_description || '',
  }
}

function sameCatalogName(left: string | null | undefined, right: string | null | undefined) {
  return Boolean(left && right && left.trim().toLocaleLowerCase() === right.trim().toLocaleLowerCase())
}

function makeValue(make: VehicleMake) {
  return make.name_en || make.name_ar
}

function modelValue(model: VehicleModel) {
  return model.name_en || model.name_ar || model.slug
}

function MakeLogo({ make }: { make: VehicleMake }) {
  const [failed, setFailed] = useState(false)
  const logoPath = priorityMakeLogo(make.slug)
  const initials = initialsForVehicle(make.name_en || make.name_ar)

  if (!logoPath || failed) {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
        {initials}
      </span>
    )
  }

  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-white">
      <Image src={logoPath} alt="" width={32} height={32} unoptimized className="h-8 w-8 object-contain" onError={() => setFailed(true)} />
    </span>
  )
}

function makeOptionLabel(make: VehicleMake) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <MakeLogo make={make} />
      <span className="min-w-0">
        <span className="block truncate font-medium">{make.name_ar}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {make.name_en || make.slug}{make.origin_country ? ` · ${make.origin_country}` : ''}
        </span>
      </span>
    </span>
  )
}

function modelOptionLabel(model: VehicleModel) {
  return (
    <span className="min-w-0">
      <span className="block truncate font-medium">{model.name_ar || model.name_en}</span>
      {model.name_ar && model.name_ar !== model.name_en && (
        <span className="block truncate text-xs text-muted-foreground">{model.name_en}</span>
      )}
    </span>
  )
}

export function DealerVehicleForm({ inventoryId }: DealerVehicleFormProps) {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(emptyForm)
  const [images, setImages] = useState<string[]>([])
  const [catalogMakes, setCatalogMakes] = useState<VehicleMake[]>([])
  const [catalogModels, setCatalogModels] = useState<VehicleModel[]>([])
  const [selectedMakeId, setSelectedMakeId] = useState('')
  const [selectedModelId, setSelectedModelId] = useState('')
  const [manualMake, setManualMake] = useState(false)
  const [manualModel, setManualModel] = useState(false)
  const [manualTrim, setManualTrim] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [isCatalogLoading, setIsCatalogLoading] = useState(true)
  const [isModelsLoading, setIsModelsLoading] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [catalogError, setCatalogError] = useState('')
  const [unauthorized, setUnauthorized] = useState(false)
  const [dealerId, setDealerId] = useState<string | null>(null)
  const [listing, setListing] = useState<DealerListing | null>(null)
  const [success, setSuccess] = useState('')

  const isEdit = Boolean(inventoryId)

  useEffect(() => {
    let active = true

    const loadAccessAndListing = async () => {
      const currentUser = await getCurrentUser()
      const role = await getUserRole()

      if (!currentUser) {
        router.push('/auth/login')
        return
      }

      if (role !== 'dealer') {
        router.push('/dashboard')
        return
      }

      const { data: dealer } = await supabase
        .from('dealers')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('verified', true)
        .maybeSingle()

      if (!active) return
      if (!dealer) {
        setUnauthorized(true)
        setIsChecking(false)
        return
      }

      setDealerId(dealer.id)

      if (inventoryId) {
        const result = await getDealerInventoryItem(inventoryId)
        if (!active) return
        if (result.error || !result.data || result.data.dealer_id !== dealer.id) {
          setUnauthorized(true)
        } else {
          setListing(result.data)
          const initialForm = formFromListing(result.data)
          setForm(initialForm)
          setManualTrim(!trimOptions.includes(initialForm.trim) && !legacyVariantValues.includes(initialForm.trim))
          setImages(result.data.listing_images || [])
        }
      }

      setIsChecking(false)
    }

    loadAccessAndListing()
    return () => { active = false }
  }, [inventoryId, router])

  useEffect(() => {
    let active = true
    const loadMakes = async () => {
      if (isChecking || !dealerId || unauthorized) return
      setIsCatalogLoading(true)
      const result = await getVehicleMakes()
      if (!active) return
      if (result.error) {
        setCatalogError('تعذر تحميل قائمة السيارات. يمكنك الإضافة يدوياً.')
        setCatalogMakes([])
      } else {
        const sorted = sortVehicleMakes(result.data)
        setCatalogMakes(sorted)
        setCatalogError('')
        if (listing?.specification?.make) {
          const match = sorted.find((make) =>
            sameCatalogName(make.name_en, listing.specification?.make) ||
            sameCatalogName(make.name_ar, listing.specification?.make) ||
            sameCatalogName(make.slug, listing.specification?.make),
          )
          if (match) {
            setSelectedMakeId(match.id)
            setForm((previous) => ({ ...previous, make: makeValue(match) }))
          } else {
            setManualMake(true)
          }
        }
      }
      setIsCatalogLoading(false)
    }
    loadMakes()
    return () => { active = false }
  }, [dealerId, isChecking, listing, unauthorized])

  useEffect(() => {
    let active = true
    const loadModels = async () => {
      if (!selectedMakeId) {
        setCatalogModels([])
        return
      }
      setIsModelsLoading(true)
      const result = await getVehicleModels(selectedMakeId)
      if (!active) return
      if (result.error) {
        setCatalogError('تعذر تحميل طرازات هذه الماركة. يمكنك إدخال اسم الطراز يدوياً.')
        setCatalogModels([])
      } else {
        setCatalogModels(result.data)
        if (listing?.specification?.model) {
          const match = result.data.find((model) =>
            sameCatalogName(model.name_en, listing.specification?.model) ||
            sameCatalogName(model.name_ar, listing.specification?.model) ||
            sameCatalogName(model.slug, listing.specification?.model),
          )
          if (match) {
            setSelectedModelId(match.id)
            setForm((previous) => ({ ...previous, model: modelValue(match) }))
          } else {
            setManualModel(true)
          }
        }
      }
      setIsModelsLoading(false)
    }
    loadModels()
    return () => { active = false }
  }, [listing, selectedMakeId])

  const makeOptions = useMemo<SearchableVehicleOption[]>(() => [
    ...catalogMakes.map((make) => ({
      value: make.id,
      searchText: makeSearchText(make),
      label: makeOptionLabel(make),
    })),
    { value: CUSTOM_MAKE_VALUE, searchText: 'custom manual غير موجودة', label: 'غير موجودة؟ أضف الماركة يدوياً' },
  ], [catalogMakes])

  const modelOptions = useMemo<SearchableVehicleOption[]>(() => [
    ...catalogModels.map((model) => ({
      value: model.id,
      searchText: modelSearchText(model),
      label: modelOptionLabel(model),
    })),
    { value: CUSTOM_MODEL_VALUE, searchText: 'custom manual غير موجود', label: 'غير موجود؟ أضف اسم الطراز يدوياً' },
  ], [catalogModels])

  const trimFieldOptions = useMemo<SearchableVehicleOption[]>(() => [
    ...trimOptions.map((trim) => ({ value: trim, searchText: trim, label: trim })),
    ...legacyVariantValues.map((trim) => ({ value: trim, searchText: trim, label: `${trim} (قديم)` })),
    { value: CUSTOM_TRIM_VALUE, searchText: 'custom manual أخرى', label: 'أخرى - اكتب الفئة يدوياً' },
  ], [])

  const colorFieldOptions = useMemo<SearchableVehicleOption[]>(() => [
    ...colorOptions.map((color) => ({ value: color, searchText: color, label: color })),
    { value: CUSTOM_COLOR_VALUE, searchText: 'custom two tone لون مخصص', label: 'لون مخصص / ثنائي اللون' },
  ], [])

  const updateForm = (field: keyof FormState, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }))
    setError('')
  }

  const handleMakeChange = (value: string) => {
    if (value === CUSTOM_MAKE_VALUE) {
      setManualMake(true)
      setSelectedMakeId('')
      setSelectedModelId('')
      setManualModel(true)
      setCatalogModels([])
      setForm((previous) => ({ ...previous, make: '', model: '' }))
      return
    }
    const make = catalogMakes.find((item) => item.id === value)
    setManualMake(false)
    setSelectedMakeId(value)
    setSelectedModelId('')
    setManualModel(false)
    setForm((previous) => ({ ...previous, make: make ? makeValue(make) : '', model: '' }))
  }

  const handleModelChange = (value: string) => {
    if (value === CUSTOM_MODEL_VALUE) {
      setManualModel(true)
      setSelectedModelId('')
      setForm((previous) => ({ ...previous, model: '' }))
      return
    }
    const model = catalogModels.find((item) => item.id === value)
    setManualModel(false)
    setSelectedModelId(value)
    setForm((previous) => ({ ...previous, model: model ? modelValue(model) : '' }))
  }

  const handleTrimChange = (value: string) => {
    if (value === CUSTOM_TRIM_VALUE) {
      setManualTrim(true)
      updateForm('trim', '')
      return
    }
    setManualTrim(false)
    updateForm('trim', value)
  }

  const handleColorChange = (index: number, value: string) => {
    if (value === CUSTOM_COLOR_VALUE) {
      setForm((previous) => ({
        ...previous,
        colors: previous.colors.map((row, rowIndex) => rowIndex === index ? { ...row, color: '', manual: true } : row),
      }))
      return
    }
    setForm((previous) => ({
      ...previous,
      colors: previous.colors.map((row, rowIndex) => rowIndex === index ? { ...row, color: value, manual: false } : row),
    }))
    setError('')
  }

  const updateColorRow = (index: number, field: 'color' | 'quantity', value: string) => {
    setForm((previous) => ({
      ...previous,
      colors: previous.colors.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row),
    }))
    setError('')
  }

  const addColorRow = () => {
    setForm((previous) => ({ ...previous, colors: [...previous.colors, { color: '', quantity: '1', manual: false }] }))
  }

  const removeColorRow = (index: number) => {
    setForm((previous) => ({
      ...previous,
      colors: previous.colors.length === 1 ? previous.colors : previous.colors.filter((_, rowIndex) => rowIndex !== index),
    }))
    setError('')
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    const normalized = normalizeDealerVehicleValue({
      make: form.make,
      model: form.model,
      year: Number(form.year),
      trim: form.trim,
      origin_locale: form.origin_locale,
      variant: form.variant,
      agencyPrice: Number(form.agencyPrice),
      colors: form.colors.map((row) => ({ color: row.color, quantity: Number(row.quantity) })),
      description: form.description,
      images,
    })
    const validation = dealerVehicleSchema.safeParse(normalized)
    if (!validation.success) {
      setError(validation.error.issues[0]?.message || 'يرجى مراجعة البيانات المدخلة.')
      return
    }

    setIsLoading(true)
    const result = await saveDealerInventoryListing({ ...validation.data, inventoryId })
    if (result.error) {
      setError(toArabicError(result.error, 'تعذر حفظ الإعلان.'))
      setIsLoading(false)
      return
    }

    setSuccess(isEdit ? 'تم تحديث الإعلان بنجاح.' : 'تمت إضافة السيارة إلى المخزون بنجاح.')
    setTimeout(() => router.push('/dashboard'), 800)
  }

  if (isChecking) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  if (unauthorized) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-xl items-center justify-center px-4 text-center" dir="rtl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>غير مصرح أو غير موجود</AlertTitle>
          <AlertDescription>لا يمكن الوصول إلى هذا الإعلان من حسابك.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <PageHeader
          eyebrow={<button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => router.push('/dashboard')}><ArrowRight className="h-3.5 w-3.5" />لوحة التاجر</button>}
          title={isEdit ? 'تعديل إعلان السيارة' : 'إضافة سيارة للمخزون'}
          description="اختر الماركة والطراز من الكتالوج أو أدخلهما يدوياً عند الحاجة."
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Car className="h-5 w-5" /> تفاصيل السيارة</CardTitle>
            <CardDescription>أضف جميع الألوان المتاحة وكميّة كل لون داخل إعلان واحد.</CardDescription>
          </CardHeader>
          <form onSubmit={submit}>
            <CardContent className="space-y-6">
              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
              {catalogError && <Alert><AlertCircle className="h-4 w-4" /><AlertDescription>{catalogError}</AlertDescription></Alert>}
              {success && <Alert className="border-transparent bg-status-success text-status-success-foreground"><AlertDescription>{success}</AlertDescription></Alert>}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>الماركة *</Label>
                  {manualMake ? (
                    <div className="flex gap-2">
                      <Input value={form.make} onChange={(event) => updateForm('make', event.target.value)} placeholder="اكتب الماركة" />
                      <Button type="button" variant="outline" onClick={() => setManualMake(false)}>الكتالوج</Button>
                    </div>
                  ) : (
                    <SearchableVehicleField value={selectedMakeId} onChange={handleMakeChange} options={makeOptions} disabled={isCatalogLoading} placeholder={isCatalogLoading ? 'جاري تحميل الماركات' : 'ابحث عن الماركة'} searchPlaceholder="ابحث بالعربي أو الإنجليزي أو بلد المنشأ" />
                  )}
                </div>

                <div className="space-y-2">
                  <Label>الطراز / اسم الموديل *</Label>
                  {manualModel || manualMake ? (
                    <div className="flex gap-2">
                      <Input value={form.model} onChange={(event) => updateForm('model', event.target.value)} placeholder="اكتب اسم الطراز" />
                      {!manualMake && <Button type="button" variant="outline" onClick={() => setManualModel(false)}>الكتالوج</Button>}
                    </div>
                  ) : (
                    <SearchableVehicleField value={selectedModelId} onChange={handleModelChange} options={modelOptions} disabled={!selectedMakeId || isModelsLoading} placeholder={isModelsLoading ? 'جاري تحميل الطرازات' : 'ابحث عن الطراز'} searchPlaceholder="ابحث بالعربي أو الإنجليزي" />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label>سنة الصنع *</Label><Select value={form.year} onValueChange={(value) => updateForm('year', value)}><SelectTrigger><SelectValue placeholder="اختر سنة الصنع" /></SelectTrigger><SelectContent>{yearOptions.map((year) => <SelectItem key={year} value={String(year)}>{year}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2">
                  <Label>الفئة / التريم *</Label>
                  {manualTrim ? <div className="flex gap-2"><Input value={form.trim} onChange={(event) => updateForm('trim', event.target.value)} placeholder="اكتب الفئة" /><Button type="button" variant="outline" onClick={() => setManualTrim(false)}>الخيارات</Button></div> : <SearchableVehicleField value={trimOptions.includes(form.trim) || legacyVariantValues.includes(form.trim) ? form.trim : ''} onChange={handleTrimChange} options={trimFieldOptions} placeholder="ابحث عن الفئة" searchPlaceholder="ابحث عن الفئة أو اختر أخرى" />}
                </div>
              </div>

              <div className="space-y-2"><Label>منشأ السيارة *</Label><Select value={form.origin_locale} onValueChange={(value) => updateForm('origin_locale', value)}><SelectTrigger><SelectValue placeholder="اختر المنشأ" /></SelectTrigger><SelectContent>{originOptions.map((origin) => <SelectItem key={origin} value={origin}>{origin}</SelectItem>)}{form.origin_locale && !originOptions.includes(form.origin_locale) && <SelectItem value={form.origin_locale}>{form.origin_locale} (قيمة قديمة)</SelectItem>}</SelectContent></Select></div>

              <div className="space-y-2"><Label>مستوى التجهيز *</Label><Select value={form.variant} onValueChange={(value) => updateForm('variant', value)}><SelectTrigger><SelectValue placeholder="اختر مستوى التجهيز" /></SelectTrigger><SelectContent>{variantOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}{form.variant && !variantOptions.some((option) => option.value === form.variant) && <SelectItem value={form.variant}>{form.variant} (قيمة قديمة)</SelectItem>}</SelectContent></Select></div>

              <div className="space-y-2"><Label>سعر الوكالة / السعر المرجعي *</Label><Input type="number" min="0.01" step="0.01" value={form.agencyPrice} onChange={(event) => updateForm('agencyPrice', event.target.value)} required /><p className="text-xs text-muted-foreground">سعر واحد مشترك لجميع الألوان، وليس عرض المشتري أو سعر المزاد.</p></div>

              <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <Label>الألوان والكميات *</Label>
                    <p className="mt-1 text-xs text-muted-foreground">يمكنك إضافة لون مخصص أو ثنائي، مثل: أبيض / أسود.</p>
                  </div>
                  <div className="rounded-lg bg-background px-3 py-2 text-sm font-semibold">
                    الإجمالي: {form.colors.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0)} سيارة
                  </div>
                </div>
                {form.colors.map((row, index) => (
                  <div key={index} className="grid grid-cols-1 gap-3 rounded-md border bg-muted/30 p-3 sm:grid-cols-[minmax(0,1fr)_120px_auto] sm:items-end">
                    <div className="space-y-2">
                      <Label htmlFor={`color-${index}`}>اللون {index + 1}</Label>
                      {row.manual ? (
                        <div className="flex gap-2">
                          <Input id={`color-${index}`} value={row.color} onChange={(event) => updateColorRow(index, 'color', event.target.value)} placeholder="مثال: أبيض / أسود" />
                          <Button type="button" variant="outline" onClick={() => handleColorChange(index, '')}>الخيارات</Button>
                        </div>
                      ) : (
                        <SearchableVehicleField value={colorOptions.includes(row.color) ? row.color : ''} onChange={(value) => handleColorChange(index, value)} options={colorFieldOptions} placeholder="ابحث عن اللون" searchPlaceholder="ابحث عن لون شائع أو اختر لوناً مخصصاً" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`quantity-${index}`}>الكمية</Label>
                      <Input id={`quantity-${index}`} type="number" min="1" max="100000" step="1" value={row.quantity} onChange={(event) => updateColorRow(index, 'quantity', event.target.value)} required />
                    </div>
                    <Button type="button" variant="outline" size="icon" aria-label={`حذف اللون ${index + 1}`} onClick={() => removeColorRow(index)} disabled={form.colors.length === 1}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" className="w-full gap-2" onClick={addColorRow} disabled={form.colors.length >= 50}>
                  <Plus className="h-4 w-4" />
                  إضافة لون آخر
                </Button>
              </div>

              <ImageUpload images={images} onImagesChange={setImages} maxImages={5} />
              <div className="space-y-2"><Label>الوصف</Label><Textarea maxLength={5000} value={form.description} onChange={(event) => updateForm('description', event.target.value)} placeholder="أضف وصفاً مختصراً للسيارة" /></div>
            </CardContent>
            <CardFooter className="justify-end border-t border-border pt-4"><Button type="submit" className="w-full sm:w-auto" disabled={isLoading}>{isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? 'حفظ التعديلات' : 'إضافة إلى المخزون'}</Button></CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
