'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { Upload, X, Loader2, ImagePlus } from 'lucide-react'

interface ImageUploadProps {
  images: string[]
  onImagesChange: (images: string[]) => void
  maxImages?: number
}

export function ImageUpload({ images, onImagesChange, maxImages = 5 }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    if (images.length + files.length > maxImages) {
      setError(`يمكنك رفع ${maxImages} صور كحد أقصى`)
      return
    }

    setIsUploading(true)
    setError('')

    const newImageUrls: string[] = []

    for (const file of Array.from(files)) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('يرجى اختيار ملفات صور فقط')
        continue
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setError('حجم الملف يجب أن يكون أقل من 5 ميجابايت')
        continue
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `cars/${fileName}`

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('car-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        setError('حدث خطأ أثناء رفع الصورة')
        continue
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('car-images')
        .getPublicUrl(filePath)

      if (urlData?.publicUrl) {
        newImageUrls.push(urlData.publicUrl)
      }
    }

    if (newImageUrls.length > 0) {
      onImagesChange([...images, ...newImageUrls])
    }

    setIsUploading(false)

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeImage = async (index: number) => {
    const imageUrl = images[index]

    // Extract file path from URL
    const urlParts = imageUrl.split('/car-images/')
    if (urlParts.length > 1) {
      const filePath = urlParts[1]

      // Delete from storage
      await supabase.storage
        .from('car-images')
        .remove([filePath])
    }

    // Remove from state
    const newImages = images.filter((_, i) => i !== index)
    onImagesChange(newImages)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">صور السيارة</label>
        <span className="text-xs text-gray-500">{images.length} / {maxImages}</span>
      </div>

      {/* Image Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {images.map((url, index) => (
          <div key={index} className="relative aspect-video rounded-lg overflow-hidden border bg-gray-100">
            <Image
              src={url}
              alt={`صورة ${index + 1}`}
              fill
              className="object-cover"
            />
            <button
              type="button"
              onClick={() => removeImage(index)}
              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            {index === 0 && (
              <span className="absolute bottom-2 right-2 px-2 py-1 bg-primary text-white text-xs rounded">
                رئيسية
              </span>
            )}
          </div>
        ))}

        {/* Upload Button */}
        {images.length < maxImages && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="aspect-video rounded-lg border-2 border-dashed border-gray-300 hover:border-primary hover:bg-primary/5 transition-colors flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="text-sm">جاري الرفع...</span>
              </>
            ) : (
              <>
                <ImagePlus className="w-8 h-8" />
                <span className="text-sm">إضافة صورة</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Error Message */}
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {/* Help Text */}
      <p className="text-xs text-gray-500">
        يمكنك رفع حتى {maxImages} صور. الحجم الأقصى للملف 5 ميجابايت. الصيغ المدعومة: JPG, PNG, WebP, GIF
      </p>
    </div>
  )
}
