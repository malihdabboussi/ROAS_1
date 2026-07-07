import {
  useCallback,
  useRef,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react'
import { updateAd } from '../../services/artifact-preview.service'
import type { Ad, CarouselCard } from '../../types'
import type { VideoPickerTarget } from './AdVideoCreativeEditor'

interface UseAdSettingsCarouselCardsParams {
  ad: Ad | null
  adId: string
  adRef: MutableRefObject<Ad | null>
  saveVersion: MutableRefObject<number>
  setAd: Dispatch<SetStateAction<Ad | null>>
  setMediaPickerOpen: Dispatch<SetStateAction<boolean>>
  setMediaPickerForVideo: Dispatch<SetStateAction<VideoPickerTarget | null>>
  setMediaPickerForCarousel: Dispatch<SetStateAction<number | null>>
  onAdUpdated?: (ad: Ad) => void
  mergeAdResponse: (prev: Ad | null, updated: Ad) => Ad
}

export function useAdSettingsCarouselCards({
  ad,
  adId,
  adRef,
  saveVersion,
  setAd,
  setMediaPickerOpen,
  setMediaPickerForVideo,
  setMediaPickerForCarousel,
  onAdUpdated,
  mergeAdResponse,
}: UseAdSettingsCarouselCardsParams) {
  const carouselCardsRef = useRef<CarouselCard[] | null>(null)

  const updateCarouselCard = useCallback(
    (idx: number, patch: Partial<CarouselCard>) => {
      const cards = [...(adRef.current?.carousel_cards ?? [])]
      cards[idx] = { image_url: '', ...cards[idx], ...patch }
      carouselCardsRef.current = cards
      setAd((prev) => (prev ? { ...prev, carousel_cards: cards } : prev))
    },
    [adRef, setAd],
  )

  const saveCarouselCards = useCallback(() => {
    const v = ++saveVersion.current
    const latest = carouselCardsRef.current ?? adRef.current?.carousel_cards
    void updateAd(adId, { carousel_cards: latest }).then((updated) => {
      if (saveVersion.current === v)
        setAd((prev) => {
          const next = mergeAdResponse(prev, updated)
          onAdUpdated?.(next)
          return next
        })
      else onAdUpdated?.(updated)
    })
  }, [adId, adRef, mergeAdResponse, onAdUpdated, saveVersion, setAd])

  const handleAddCarouselCard = useCallback(() => {
    const v = ++saveVersion.current
    const cards: CarouselCard[] = [...(adRef.current?.carousel_cards ?? [])]
    cards.push({
      image_url: '',
      headline: '',
      description: '',
      link: '',
    })
    carouselCardsRef.current = cards
    setAd((prev) => (prev ? { ...prev, carousel_cards: cards } : prev))
    void updateAd(adId, { carousel_cards: cards }).then((updated) => {
      if (saveVersion.current === v)
        setAd((prev) => {
          const next = mergeAdResponse(prev, updated)
          onAdUpdated?.(next)
          return next
        })
      else onAdUpdated?.(updated)
    })
  }, [adId, adRef, mergeAdResponse, onAdUpdated, saveVersion, setAd])

  const handleRemoveCarouselCard = useCallback(
    (idx: number) => {
      const v = ++saveVersion.current
      const cards = [...(adRef.current?.carousel_cards ?? [])].filter((_, i) => i !== idx)
      carouselCardsRef.current = cards
      setAd((prev) => (prev ? { ...prev, carousel_cards: cards } : prev))
      void updateAd(adId, { carousel_cards: cards }).then((updated) => {
        if (saveVersion.current === v)
          setAd((prev) => {
            const next = mergeAdResponse(prev, updated)
            onAdUpdated?.(next)
            return next
          })
        else onAdUpdated?.(updated)
      })
    },
    [adId, adRef, mergeAdResponse, onAdUpdated, saveVersion, setAd],
  )

  const handleOpenCarouselLibrary = useCallback(
    (idx: number) => {
      setMediaPickerForCarousel(idx)
      setMediaPickerForVideo(null)
      setMediaPickerOpen(true)
    },
    [setMediaPickerForCarousel, setMediaPickerForVideo, setMediaPickerOpen],
  )

  const handleCarouselMediaPickedFromPicker = useCallback(
    (cardIndex: number, patch: Partial<CarouselCard>) => {
      const cards = [...(ad?.carousel_cards ?? [])]
      if (cards[cardIndex]) {
        cards[cardIndex] = { ...cards[cardIndex], ...patch }
        carouselCardsRef.current = cards
        setAd((previous) => (previous ? { ...previous, carousel_cards: cards } : previous))
        void updateAd(adId, { carousel_cards: cards }).then((updated) => {
          setAd((previous) => mergeAdResponse(previous, updated))
          onAdUpdated?.(updated)
        })
      }
      setMediaPickerForCarousel(null)
    },
    [ad?.carousel_cards, adId, mergeAdResponse, onAdUpdated, setAd, setMediaPickerForCarousel],
  )

  return {
    updateCarouselCard,
    saveCarouselCards,
    handleAddCarouselCard,
    handleRemoveCarouselCard,
    handleOpenCarouselLibrary,
    handleCarouselMediaPickedFromPicker,
  }
}
