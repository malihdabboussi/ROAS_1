import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react'
import { toast } from 'sonner'
import type { MediaAsset } from '@/lib/services/media-api'
import { ADS_TOAST_ERRORS } from '../../config/ads-toast-errors.config'
import { updateAd } from '../../services/artifact-preview.service'
import type { Ad } from '../../types'
import type { FieldState } from './ad-settings-panel-primitives'
import { GENERATED_TSX_BACKUP_META_KEY } from './AdSingleImageCreativeEditor'

interface UseAdSettingsRootImageMediaSavesParams {
  ad: Ad | null
  adId: string
  adRef: MutableRefObject<Ad | null>
  saveVersion: MutableRefObject<number>
  setAd: Dispatch<SetStateAction<Ad | null>>
  setFieldStates: Dispatch<SetStateAction<Record<string, FieldState>>>
  onAdUpdated?: (ad: Ad) => void
  mergeAdResponse: (prev: Ad | null, updated: Ad) => Ad
}

export function useAdSettingsRootImageMediaSaves({
  ad,
  adId,
  adRef,
  saveVersion,
  setAd,
  setFieldStates,
  onAdUpdated,
  mergeAdResponse,
}: UseAdSettingsRootImageMediaSavesParams) {
  const handleMediaPicked = useCallback(
    async (url: string, asset?: MediaAsset) => {
      const cur = adRef.current
      const v = ++saveVersion.current
      setFieldStates((prev) => ({ ...prev, image_url: 'saving' }))
      try {
        const meta = {
          ...(cur?.metadata && typeof cur.metadata === 'object' ? cur.metadata : {}),
        } as Record<string, unknown>
        if (cur?.generated_tsx?.trim() && meta[GENERATED_TSX_BACKUP_META_KEY] == null) {
          meta[GENERATED_TSX_BACKUP_META_KEY] = cur.generated_tsx
        }
        const updated = await updateAd(adId, {
          image_url: url,
          image_asset_id: asset?.id ?? null,
          generated_tsx: null,
          metadata: meta,
        })
        if (saveVersion.current === v)
          setAd((prev) => {
            const next = mergeAdResponse(prev, updated)
            onAdUpdated?.(next)
            return next
          })
        else onAdUpdated?.(updated)
        window.dispatchEvent(new CustomEvent('ad-identity-changed', { detail: { adId } }))
        setFieldStates((prev) => ({ ...prev, image_url: 'saved' }))
        setTimeout(() => setFieldStates((prev) => ({ ...prev, image_url: 'idle' })), 1500)
      } catch {
        toast.error(ADS_TOAST_ERRORS.MEDIA_PICK_FAILED.userMessage)
        setFieldStates((prev) => ({ ...prev, image_url: 'error' }))
        setTimeout(() => setFieldStates((prev) => ({ ...prev, image_url: 'idle' })), 3000)
      }
    },
    [adId, adRef, mergeAdResponse, onAdUpdated, saveVersion, setAd, setFieldStates],
  )

  const restoreGeneratedTsxFromBackup = useCallback(async () => {
    const cur = adRef.current
    if (!cur) return
    const meta = {
      ...(cur.metadata && typeof cur.metadata === 'object' ? cur.metadata : {}),
    } as Record<string, unknown>
    const backup = meta[GENERATED_TSX_BACKUP_META_KEY]
    if (typeof backup !== 'string' || !backup.trim()) return
    const v = ++saveVersion.current
    setFieldStates((prev) => ({ ...prev, image_url: 'saving' }))
    try {
      delete meta[GENERATED_TSX_BACKUP_META_KEY]
      const updated = await updateAd(adId, {
        generated_tsx: backup.trim(),
        image_url: null,
        image_asset_id: null,
        metadata: meta,
      })
      if (saveVersion.current === v)
        setAd((prev) => {
          const next = mergeAdResponse(prev, updated)
          onAdUpdated?.(next)
          return next
        })
      else onAdUpdated?.(updated)
      window.dispatchEvent(new CustomEvent('ad-identity-changed', { detail: { adId } }))
      setFieldStates((prev) => ({ ...prev, image_url: 'saved' }))
      setTimeout(() => setFieldStates((prev) => ({ ...prev, image_url: 'idle' })), 1500)
    } catch {
      toast.error(ADS_TOAST_ERRORS.MEDIA_REMOVE_FAILED.userMessage)
      setFieldStates((prev) => ({ ...prev, image_url: 'error' }))
      setTimeout(() => setFieldStates((prev) => ({ ...prev, image_url: 'idle' })), 3000)
    }
  }, [adId, adRef, mergeAdResponse, onAdUpdated, saveVersion, setAd, setFieldStates])

  const handleMediaRemove = useCallback(async () => {
    const cur = adRef.current
    const metaProbe = {
      ...(cur?.metadata && typeof cur.metadata === 'object' ? cur.metadata : {}),
    } as Record<string, unknown>
    const backup = metaProbe[GENERATED_TSX_BACKUP_META_KEY]
    if (typeof backup === 'string' && backup.trim() && cur?.image_url) {
      await restoreGeneratedTsxFromBackup()
      return
    }
    const v = ++saveVersion.current
    setFieldStates((prev) => ({ ...prev, image_url: 'saving' }))
    try {
      const meta = {
        ...(cur?.metadata && typeof cur.metadata === 'object' ? cur.metadata : {}),
      }
      delete meta.image_source
      delete meta.drive_file_id
      delete meta.drive_file_name
      const updated = await updateAd(adId, {
        image_url: null,
        image_asset_id: null,
        generated_tsx: null,
        metadata: meta,
      })
      if (saveVersion.current === v)
        setAd((prev) => {
          const next = mergeAdResponse(prev, updated)
          onAdUpdated?.(next)
          return next
        })
      else onAdUpdated?.(updated)
      window.dispatchEvent(new CustomEvent('ad-identity-changed', { detail: { adId } }))
      setFieldStates((prev) => ({ ...prev, image_url: 'saved' }))
      setTimeout(() => setFieldStates((prev) => ({ ...prev, image_url: 'idle' })), 1500)
    } catch {
      toast.error(ADS_TOAST_ERRORS.MEDIA_REMOVE_FAILED.userMessage)
      setFieldStates((prev) => ({ ...prev, image_url: 'error' }))
      setTimeout(() => setFieldStates((prev) => ({ ...prev, image_url: 'idle' })), 3000)
    }
  }, [
    adId,
    adRef,
    mergeAdResponse,
    onAdUpdated,
    restoreGeneratedTsxFromBackup,
    saveVersion,
    setAd,
    setFieldStates,
  ])

  const handleDriveFileSelect = useCallback(
    async (file: { id: string; name: string; mimeType?: string }) => {
      const v = ++saveVersion.current
      setFieldStates((prev) => ({ ...prev, image_url: 'saving' }))
      try {
        const meta = { ...(ad?.metadata && typeof ad.metadata === 'object' ? ad.metadata : {}) }
        const updated = await updateAd(adId, {
          metadata: {
            ...meta,
            image_source: 'google_drive',
            drive_file_id: file.id,
            drive_file_name: file.name,
          },
          image_url: null,
          image_asset_id: null,
          generated_tsx: null,
        })
        if (saveVersion.current === v)
          setAd((prev) => {
            const next = mergeAdResponse(prev, updated)
            onAdUpdated?.(next)
            return next
          })
        else onAdUpdated?.(updated)
        window.dispatchEvent(new CustomEvent('ad-identity-changed', { detail: { adId } }))
        setFieldStates((prev) => ({ ...prev, image_url: 'saved' }))
        setTimeout(() => setFieldStates((prev) => ({ ...prev, image_url: 'idle' })), 1500)
      } catch {
        toast.error(ADS_TOAST_ERRORS.MEDIA_PICK_FAILED.userMessage)
        setFieldStates((prev) => ({ ...prev, image_url: 'error' }))
        setTimeout(() => setFieldStates((prev) => ({ ...prev, image_url: 'idle' })), 3000)
      }
    },
    [ad?.metadata, adId, mergeAdResponse, onAdUpdated, saveVersion, setAd, setFieldStates],
  )

  return {
    handleMediaPicked,
    restoreGeneratedTsxFromBackup,
    handleMediaRemove,
    handleDriveFileSelect,
  }
}
