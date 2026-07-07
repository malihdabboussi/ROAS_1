import { useCallback, type Dispatch, type SetStateAction } from 'react'
import type { MediaAsset } from '@/lib/services/media-api'
import type { CarouselCard } from '../../types'
import type { ImagePlacement } from './AdSingleImageCreativeEditor'
import type { VideoPickerTarget } from './AdVideoCreativeEditor'

type MaybePromise = Promise<void> | void

interface UseAdSettingsMediaPickerRoutingParams {
  activePlacement: ImagePlacement
  mediaPickerForCarousel: number | null
  mediaPickerForVideo: VideoPickerTarget | null
  perPlacement: boolean
  setMediaPickerOpen: Dispatch<SetStateAction<boolean>>
  setMediaPickerForVideo: Dispatch<SetStateAction<VideoPickerTarget | null>>
  setMediaPickerForCarousel: Dispatch<SetStateAction<number | null>>
  handleCarouselMediaPickedFromPicker: (
    cardIndex: number,
    patch: Partial<CarouselCard>,
  ) => void
  handleVideoMediaPickedFromPicker: (target: VideoPickerTarget, url: string) => void
  handlePlacementMediaPicked: (
    placement: ImagePlacement,
    url: string,
    asset?: MediaAsset,
  ) => MaybePromise
  handleMediaPicked: (url: string, asset?: MediaAsset) => MaybePromise
}

export function useAdSettingsMediaPickerRouting({
  activePlacement,
  mediaPickerForCarousel,
  mediaPickerForVideo,
  perPlacement,
  setMediaPickerOpen,
  setMediaPickerForVideo,
  setMediaPickerForCarousel,
  handleCarouselMediaPickedFromPicker,
  handleVideoMediaPickedFromPicker,
  handlePlacementMediaPicked,
  handleMediaPicked,
}: UseAdSettingsMediaPickerRoutingParams) {
  const handleOpenImageLibrary = useCallback(() => {
    setMediaPickerForCarousel(null)
    setMediaPickerForVideo(null)
    setMediaPickerOpen(true)
  }, [setMediaPickerForCarousel, setMediaPickerForVideo, setMediaPickerOpen])

  const handleMediaPickerClose = useCallback(() => {
    setMediaPickerOpen(false)
    setMediaPickerForVideo(null)
    setMediaPickerForCarousel(null)
  }, [setMediaPickerForCarousel, setMediaPickerForVideo, setMediaPickerOpen])

  const handleSelectMediaUrl = useCallback(
    (url: string) => {
      if (mediaPickerForCarousel !== null) {
        handleCarouselMediaPickedFromPicker(mediaPickerForCarousel, { image_url: url })
        return
      }
      if (mediaPickerForVideo !== null) {
        handleVideoMediaPickedFromPicker(mediaPickerForVideo, url)
        return
      }
      if (perPlacement) {
        void handlePlacementMediaPicked(activePlacement, url)
        return
      }
      void handleMediaPicked(url)
    },
    [
      activePlacement,
      handleCarouselMediaPickedFromPicker,
      handleMediaPicked,
      handlePlacementMediaPicked,
      handleVideoMediaPickedFromPicker,
      mediaPickerForCarousel,
      mediaPickerForVideo,
      perPlacement,
    ],
  )

  const handleSelectMediaAsset = useCallback(
    (asset: MediaAsset) => {
      const url = asset.public_url ?? ''
      if (mediaPickerForCarousel !== null) {
        handleCarouselMediaPickedFromPicker(mediaPickerForCarousel, {
          image_url: url,
          image_asset_id: asset.id,
        })
        return
      }
      if (mediaPickerForVideo !== null) {
        handleVideoMediaPickedFromPicker(mediaPickerForVideo, url)
        return
      }
      if (perPlacement) {
        void handlePlacementMediaPicked(activePlacement, url, asset)
        return
      }
      void handleMediaPicked(url, asset)
    },
    [
      activePlacement,
      handleCarouselMediaPickedFromPicker,
      handleMediaPicked,
      handlePlacementMediaPicked,
      handleVideoMediaPickedFromPicker,
      mediaPickerForCarousel,
      mediaPickerForVideo,
      perPlacement,
    ],
  )

  return {
    handleOpenImageLibrary,
    handleMediaPickerClose,
    handleSelectMediaUrl,
    handleSelectMediaAsset,
  }
}
