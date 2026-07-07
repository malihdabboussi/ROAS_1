import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { VideoPickerTarget } from './AdVideoCreativeEditor'

const DROPDOWN_WIDTH = 176

type MenuPosition = {
  top: number
  left: number
}

function getDropdownPosition(anchor: HTMLButtonElement): MenuPosition {
  const rect = anchor.getBoundingClientRect()
  return {
    top: rect.bottom + 4,
    left: Math.min(rect.right, window.innerWidth - DROPDOWN_WIDTH - 8),
  }
}

export function useAdSettingsCreativeMenuControls() {
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false)
  const [mediaPickerForVideo, setMediaPickerForVideo] = useState<VideoPickerTarget | null>(null)
  const [mediaPickerForCarousel, setMediaPickerForCarousel] = useState<number | null>(null)
  const [carouselCardMenuOpen, setCarouselCardMenuOpen] = useState<number | null>(null)
  const [carouselCardMenuPos, setCarouselCardMenuPos] = useState<MenuPosition>({ top: 0, left: 0 })
  const carouselCardMenuRef = useRef<HTMLButtonElement>(null)
  const [videoMenuOpen, setVideoMenuOpen] = useState(false)
  const [videoMenuPos, setVideoMenuPos] = useState<MenuPosition>({ top: 0, left: 0 })
  const videoMenuRef = useRef<HTMLButtonElement>(null)
  const [imageMenuOpen, setImageMenuOpen] = useState(false)
  const [imageMenuPos, setImageMenuPos] = useState<MenuPosition>({ top: 0, left: 0 })
  const imageMenuTriggerRef = useRef<HTMLButtonElement>(null)

  const updateImageMenuPos = useCallback(() => {
    if (!imageMenuTriggerRef.current) return
    setImageMenuPos(getDropdownPosition(imageMenuTriggerRef.current))
  }, [])

  useLayoutEffect(() => {
    if (!imageMenuOpen) return
    updateImageMenuPos()
  }, [imageMenuOpen, updateImageMenuPos])

  useEffect(() => {
    if (!imageMenuOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (
        !target.closest('[data-image-menu-dropdown]') &&
        !imageMenuTriggerRef.current?.contains(target)
      ) {
        setImageMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [imageMenuOpen])

  useEffect(() => {
    if (!imageMenuOpen) return
    window.addEventListener('scroll', updateImageMenuPos, { passive: true })
    window.addEventListener('resize', updateImageMenuPos)
    return () => {
      window.removeEventListener('scroll', updateImageMenuPos)
      window.removeEventListener('resize', updateImageMenuPos)
    }
  }, [imageMenuOpen, updateImageMenuPos])

  useLayoutEffect(() => {
    if (carouselCardMenuOpen === null || !carouselCardMenuRef.current) return
    setCarouselCardMenuPos(getDropdownPosition(carouselCardMenuRef.current))
  }, [carouselCardMenuOpen])

  useEffect(() => {
    if (carouselCardMenuOpen === null) return
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (
        !target.closest('[data-carousel-card-menu-dropdown]') &&
        !carouselCardMenuRef.current?.contains(target)
      ) {
        setCarouselCardMenuOpen(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [carouselCardMenuOpen])

  useLayoutEffect(() => {
    if (!videoMenuOpen || !videoMenuRef.current) return
    setVideoMenuPos(getDropdownPosition(videoMenuRef.current))
  }, [videoMenuOpen])

  useEffect(() => {
    if (!videoMenuOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (
        !target.closest('[data-video-menu-dropdown]') &&
        !videoMenuRef.current?.contains(target)
      ) {
        setVideoMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [videoMenuOpen])

  return {
    mediaPickerOpen,
    setMediaPickerOpen,
    mediaPickerForVideo,
    setMediaPickerForVideo,
    mediaPickerForCarousel,
    setMediaPickerForCarousel,
    carouselCardMenuOpen,
    setCarouselCardMenuOpen,
    carouselCardMenuPos,
    carouselCardMenuRef,
    videoMenuOpen,
    setVideoMenuOpen,
    videoMenuPos,
    videoMenuRef,
    imageMenuOpen,
    setImageMenuOpen,
    imageMenuPos,
    imageMenuTriggerRef,
  }
}
