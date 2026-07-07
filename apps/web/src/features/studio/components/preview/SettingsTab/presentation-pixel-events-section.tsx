'use client'

import { Megaphone } from 'lucide-react'
import { toast } from 'sonner'
import type { Presentation } from '@/lib/artifacts/artifact-types'
import {
  FUNNEL_META_EVENTS,
  getFunnelPixelsFromMetadata,
  type FunnelPixelEntry,
} from '../funnel-settings/funnel-pixel-utils'
import { SettingsDropdown } from '../SettingsDropdown'

type MetaPixelOption = {
  value: string
  label: string
}

interface PresentationPixelEventsSectionProps {
  presentation: Presentation
  pixelSaving: boolean
  pixelAddFlow: string
  setPixelAddFlow: (mode: string) => void
  allMetaPixelOptions: MetaPixelOption[]
  onUpdatePixels: (presentationId: string, pixels: FunnelPixelEntry[]) => Promise<void> | void
  onUpdateMetaEvents: (presentationId: string, events: Record<string, string>) => Promise<void> | void
}

export function PresentationPixelEventsSection({
  presentation,
  pixelSaving,
  pixelAddFlow,
  setPixelAddFlow,
  allMetaPixelOptions,
  onUpdatePixels,
  onUpdateMetaEvents,
}: PresentationPixelEventsSectionProps) {
  const meta =
    presentation.metadata && typeof presentation.metadata === 'object'
      ? (presentation.metadata as Record<string, unknown>)
      : {}
  const currentPixels = getFunnelPixelsFromMetadata(meta)
  const events = (
    meta.meta_events && typeof meta.meta_events === 'object' ? meta.meta_events : {}
  ) as Record<string, string>

  return (
    <div className="space-y-spacing-4 pt-spacing-4 border-border border-t">
      <div className="gap-spacing-2 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="gap-spacing-2 flex min-w-0 items-center">
          <Megaphone className="icon-sm text-muted-foreground shrink-0" />
          <span className="body-3 text-foreground font-medium">Meta Pixel & events</span>
        </div>
        <div className="flex shrink-0 justify-start sm:justify-end">
          {pixelAddFlow === '__choose__' ||
          pixelAddFlow === '__meta__' ||
          pixelAddFlow.startsWith('__pasting__') ? (
            <button
              type="button"
              className="body-3 text-muted-foreground hover:text-foreground font-medium"
              onClick={() => setPixelAddFlow('')}
            >
              Cancel
            </button>
          ) : (
            <button
              type="button"
              className="chip-glass-green rounded-spacing-2 px-spacing-3 py-spacing-1 body-3 inline-flex items-center justify-center font-medium"
              onClick={() => setPixelAddFlow('__choose__')}
            >
              Add Pixel To Presentation
            </button>
          )}
        </div>
      </div>
      <p className="body-3 text-muted-foreground">
        We add your pixel to this presentation automatically. Choose which pixel(s) to use and which
        event fires on the page.
      </p>
      <div className="space-y-spacing-4">
        {pixelSaving && <span className="typo-caption text-muted-foreground">Saving...</span>}
        <div className="space-y-spacing-2">
          <label className="typo-caption text-foreground font-medium">Pixels</label>
          {currentPixels.length > 0 && (
            <ul className="space-y-spacing-2">
              {currentPixels.map((pixel) => {
                const resolvedName =
                  pixel.name || allMetaPixelOptions.find((option) => option.value === pixel.id)?.label
                return (
                  <li key={pixel.id} className="gap-spacing-2 flex items-start">
                    <div className="min-w-0 flex-1">
                      {resolvedName && (
                        <span className="body-3 text-foreground block font-medium">
                          {resolvedName}
                        </span>
                      )}
                      <span className="typo-caption text-muted-foreground">{pixel.id}</span>
                    </div>
                    <button
                      type="button"
                      className="button-glass-destructive rounded-spacing-2 px-spacing-2 py-spacing-1 body-3"
                      disabled={pixelSaving}
                      onClick={() => {
                        const next = currentPixels.filter((entry) => entry.id !== pixel.id)
                        void onUpdatePixels(presentation.id, next)
                      }}
                    >
                      Remove
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          {pixelAddFlow === '__choose__' && (
            <div className="gap-spacing-2 flex flex-wrap items-center">
              <button
                type="button"
                className="button-glass-accent rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 font-medium"
                onClick={() => setPixelAddFlow('__meta__')}
              >
                From Meta
              </button>
              <button
                type="button"
                className="button-glass rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 font-medium"
                onClick={() => setPixelAddFlow('__pasting__')}
              >
                Paste Pixel ID
              </button>
            </div>
          )}
          {pixelAddFlow === '__meta__' && (
            <div className="space-y-spacing-2">
              <SettingsDropdown
                value=""
                options={[
                  { value: '', label: 'Select a pixel...' },
                  ...allMetaPixelOptions
                    .filter((option) => !currentPixels.some((pixel) => pixel.id === option.value))
                    .map((option) => ({
                      value: option.value,
                      label: option.label,
                      description: option.value,
                    })),
                ]}
                onChange={(value) => {
                  if (!value.trim()) return
                  const option = allMetaPixelOptions.find((item) => item.value === value)
                  setPixelAddFlow('')
                  void onUpdatePixels(presentation.id, [
                    ...currentPixels,
                    {
                      id: value.trim(),
                      name: option?.label,
                      source: 'integration',
                    },
                  ])
                }}
                placeholder="Select a pixel..."
                searchable
                compactSearch
                minWidth={280}
              />
            </div>
          )}
          {pixelAddFlow.startsWith('__pasting__') && (
            <div className="gap-spacing-2 flex flex-wrap items-center">
              <input
                autoFocus
                value={pixelAddFlow.replace('__pasting__', '')}
                onChange={(e) => setPixelAddFlow(`__pasting__${e.target.value}`)}
                placeholder="Enter Pixel ID (e.g. 505546750304736)"
                className="input-glass h-spacing-10 rounded-spacing-2 px-spacing-3 body-3 flex-1"
              />
              <button
                type="button"
                className="button-glass-accent rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 font-medium disabled:opacity-50"
                disabled={pixelSaving}
                onClick={() => {
                  const id = pixelAddFlow.replace('__pasting__', '').trim()
                  if (!id) return
                  if (!/^\d{5,20}$/.test(id)) {
                    toast.error('Pixel ID must be 5–20 digits')
                    return
                  }
                  if (currentPixels.some((pixel) => pixel.id === id)) return
                  setPixelAddFlow('')
                  void onUpdatePixels(presentation.id, [...currentPixels, { id, source: 'manual' }])
                }}
              >
                Add
              </button>
            </div>
          )}
        </div>
        <div className="space-y-spacing-3 border-border pt-spacing-3 border-t">
          <label className="typo-caption text-foreground font-medium">Events on page</label>
          <div className="space-y-spacing-2">
            <div className="space-y-spacing-2">
              <div className="gap-spacing-2 flex items-center">
                <div className="icon-badge-green rounded-spacing-2 p-spacing-1 flex items-center justify-center">
                  <span className="body-4 text-chip-strategy-green font-bold">1</span>
                </div>
                <span className="body-3 text-foreground font-medium">Presentation page</span>
              </div>
              <SettingsDropdown
                value={events['opt-in'] ?? ''}
                options={[{ value: '', label: 'Default (View content)' }, ...FUNNEL_META_EVENTS]}
                onChange={(value) =>
                  void onUpdateMetaEvents(presentation.id, {
                    ...events,
                    'opt-in': value,
                  })
                }
                placeholder="View content"
                compactSearch
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
