'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { listAssets, type MediaAsset } from '@/lib/services/media-api'
import { cn } from '@/lib/utils/cn'

interface ShellMediaHistoryRailProps {
  activeAssetId?: string | null
  conversationId?: string | null
  resolvedAsset: MediaAsset | null
  spaceId?: string | null
  onSelect: (asset: MediaAsset) => void
}

export function ShellMediaHistoryRail({
  activeAssetId,
  conversationId,
  resolvedAsset,
  spaceId,
  onSelect,
}: ShellMediaHistoryRailProps) {
  const [history, setHistory] = useState<MediaAsset[]>([])
  const [loading, setLoading] = useState(false)
  const activeItemRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!conversationId && !spaceId) {
      setHistory([])
      return
    }
    let cancelled = false
    setLoading(true)
    void listAssets({
      asset_type: 'image',
      limit: 40,
      ...(conversationId ? { conversation_id: conversationId } : { space_id: spaceId! }),
    })
      .then((result) => {
        if (!cancelled) setHistory(result.assets)
      })
      .catch(() => {
        if (!cancelled) setHistory([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [conversationId, spaceId])

  const items = useMemo(() => {
    const seen = new Set<string>()
    return [...history, resolvedAsset].filter((asset): asset is MediaAsset => {
      if (!asset?.public_url || seen.has(asset.id)) return false
      seen.add(asset.id)
      return true
    })
  }, [history, resolvedAsset])

  useEffect(() => {
    const activeItem = activeItemRef.current
    if (activeItem && typeof activeItem.scrollIntoView === 'function') {
      activeItem.scrollIntoView({ block: 'nearest' })
    }
  }, [activeAssetId])

  return (
    <aside
      aria-label="Image history"
      className="border-border gap-spacing-2 p-spacing-2 flex w-20 shrink-0 flex-col overflow-y-auto border-r"
    >
      {loading ? (
        <div className="py-spacing-4 flex justify-center">
          <VibeyLoadingOrb state="processing" size="sm" className="gap-0 py-0" />
        </div>
      ) : (
        items.map((asset) => (
          <button
            key={asset.id}
            ref={asset.id === activeAssetId ? activeItemRef : undefined}
            type="button"
            onClick={() => onSelect(asset)}
            className={cn(
              'border-border rounded-spacing-2 aspect-square w-full shrink-0 overflow-hidden border transition-opacity',
              asset.id === activeAssetId
                ? 'border-primary ring-primary/30 ring-2'
                : 'opacity-50 hover:opacity-100',
            )}
            aria-label={`Open ${asset.name}`}
          >
            <img src={asset.public_url!} alt="" className="h-full w-full object-cover" />
          </button>
        ))
      )}
    </aside>
  )
}
