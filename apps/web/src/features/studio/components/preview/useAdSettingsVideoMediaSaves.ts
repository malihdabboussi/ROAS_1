import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import type { Ad } from '../../types'
import type { VideoPickerTarget, VideoPlacement } from './AdVideoCreativeEditor'

type PlacementVideos = Record<string, { video_url?: string; from_library?: boolean }>

interface UseAdSettingsVideoMediaSavesParams {
  ad: Ad | null
  saveMetadata: (meta: Record<string, unknown>) => Promise<void>
  handleChange: (field: string, value: string | null) => void
  setAd: Dispatch<SetStateAction<Ad | null>>
  setMediaPickerOpen: Dispatch<SetStateAction<boolean>>
  setMediaPickerForCarousel: Dispatch<SetStateAction<number | null>>
  setMediaPickerForVideo: Dispatch<SetStateAction<VideoPickerTarget | null>>
  setVideoMenuOpen: Dispatch<SetStateAction<boolean>>
}

export function useAdSettingsVideoMediaSaves({
  ad,
  saveMetadata,
  handleChange,
  setAd,
  setMediaPickerOpen,
  setMediaPickerForCarousel,
  setMediaPickerForVideo,
  setVideoMenuOpen,
}: UseAdSettingsVideoMediaSavesParams) {
  const [perPlacementVideo, setPerPlacementVideo] = useState(false)
  const [activeVideoPlacement, setActiveVideoPlacement] = useState<VideoPlacement>('feed')

  useEffect(() => {
    const placementVideos = ad?.metadata?.placement_videos as PlacementVideos | undefined
    if (
      placementVideos &&
      typeof placementVideos === 'object' &&
      Object.keys(placementVideos).length > 0
    ) {
      setPerPlacementVideo(true)
    }
    if (ad?.ad_format !== 'SINGLE_VIDEO') setPerPlacementVideo(false)
  }, [ad?.ad_format, ad?.metadata])

  const handleVideoMediaPickedFromPicker = useCallback(
    (target: VideoPickerTarget, url: string) => {
      if (target === 'default') {
        handleChange('video_url', url)
        void saveMetadata({ ...(ad?.metadata || {}), video_from_library: true })
        setAd((previous) =>
          previous
            ? { ...previous, metadata: { ...previous.metadata, video_from_library: true } }
            : previous,
        )
        return
      }
      const previousVideos = (ad?.metadata?.placement_videos as PlacementVideos | undefined) ?? {}
      const nextVideos = {
        ...previousVideos,
        [target]: {
          ...previousVideos[target],
          video_url: url,
          from_library: true,
        },
      }
      void saveMetadata({ ...(ad?.metadata || {}), placement_videos: nextVideos })
      setAd((previous) =>
        previous
          ? { ...previous, metadata: { ...previous.metadata, placement_videos: nextVideos } }
          : previous,
      )
    },
    [ad?.metadata, handleChange, saveMetadata, setAd],
  )

  const handleToggleVideoPerPlacement = useCallback(
    (nextPerPlacement: boolean) => {
      setPerPlacementVideo(nextPerPlacement)
      if (!nextPerPlacement && ad) {
        const { placement_videos: _, ...rest } = (ad.metadata || {}) as Record<string, unknown>
        void saveMetadata(rest)
        setAd((prev) =>
          prev
            ? {
                ...prev,
                metadata: (() => {
                  const { placement_videos: __, ...remaining } = (prev.metadata || {}) as Record<
                    string,
                    unknown
                  >
                  return remaining
                })(),
              }
            : prev,
        )
      } else if (nextPerPlacement && ad?.video_url) {
        const fromLibrary = !!(ad.metadata?.video_from_library as boolean | undefined)
        const placementVideosInit = {
          feed: { video_url: ad.video_url, from_library: fromLibrary },
          story: { video_url: ad.video_url, from_library: fromLibrary },
          reels: { video_url: ad.video_url, from_library: fromLibrary },
        }
        void saveMetadata({
          ...(ad.metadata || {}),
          placement_videos: placementVideosInit,
        })
        setAd((prev) =>
          prev
            ? {
                ...prev,
                metadata: {
                  ...(prev.metadata || {}),
                  placement_videos: placementVideosInit,
                },
              }
            : prev,
        )
      }
    },
    [ad, saveMetadata, setAd],
  )

  const handleOpenVideoLibrary = useCallback(
    (target: VideoPickerTarget) => {
      setMediaPickerForCarousel(null)
      setMediaPickerForVideo(target)
      setMediaPickerOpen(true)
    },
    [setMediaPickerForCarousel, setMediaPickerForVideo, setMediaPickerOpen],
  )

  const handleOpenVideoLibraryFromMenu = useCallback(() => {
    setMediaPickerForVideo(perPlacementVideo ? activeVideoPlacement : 'default')
    setVideoMenuOpen(false)
    setMediaPickerOpen(true)
  }, [
    activeVideoPlacement,
    perPlacementVideo,
    setMediaPickerForVideo,
    setMediaPickerOpen,
    setVideoMenuOpen,
  ])

  const handleClearCurrentVideo = useCallback(() => {
    if (perPlacementVideo) {
      const placementVideos = (ad?.metadata?.placement_videos as PlacementVideos | undefined) ?? {}
      const next = {
        ...placementVideos,
        [activeVideoPlacement]: {
          ...placementVideos[activeVideoPlacement],
          video_url: '',
          from_library: false,
        },
      }
      void saveMetadata({
        ...(ad?.metadata || {}),
        placement_videos: next,
      })
      setAd((prev) =>
        prev
          ? {
              ...prev,
              metadata: { ...prev.metadata, placement_videos: next },
            }
          : prev,
      )
    } else {
      handleChange('video_url', null)
      void saveMetadata({
        ...(ad?.metadata || {}),
        video_from_library: false,
      })
      setAd((prev) =>
        prev
          ? {
              ...prev,
              metadata: {
                ...prev.metadata,
                video_from_library: false,
              },
            }
          : prev,
      )
    }
    setVideoMenuOpen(false)
  }, [
    activeVideoPlacement,
    ad?.metadata,
    handleChange,
    perPlacementVideo,
    saveMetadata,
    setAd,
    setVideoMenuOpen,
  ])

  const handlePasteVideoUrl = useCallback(
    (videoUrl: string | null) => {
      if (perPlacementVideo) {
        const placementVideos =
          (ad?.metadata?.placement_videos as PlacementVideos | undefined) ?? {}
        const next = {
          ...placementVideos,
          [activeVideoPlacement]: {
            ...placementVideos[activeVideoPlacement],
            video_url: videoUrl ?? '',
            from_library: false,
          },
        }
        void saveMetadata({
          ...(ad?.metadata || {}),
          placement_videos: next,
        })
        setAd((prev) =>
          prev
            ? {
                ...prev,
                metadata: { ...prev.metadata, placement_videos: next },
              }
            : prev,
        )
      } else {
        handleChange('video_url', videoUrl)
        void saveMetadata({
          ...(ad?.metadata || {}),
          video_from_library: false,
        })
        setAd((prev) =>
          prev
            ? {
                ...prev,
                metadata: { ...prev.metadata, video_from_library: false },
              }
            : prev,
        )
      }
    },
    [activeVideoPlacement, ad?.metadata, handleChange, perPlacementVideo, saveMetadata, setAd],
  )

  return {
    perPlacementVideo,
    activeVideoPlacement,
    setActiveVideoPlacement,
    handleVideoMediaPickedFromPicker,
    handleToggleVideoPerPlacement,
    handleOpenVideoLibrary,
    handleOpenVideoLibraryFromMenu,
    handleClearCurrentVideo,
    handlePasteVideoUrl,
  }
}
