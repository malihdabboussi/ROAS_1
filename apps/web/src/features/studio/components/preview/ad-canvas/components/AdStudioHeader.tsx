'use client'

import type { ReactNode } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/navigation/tabs'
import {
  FbIcon,
  IgIcon,
} from '@/features/studio/components/preview/ad-preview/ad-preview-platform-icons'
import {
  PLACEMENT_OPTIONS as AD_PLACEMENT_OPTIONS,
  type AdPlacement,
  type AdPlatform,
} from '@/features/studio/components/preview/ad-preview/ad-preview.types'
import { AnimatedArtifactTitle } from '@/features/studio/components/preview/artifacts/preview/animated-artifact-title'

interface AdStudioHeaderProps {
  adTitle?: string
  platform: AdPlatform
  onPlatformChange: (platform: AdPlatform) => void
  placement: AdPlacement
  onPlacementChange: (placement: AdPlacement) => void
  onPublishHostEl?: (el: HTMLDivElement | null) => void
  onRefreshHostEl?: (el: HTMLDivElement | null) => void
  headerLeading?: ReactNode
  headerTrailing?: ReactNode
}

export function AdStudioHeader({
  adTitle,
  platform,
  onPlatformChange,
  placement,
  onPlacementChange,
  onPublishHostEl,
  onRefreshHostEl,
  headerLeading,
  headerTrailing,
}: AdStudioHeaderProps) {
  return (
    <div className="border-border gap-spacing-2 px-spacing-3 py-spacing-2 flex shrink-0 items-center justify-between border-b">
      <div className="gap-spacing-2 flex min-w-0 flex-1 items-center">
        {headerLeading}
        {adTitle ? (
          <AnimatedArtifactTitle text={adTitle} className="body-3 text-foreground font-medium" />
        ) : null}
      </div>
      <div className="gap-spacing-2 flex shrink-0 items-center">
        <div className="gap-spacing-1 hidden items-center md:flex">
          {(['facebook', 'instagram'] as AdPlatform[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPlatformChange(p)}
              title={p === 'facebook' ? 'Facebook' : 'Instagram'}
              className={`rounded-spacing-2 p-spacing-1 transition-colors ${platform === p ? 'bg-primary/10 text-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
              aria-label={p === 'facebook' ? 'Facebook' : 'Instagram'}
              aria-pressed={platform === p}
            >
              {p === 'facebook' ? <FbIcon className="icon-sm" /> : <IgIcon className="icon-sm" />}
            </button>
          ))}
        </div>
        <Tabs value={placement} onValueChange={(v) => onPlacementChange(v as AdPlacement)}>
          <TabsList variant="liquid">
            {AD_PLACEMENT_OPTIONS.map((opt) => (
              <TabsTrigger key={opt.value} value={opt.value} className="px-spacing-3">
                {opt.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {onRefreshHostEl ? <div ref={onRefreshHostEl} className="flex items-center" /> : null}
        {headerTrailing}
        {onPublishHostEl ? (
          <>
            <div
              className="border-l-glass mx-spacing-1 h-spacing-4 w-0 shrink-0 self-center"
              aria-hidden
            />
            <div ref={onPublishHostEl} className="flex items-center" />
          </>
        ) : null}
      </div>
    </div>
  )
}
