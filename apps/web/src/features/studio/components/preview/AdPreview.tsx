'use client'

import { AlertCircle, PanelRightClose, PanelRightOpen } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/navigation/tabs'
import { Tooltip } from '@/components/ui/tooltip'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import {
  AdPreviewPlacementPreview,
  PLACEMENT_OPTIONS,
  useAdPreviewController,
  type AdPageDisplay,
  type AdPlacement,
  type AdPlatform,
  type AdPreviewProps,
  type AdViewportSize,
} from './ad-preview'
import { FbIcon, IgIcon } from './ad-preview/ad-preview-platform-icons'

export type { AdPageDisplay, AdPlacement, AdPlatform, AdViewportSize }

export function AdPreview({
  adId,
  onAdUpdated,
  initialAd,
  singleImageForAllPlacements = true,
  settingsOpen,
  onToggleSettings,
  hideToolbar,
  platform: platformProp,
  onPlatformChange,
  placement: placementProp,
  onPlacementChange,
}: AdPreviewProps) {
  const {
    ad,
    pageDisplay,
    loading,
    error,
    platform,
    setPlatform,
    placement,
    setPlacement,
    isEditing,
    setIsEditing,
    handleFieldChange,
    handleImageDrop,
  } = useAdPreviewController({
    adId,
    initialAd,
    onAdUpdated,
    singleImageForAllPlacements,
    platform: platformProp,
    onPlatformChange,
    placement: placementProp,
    onPlacementChange,
  })

  if (loading)
    return (
      <div className="flex h-full items-center justify-center">
        <VibeyLoadingOrb size="sm" text="Loading ad..." />
      </div>
    )
  if (error || !ad)
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <AlertCircle className="text-muted-foreground/40 h-8 w-8" />
        <p className="text-muted-foreground text-sm">{error ?? 'Ad not found'}</p>
      </div>
    )

  return (
    <div className="bg-card flex h-full flex-col overflow-hidden rounded-tl-2xl">
      {!hideToolbar && (
        <div className="bg-card flex items-center px-4 py-2">
          {isEditing && (
            <span className="mr-3 shrink-0 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
              Edit Mode
            </span>
          )}
          <div className="flex flex-1 items-center justify-center gap-3 md:justify-end">
            <div className="flex items-center gap-1">
              {(['facebook', 'instagram'] as AdPlatform[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlatform(p)}
                  title={p}
                  className={`rounded-md p-1.5 transition-colors ${platform === p ? 'bg-primary/10 text-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
                >
                  {p === 'facebook' ? <FbIcon /> : <IgIcon />}
                </button>
              ))}
            </div>
            <Tabs value={placement} onValueChange={(v) => setPlacement(v as AdPlacement)}>
              <TabsList variant="liquid">
                {PLACEMENT_OPTIONS.map((opt) => (
                  <TabsTrigger key={opt.value} value={opt.value}>
                    {opt.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            {onToggleSettings && (
              <Tooltip label={settingsOpen ? 'Hide settings' : 'Show settings'} side="bottom">
                <button
                  type="button"
                  onClick={onToggleSettings}
                  className="text-muted-foreground hover:bg-secondary hover:text-foreground hidden rounded-md p-1.5 transition-colors md:flex"
                  aria-label={settingsOpen ? 'Hide settings' : 'Show settings'}
                >
                  {settingsOpen ? (
                    <PanelRightOpen className="h-4 w-4" />
                  ) : (
                    <PanelRightClose className="h-4 w-4" />
                  )}
                </button>
              </Tooltip>
            )}
          </div>
        </div>
      )}
      <div className="scrollbar-thin bg-card flex flex-1 items-start justify-center overflow-y-auto overflow-x-hidden p-4">
        <AdPreviewPlacementPreview
          ad={ad}
          pageDisplay={pageDisplay}
          platform={platform}
          placement={placement}
          onFieldChange={handleFieldChange}
          onEditingChange={setIsEditing}
          onImageDropped={handleImageDrop}
        />
      </div>
    </div>
  )
}
