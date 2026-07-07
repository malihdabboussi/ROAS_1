'use client'

import type { RefObject } from 'react'
import { Image as ImageIcon, Loader2 } from 'lucide-react'
import { TabsContent } from '@/components/ui/navigation/tabs'

export interface UserAddInfoImageTabProps {
  imagePreview: string | null
  imageCaption: string
  onImageCaptionChange: (v: string) => void
  imageDragOver: boolean
  onImageDragOver: (over: boolean) => void
  onPickImageClick: () => void
  onImageDrop: (file: File) => void
  imageInputRef: RefObject<HTMLInputElement | null>
  onImageFileSelected: (file: File) => void
  rememberingImage: boolean
  imageBase64: string | null
  onRememberImage: () => void
}

export function UserAddInfoImageTab({
  imagePreview,
  imageCaption,
  onImageCaptionChange,
  imageDragOver,
  onImageDragOver,
  onPickImageClick,
  onImageDrop,
  imageInputRef,
  onImageFileSelected,
  rememberingImage,
  imageBase64,
  onRememberImage,
}: UserAddInfoImageTabProps) {
  return (
    <TabsContent value="image" className="space-y-spacing-2 mt-0">
      <div
        className={`border-border rounded-spacing-2 bg-muted/10 flex min-h-[160px] cursor-pointer items-center justify-center border border-dashed p-3 transition-colors ${imageDragOver ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/40'}`}
        onClick={onPickImageClick}
        onDragOver={(e) => {
          e.preventDefault()
          onImageDragOver(true)
        }}
        onDragLeave={() => onImageDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          onImageDragOver(false)
          const file = e.dataTransfer.files[0]
          if (file?.type.startsWith('image/')) onImageDrop(file)
        }}
      >
        {imagePreview ? (
          <img
            src={imagePreview}
            alt="Preview"
            className="max-h-[220px] rounded-md object-contain"
          />
        ) : (
          <div className="text-muted-foreground body-4 flex flex-col items-center gap-2 text-center">
            <ImageIcon className="h-5 w-5" />
            <span>Click, drag & drop, or paste (Ctrl/Cmd+V)</span>
          </div>
        )}
      </div>
      <input
        ref={imageInputRef}
        type="file"
        className="hidden"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onImageFileSelected(file)
          e.target.value = ''
        }}
      />
      <input
        type="text"
        placeholder="Optional caption"
        value={imageCaption}
        onChange={(e) => onImageCaptionChange(e.target.value)}
        className="h-spacing-10 px-spacing-3 body-3 rounded-spacing-2 border-border surface-bg placeholder:text-muted-foreground text-foreground w-full border"
      />
      <button
        type="button"
        disabled={rememberingImage || !imageBase64}
        onClick={onRememberImage}
        className="button-glass-accent body-3 py-spacing-2 flex w-full items-center justify-center gap-2 rounded-lg font-medium disabled:opacity-40"
      >
        {rememberingImage ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <ImageIcon className="h-3.5 w-3.5" />
        )}
        {rememberingImage ? 'Embedding image...' : 'Embed Image'}
      </button>
    </TabsContent>
  )
}
