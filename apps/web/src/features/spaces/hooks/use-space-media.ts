'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { listAssets, type MediaAsset } from '@/lib/services/media-api'
import type { MediaAssetTypePick, MediaSourceFilter } from '../types/space-schema'

function passesSourceFilter(asset: MediaAsset, filter: MediaSourceFilter): boolean {
  if (filter === 'all') return true
  const src = (asset.source ?? '').toLowerCase()
  const cat = (asset.category ?? '').toLowerCase()
  if (filter === 'uploaded') return src === 'upload' || cat === 'upload'
  if (filter === 'generated')
    return src === 'generated' || cat === 'generated' || cat === 'ai-generated'
  if (filter === 'agent') {
    const tags = asset.tags ?? []
    return tags.some((t) => t.includes('ai-generated')) || src === 'generated'
  }
  return true
}

function isMediaGalleryAsset(asset: MediaAsset): boolean {
  return asset.asset_type === 'image' || asset.asset_type === 'video'
}

function assetMatchesTypePick(asset: MediaAsset, pick: MediaAssetTypePick): boolean {
  return asset.asset_type === pick
}

function passesTypeFilters(asset: MediaAsset, filters: MediaAssetTypePick[]): boolean {
  if (filters.length === 0) return true
  return filters.some((f) => assetMatchesTypePick(asset, f))
}

export function useSpaceMedia(
  spaceId: string | null,
  opts: {
    typeFilters: MediaAssetTypePick[]
    sourceFilter: MediaSourceFilter
    search?: string
  },
) {
  const [assets, setAssets] = useState<MediaAsset[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const typeFiltersKey = opts.typeFilters.slice().sort().join(',')

  const assetTypeParam = useMemo(() => {
    if (opts.typeFilters.length !== 1) return undefined
    const f = opts.typeFilters[0]
    return f === 'image' || f === 'video' ? f : undefined
  }, [opts.typeFilters])

  const reload = useCallback(async () => {
    if (!spaceId) {
      setAssets([])
      setTotal(0)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await listAssets({
        space_id: spaceId,
        limit: 100,
        offset: 0,
        ...(assetTypeParam ? { asset_type: assetTypeParam } : {}),
        ...(opts.search?.trim() ? { search: opts.search.trim() } : {}),
      })
      const filtered = res.assets.filter(
        (a) =>
          isMediaGalleryAsset(a) &&
          passesTypeFilters(a, opts.typeFilters) &&
          passesSourceFilter(a, opts.sourceFilter),
      )
      setAssets(filtered)
      setTotal(filtered.length)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load media')
      setAssets([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [spaceId, assetTypeParam, typeFiltersKey, opts.sourceFilter, opts.search])

  useEffect(() => {
    void reload()
  }, [reload])

  const reloadRef = useRef(reload)
  reloadRef.current = reload

  useEffect(() => {
    if (!spaceId) return
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    let timer: ReturnType<typeof setTimeout> | null = null
    const fire = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        void reloadRef.current()
      }, 300)
    }
    const channel = supabase.channel(`media_assets:${spaceId}`).on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'media_assets',
        filter: `space_id=eq.${spaceId}`,
      },
      fire,
    )
    const subscribed = channel.subscribe((status, err) => {
      if (status === 'CHANNEL_ERROR') {
        console.error(`[Realtime] media_assets channel error for ${spaceId}:`, err)
      }
    })

    return () => {
      if (timer) clearTimeout(timer)
      void supabase.removeChannel(subscribed)
    }
  }, [spaceId])

  const visible = useMemo(() => assets, [assets])

  return { assets: visible, total, loading, error, reload }
}
