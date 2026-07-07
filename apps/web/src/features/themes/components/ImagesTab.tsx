'use client'

import { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { backendPost } from '@/lib/api/backend-client'
import type { BrandValues, BrandVoice, ThemeImageEntry } from '../types'
import { ImageStyleExamples } from './images-tab/ImageStyleExamples'
import { ImageUploadCard } from './images-tab/ImageUploadCard'

export interface ImagesTabProps {
  imageStylePrompt: string | null
  onChangeImageStylePrompt: (value: string | null) => void
  brandVoice: BrandVoice | null
  brandValues: BrandValues | null
  headshotImages?: ThemeImageEntry[]
  onUploadHeadshot?: (file: File, name: string, description: string) => Promise<void>
  onRemoveHeadshot?: (index: number) => void
  onUpdateHeadshot?: (index: number, updates: { name?: string; description?: string }) => void
  productImages?: ThemeImageEntry[]
  onUploadProductImage?: (file: File, name: string, description: string) => Promise<void>
  onRemoveProductImage?: (index: number) => void
  onUpdateProductImage?: (index: number, updates: { name?: string; description?: string }) => void
  isReadOnly?: boolean
}

export function ImagesTab({
  imageStylePrompt,
  onChangeImageStylePrompt,
  brandVoice,
  brandValues,
  headshotImages = [],
  onUploadHeadshot,
  onRemoveHeadshot,
  onUpdateHeadshot,
  productImages = [],
  onUploadProductImage,
  onRemoveProductImage,
  onUpdateProductImage,
  isReadOnly,
}: ImagesTabProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const hasBrandIdentity = Boolean(
    brandVoice?.tone ||
    brandVoice?.style ||
    brandVoice?.personality ||
    brandValues?.primary ||
    (brandValues?.secondary && brandValues.secondary.length > 0) ||
    brandValues?.tagline,
  )

  const handleGenerate = async () => {
    if (!hasBrandIdentity) return
    setIsGenerating(true)
    try {
      const response = await backendPost<{ imageStylePrompt: string }>(
        '/themes/generate-image-style',
        { brandVoice, brandValues },
      )
      onChangeImageStylePrompt(response.imageStylePrompt)
    } catch {
      // silent
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-spacing-6">
      <div>
        <h3 className="body-1 mb-spacing-2 font-semibold text-foreground">Your Headshots</h3>
        <p className="body-3 mb-spacing-4 text-muted-foreground">
          Upload professional photos of yourself from different angles. Vibey will pick the best one
          for each ad creative based on the name and description you provide.
        </p>
        <ImageUploadCard
          images={headshotImages}
          onUpload={onUploadHeadshot}
          onRemove={onRemoveHeadshot}
          onUpdate={onUpdateHeadshot}
          isReadOnly={isReadOnly}
          maxImages={6}
          category="headshot"
          emptyTitle="Upload your headshots"
          acceptHint="JPG, PNG or WebP. Square crop recommended. Up to 6 photos."
        />
      </div>

      <div className="border-t border-border" />

      <div>
        <h3 className="body-1 mb-spacing-2 font-semibold text-foreground">
          Product &amp; Brand Images
        </h3>
        <p className="body-3 mb-spacing-4 text-muted-foreground">
          Upload product shots, book covers, app screenshots, or brand imagery. Name and describe
          each one so Vibey knows when to use it.
        </p>
        <ImageUploadCard
          images={productImages}
          onUpload={onUploadProductImage}
          onRemove={onRemoveProductImage}
          onUpdate={onUpdateProductImage}
          isReadOnly={isReadOnly}
          maxImages={12}
          category="product image"
          emptyTitle="Upload product images"
          acceptHint="JPG, PNG or WebP. Up to 12 images."
        />
      </div>

      <div className="border-t border-border" />

      <div>
        <h3 className="body-1 mb-spacing-2 font-semibold text-foreground">Image Style</h3>
        <p className="body-3 text-muted-foreground">
          Help me visualize your brand. Drop in some keywords that describe your vibe... I&apos;ll
          weave them into every image I create for you.
        </p>
      </div>

      <div className="space-y-spacing-3">
        <div className="flex items-center justify-between">
          <label className="body-3 font-medium text-muted-foreground">Style Keywords</label>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!hasBrandIdentity || isGenerating}
            className="button-compact button-glass-accent gap-spacing-1 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGenerating ? (
              <Loader2 className="icon-sm animate-spin" />
            ) : (
              <Sparkles className="icon-sm" />
            )}
            <span>{isGenerating ? 'Generating...' : 'Generate'}</span>
          </button>
        </div>
        <textarea
          value={imageStylePrompt || ''}
          onChange={(e) => onChangeImageStylePrompt(e.target.value || null)}
          placeholder="e.g., minimalist, professional photography, warm lighting, soft gradients, modern tech aesthetic..."
          rows={4}
          maxLength={2000}
          className="input-glass body-2 w-full resize-none"
        />
        <p className="typo-caption text-muted-foreground">
          Think adjectives, moods, and visual styles. The more specific, the more consistent your
          imagery will be.
        </p>
      </div>

      {!hasBrandIdentity && (
        <div className="p-spacing-3 rounded-spacing-2 border border-dashed border-border">
          <p className="body-3 text-muted-foreground">
            Fill in your Brand Identity tab first to auto-generate style keywords, or type them
            manually above.
          </p>
        </div>
      )}

      <ImageStyleExamples />
    </div>
  )
}
