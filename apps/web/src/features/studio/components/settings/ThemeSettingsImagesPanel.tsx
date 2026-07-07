'use client'

import type { Dispatch, SetStateAction } from 'react'
import { ImagesTab } from '@/features/themes/components/ImagesTab'
import type { BrandValues, BrandVoice, Theme } from '@/features/themes/types'
import type { ThemeImageRow } from './use-theme-settings-data'

export interface ThemeSettingsImagesPanelProps {
  selectedTheme: Theme
  imageStylePrompt: string | null
  setImageStylePrompt: Dispatch<SetStateAction<string | null>>
  brandVoice: BrandVoice | null
  brandValues: BrandValues | null
  headshotImages: ThemeImageRow[]
  onUploadHeadshot: (file: File, imgName: string, description: string) => Promise<void>
  onRemoveHeadshot: (index: number) => void
  onUpdateHeadshot: (index: number, updates: { name?: string; description?: string }) => void
  productImages: ThemeImageRow[]
  onUploadProductImage: (file: File, imgName: string, description: string) => Promise<void>
  onRemoveProductImage: (index: number) => void
  onUpdateProductImage: (index: number, updates: { name?: string; description?: string }) => void
}

export function ThemeSettingsImagesPanel({
  selectedTheme,
  imageStylePrompt,
  setImageStylePrompt,
  brandVoice,
  brandValues,
  headshotImages,
  onUploadHeadshot,
  onRemoveHeadshot,
  onUpdateHeadshot,
  productImages,
  onUploadProductImage,
  onRemoveProductImage,
  onUpdateProductImage,
}: ThemeSettingsImagesPanelProps) {
  return (
    <div>
      <ImagesTab
        imageStylePrompt={imageStylePrompt}
        onChangeImageStylePrompt={setImageStylePrompt}
        brandVoice={brandVoice}
        brandValues={brandValues}
        headshotImages={headshotImages}
        onUploadHeadshot={onUploadHeadshot}
        onRemoveHeadshot={onRemoveHeadshot}
        onUpdateHeadshot={onUpdateHeadshot}
        productImages={productImages}
        onUploadProductImage={onUploadProductImage}
        onRemoveProductImage={onRemoveProductImage}
        onUpdateProductImage={onUpdateProductImage}
        isReadOnly={selectedTheme.is_system}
      />
    </div>
  )
}
