'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { AlertCircle, ArrowRight, Car, Loader2 } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
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
import { DealerInventoryListing, supabase, VehicleMake, VehicleModel } from '@/lib/supabase'

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
  color: string
  origin_locale: string
  variant: string
  agencyPrice: string
  quantity: string
  description: string
}

function emptyForm(): FormState {
  return {
    make: dealerVehicleFormDefaults.make,
    model: dealerVehicleFormDefaults.model,
    year: String(dealerVehicleFormDefaults.year),
    trim: dealerVehicleFormDefaults.trim,
    color: dealerVehicleFormDefaults.color,
    origin_locale: dealerVehicleFormDefaults.origin_locale,
    variant: dealerVehicleFormDefaults.variant,
    agencyPrice: '',
    quantity: String(dealerVehicleFormDefaults.quantity),
    description: dealerVehicleFormDefaults.description,
  }
}

function formFromListing(listing: DealerInventoryListing): FormState {
  const config = listing.configuration
  return {
    make: config?.make || '',
    model: config?.model || '',
    year: String(config?.year || new Date().getFullYear()),
    trim: config?.trim || '',
    color: config?.color || '',
    origin_locale: config?.origin_locale || '',
    variant: config?.variant || 'أخرى',
    agencyPrice: String(listing.agency_price || config?.msrp || ''),
    quantity: String(listing.quantity ?? 1),
    description: listing.listing_description || config?.description || '',
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
  const [manualColor, setManualColor] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [isCatalogLoading, setIsCatalogLoading] = useState(true)
  const [isModelsLoading, setIsModelsLoading] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [catalogError, setCatalogError] = useState('')
  const [unauthorized, setUnauthorized] = useState(false)
  const [dealerId, setDealerId] = useState<string | null>(null)
  const [listing, setListing] = useState<DealerInventoryListing | null>(null)
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
          setManualColor(!colorOptions.includes(initialForm.color))
          setImages(result.data.listing_images?.length ? result.data.listing_images : result.data.configuration?.images || [])
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
        if (listing?.configuration?.make) {
          const match = sorted.find((make) =>
            sameCatalogName(make.name_en, listing.configuration?.make) ||
            sameCatalogName(make.name_ar, listing.configuration?.make) ||
            sameCatalogName(make.slug, listing.configuration?.make),
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
        setCatalogError('تعذر تحميل موديلات هذه الماركة. يمكنك إدخال الموديل يدوياً.')
        setCatalogModels([])
      } else {
        setCatalogModels(result.data)
        if (listing?.configuration?.model) {
          const match = result.data.find((model) =>
            sameCatalogName(model.name_en, listing.configuration?.model) ||
            sameCatalogName(model.name_ar, listing.configuration?.model) ||
            sameCatalogName(model.slug, listing.configuration?.model),
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
    { value: CUSTOM_MODEL_VALUE, searchText: 'custom manual غير موجود', label: 'غير موجود؟ أضف الموديل يدوياً' },
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

  const handleColorChange = (value: string) => {
    if (value === CUSTOM_COLOR_VALUE) {
      setManualColor(true)
      updateForm('color', '')
      return
    }
    setManualColor(false)
    updateForm('color', value)
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
      color: form.color,
      origin_locale: form.origin_locale,
      variant: form.variant,
      agencyPrice: Number(form.agencyPrice),
      quantity: Number(form.quantity),
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
    <div className="min-h-screen bg-background px-4 py-8" dir="rtl">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-8">
          <Button type="button" variant="ghost" className="mb-4 gap-2" onClick={() => router.push('/dashboard')}>
            <ArrowRight className="h-4 w-4" />
            العودة للوحة التحكم
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'تعديل إعلان السيارة' : 'إضافة سيارة للمخزون'}</h1>
          <p className="mt-1 text-gray-600">اختر الماركة والموديل من الكتالوج أو أدخلهما يدوياً عند الحاجة.</p>
        </div>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Car className="h-5 w-5" /> تفاصيل السيارة</CardTitle>
            <CardDescription>كل إعلان يمثل لوناً واحداً. إذا اختلفت الكمية حسب اللون، أنشئ إعلاناً منفصلاً لكل لون.</CardDescription>
          </CardHeader>
          <form onSubmit={submit}>
            <CardContent className="space-y-6">
              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
              {catalogError && <Alert><AlertCircle className="h-4 w-4" /><AlertDescription>{catalogError}</AlertDescription></Alert>}
              {success && <Alert className="border-green-500 bg-green-50 text-green-900"><AlertDescription>{success}</AlertDescription></Alert>}

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
                  <Label>الموديل *</Label>
                  {manualModel || manualMake ? (
                    <div className="flex gap-2">
                      <Input value={form.model} onChange={(event) => updateForm('model', event.target.value)} placeholder="اكتب الموديل" />
                      {!manualMake && <Button type="button" variant="outline" onClick={() => setManualModel(false)}>الكتالوج</Button>}
                    </div>
                  ) : (
                    <SearchableVehicleField value={selectedModelId} onChange={handleModelChange} options={modelOptions} disabled={!selectedMakeId || isModelsLoading} placeholder={isModelsLoading ? 'جاري تحميل الموديلات' : 'ابحث عن الموديل'} searchPlaceholder="ابحث بالعربي أو الإنجليزي" />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label>السنة *</Label><Select value={form.year} onValueChange={(value) => updateForm('year', value)}><SelectTrigger><SelectValue placeholder="اختر السنة" /></SelectTrigger><SelectContent>{yearOptions.map((year) => <SelectItem key={year} value={String(year)}>{year}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2">
                  <Label>الفئة / التريم *</Label>
                  {manualTrim ? <div className="flex gap-2"><Input value={form.trim} onChange={(event) => updateForm('trim', event.target.value)} placeholder="اكتب الفئة" /><Button type="button" variant="outline" onClick={() => setManualTrim(false)}>الخيارات</Button></div> : <SearchableVehicleField value={trimOptions.includes(form.trim) || legacyVariantValues.includes(form.trim) ? form.trim : ''} onChange={handleTrimChange} options={trimFieldOptions} placeholder="ابحث عن الفئة" searchPlaceholder="ابحث عن الفئة أو اختر أخرى" />}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>اللون *</Label>
                  {manualColor ? <div className="flex gap-2"><Input value={form.color} onChange={(event) => updateForm('color', event.target.value)} placeholder="مثال: أبيض / أسود" /><Button type="button" variant="outline" onClick={() => setManualColor(false)}>الخيارات</Button></div> : <SearchableVehicleField value={colorOptions.includes(form.color) ? form.color : ''} onChange={handleColorChange} options={colorFieldOptions} placeholder="ابحث عن اللون" searchPlaceholder="ابحث عن لون شائع أو اختر لوناً مخصصاً" />}
                  <p className="text-xs text-muted-foreground">يمكنك كتابة لون مخصص أو لون ثنائي، مثل: أبيض / أسود.</p>
                </div>
                <div className="space-y-2"><Label>منشأ السيارة *</Label><Select value={form.origin_locale} onValueChange={(value) => updateForm('origin_locale', value)}><SelectTrigger><SelectValue placeholder="اختر المنشأ" /></SelectTrigger><SelectContent>{originOptions.map((origin) => <SelectItem key={origin} value={origin}>{origin}</SelectItem>)}{form.origin_locale && !originOptions.includes(form.origin_locale) && <SelectItem value={form.origin_locale}>{form.origin_locale} (قيمة قديمة)</SelectItem>}</SelectContent></Select></div>
              </div>

              <div className="space-y-2"><Label>مستوى التجهيز *</Label><Select value={form.variant} onValueChange={(value) => updateForm('variant', value)}><SelectTrigger><SelectValue placeholder="اختر مستوى التجهيز" /></SelectTrigger><SelectContent>{variantOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}{form.variant && !variantOptions.some((option) => option.value === form.variant) && <SelectItem value={form.variant}>{form.variant} (قيمة قديمة)</SelectItem>}</SelectContent></Select></div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label>سعر الوكالة / السعر المرجعي *</Label><Input type="number" min="0.01" step="0.01" value={form.agencyPrice} onChange={(event) => updateForm('agencyPrice', event.target.value)} required /><p className="text-xs text-muted-foreground">هذا هو سعر الوكالة الرسمي أو المرجعي، وليس عرض المشتري أو سعر المزاد.</p></div>
                <div className="space-y-2"><Label>الكمية *</Label><Input type="number" min="1" step="1" value={form.quantity} onChange={(event) => updateForm('quantity', event.target.value)} required /></div>
              </div>

              <ImageUpload images={images} onImagesChange={setImages} maxImages={5} />
              <div className="space-y-2"><Label>الوصف</Label><Textarea maxLength={5000} value={form.description} onChange={(event) => updateForm('description', event.target.value)} placeholder="أضف وصفاً مختصراً للسيارة" /></div>
            </CardContent>
            <CardFooter><Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? <Loader2 className="animate-spin" /> : isEdit ? 'حفظ التعديلات' : 'إضافة إلى المخزون'}</Button></CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
