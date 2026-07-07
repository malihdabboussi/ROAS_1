import { useCallback, useMemo, useRef, useState } from 'react'
import { LIBRARY_MEDIA_TYPES, PAGE_SIZE } from '@/components/media/media-picker-modal.constants'
import type { CampaignFilter, TypeFilter } from '@/components/media/media-picker-modal.types'
import { listAssets, type MediaAsset } from '@/lib/services/media-api'

export function useMediaPickerLibrary(options: { campaignId?: string }) {
  const { campaignId } = options
  const [assets, setAssets] = useState<MediaAsset[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [search, setSearch] = useState('')
  const [campaignFilter, setCampaignFilter] = useState<CampaignFilter>('current')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [isPillsExpanded, setIsPillsExpanded] = useState(true)
  const [scopeDropdownOpen, setScopeDropdownOpen] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)

  const effectiveCampaignId = campaignFilter === 'current' ? campaignId : undefined

  const loadAssets = useCallback(
    async (offset = 0, append = false) => {
      if (offset === 0) setLoading(true)
      else setLoadingMore(true)
      try {
        const result = await listAssets({
          campaign_id: effectiveCampaignId,
          search: search.trim() || undefined,
          limit: PAGE_SIZE,
          offset,
        })
        const mediaOnly = result.assets.filter((asset) => LIBRARY_MEDIA_TYPES.has(asset.asset_type))
        setAssets((prev) => (append ? [...prev, ...mediaOnly] : mediaOnly))
        setTotal(result.total)
      } catch {
        if (!append) setAssets([])
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [effectiveCampaignId, search],
  )

  const hasMore = assets.length < total

  const handleScroll = useCallback(() => {
    if (!gridRef.current || loadingMore || !hasMore) return
    const el = gridRef.current
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
      void loadAssets(assets.length, true)
    }
  }, [loadingMore, hasMore, assets.length, loadAssets])

  const filteredAssets = useMemo(
    () => (typeFilter === 'all' ? assets : assets.filter((a) => a.asset_type === typeFilter)),
    [assets, typeFilter],
  )

  const skeletons = useMemo(() => Array.from({ length: 8 }, (_, i) => i), [])

  return {
    assets,
    setAssets,
    total,
    setTotal,
    loading,
    loadingMore,
    search,
    setSearch,
    campaignFilter,
    setCampaignFilter,
    typeFilter,
    setTypeFilter,
    isPillsExpanded,
    setIsPillsExpanded,
    scopeDropdownOpen,
    setScopeDropdownOpen,
    gridRef,
    loadAssets,
    hasMore,
    handleScroll,
    filteredAssets,
    skeletons,
  }
}
