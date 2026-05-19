'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertCircle, ArrowRight, Car, Loader2, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ImageUpload } from '@/components/image-upload'
import { addToInventory, getVehicleMakes, getVehicleModels } from '@/lib/cars'
import { toArabicError } from '@/lib/arabic-errors'
import { formatNumber } from '@/lib/format'
import { getCurrentUser, getUserRole } from '@/lib/auth'
import { supabase, VehicleMake, VehicleModel } from '@/lib/supabase'

const CUSTOM_MAKE_VALUE = '__custom_make__'
const CUSTOM_MODEL_VALUE = '__custom_model__'

const years = Array.from({ length: 14 }, (_, index) => new Date().getFullYear() + 1 - index)
const trims = ['قياسي', 'GL', 'GLX', 'XLE', 'Limited', 'Sport', 'Platinum', 'Titanium', 'كامل المواصفات']
const colors = ['أبيض', 'أبيض لؤلؤي', 'أسود', 'فضي', 'رمادي', 'أحمر', 'أزرق', 'بني', 'ذهبي', 'أخضر']
const origins = ['سعودي', 'خليجي', 'وارد أمريكي', 'وارد أوروبي', 'وارد ياباني', 'وارد كوري', 'وارد صيني']
const variants = ['الفئة العليا', 'الفئة المتوسطة', 'الفئة الأساسية']

function makeLabel(make: VehicleMake) {
  const english = make.name_en && make.name_en !== make.name_ar ? ` (${make.name_en})` : ''
  const origin = make.origin_country ? ` - ${make.origin_country}` : ''
  return `${make.name_ar}${english}${origin}`
}

function modelLabel(model: VehicleModel) {
  if (!model.name_ar || model.name_ar === model.name_en) return model.name_en
  return `${model.name_ar} (${model.name_en})`
}

export default function AddCarPage() {
  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year: '',
    trim: '',
    color: '',
    origin_locale: '',
    variant: '',
    wakala_price: '',
    description: '',
    quantity: '1'
  })
  const [images, setImages] = useState<string[]>([])
  const [priceSlots, setPriceSlots] = useState<number[]>([])
  const [newSlotPrice, setNewSlotPrice] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [error, setError] = useState('')
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'warning' | 'info'
    title?: string
    text: string
  } | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [dealerId, setDealerId] = useState<string | null>(null)
  const [catalogMakes, setCatalogMakes] = useState<VehicleMake[]>([])
  const [catalogModels, setCatalogModels] = useState<VehicleModel[]>([])
  const [selectedMakeId, setSelectedMakeId] = useState('')
  const [selectedModelId, setSelectedModelId] = useState('')
  const [manualMake, setManualMake] = useState(false)
  const [manualModel, setManualModel] = useState(false)
  const [isCatalogLoading, setIsCatalogLoading] = useState(true)
  const [isModelsLoading, setIsModelsLoading] = useState(false)
  const [catalogError, setCatalogError] = useState('')
  const router = useRouter()

  useEffect(() => {
    const checkAccess = async () => {
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

      const { data: dealerData } = await supabase
        .from('dealers')
        .select('id')
        .eq('user_id', currentUser.id)
        .single()

      if (dealerData) {
        setDealerId(dealerData.id)
      } else {
        setError('لم يتم العثور على بيانات المورد')
      }

      setIsChecking(false)
    }

    checkAccess()
  }, [router])

  useEffect(() => {
    let isActive = true

    const loadMakes = async () => {
      if (isChecking || !dealerId) {
        setIsCatalogLoading(false)
        return
      }

      setIsCatalogLoading(true)
      const { data, error: makesError } = await getVehicleMakes()

      if (!isActive) return
      if (makesError) {
        setCatalogError('تعذر تحميل قائمة السيارات. يمكنك الإضافة يدوياً.')
        setCatalogMakes([])
      } else {
        setCatalogError('')
        setCatalogMakes(data)
      }
      setIsCatalogLoading(false)
    }

    loadMakes()

    return () => {
      isActive = false
    }
  }, [dealerId, isChecking])

  useEffect(() => {
    let isActive = true

    const loadModels = async () => {
      if (!selectedMakeId) {
        setCatalogModels([])
        return
      }

      setIsModelsLoading(true)
      const { data, error: modelsError } = await getVehicleModels(selectedMakeId)

      if (!isActive) return
      if (modelsError) {
        setCatalogError('تعذر تحميل موديلات هذه الماركة. يمكنك إدخال الموديل يدوياً.')
        setCatalogModels([])
      } else {
        setCatalogModels(data)
      }
      setIsModelsLoading(false)
    }

    loadModels()

    return () => {
      isActive = false
    }
  }, [selectedMakeId])

  const resetConfirmation = () => {
    setShowConfirmation(false)
    setStatusMessage(null)
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (['make', 'model', 'year', 'trim', 'color', 'origin_locale'].includes(field)) {
      resetConfirmation()
    }
  }

  const handleMakeSelect = (value: string) => {
    resetConfirmation()
    setSelectedModelId('')
    setCatalogModels([])
    setManualModel(false)

    if (value === CUSTOM_MAKE_VALUE) {
      setManualMake(true)
      setSelectedMakeId('')
      setFormData(prev => ({ ...prev, make: '', model: '' }))
      return
    }

    const make = catalogMakes.find(item => item.id === value)
    setManualMake(false)
    setSelectedMakeId(value)
    setFormData(prev => ({
      ...prev,
      make: make?.name_en || make?.name_ar || '',
      model: ''
    }))
  }

  const handleModelSelect = (value: string) => {
    resetConfirmation()

    if (value === CUSTOM_MODEL_VALUE) {
      setManualModel(true)
      setSelectedModelId('')
      setFormData(prev => ({ ...prev, model: '' }))
      return
    }

    const model = catalogModels.find(item => item.id === value)
    setManualModel(false)
    setSelectedModelId(value)
    setFormData(prev => ({ ...prev, model: model?.name_en || model?.name_ar || '' }))
  }

  const handleSubmit = async (e: React.FormEvent, confirmed = false) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setStatusMessage(null)

    if (!dealerId) {
      setError('لم يتم العثور على بيانات المورد')
      setIsLoading(false)
      return
    }

    if (!formData.make || !formData.model || !formData.year || !formData.trim || !formData.color || !formData.origin_locale || !formData.wakala_price || !formData.quantity) {
      setError('يرجى تعبئة جميع الحقول المطلوبة: الماركة، الموديل، السنة، الفئة، اللون، المنشأ، السعر، والكمية.')
      setIsLoading(false)
      return
    }

    const wakalaPrice = parseFloat(formData.wakala_price)
    const quantity = parseInt(formData.quantity, 10)
    const yearInt = parseInt(formData.year, 10)

    if (Number.isNaN(wakalaPrice) || wakalaPrice <= 0) {
      setError('يرجى إدخال سعر وكالة صحيح')
      setIsLoading(false)
      return
    }

    if (Number.isNaN(quantity) || quantity <= 0) {
      setError('يرجى إدخال كمية صحيحة')
      setIsLoading(false)
      return
    }

    if ((manualMake || manualModel) && !confirmed) {
      setShowConfirmation(true)
      setStatusMessage({
        type: 'info',
        title: 'تأكيد إدخال يدوي',
        text: 'هذه الماركة أو الموديل غير موجودة في الكتالوج. عند التأكيد سيتم إنشاء تكوين سيارة جديد يمكن إعادة استخدامه لاحقاً.'
      })
      setIsLoading(false)
      return
    }

    const result = await addToInventory({
      dealer_id: dealerId,
      make: formData.make,
      model: formData.model,
      year: yearInt,
      trim: formData.trim,
      color: formData.color,
      origin_locale: formData.origin_locale,
      variant: formData.variant || undefined,
      msrp: wakalaPrice,
      description: formData.description,
      images,
      quantity,
      price_slots: priceSlots
    }, confirmed)

    if (result.error) {
      setError(toArabicError(result.error, 'تعذر إضافة السيارة. يرجى المحاولة مرة أخرى.'))
    } else if (result.status === 'exists_in_inventory') {
      setError('هذه السيارة موجودة بالفعل في مخزونك.')
    } else if (result.status === 'requires_confirmation') {
      setShowConfirmation(true)
      setStatusMessage({
        type: 'info',
        title: 'تأكيد تكوين جديد',
        text: 'لم يتم العثور على هذا التكوين مسبقاً. عند التأكيد سيتم إنشاء تكوين سيارة جديد وإضافته للمخزون.'
      })
    } else if (result.data) {
      const text = result.status === 'created'
        ? 'تم إنشاء التكوين وإضافته للمخزون بنجاح'
        : 'تم ربط التكوين الموجود بمخزونك بنجاح'
      setStatusMessage({ type: 'success', text })
      setTimeout(() => {
        router.push('/dashboard')
      }, 1500)
    }

    setIsLoading(false)
  }

  const addPriceSlot = () => {
    const price = parseFloat(newSlotPrice)
    if (Number.isNaN(price) || price <= 0 || priceSlots.includes(price)) return
    setPriceSlots(prev => [...prev, price].sort((a, b) => b - a))
    setNewSlotPrice('')
  }

  const removePriceSlot = (price: number) => {
    setPriceSlots(prev => prev.filter(item => item !== price))
  }

  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4" dir="rtl">
      <div className="w-full max-w-3xl mx-auto">
        <div className="mb-8">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
            <ArrowRight className="w-4 h-4" />
            العودة للوحة التحكم
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">إضافة سيارة للمخزون</h1>
          <p className="text-gray-600 mt-1">اختر الماركة والموديل من الكتالوج أو أضفها يدوياً إذا لم تكن موجودة.</p>
        </div>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="w-5 h-5" />
              تفاصيل السيارة
            </CardTitle>
            <CardDescription>سيتم إعادة استخدام التكوين نفسه عند إضافة نفس المواصفات لاحقاً.</CardDescription>
          </CardHeader>
          <form onSubmit={(event) => handleSubmit(event, showConfirmation)}>
            <CardContent className="space-y-6">
              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

              {catalogError && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{catalogError}</AlertDescription>
                </Alert>
              )}

              {statusMessage && (
                <Alert className={statusMessage.type === 'success' ? 'border-green-500 bg-green-50 text-green-900' : ''}>
                  {statusMessage.type === 'info' && <AlertCircle className="h-4 w-4" />}
                  {statusMessage.title && <AlertTitle>{statusMessage.title}</AlertTitle>}
                  <AlertDescription>{statusMessage.text}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>الماركة *</Label>
                  {manualMake ? (
                    <div className="flex gap-2">
                      <Input
                        value={formData.make}
                        onChange={(event) => handleInputChange('make', event.target.value)}
                        placeholder="اكتب الماركة"
                      />
                      <Button type="button" variant="outline" onClick={() => setManualMake(false)}>الكتالوج</Button>
                    </div>
                  ) : (
                    <Select value={selectedMakeId} onValueChange={handleMakeSelect} disabled={isCatalogLoading}>
                      <SelectTrigger>
                        <SelectValue placeholder={isCatalogLoading ? 'جاري تحميل الماركات' : 'اختر الماركة'} />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {catalogMakes.map(make => <SelectItem key={make.id} value={make.id}>{makeLabel(make)}</SelectItem>)}
                        <SelectItem value={CUSTOM_MAKE_VALUE}>غير موجودة؟ أضف يدوياً</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>الموديل *</Label>
                  {manualModel || manualMake ? (
                    <div className="flex gap-2">
                      <Input
                        value={formData.model}
                        onChange={(event) => handleInputChange('model', event.target.value)}
                        placeholder="اكتب الموديل"
                      />
                      {!manualMake && (
                        <Button type="button" variant="outline" onClick={() => setManualModel(false)}>الكتالوج</Button>
                      )}
                    </div>
                  ) : (
                    <Select value={selectedModelId} onValueChange={handleModelSelect} disabled={!selectedMakeId || isModelsLoading}>
                      <SelectTrigger>
                        <SelectValue placeholder={isModelsLoading ? 'جاري تحميل الموديلات' : 'اختر الموديل'} />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {catalogModels.map(model => <SelectItem key={model.id} value={model.id}>{modelLabel(model)}</SelectItem>)}
                        <SelectItem value={CUSTOM_MODEL_VALUE}>غير موجود؟ أضف يدوياً</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>السنة *</Label>
                  <Select value={formData.year} onValueChange={(value) => handleInputChange('year', value)}>
                    <SelectTrigger><SelectValue placeholder="اختر السنة" /></SelectTrigger>
                    <SelectContent>
                      {years.map(year => <SelectItem key={year} value={year.toString()}>{year}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>الفئة *</Label>
                  <Select value={formData.trim} onValueChange={(value) => handleInputChange('trim', value)}>
                    <SelectTrigger><SelectValue placeholder="اختر الفئة" /></SelectTrigger>
                    <SelectContent>
                      {trims.map(trim => <SelectItem key={trim} value={trim}>{trim}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>اللون *</Label>
                  <Select value={formData.color} onValueChange={(value) => handleInputChange('color', value)}>
                    <SelectTrigger><SelectValue placeholder="اختر اللون" /></SelectTrigger>
                    <SelectContent>
                      {colors.map(color => <SelectItem key={color} value={color}>{color}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>منشأ السيارة *</Label>
                  <Select value={formData.origin_locale} onValueChange={(value) => handleInputChange('origin_locale', value)}>
                    <SelectTrigger><SelectValue placeholder="اختر المنشأ" /></SelectTrigger>
                    <SelectContent>
                      {origins.map(origin => <SelectItem key={origin} value={origin}>{origin}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>نوع الفئة</Label>
                  <Select value={formData.variant} onValueChange={(value) => handleInputChange('variant', value)}>
                    <SelectTrigger><SelectValue placeholder="اختر النوع (اختياري)" /></SelectTrigger>
                    <SelectContent>
                      {variants.map(variant => <SelectItem key={variant} value={variant}>{variant}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>سعر الوكالة *</Label>
                  <Input type="number" value={formData.wakala_price} onChange={(event) => handleInputChange('wakala_price', event.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>الكمية *</Label>
                  <Input type="number" min="1" value={formData.quantity} onChange={(event) => handleInputChange('quantity', event.target.value)} required />
                </div>
              </div>

              <div className="space-y-4">
                <Label>أسعار المزاد الاختيارية</Label>
                <div className="flex gap-2">
                  <Input type="number" placeholder="سعر للمزاد" value={newSlotPrice} onChange={event => setNewSlotPrice(event.target.value)} />
                  <Button type="button" onClick={addPriceSlot} variant="outline"><Plus className="w-4 h-4" /></Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {priceSlots.map(price => (
                    <div key={price} className="flex items-center gap-2 bg-secondary px-3 py-1 rounded-full text-sm">
                      {formatNumber(price)}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => removePriceSlot(price)} />
                    </div>
                  ))}
                </div>
              </div>

              <ImageUpload images={images} onImagesChange={setImages} maxImages={5} />

              <div className="space-y-2">
                <Label>وصف</Label>
                <Textarea value={formData.description} onChange={event => handleInputChange('description', event.target.value)} />
              </div>
            </CardContent>
            <CardFooter>
              {!showConfirmation ? (
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin" /> : 'تحقق وإضافة'}
                </Button>
              ) : (
                <div className="flex gap-4 w-full">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setShowConfirmation(false)}>إلغاء</Button>
                  <Button type="submit" className="flex-1" variant="destructive" disabled={isLoading}>
                    {isLoading ? <Loader2 className="animate-spin" /> : 'تأكيد وإضافة'}
                  </Button>
                </div>
              )}
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
