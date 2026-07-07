import type { Ad } from '../../../types'

export type AdViewportSize = 'desktop' | 'tablet' | 'mobile'
export type AdPlatform = 'facebook' | 'instagram'
export type AdPlacement = 'feed' | 'story' | 'reels'

export const PLACEMENT_OPTIONS: { value: AdPlacement; label: string }[] = [
  { value: 'feed', label: 'Feed' },
  { value: 'story', label: 'Story' },
  { value: 'reels', label: 'Reels' },
]

export interface AdPreviewProps {
  adId: string
  viewport?: AdViewportSize
  onViewportChange?: (v: AdViewportSize) => void
  onAdUpdated?: (ad: Ad) => void
  initialAd?: Ad
  /** When true, dropping an image updates the single image for all placements; when false, only the dropped placement. */
  singleImageForAllPlacements?: boolean
  settingsOpen?: boolean
  onToggleSettings?: () => void
  hideToolbar?: boolean
  /** Controlled platform (e.g. lifted into the ad full-mode top toolbar). */
  platform?: AdPlatform
  onPlatformChange?: (p: AdPlatform) => void
  /** Controlled placement (e.g. lifted into the ad full-mode top toolbar). */
  placement?: AdPlacement
  onPlacementChange?: (p: AdPlacement) => void
}

export type AdFieldChangeHandler = (field: string, value: string) => void
export type AdEditingChangeHandler = (editing: boolean) => void

export type AdPageDisplay = { fbName: string; igName: string; pictureUrl: string | null }

export type AdFormatPreviewSharedProps = {
  ad: Ad
  pageDisplay: AdPageDisplay
  onFieldChange?: AdFieldChangeHandler
  onEditingChange?: AdEditingChangeHandler
  onImageDropped?: (file: File, placement: string) => void
}
