import { useCallback, type Dispatch, type SetStateAction } from 'react'
import type { Ad } from '../../types'
import { stripCopyFromAdHeadline } from '../../utils/ad-headline'
import type { ImagePlacement } from './AdSingleImageCreativeEditor'
import type { VideoPlacement } from './AdVideoCreativeEditor'

interface UseAdSettingsRegenerationActionsParams {
  ad: Ad | null
  adId: string
  activePlacement: ImagePlacement
  activeVideoPlacement: VideoPlacement
  carouselCardMenuOpen: number | null
  driveFileId: string | null
  drivePreviewUrl: string | null
  perPlacement: boolean
  perPlacementVideo: boolean
  setCarouselCardMenuOpen: Dispatch<SetStateAction<number | null>>
  setImageMenuOpen: Dispatch<SetStateAction<boolean>>
  setMediaPickerForCarousel: Dispatch<SetStateAction<number | null>>
  setMediaPickerForVideo: Dispatch<SetStateAction<'default' | VideoPlacement | null>>
  setMediaPickerOpen: Dispatch<SetStateAction<boolean>>
  setVideoMenuOpen: Dispatch<SetStateAction<boolean>>
}

export function useAdSettingsRegenerationActions({
  ad,
  adId,
  activePlacement,
  activeVideoPlacement,
  carouselCardMenuOpen,
  driveFileId,
  drivePreviewUrl,
  perPlacement,
  perPlacementVideo,
  setCarouselCardMenuOpen,
  setImageMenuOpen,
  setMediaPickerForCarousel,
  setMediaPickerForVideo,
  setMediaPickerOpen,
  setVideoMenuOpen,
}: UseAdSettingsRegenerationActionsParams) {
  const handleRequestRegenerateImage = useCallback(
    (imageUrl: string | null) => {
      const prompt = `Regenerate the image for this ad (ad id: ${adId}). Update the existing ad creative; do not create or duplicate ads.`
      window.dispatchEvent(
        new CustomEvent('studio-request-regenerate-ad-image', {
          detail: {
            adId,
            prompt,
            headline: stripCopyFromAdHeadline(ad?.headline) || 'Untitled ad',
            imageUrl,
          },
        }),
      )
    },
    [ad?.headline, adId],
  )

  const handleRegenerateCarouselCardFromMenu = useCallback(() => {
    const cardIndex = carouselCardMenuOpen
    setCarouselCardMenuOpen(null)
    if (cardIndex === null) return
    const card = ad?.carousel_cards?.[cardIndex]
    if (!card) return
    const prompt = `Regenerate the image for carousel card ${cardIndex + 1} of this ad (ad id: ${adId}). Update the existing ad creative; do not create or duplicate ads.`
    window.dispatchEvent(
      new CustomEvent('studio-request-regenerate-ad-image', {
        detail: {
          adId,
          prompt,
          headline: stripCopyFromAdHeadline(ad?.headline) || 'Untitled ad',
          imageUrl: card.image_url || null,
          carouselCardIndex: cardIndex,
        },
      }),
    )
  }, [ad?.carousel_cards, ad?.headline, adId, carouselCardMenuOpen, setCarouselCardMenuOpen])

  const handleOpenCarouselCardLibraryFromMenu = useCallback(() => {
    if (carouselCardMenuOpen === null) return
    setMediaPickerForCarousel(carouselCardMenuOpen)
    setMediaPickerForVideo(null)
    setCarouselCardMenuOpen(null)
    setMediaPickerOpen(true)
  }, [
    carouselCardMenuOpen,
    setCarouselCardMenuOpen,
    setMediaPickerForCarousel,
    setMediaPickerForVideo,
    setMediaPickerOpen,
  ])

  const handleRegenerateCurrentVideoFromMenu = useCallback(() => {
    setVideoMenuOpen(false)
    const prompt = `Regenerate the video for this ad (ad id: ${adId}). Update the existing ad creative; do not create or duplicate ads.`
    const placementVideos = ad?.metadata?.placement_videos as
      | Record<string, { video_url?: string }>
      | undefined
    const videoUrl = perPlacementVideo
      ? (placementVideos?.[activeVideoPlacement]?.video_url ?? null)
      : (ad?.video_url ?? null)
    window.dispatchEvent(
      new CustomEvent('studio-request-regenerate-ad-image', {
        detail: {
          adId,
          prompt,
          headline: stripCopyFromAdHeadline(ad?.headline) || 'Untitled ad',
          imageUrl: videoUrl,
          isVideo: true,
        },
      }),
    )
  }, [
    activeVideoPlacement,
    ad?.headline,
    ad?.metadata?.placement_videos,
    ad?.video_url,
    adId,
    perPlacementVideo,
    setVideoMenuOpen,
  ])

  const handleRegenerateCurrentImageFromMenu = useCallback(() => {
    setImageMenuOpen(false)
    const prompt = `Regenerate the image for this ad (ad id: ${adId}). Update the existing ad creative; do not create or duplicate ads.`
    const imageUrl = perPlacement
      ? (ad?.placement_images?.[activePlacement]?.image_url ?? null)
      : (ad?.image_url ?? (driveFileId ? drivePreviewUrl : null))
    window.dispatchEvent(
      new CustomEvent('studio-request-regenerate-ad-image', {
        detail: {
          adId,
          prompt,
          headline: stripCopyFromAdHeadline(ad?.headline) || 'Untitled ad',
          imageUrl: imageUrl ?? null,
        },
      }),
    )
  }, [
    activePlacement,
    ad?.headline,
    ad?.image_url,
    ad?.placement_images,
    adId,
    driveFileId,
    drivePreviewUrl,
    perPlacement,
    setImageMenuOpen,
  ])

  const handleOpenImageLibraryFromMenu = useCallback(() => {
    setImageMenuOpen(false)
    setMediaPickerOpen(true)
  }, [setImageMenuOpen, setMediaPickerOpen])

  return {
    handleRequestRegenerateImage,
    handleRegenerateCarouselCardFromMenu,
    handleOpenCarouselCardLibraryFromMenu,
    handleRegenerateCurrentVideoFromMenu,
    handleRegenerateCurrentImageFromMenu,
    handleOpenImageLibraryFromMenu,
  }
}
