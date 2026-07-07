'use client'

import { useState } from 'react'
import { ImagePlus, Minus, Plus, Upload, X } from 'lucide-react'
import { MediaPickerModal } from '@/components/media/MediaPickerModal'
import type { MediaAsset } from '@/lib/services/media-api'
import { SettingsDropdown } from '../SettingsDropdown'

interface BaseCreative {
  id: string
  url: string
  name: string
}

interface BulkCreatorSetupProps {
  campaignId: string
  adSetId: string | null
  adSets: Array<{ id: string; name: string }>
  onAdSetChange: (id: string) => void
  onGenerate: (baseCreatives: BaseCreative[], variationCount: number) => void
}

export function BulkCreatorSetup({
  campaignId,
  adSetId,
  adSets,
  onAdSetChange,
  onGenerate,
}: BulkCreatorSetupProps) {
  const [baseCreatives, setBaseCreatives] = useState<BaseCreative[]>([])
  const [variationCount, setVariationCount] = useState(5)
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false)

  const handleSelectAssets = (assets: MediaAsset[]) => {
    const newCreatives = assets.map((a) => ({
      id: a.id,
      url: a.public_url ?? '',
      name: a.original_filename,
    }))
    setBaseCreatives((prev) => {
      const existingIds = new Set(prev.map((c) => c.id))
      const unique = newCreatives.filter((c) => !existingIds.has(c.id))
      return [...prev, ...unique]
    })
    setMediaPickerOpen(false)
  }

  const handleRemoveCreative = (id: string) => {
    setBaseCreatives((prev) => prev.filter((c) => c.id !== id))
  }

  const canGenerate = baseCreatives.length > 0 && adSetId && variationCount >= 1

  return (
    <div className="gap-spacing-4 flex flex-col">
      {baseCreatives.length === 0 ? (
        <button
          type="button"
          onClick={() => setMediaPickerOpen(true)}
          className="border-border gap-spacing-2 rounded-spacing-3 px-spacing-4 py-spacing-8 hover:border-muted-foreground/30 flex w-full flex-col items-center border border-dashed transition-colors"
        >
          <div className="rounded-spacing-2 bg-primary/10 flex h-10 w-10 items-center justify-center">
            <Upload className="text-foreground h-5 w-5" />
          </div>
          <span className="body-3 text-foreground">Drop your base creative here</span>
          <span className="body-4 text-foreground">or browse library</span>
        </button>
      ) : (
        <div className="gap-spacing-2 flex flex-wrap">
          {baseCreatives.map((c) => (
            <div
              key={c.id}
              className="border-border rounded-spacing-2 group relative h-24 w-24 overflow-hidden border"
            >
              <img src={c.url} alt={c.name} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => handleRemoveCreative(c.id)}
                className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="h-3 w-3 text-white" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setMediaPickerOpen(true)}
            className="chip-glass-neutral rounded-spacing-2 flex h-24 w-24 flex-col items-center justify-center gap-1 transition-all"
          >
            <ImagePlus className="text-muted-foreground h-5 w-5" />
            <span className="body-4 text-muted-foreground">Add</span>
          </button>
        </div>
      )}

      <div className="gap-spacing-3 flex items-end">
        <div className="min-w-0 flex-1">
          <label className="body-3 text-muted-foreground mb-spacing-1 block font-medium">
            Ad Set
          </label>
          {adSets.length === 0 ? (
            <p className="body-3 text-muted-foreground">No ad sets found.</p>
          ) : (
            <SettingsDropdown
              value={adSetId ?? ''}
              options={adSets.map((s) => ({ value: s.id, label: s.name }))}
              onChange={onAdSetChange}
              placeholder="Select ad set..."
              compact
            />
          )}
        </div>
        <div className="flex shrink-0 flex-col">
          <label className="body-3 text-muted-foreground mb-spacing-1 block font-medium">
            Variations
          </label>
          <div className="gap-spacing-1 flex items-center">
            <button
              type="button"
              onClick={() => setVariationCount((c) => Math.max(1, c - 1))}
              className="chip-glass-neutral h-spacing-8 w-spacing-8 rounded-spacing-2 flex items-center justify-center"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="chip-glass-neutral body-2 h-spacing-8 w-spacing-8 rounded-spacing-2 flex items-center justify-center font-semibold">
              {variationCount}
            </span>
            <button
              type="button"
              onClick={() => setVariationCount((c) => Math.min(10, c + 1))}
              className="chip-glass-neutral h-spacing-8 w-spacing-8 rounded-spacing-2 flex items-center justify-center"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <button
        type="button"
        disabled={!canGenerate}
        onClick={() => onGenerate(baseCreatives, variationCount)}
        className="chip-glass-blue h-spacing-10 rounded-spacing-2 flex items-center justify-center gap-2 font-semibold transition-all disabled:opacity-40"
      >
        Generate {baseCreatives.length * variationCount} Variations
      </button>

      <MediaPickerModal
        open={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={() => {}}
        onSelectAssets={handleSelectAssets}
        campaignId={campaignId}
        multiSelect
      />
    </div>
  )
}
