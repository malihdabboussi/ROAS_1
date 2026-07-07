'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { toast } from 'sonner'
import { STUDIO_INLINE_ERRORS } from '@/features/studio/config/studio-inline-errors.config'
import { backendUpload } from '@/lib/api/backend-client'
import type { MediaAsset } from '@/lib/services/media-api'
import {
  fetchAd,
  fetchAdCampaign,
  fetchAdSet,
  fetchMetaPage,
  updateAd,
} from '../../../services/artifact-preview.service'
import type { Ad } from '../../../types'
import type { AdPageDisplay, AdPlacement, AdPlatform } from './ad-preview.types'
import { igUsername, pageName } from './ad-preview.utils'

export function useAdPreviewController({
  adId,
  initialAd,
  onAdUpdated,
  singleImageForAllPlacements,
  platform: platformProp,
  onPlatformChange,
  placement: placementProp,
  onPlacementChange,
}: {
  adId: string
  initialAd?: Ad
  onAdUpdated?: (ad: Ad) => void
  singleImageForAllPlacements: boolean
  platform?: AdPlatform
  onPlatformChange?: (p: AdPlatform) => void
  placement?: AdPlacement
  onPlacementChange?: (p: AdPlacement) => void
}) {
  const [ad, setAd] = useState<Ad | null>(initialAd ?? null)
  const [pageDisplay, setPageDisplay] = useState<AdPageDisplay>({
    fbName: '',
    igName: '',
    pictureUrl: null,
  })
  const [loading, setLoading] = useState(!initialAd)
  const [error, setError] = useState<string | null>(null)
  const [platformInternal, setPlatformInternal] = useState<AdPlatform>('facebook')
  const [placementInternal, setPlacementInternal] = useState<AdPlacement>('feed')
  const platform = platformProp ?? platformInternal
  const placement = placementProp ?? placementInternal
  const setPlatform = useCallback(
    (p: AdPlatform) => {
      if (platformProp === undefined) setPlatformInternal(p)
      onPlatformChange?.(p)
    },
    [platformProp, onPlatformChange],
  )
  const setPlacement = useCallback(
    (p: AdPlacement) => {
      if (placementProp === undefined) setPlacementInternal(p)
      onPlacementChange?.(p)
    },
    [placementProp, onPlacementChange],
  )
  const [isEditing, setIsEditing] = useState(false)
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const adRef = useRef<Ad | null>(initialAd ?? null)
  adRef.current = ad

  const resolvePageDisplay = useCallback(async (loaded: Ad) => {
    setPageDisplay({ fbName: pageName(loaded), igName: igUsername(loaded), pictureUrl: null })
    let pageId: string | null =
      (loaded.metadata &&
      typeof (loaded.metadata as Record<string, unknown>).meta_page_id === 'string'
        ? ((loaded.metadata as Record<string, unknown>).meta_page_id as string)
        : null) || null
    if (!pageId && loaded.ad_set_id) {
      try {
        const adSet = await fetchAdSet(loaded.ad_set_id)
        const adCampaign = await fetchAdCampaign(adSet.ad_campaign_id)
        pageId = adCampaign.meta_page_id ?? null
      } catch {
        pageId = null
      }
    }
    if (pageId) {
      try {
        const metaPage = await fetchMetaPage(pageId)
        if (metaPage) {
          setPageDisplay({
            fbName: metaPage.name,
            igName: metaPage.name,
            pictureUrl: metaPage.picture_url,
          })
          return
        }
      } catch {
        /* ignore */
      }
    }
    setPageDisplay({ fbName: pageName(loaded), igName: igUsername(loaded), pictureUrl: null })
  }, [])

  const loadAd = useCallback(
    async (forceRefresh = false) => {
      const useInitial = !!initialAd && !forceRefresh
      if (!useInitial) {
        setLoading(true)
        setError(null)
      }
      try {
        const loaded = useInitial ? initialAd : await fetchAd(adId)
        if (!useInitial) setAd(loaded)
        await resolvePageDisplay(loaded)
      } catch (err) {
        if (!useInitial) setError(err instanceof Error ? err.message : STUDIO_INLINE_ERRORS.LOAD_AD)
      } finally {
        setLoading(false)
      }
    },
    [adId, initialAd, resolvePageDisplay],
  )

  useEffect(() => {
    if (initialAd && initialAd.id === adId) setAd(initialAd)
  }, [adId, initialAd])

  useEffect(() => {
    void loadAd()
  }, [loadAd])

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.adId === adId) void loadAd(true)
    }
    window.addEventListener('ad-identity-changed', handler)
    return () => window.removeEventListener('ad-identity-changed', handler)
  }, [adId, loadAd])

  const adRealtimeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!adId) return
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    let cancelled = false
    const refresh = () => {
      if (adRealtimeDebounceRef.current) clearTimeout(adRealtimeDebounceRef.current)
      adRealtimeDebounceRef.current = setTimeout(() => {
        if (!cancelled) void loadAd(true)
      }, 400)
    }
    const channel = supabase
      .channel(`ad-preview:${adId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ads',
          filter: `id=eq.${adId}`,
        },
        refresh,
      )
      .subscribe()
    return () => {
      cancelled = true
      if (adRealtimeDebounceRef.current) clearTimeout(adRealtimeDebounceRef.current)
      void supabase.removeChannel(channel)
    }
  }, [adId, loadAd])

  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(clearTimeout)
    }
  }, [])

  const handleFieldChange = useCallback(
    (field: string, value: string) => {
      setAd((prev) => (prev ? { ...prev, [field]: value } : prev))
      if (debounceTimers.current[field]) clearTimeout(debounceTimers.current[field])
      debounceTimers.current[field] = setTimeout(async () => {
        try {
          const updated = await updateAd(adId, { [field]: value })
          onAdUpdated?.(updated)
        } catch {
          /* settings panel is the canonical save */
        }
      }, 800)
    },
    [adId, onAdUpdated],
  )

  const handleImageDrop = useCallback(
    async (file: File, dropPlacement: string) => {
      const localUrl = URL.createObjectURL(file)
      const prevAdBeforeDrop = adRef.current
      if (singleImageForAllPlacements) {
        setAd((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            image_url: localUrl,
            image_asset_id: null,
            placement_images: {},
            placement_tsx: {},
            generated_tsx: null,
          }
        })
      } else {
        setAd((prev) => {
          if (!prev) return prev
          const newPlacementImages = {
            ...prev.placement_images,
            [dropPlacement]: { image_url: localUrl },
          }
          const newPlacementTsx = { ...prev.placement_tsx }
          delete newPlacementTsx[dropPlacement]
          return { ...prev, placement_images: newPlacementImages, placement_tsx: newPlacementTsx }
        })
      }
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('name', file.name)
        formData.append('category', 'ad_creative')
        const res = await backendUpload<{ asset?: MediaAsset; url?: string }>(
          '/api/media/upload',
          formData,
        )
        const url = res.asset?.public_url ?? res.url
        if (url) {
          const currentAd = adRef.current
          if (!currentAd) return
          if (singleImageForAllPlacements) {
            const updated = await updateAd(adId, {
              image_url: url,
              image_asset_id: res.asset?.id ?? null,
              placement_images: {},
              placement_tsx: {},
              generated_tsx: null,
            })
            setAd(updated)
            onAdUpdated?.(updated)
            window.dispatchEvent(new CustomEvent('ad-identity-changed', { detail: { adId } }))
          } else {
            const mergedImages = {
              ...currentAd.placement_images,
              [dropPlacement]: { image_url: url, image_asset_id: res.asset?.id ?? null },
            }
            const mergedTsx = { ...currentAd.placement_tsx }
            delete mergedTsx[dropPlacement]
            const updated = await updateAd(adId, {
              placement_images: mergedImages,
              placement_tsx: Object.keys(mergedTsx).length > 0 ? mergedTsx : {},
            })
            setAd(updated)
            onAdUpdated?.(updated)
            window.dispatchEvent(new CustomEvent('ad-identity-changed', { detail: { adId } }))
          }
        }
      } catch {
        toast.error('Failed to upload image')
        if (singleImageForAllPlacements && prevAdBeforeDrop) {
          setAd({
            ...prevAdBeforeDrop,
            image_url: prevAdBeforeDrop.image_url ?? null,
            image_asset_id: prevAdBeforeDrop.image_asset_id ?? null,
            placement_images: prevAdBeforeDrop.placement_images ?? {},
            placement_tsx: prevAdBeforeDrop.placement_tsx ?? {},
            generated_tsx: prevAdBeforeDrop.generated_tsx ?? null,
          })
        } else {
          setAd((prev) => {
            if (!prev) return prev
            const reverted = { ...prev.placement_images }
            delete reverted[dropPlacement]
            return { ...prev, placement_images: reverted }
          })
        }
      } finally {
        URL.revokeObjectURL(localUrl)
      }
    },
    [adId, onAdUpdated, singleImageForAllPlacements],
  )

  return {
    ad,
    pageDisplay,
    loading,
    error,
    platform,
    setPlatform,
    placement,
    setPlacement,
    isEditing,
    setIsEditing,
    handleFieldChange,
    handleImageDrop,
  }
}
