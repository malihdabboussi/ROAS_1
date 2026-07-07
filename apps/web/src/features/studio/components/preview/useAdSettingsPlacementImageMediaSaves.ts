import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react'
import { toast } from 'sonner'
import type { MediaAsset } from '@/lib/services/media-api'
import { ADS_TOAST_ERRORS } from '../../config/ads-toast-errors.config'
import { updateAd } from '../../services/artifact-preview.service'
import type { Ad } from '../../types'
import type { FieldState } from './ad-settings-panel-primitives'
import { PLACEMENT_TSX_BACKUPS_META_KEY } from './AdSingleImageCreativeEditor'

interface UseAdSettingsPlacementImageMediaSavesParams {
  adId: string
  adRef: MutableRefObject<Ad | null>
  saveVersion: MutableRefObject<number>
  setAd: Dispatch<SetStateAction<Ad | null>>
  setFieldStates: Dispatch<SetStateAction<Record<string, FieldState>>>
  onAdUpdated?: (ad: Ad) => void
  mergeAdResponse: (prev: Ad | null, updated: Ad) => Ad
}

export function useAdSettingsPlacementImageMediaSaves({
  adId,
  adRef,
  saveVersion,
  setAd,
  setFieldStates,
  onAdUpdated,
  mergeAdResponse,
}: UseAdSettingsPlacementImageMediaSavesParams) {
  const handlePlacementMediaPicked = useCallback(
    async (placement: string, url: string, asset?: MediaAsset) => {
      const cur = adRef.current
      const v = ++saveVersion.current
      const key = `placement_images_${placement}`
      setFieldStates((prev) => ({ ...prev, [key]: 'saving' }))
      try {
        const prevIm = cur?.placement_images ?? {}
        const next = {
          ...prevIm,
          [placement]: { image_url: url, image_asset_id: asset?.id ?? null },
        }
        const prevTsx = { ...(cur?.placement_tsx ?? {}) }
        const tsxCode = prevTsx[placement]?.trim()
        const meta = {
          ...(cur?.metadata && typeof cur.metadata === 'object' ? cur.metadata : {}),
        } as Record<string, unknown>
        if (tsxCode) {
          const backups =
            typeof meta[PLACEMENT_TSX_BACKUPS_META_KEY] === 'object' &&
            meta[PLACEMENT_TSX_BACKUPS_META_KEY] !== null
              ? {
                  ...(meta[PLACEMENT_TSX_BACKUPS_META_KEY] as Record<string, string>),
                }
              : {}
          if (!backups[placement]) backups[placement] = tsxCode
          meta[PLACEMENT_TSX_BACKUPS_META_KEY] = backups
        }
        delete prevTsx[placement]
        const nextTsx = Object.keys(prevTsx).length > 0 ? prevTsx : {}
        const updated = await updateAd(adId, {
          placement_images: next,
          placement_tsx: nextTsx,
          metadata: meta,
        })
        if (saveVersion.current === v)
          setAd((prev) => {
            const next_ = mergeAdResponse(prev, updated)
            onAdUpdated?.(next_)
            return next_
          })
        else onAdUpdated?.(updated)
        window.dispatchEvent(new CustomEvent('ad-identity-changed', { detail: { adId } }))
        setFieldStates((p) => ({ ...p, [key]: 'saved' }))
        setTimeout(() => setFieldStates((p) => ({ ...p, [key]: 'idle' })), 1500)
      } catch {
        toast.error(ADS_TOAST_ERRORS.MEDIA_PICK_FAILED.userMessage)
        setFieldStates((p) => ({ ...p, [key]: 'error' }))
        setTimeout(() => setFieldStates((p) => ({ ...p, [key]: 'idle' })), 3000)
      }
    },
    [adId, adRef, mergeAdResponse, onAdUpdated, saveVersion, setAd, setFieldStates],
  )

  const restorePlacementTsxFromBackup = useCallback(
    async (placement: string) => {
      const cur = adRef.current
      if (!cur) return
      const meta = {
        ...(cur.metadata && typeof cur.metadata === 'object' ? cur.metadata : {}),
      } as Record<string, unknown>
      const backups =
        typeof meta[PLACEMENT_TSX_BACKUPS_META_KEY] === 'object' &&
        meta[PLACEMENT_TSX_BACKUPS_META_KEY] !== null
          ? { ...(meta[PLACEMENT_TSX_BACKUPS_META_KEY] as Record<string, string>) }
          : {}
      const back = backups[placement]
      if (typeof back !== 'string' || !back.trim()) return
      const v = ++saveVersion.current
      const key = `placement_images_${placement}`
      setFieldStates((prev) => ({ ...prev, [key]: 'saving' }))
      try {
        delete backups[placement]
        if (Object.keys(backups).length > 0) meta[PLACEMENT_TSX_BACKUPS_META_KEY] = backups
        else delete meta[PLACEMENT_TSX_BACKUPS_META_KEY]
        const prevIm = { ...(cur.placement_images ?? {}) }
        delete prevIm[placement]
        const nextTsx = { ...(cur.placement_tsx ?? {}), [placement]: back.trim() }
        const updated = await updateAd(adId, {
          placement_images: prevIm,
          placement_tsx: nextTsx,
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
        setFieldStates((p) => ({ ...p, [key]: 'saved' }))
        setTimeout(() => setFieldStates((p) => ({ ...p, [key]: 'idle' })), 1500)
      } catch {
        toast.error(ADS_TOAST_ERRORS.MEDIA_REMOVE_FAILED.userMessage)
        setFieldStates((p) => ({ ...p, [key]: 'error' }))
        setTimeout(() => setFieldStates((p) => ({ ...p, [key]: 'idle' })), 3000)
      }
    },
    [adId, adRef, mergeAdResponse, onAdUpdated, saveVersion, setAd, setFieldStates],
  )

  const handlePlacementMediaRemove = useCallback(
    async (placement: string) => {
      const cur = adRef.current
      const metaProbe = {
        ...(cur?.metadata && typeof cur.metadata === 'object' ? cur.metadata : {}),
      } as Record<string, unknown>
      const backups =
        typeof metaProbe[PLACEMENT_TSX_BACKUPS_META_KEY] === 'object' &&
        metaProbe[PLACEMENT_TSX_BACKUPS_META_KEY] !== null
          ? { ...(metaProbe[PLACEMENT_TSX_BACKUPS_META_KEY] as Record<string, string>) }
          : {}
      const back = backups[placement]
      if (
        typeof back === 'string' &&
        back.trim() &&
        cur?.placement_images?.[placement]?.image_url
      ) {
        await restorePlacementTsxFromBackup(placement)
        return
      }
      const v = ++saveVersion.current
      const key = `placement_images_${placement}`
      setFieldStates((prev) => ({ ...prev, [key]: 'saving' }))
      try {
        const prev = { ...(cur?.placement_images ?? {}) }
        delete prev[placement]
        const updated = await updateAd(adId, { placement_images: prev })
        if (saveVersion.current === v)
          setAd((prev) => {
            const next = mergeAdResponse(prev, updated)
            onAdUpdated?.(next)
            return next
          })
        else onAdUpdated?.(updated)
        window.dispatchEvent(new CustomEvent('ad-identity-changed', { detail: { adId } }))
        setFieldStates((p) => ({ ...p, [key]: 'saved' }))
        setTimeout(() => setFieldStates((p) => ({ ...p, [key]: 'idle' })), 1500)
      } catch {
        toast.error(ADS_TOAST_ERRORS.MEDIA_REMOVE_FAILED.userMessage)
        setFieldStates((p) => ({ ...p, [key]: 'error' }))
        setTimeout(() => setFieldStates((p) => ({ ...p, [key]: 'idle' })), 3000)
      }
    },
    [
      adId,
      adRef,
      mergeAdResponse,
      onAdUpdated,
      restorePlacementTsxFromBackup,
      saveVersion,
      setAd,
      setFieldStates,
    ],
  )

  return {
    handlePlacementMediaPicked,
    restorePlacementTsxFromBackup,
    handlePlacementMediaRemove,
  }
}
