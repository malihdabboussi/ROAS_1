'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { FileText, Film, ImageIcon, Layers3, Presentation, Search, Workflow } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import {
  fetchCampaignArtifacts,
  type GlobalArtifactCategory,
  type GlobalArtifactItem,
} from '@/lib/artifacts/global-artifacts-api'
import { openArtifactInShell } from '@/lib/artifacts/shell-artifact-viewer'
import { cn } from '@/lib/utils/cn'
import { CAMPAIGN_VIEW_MESSAGES } from '../../_config/campaign-view-messages.config'

type AssetFilter = 'all' | 'docs' | 'media' | 'funnels' | 'presentations'

const FILTERS: Array<{ id: AssetFilter; label: string }> = [
  { id: 'all', label: 'All artifacts' },
  { id: 'docs', label: 'Docs' },
  { id: 'media', label: 'Media' },
  { id: 'funnels', label: 'Funnels' },
  { id: 'presentations', label: 'Presentations' },
]

function matchesFilter(category: GlobalArtifactCategory, filter: AssetFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'media') {
    return category === 'images' || category === 'videos' || category === 'files'
  }
  return category === filter
}

function AssetIcon({ category }: { category: GlobalArtifactCategory }) {
  if (category === 'docs') return <FileText className="icon-sm" />
  if (category === 'images' || category === 'files') return <ImageIcon className="icon-sm" />
  if (category === 'videos') return <Film className="icon-sm" />
  if (category === 'funnels') return <Workflow className="icon-sm" />
  if (category === 'presentations') return <Presentation className="icon-sm" />
  return <Layers3 className="icon-sm" />
}

export function CampaignAssetsTab({ campaignId }: { campaignId: string }) {
  const [items, setItems] = useState<GlobalArtifactItem[]>([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<AssetFilter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setLoading(true)
      setError(false)
      void fetchCampaignArtifacts(campaignId, query, controller.signal)
        .then(setItems)
        .catch((cause: unknown) => {
          if (cause instanceof DOMException && cause.name === 'AbortError') return
          setItems([])
          setError(true)
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false)
        })
    }, 220)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [campaignId, query])

  const visibleItems = useMemo(
    () => items.filter((item) => matchesFilter(item.category, filter)),
    [filter, items],
  )

  return (
    <div className="gap-spacing-4 flex flex-col">
      <div className="gap-spacing-3 flex flex-wrap items-center justify-between">
        <label className="relative min-w-64 flex-1">
          <Search className="icon-left-center icon-sm text-muted-foreground pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={CAMPAIGN_VIEW_MESSAGES.assetSearchPlaceholder}
            className="input-glass input-leading body-3 text-foreground placeholder:text-muted-foreground w-full rounded-lg py-2 pr-3 outline-none"
          />
        </label>
        <div className="gap-spacing-1 flex flex-wrap">
          {FILTERS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setFilter(option.id)}
              className={cn(
                'body-3 rounded-full px-3 py-2 font-medium transition-colors',
                filter === option.id
                  ? 'button-glass-accent text-foreground'
                  : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-64 items-center justify-center">
          <VibeyLoadingOrb
            text={CAMPAIGN_VIEW_MESSAGES.assetLoading}
            state="processing"
            size="sm"
          />
        </div>
      ) : error ? (
        <div className="surface-card border-border rounded-spacing-3 p-spacing-6 border text-center">
          <p className="body-2 text-foreground font-medium">
            {CAMPAIGN_VIEW_MESSAGES.assetLoadFailed}
          </p>
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="surface-card border-border rounded-spacing-3 p-spacing-6 border text-center">
          <Layers3 className="text-muted-foreground mb-spacing-2 mx-auto h-8 w-8" />
          <p className="body-2 text-foreground font-medium">{CAMPAIGN_VIEW_MESSAGES.assetEmpty}</p>
        </div>
      ) : (
        <div className="gap-spacing-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {visibleItems.map((item) => (
            <button
              key={`${item.category}:${item.id}`}
              type="button"
              onClick={() => openArtifactInShell(item.viewer)}
              className="surface-card border-border rounded-spacing-3 hover:bg-hover-subtle flex min-w-0 flex-col overflow-hidden border text-left transition-colors"
            >
              <span className="bg-secondary flex aspect-video w-full items-center justify-center overflow-hidden">
                {item.category === 'images' && item.thumbnailUrl ? (
                  <Image
                    src={item.thumbnailUrl}
                    alt={`${item.title} preview`}
                    width={640}
                    height={360}
                    unoptimized
                    className="h-full w-full object-cover"
                  />
                ) : item.category === 'videos' && item.viewer.fileUrl ? (
                  <video
                    src={item.viewer.fileUrl}
                    aria-label={`${item.title} preview`}
                    muted
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-muted-foreground">
                    <AssetIcon category={item.category} />
                  </span>
                )}
              </span>
              <span className="p-spacing-3 gap-spacing-1 flex min-w-0 flex-col">
                <span className="body-2 text-foreground truncate font-medium">{item.title}</span>
                <span className="body-4 text-muted-foreground">{item.badge}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
