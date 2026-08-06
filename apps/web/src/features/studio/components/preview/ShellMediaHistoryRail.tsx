'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { useResilientImageSrc } from '@/lib/media/use-resilient-image-src'
import { listAssets, type MediaAsset } from '@/lib/services/media-api'
import { cn } from '@/lib/utils/cn'

interface ShellMediaHistoryRailProps {
  activeAssetId?: string | null
  conversationId?: string | null
  resolvedAsset: MediaAsset | null
  spaceId?: string | null
  onSelect: (asset: MediaAsset) => void
}

function MediaThumb({ asset }: { asset: MediaAsset }) {
  const resilient = useResilientImageSrc(asset.public_url ?? '', {
    mediaAssetId: asset.id,
  })

  if (asset.asset_type === 'video' && asset.public_url) {
    return (
      <video
        src={asset.public_url}
        muted
        playsInline
        preload="metadata"
        className="h-full w-full object-cover"
      />
    )
  }

  if (resilient.loadState === 'error') {
    return (
      <button
        type="button"
        className="bg-secondary text-destructive flex h-full w-full flex-col items-center justify-center gap-1 p-1"
        onClick={(event) => {
          event.stopPropagation()
          resilient.retry()
        }}
        aria-label={`Retry loading ${asset.name}`}
      >
        <AlertCircle className="h-3.5 w-3.5" aria-hidden />
        <span className="text-[9px] leading-tight">Retry</span>
      </button>
    )
  }

  return (
    <img
      src={resilient.imgSrc}
      alt=""
      className={cn(
        'h-full w-full object-cover transition-opacity',
        resilient.loadState === 'loaded' ? 'opacity-100' : 'opacity-0',
      )}
      onLoad={resilient.onLoad}
      onError={resilient.onError}
    />
  )
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
      limit: 40,
      ...(conversationId ? { conversation_id: conversationId } : { space_id: spaceId! }),
    })
      .then((result) => {
        if (cancelled) return
        setHistory(
          result.assets.filter(
            (asset) => asset.asset_type === 'image' || asset.asset_type === 'video',
          ),
        )
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

  useEffect(() => {
    if (!resolvedAsset?.public_url) return
    if (resolvedAsset.asset_type !== 'image' && resolvedAsset.asset_type !== 'video') return
    setHistory((current) =>
      current.some((asset) => asset.id === resolvedAsset.id)
        ? current
        : [...current, resolvedAsset],
    )
  }, [resolvedAsset])

  const items = useMemo(() => {
    const seen = new Set<string>()
    return [...history, resolvedAsset].filter((asset): asset is MediaAsset => {
      if (!asset?.public_url || seen.has(asset.id)) return false
      if (asset.asset_type !== 'image' && asset.asset_type !== 'video') return false
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
      aria-label="Media history"
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
            <MediaThumb asset={asset} />
          </button>
        ))
      )}
    </aside>
  )
}
