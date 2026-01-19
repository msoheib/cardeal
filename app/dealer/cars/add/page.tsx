'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { addToInventory } from '@/lib/cars'
import { getCurrentUser, getUserRole } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { ArrowRight, Loader2, Car, DollarSign, Hash, Palette, FileText, Plus, X, AlertCircle } from 'lucide-react'
import { ImageUpload } from '@/components/image-upload'

// Predefined lists for Dropdowns
const carMakes = ['تويوتا', 'لكزس', 'نيسان', 'هوندا', 'مرسيدس', 'بي إم دبليو', 'أودي', 'فورد', 'شيفروليه', 'جي إم سي', 'كيا', 'هيونداي', 'مازدا', 'جيب', 'لاند روفر', 'بورش', 'فولكس واجن', 'سوبارو', 'ميتسوبيشي', 'إنفينيتي']
// Mock data for other dropdowns - in a real app these might cascade or be more extensive
const carModels: Record<string, string[]> = {
  'تويوتا': ['كامري', 'كورولا', 'يارس', 'أفالون', 'لاند كروزر', 'برادو', 'فورتشنر', 'هايلكس', 'راف4'],
  'لكزس': ['ES', 'LS', 'IS', 'RX', 'LX', 'GX', 'NX'],
  'نيسان': ['باترول', 'صني', 'التيما', 'ماكسيما', 'اكس تريل', 'باثفندر'],
  'هوندا': ['أكورد', 'سيفيك', 'باي-لوت', 'CR-V'],
  'هيونداي': ['سوناتا', 'إلنترا', 'أكسنت', 'توسان', 'سنتافي', 'باليسيد'],
  'كيا': ['K5', 'سيراتو', 'ريو', 'سبورتاج', 'سورينتو', 'تيلورايد'],
  // Default fallback
  'other': ['Model 1', 'Model 2']
}
const years = Array.from({ length: 11 }, (_, i) => 2025 - i)
const trims = ['Stanard', 'GL', 'GLX', 'XLE', 'Limited', 'Sport', 'Platinum', 'Titanium', 'Full Option']
const colors = ['أبيض', 'أبيض لؤلؤي', 'أسود', 'فضي', 'رمادي', 'أحمر', 'أزرق', 'بني', 'ذهبي', 'أخضر']
const variants = ['Highline', 'Midline', 'Baseline'] 

export default function AddCarPage() {
  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year: '',
    trim: '',
    color: '',
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
  const [statusMessage, setStatusMessage] = useState<{type: 'success' | 'warning' | 'info', text: string} | null>(null)
  
  // State for Duplicate Check Flow
  const [showConfirmation, setShowConfirmation] = useState(false)
  
  const [dealerId, setDealerId] = useState<string | null>(null)
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

      // Get dealer ID
      const { data: dealerData } = await supabase
        .from('dealers')
        .select('id')
        .eq('user_id', currentUser.id)
        .single()

      if (dealerData) {
        setDealerId(dealerData.id)
      } else {
        setError('لم يتم العثور على بيانات التاجر')
      }

      setIsChecking(false)
    }

    checkAccess()
  }, [router])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Reset confirmation state if core details change
    if (['make', 'model', 'year', 'trim', 'color'].includes(field)) {
       setShowConfirmation(false)
       setStatusMessage(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent, confirmed: boolean = false) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setStatusMessage(null)

    if (!dealerId) {
      setError('لم يتم العثور على بيانات التاجر')
      setIsLoading(false)
      return
    }

    // Validation
    if (!formData.make || !formData.model || !formData.year || !formData.trim || !formData.color || !formData.wakala_price || !formData.quantity) {
      setError('يرجى ملء جميع الحقول المطلوبة (الشركة، الموديل، السنة، الفئة، اللون، السعر، الكمية)')
      setIsLoading(false)
      return
    }

    const wakalaPrice = parseFloat(formData.wakala_price)
    const quantity = parseInt(formData.quantity)
    const yearInt = parseInt(formData.year)

    if (isNaN(wakalaPrice) || wakalaPrice <= 0) {
      setError('يرجى إدخال سعر وكالة صحيح')
      setIsLoading(false)
      return
    }

    // Call addToInventory
    const result = await addToInventory({
      dealer_id: dealerId,
      make: formData.make,
      model: formData.model,
      year: yearInt,
      trim: formData.trim,
      color: formData.color,
      variant: formData.variant || undefined,
      msrp: wakalaPrice,
      description: formData.description,
      images: images,
      quantity: quantity,
      price_slots: priceSlots
    }, confirmed) // Pass confirmation flag

    if (result.error) {
       setError(result.error.message || 'حدث خطأ غير متوقع')
    } else if (result.status === 'exists_in_inventory') {
       setError('هذه السيارة موجودة بالفعل في مخزونك.')
    } else if (result.status === 'requires_confirmation') {
       setShowConfirmation(true)
       setStatusMessage({
         type: 'info',
         text: 'لم يتم العثور على هذا التكوين مسبقاً. هل أنت متأكد أنك تريد إنشاء تكوين سيارة جديد؟ سيتم إضافته للنظام العام.'
       })
    } else if (result.data) {
       // Success (Linked OR Created)
       const msg = result.status === 'created' ? 'تم إنشاء التكوين وإضافته للمخزون بنجاح' : 'تم ربط التكوين الموجود بمخزونك بنجاح'
       // Show success briefly then redirect
       setStatusMessage({ type: 'success', text: msg })
       setTimeout(() => {
          router.push('/dashboard')
       }, 1500)
    }

    setIsLoading(false)
  }
  
  const addPriceSlot = () => {
    const price = parseFloat(newSlotPrice)
    if (isNaN(price) || price <= 0) return
    if (priceSlots.includes(price)) return
    setPriceSlots(prev => [...prev, price].sort((a, b) => b - a))
    setNewSlotPrice('')
  }
  const removePriceSlot = (price: number) => setPriceSlots(prev => prev.filter(p => p !== price))

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const availableModels = carModels[formData.make] || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-background py-8 px-4">
      <div className="w-full max-w-3xl mx-auto">
        <div className="mb-8">
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
            <ArrowRight className="w-4 h-4" />
            العودة للوحة التحكم
            </Link>
          <h1 className="text-2xl font-bold text-gray-900">إضافة للمخزون</h1>
          <p className="text-gray-600 mt-1">أضف سياراتك للمخزون لتلقي العروض</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Car className="w-5 h-5" /> تفاصيل السيارة</CardTitle>
          </CardHeader>
          <form onSubmit={(e) => handleSubmit(e, showConfirmation)}>
            <CardContent className="space-y-6">
              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
              {statusMessage && (
                  <Alert variant={statusMessage.type === 'info' ? 'default' : statusMessage.type === 'success' ? 'default' : 'destructive'} 
                         className={statusMessage.type === 'success' ? 'border-green-500 bg-green-50 text-green-900' : ''}>
                    {statusMessage.type === 'info' && <AlertCircle className="h-4 w-4" />}
                    <AlertTitle>{statusMessage.text.includes('جديد') ? 'تأكيد' : ''}</AlertTitle>
                    <AlertDescription>{statusMessage.text}</AlertDescription>
                  </Alert>
              )}

              {/* Make & Model */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                   <Label>الشركة *</Label>
                   <Select value={formData.make} onValueChange={(v) => handleInputChange('make', v)}>
                     <SelectTrigger><SelectValue placeholder="اختر الشركة" /></SelectTrigger>
                     <SelectContent>
                        {carMakes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                     </SelectContent>
                   </Select>
                </div>
                <div className="space-y-2">
                   <Label>الموديل *</Label>
                   <Select value={formData.model} onValueChange={(v) => handleInputChange('model', v)} disabled={!formData.make}>
                     <SelectTrigger><SelectValue placeholder="اختر الموديل" /></SelectTrigger>
                     <SelectContent>
                        {availableModels.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        <SelectItem value="other">أخرى</SelectItem>
                     </SelectContent>
                   </Select>
                </div>
              </div>

               {/* Year & Trim */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                   <Label>السنة *</Label>
                   <Select value={formData.year} onValueChange={(v) => handleInputChange('year', v)}>
                     <SelectTrigger><SelectValue placeholder="اختر السنة" /></SelectTrigger>
                     <SelectContent>
                        {years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                     </SelectContent>
                   </Select>
                </div>
                <div className="space-y-2">
                   <Label>الفئة (Trim) *</Label>
                    <Select value={formData.trim} onValueChange={(v) => handleInputChange('trim', v)}>
                     <SelectTrigger><SelectValue placeholder="اختر الفئة" /></SelectTrigger>
                     <SelectContent>
                        {trims.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                     </SelectContent>
                   </Select>
                </div>
              </div>

              {/* Color & Variant */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label>اللون *</Label>
                    <Select value={formData.color} onValueChange={(v) => handleInputChange('color', v)}>
                     <SelectTrigger><SelectValue placeholder="اختر اللون" /></SelectTrigger>
                     <SelectContent>
                        {colors.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                     </SelectContent>
                   </Select>
                </div>
                <div className="space-y-2">
                   <Label>نوع (Variant)</Label>
                    <Select value={formData.variant} onValueChange={(v) => handleInputChange('variant', v)}>
                     <SelectTrigger><SelectValue placeholder="اختر النوع (اختياري)" /></SelectTrigger>
                     <SelectContent>
                        {variants.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                     </SelectContent>
                   </Select>
                </div>
              </div>

              {/* Price & Qty */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>سعر الوكالة (MSRP) *</Label>
                  <Input type="number" value={formData.wakala_price} onChange={(e) => handleInputChange('wakala_price', e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>الكمية *</Label>
                  <Input type="number" value={formData.quantity} onChange={(e) => handleInputChange('quantity', e.target.value)} required />
                </div>
              </div>

               {/* Price Slots */}
              <div className="space-y-4">
                <div className="flex gap-2">
                    <Input type="number" placeholder="سعر للمزاد" value={newSlotPrice} onChange={e => setNewSlotPrice(e.target.value)} />
                    <Button type="button" onClick={addPriceSlot} variant="outline"><Plus className="w-4 h-4" /></Button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {priceSlots.map(p => (
                        <div key={p} className="flex items-center gap-2 bg-secondary px-3 py-1 rounded-full text-sm">
                            {p.toLocaleString()} <X className="w-3 h-3 cursor-pointer" onClick={() => removePriceSlot(p)} />
                        </div>
                    ))}
                </div>
              </div>

              <ImageUpload images={images} onImagesChange={setImages} maxImages={5} />

              <div className="space-y-2">
                 <Label>وصف</Label>
                 <Textarea value={formData.description} onChange={e => handleInputChange('description', e.target.value)} />
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
                        <Button type="submit" className="flex-1" variant="destructive">تأكيد وإنشاء جديد</Button>
                    </div>
                 )}
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}


