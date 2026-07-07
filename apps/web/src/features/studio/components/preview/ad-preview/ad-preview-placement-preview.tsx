'use client'

import type { Ad } from '../../../types'
import { AdPreviewFbFeed } from './ad-preview-fb-feed'
import { AdPreviewFbReels } from './ad-preview-fb-reels'
import { AdPreviewFbStory } from './ad-preview-fb-story'
import { AdPreviewIgFeed } from './ad-preview-ig-feed'
import { AdPreviewIgReels } from './ad-preview-ig-reels'
import { AdPreviewIgStory } from './ad-preview-ig-story'
import type {
  AdEditingChangeHandler,
  AdFieldChangeHandler,
  AdPageDisplay,
  AdPlacement,
  AdPlatform,
} from './ad-preview.types'

export function AdPreviewPlacementPreview({
  ad,
  pageDisplay,
  platform,
  placement,
  onFieldChange,
  onEditingChange,
  onImageDropped,
}: {
  ad: Ad
  pageDisplay: AdPageDisplay
  platform: AdPlatform
  placement: AdPlacement
  onFieldChange?: AdFieldChangeHandler
  onEditingChange?: AdEditingChangeHandler
  onImageDropped?: (file: File, placement: string) => void
}) {
  const is9x16 = placement === 'story' || placement === 'reels'
  const wrapClass = is9x16 ? 'w-full max-w-[412px]' : 'w-full max-w-[500px]'

  const Component = (() => {
    if (placement === 'story') return platform === 'instagram' ? AdPreviewIgStory : AdPreviewFbStory
    if (placement === 'reels') return platform === 'instagram' ? AdPreviewIgReels : AdPreviewFbReels
    return platform === 'instagram' ? AdPreviewIgFeed : AdPreviewFbFeed
  })()

  return (
    <div className={wrapClass}>
      <Component
        ad={ad}
        pageDisplay={pageDisplay}
        onFieldChange={onFieldChange}
        onEditingChange={onEditingChange}
        onImageDropped={onImageDropped}
      />
    </div>
  )
}
