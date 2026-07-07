import {
  useCallback,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react'
import { STUDIO_INLINE_ERRORS } from '@/features/studio/config/studio-inline-errors.config'
import {
  fetchAd,
  refreshAdMetaStatus,
  setAdMetaStatus,
} from '../../services/artifact-preview.service'
import type { Ad } from '../../types'

interface UseAdSettingsMetaControlsParams {
  ad: Ad | null
  adId: string
  saveVersion: MutableRefObject<number>
  setAd: Dispatch<SetStateAction<Ad | null>>
  onAdUpdated?: (ad: Ad) => void
  mergeAdResponse: (prev: Ad | null, updated: Ad) => Ad
}

export function useAdSettingsMetaControls({
  ad,
  adId,
  saveVersion,
  setAd,
  onAdUpdated,
  mergeAdResponse,
}: UseAdSettingsMetaControlsParams) {
  const [refreshingStatus, setRefreshingStatus] = useState(false)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const [settingMetaStatus, setSettingMetaStatus] = useState(false)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [publishModalOpen, setPublishModalOpen] = useState(false)

  const isPublished = !!ad?.meta_ad_id
  const metaPublishedAt = (ad?.metadata?.meta_published_at as string | undefined) ?? null
  const hasPendingChanges =
    !!ad?.meta_ad_id &&
    !!ad?.updated_at &&
    (!metaPublishedAt || new Date(ad.updated_at) > new Date(metaPublishedAt))

  const handleRefreshStatus = useCallback(async () => {
    const v = ++saveVersion.current
    setRefreshingStatus(true)
    setRefreshError(null)
    try {
      const result = await refreshAdMetaStatus(adId)
      if ((result as Record<string, unknown>).not_published) {
        setRefreshError('Not published to Meta yet')
      } else {
        const updated = await fetchAd(adId)
        if (saveVersion.current === v)
          setAd((prev) => {
            const next = mergeAdResponse(prev, updated)
            onAdUpdated?.(next)
            return next
          })
        else onAdUpdated?.(updated)
      }
    } catch (err) {
      setRefreshError(err instanceof Error ? err.message : STUDIO_INLINE_ERRORS.REFRESH_META_STATUS)
    } finally {
      setRefreshingStatus(false)
    }
  }, [adId, mergeAdResponse, onAdUpdated, saveVersion, setAd])

  const handleSetMetaStatus = useCallback(
    async (status: 'ACTIVE' | 'PAUSED') => {
      const v = ++saveVersion.current
      setSettingMetaStatus(true)
      setRefreshError(null)
      try {
        await setAdMetaStatus(adId, status)
        const updated = await fetchAd(adId)
        if (saveVersion.current === v)
          setAd((prev) => {
            const next = mergeAdResponse(prev, updated)
            onAdUpdated?.(next)
            return next
          })
        else onAdUpdated?.(updated)
      } catch (err) {
        setRefreshError(
          err instanceof Error ? err.message : STUDIO_INLINE_ERRORS.UPDATE_META_STATUS,
        )
      } finally {
        setSettingMetaStatus(false)
      }
    },
    [adId, mergeAdResponse, onAdUpdated, saveVersion, setAd],
  )

  const handlePublished = useCallback(async () => {
    const updated = await fetchAd(adId)
    setAd((prev) => {
      const next = mergeAdResponse(prev, updated)
      onAdUpdated?.(next)
      return next
    })
  }, [adId, mergeAdResponse, onAdUpdated, setAd])

  return {
    isPublished,
    hasPendingChanges,
    refreshingStatus,
    refreshError,
    settingMetaStatus,
    reviewModalOpen,
    publishModalOpen,
    openReviewModal: () => setReviewModalOpen(true),
    closeReviewModal: () => setReviewModalOpen(false),
    continueToPublish: () => setPublishModalOpen(true),
    closePublishModal: () => setPublishModalOpen(false),
    handleRefreshStatus,
    handleSetMetaStatus,
    handlePublished,
  }
}
