import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react'
import { toast } from 'sonner'
import { usePresignedUpload } from '@/lib/hooks/use-presigned-upload'
import type { MediaAsset } from '@/lib/services/media-api'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'
import { updateAd } from '../../services/artifact-preview.service'
import type { Ad } from '../../types'
import type { FieldState } from './ad-settings-panel-primitives'
import type { ImagePlacement } from './AdSingleImageCreativeEditor'
import { useAdSettingsPlacementImageMediaSaves } from './useAdSettingsPlacementImageMediaSaves'
import { useAdSettingsRootImageMediaSaves } from './useAdSettingsRootImageMediaSaves'

const MAX_AD_CREATIVE_IMAGE_BYTES = 25 * 1024 * 1024

function isImageMime(mime: string | null | undefined): boolean {
  return typeof mime === 'string' && mime.toLowerCase().startsWith('image/')
}

interface UseAdSettingsImageMediaSavesParams {
  ad: Ad | null
  adId: string
  adRef: MutableRefObject<Ad | null>
  saveVersion: MutableRefObject<number>
  activePlacement: ImagePlacement
  perPlacement: boolean
  setPerPlacement: Dispatch<SetStateAction<boolean>>
  setAd: Dispatch<SetStateAction<Ad | null>>
  setFieldStates: Dispatch<SetStateAction<Record<string, FieldState>>>
  onAdUpdated?: (ad: Ad) => void
  onPerPlacementChange?: (perPlacement: boolean) => void
  mergeAdResponse: (prev: Ad | null, updated: Ad) => Ad
}

export function useAdSettingsImageMediaSaves({
  ad,
  adId,
  adRef,
  saveVersion,
  activePlacement,
  perPlacement,
  setPerPlacement,
  setAd,
  setFieldStates,
  onAdUpdated,
  onPerPlacementChange,
  mergeAdResponse,
}: UseAdSettingsImageMediaSavesParams) {
  const { upload: presignedUpload } = usePresignedUpload()
  const {
    handleMediaPicked,
    restoreGeneratedTsxFromBackup,
    handleMediaRemove,
    handleDriveFileSelect,
  } = useAdSettingsRootImageMediaSaves({
    ad,
    adId,
    adRef,
    saveVersion,
    setAd,
    setFieldStates,
    onAdUpdated,
    mergeAdResponse,
  })
  const { handlePlacementMediaPicked, restorePlacementTsxFromBackup, handlePlacementMediaRemove } =
    useAdSettingsPlacementImageMediaSaves({
      adId,
      adRef,
      saveVersion,
      setAd,
      setFieldStates,
      onAdUpdated,
      mergeAdResponse,
    })

  const handleAdCreativeImageUpload = useCallback(
    async (file: File) => {
      if (!isImageMime(file.type)) {
        toast.error('Please upload an image file (jpg, png, webp)')
        return
      }
      if (file.size > MAX_AD_CREATIVE_IMAGE_BYTES) {
        toast.error(
          `Image is too large (${Math.round(file.size / (1024 * 1024))} MB). Max ${Math.round(MAX_AD_CREATIVE_IMAGE_BYTES / (1024 * 1024))} MB.`,
        )
        return
      }
      try {
        const cur = adRef.current
        const confirmed = await presignedUpload({
          file,
          category: 'ad-creative',
          campaign_id: cur?.campaign_id ?? undefined,
        })
        const publicUrl = confirmed.asset.public_url || confirmed.url
        if (!publicUrl) {
          toast.error('Upload succeeded but no public URL was returned')
          return
        }
        const faux: MediaAsset = { id: confirmed.asset.id } as MediaAsset
        if (perPlacement) {
          await handlePlacementMediaPicked(activePlacement, publicUrl, faux)
        } else {
          await handleMediaPicked(publicUrl, faux)
        }
      } catch (err) {
        toast.error(sanitizeUserError(err, 'Failed to upload image'))
      }
    },
    [
      activePlacement,
      adRef,
      handleMediaPicked,
      handlePlacementMediaPicked,
      perPlacement,
      presignedUpload,
    ],
  )

  const handleToggleImagePerPlacement = useCallback(
    (nextPerPlacement: boolean) => {
      setPerPlacement(nextPerPlacement)
      onPerPlacementChange?.(nextPerPlacement)
      if (!nextPerPlacement && ad) {
        const v = ++saveVersion.current
        void updateAd(adId, { placement_images: {} }).then((updated) => {
          if (saveVersion.current === v)
            setAd((prev) => {
              const next = mergeAdResponse(prev, updated)
              onAdUpdated?.(next)
              return next
            })
          else onAdUpdated?.(updated)
          window.dispatchEvent(new CustomEvent('ad-identity-changed', { detail: { adId } }))
        })
      } else if (nextPerPlacement && ad) {
        const currentUrl =
          ad.image_url ??
          ad.placement_images?.feed?.image_url ??
          ad.placement_images?.story?.image_url ??
          ad.placement_images?.reels?.image_url
        const currentAssetId =
          ad.image_asset_id ??
          ad.placement_images?.feed?.image_asset_id ??
          ad.placement_images?.story?.image_asset_id ??
          ad.placement_images?.reels?.image_asset_id ??
          null
        if (currentUrl) {
          const v = ++saveVersion.current
          const placementImages = {
            feed: { image_url: currentUrl, image_asset_id: currentAssetId },
            story: { image_url: currentUrl, image_asset_id: currentAssetId },
            reels: { image_url: currentUrl, image_asset_id: currentAssetId },
          }
          void updateAd(adId, { placement_images: placementImages }).then((updated) => {
            if (saveVersion.current === v)
              setAd((prev) => {
                const next = mergeAdResponse(prev, updated)
                onAdUpdated?.(next)
                return next
              })
            else onAdUpdated?.(updated)
            window.dispatchEvent(new CustomEvent('ad-identity-changed', { detail: { adId } }))
          })
        }
      }
    },
    [
      ad,
      adId,
      mergeAdResponse,
      onAdUpdated,
      onPerPlacementChange,
      saveVersion,
      setAd,
      setPerPlacement,
    ],
  )

  const handleSingleImageRemove = useCallback(() => {
    if (perPlacement) {
      void handlePlacementMediaRemove(activePlacement)
      return
    }
    void handleMediaRemove()
  }, [activePlacement, handleMediaRemove, handlePlacementMediaRemove, perPlacement])

  return {
    handleMediaPicked,
    restoreGeneratedTsxFromBackup,
    handleDriveFileSelect,
    handlePlacementMediaPicked,
    restorePlacementTsxFromBackup,
    handleAdCreativeImageUpload,
    handleToggleImagePerPlacement,
    handleSingleImageRemove,
  }
}
