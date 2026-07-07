'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { Fullscreen, MoreVertical, Settings } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/navigation/tabs'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { AdStudioLayout } from '@/features/studio/components/preview/ad-canvas'
import {
  FbIcon,
  IgIcon,
} from '@/features/studio/components/preview/ad-preview/ad-preview-platform-icons'
import {
  PLACEMENT_OPTIONS as AD_PLACEMENT_OPTIONS,
  type AdPlacement,
  type AdPlatform,
} from '@/features/studio/components/preview/ad-preview/ad-preview.types'
import { AdPreview } from '@/features/studio/components/preview/AdPreview'
import { AdSettingsPanel } from '@/features/studio/components/preview/AdSettingsPanel'
import { AdUngroupedAssignPanel } from '@/features/studio/components/preview/AdUngroupedAssignPanel'
import {
  fetchAd,
  fetchCampaignAdCampaigns,
} from '@/features/studio/services/artifact-preview.service'
import type { Ad, AdCampaign } from '@/features/studio/types'
import { formatRelativeArtifactDate } from '@/lib/artifacts'
import type { ArtifactPreviewResource } from '@/lib/artifacts/artifact-preview-types'
import type { ViewportSize } from '../../FunnelToolbar'
import { AnimatedArtifactTitle } from './animated-artifact-title'

const MIN_AD_PREVIEW_WIDTH_PX = 320
const AD_SETTINGS_DESKTOP_WIDTH_PX = 420

export interface ArtifactPreviewAdMenuProps {
  ad: {
    id: string
    headline: string
    primary_text: string
    campaign_id: string | null
    ad_set_id: string | null
  }
  anchorRef: RefObject<HTMLButtonElement | null>
  onClose: () => void
  onChanged?: () => void
  onOpenFullView?: () => void
  onDeleted?: () => void
}

interface ArtifactPreviewAdPanelProps {
  selectedResource: Extract<ArtifactPreviewResource, { type: 'ad' }>
  adViewport: ViewportSize
  setAdViewport: React.Dispatch<React.SetStateAction<ViewportSize>>
  onAdUpdated: (updatedAd: Ad) => void
  onResourceDeleted?: () => void
  renderAdMenu?: (props: ArtifactPreviewAdMenuProps) => ReactNode
  slideOverOnOpenFullView?: () => void
  slideOverTrailingWithDeepExtras: ReactNode
  spacesDeepBackButton: ReactNode
  isDeepWorkFull: boolean
}

export function ArtifactPreviewAdPanel({
  selectedResource,
  adViewport,
  setAdViewport,
  onAdUpdated,
  onResourceDeleted,
  renderAdMenu,
  slideOverOnOpenFullView,
  slideOverTrailingWithDeepExtras,
  spacesDeepBackButton,
  isDeepWorkFull,
}: ArtifactPreviewAdPanelProps) {
  const [adTab, setAdTab] = useState<string>('preview')
  const [preloadedAd, setPreloadedAd] = useState<Ad | null>(null)
  const [adLoading, setAdLoading] = useState(false)
  const [adPerPlacementMode, setAdPerPlacementMode] = useState(false)
  const [adSettingsOpen, setAdSettingsOpen] = useState(false)
  const adMenuButtonRef = useRef<HTMLButtonElement>(null)
  const [adPreviewMenuOpen, setAdPreviewMenuOpen] = useState(false)
  const [adFullPlatform, setAdFullPlatform] = useState<AdPlatform>('facebook')
  const [adFullPlacement, setAdFullPlacement] = useState<AdPlacement>('feed')
  const [adFullPublishHostEl, setAdFullPublishHostEl] = useState<HTMLDivElement | null>(null)
  const [adFullRefreshHostEl, setAdFullRefreshHostEl] = useState<HTMLDivElement | null>(null)
  const adDesktopSplitRef = useRef<HTMLDivElement>(null)
  const [adDesktopSplitWidth, setAdDesktopSplitWidth] = useState(0)
  const [ungroupedAdCampaigns, setUngroupedAdCampaigns] = useState<AdCampaign[]>([])

  const isAdCreativeCanvas = isDeepWorkFull && Boolean(preloadedAd?.ad_set_id)
  const isAdDeepWorkUngrouped = isDeepWorkFull && Boolean(preloadedAd) && !preloadedAd?.ad_set_id
  const adSettingsPanelOpen = isDeepWorkFull || adSettingsOpen

  useEffect(() => {
    if (!preloadedAd) {
      setAdDesktopSplitWidth(0)
      return
    }
    const el = adDesktopSplitRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setAdDesktopSplitWidth(entry.contentRect.width)
    })
    ro.observe(el)
    setAdDesktopSplitWidth(el.getBoundingClientRect().width)
    return () => ro.disconnect()
  }, [preloadedAd, selectedResource.id])

  useEffect(() => {
    if (!isAdDeepWorkUngrouped || !preloadedAd?.campaign_id) {
      setUngroupedAdCampaigns([])
      return
    }
    let cancelled = false
    fetchCampaignAdCampaigns(preloadedAd.campaign_id)
      .then((campaigns) => {
        if (!cancelled) setUngroupedAdCampaigns(campaigns)
      })
      .catch(() => {
        if (!cancelled) setUngroupedAdCampaigns([])
      })
    return () => {
      cancelled = true
    }
  }, [isAdDeepWorkUngrouped, preloadedAd?.campaign_id])

  const hideAdPreviewForWidth =
    adSettingsPanelOpen &&
    adDesktopSplitWidth > 0 &&
    adDesktopSplitWidth - AD_SETTINGS_DESKTOP_WIDTH_PX < MIN_AD_PREVIEW_WIDTH_PX

  useEffect(() => {
    let cancelled = false
    setAdLoading(true)
    setPreloadedAd(null)
    fetchAd(selectedResource.id)
      .then((ad) => {
        if (!cancelled) {
          setPreloadedAd(ad)
          setAdPerPlacementMode(Object.keys(ad?.placement_images ?? {}).length > 0)
        }
      })
      .catch(() => {
        if (!cancelled) setPreloadedAd(null)
      })
      .finally(() => {
        if (!cancelled) setAdLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedResource.id])

  useEffect(() => {
    setAdPreviewMenuOpen(false)
    setAdTab('preview')
  }, [selectedResource.id])

  useEffect(() => {
    const handler = () => setAdTab((prev) => (prev === 'settings' ? 'preview' : 'settings'))
    window.addEventListener('mobile-artifact-settings', handler)
    return () => window.removeEventListener('mobile-artifact-settings', handler)
  }, [])

  const handleAdPerPlacementChange = useCallback((perPlacement: boolean) => {
    setAdPerPlacementMode(perPlacement)
  }, [])

  const handleAdUpdated = useCallback(
    (updatedAd: Ad) => {
      setPreloadedAd(updatedAd)
      setAdPerPlacementMode(Object.keys(updatedAd?.placement_images ?? {}).length > 0)
      onAdUpdated(updatedAd)
    },
    [onAdUpdated],
  )

  return (
    <>
      <div className="flex h-full flex-col overflow-hidden">
        {!isAdCreativeCanvas ? (
          <div className="border-border px-spacing-3 py-spacing-2 gap-spacing-2 flex items-center justify-between border-b">
            <div className="gap-spacing-2 flex min-w-0 flex-1 items-center">
              {spacesDeepBackButton}
              <div className="min-w-0">
                <AnimatedArtifactTitle
                  text={selectedResource.name || 'Untitled Ad'}
                  className="body-3 text-foreground font-medium"
                />
                {!isDeepWorkFull ? (
                  <p className="typo-caption text-muted-foreground truncate">
                    {preloadedAd
                      ? `${preloadedAd.platform} · ${preloadedAd.placement} · ${formatRelativeArtifactDate(preloadedAd.updated_at)}`
                      : '\u00a0'}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="gap-spacing-1 flex shrink-0 items-center">
              {isDeepWorkFull && preloadedAd && !isAdCreativeCanvas ? (
                <>
                  <div className="hidden items-center gap-0.5 md:flex">
                    {(['facebook', 'instagram'] as AdPlatform[]).map((platform) => (
                      <button
                        key={platform}
                        type="button"
                        onClick={() => setAdFullPlatform(platform)}
                        title={platform === 'facebook' ? 'Facebook' : 'Instagram'}
                        className={`rounded-spacing-2 p-spacing-1 transition-colors ${adFullPlatform === platform ? 'bg-primary/10 text-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
                        aria-label={platform === 'facebook' ? 'Facebook' : 'Instagram'}
                        aria-pressed={adFullPlatform === platform}
                      >
                        {platform === 'facebook' ? (
                          <FbIcon className="icon-sm" />
                        ) : (
                          <IgIcon className="icon-sm" />
                        )}
                      </button>
                    ))}
                  </div>
                  <Tabs value={adFullPlacement} onValueChange={(v) => setAdFullPlacement(v as AdPlacement)}>
                    <TabsList variant="liquid">
                      {AD_PLACEMENT_OPTIONS.map((opt) => (
                        <TabsTrigger key={opt.value} value={opt.value} className="px-spacing-3">
                          {opt.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                  <div ref={(el) => setAdFullRefreshHostEl(el)} className="flex items-center" />
                  {slideOverTrailingWithDeepExtras}
                  <div className="border-l-glass mx-1 h-4 w-0 shrink-0 self-center" aria-hidden />
                </>
              ) : null}
              {!isDeepWorkFull ? slideOverTrailingWithDeepExtras : null}
              {preloadedAd && renderAdMenu ? (
                <button
                  ref={adMenuButtonRef}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    setAdPreviewMenuOpen((open) => !open)
                  }}
                  className="rounded-spacing-2 border border-border p-spacing-1 text-muted-foreground transition-colors hover:bg-hover-subtle hover:text-foreground"
                  aria-label="Ad options"
                  aria-expanded={adPreviewMenuOpen}
                  aria-haspopup="menu"
                >
                  <MoreVertical className="icon-sm" />
                </button>
              ) : null}
              {hideAdPreviewForWidth && !isDeepWorkFull ? (
                <button
                  type="button"
                  onClick={() => setAdSettingsOpen(false)}
                  className="chip-glass-neutral h-spacing-8 w-spacing-8 rounded-spacing-2 hidden items-center justify-center transition-colors md:inline-flex"
                  aria-label="Show preview"
                >
                  <Fullscreen className="icon-sm" />
                </button>
              ) : null}
              {!isAdCreativeCanvas ? (
                <div className="md:hidden">
                  <Tabs value={adTab} onValueChange={setAdTab}>
                    <TabsList variant="liquid">
                      <TabsTrigger value="preview" className="px-spacing-4">
                        Preview
                      </TabsTrigger>
                      <TabsTrigger value="settings" className="gap-spacing-1 px-spacing-4">
                        <Settings className="icon-sm" />
                        Settings
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              ) : null}
              {isDeepWorkFull && preloadedAd && !isAdCreativeCanvas ? (
                <div ref={(el) => setAdFullPublishHostEl(el)} className="flex items-center" />
              ) : null}
            </div>
          </div>
        ) : null}

        <div key={selectedResource.id} className="flex flex-1 flex-col overflow-hidden">
          {adLoading || !preloadedAd ? (
            <div className="flex flex-1 items-center justify-center">
              <VibeyLoadingOrb size="sm" text="Loading ad..." />
            </div>
          ) : isAdDeepWorkUngrouped ? (
            <div className="p-spacing-6 flex min-h-0 flex-1 flex-col overflow-y-auto">
              <div className="gap-spacing-4 mx-auto flex w-full max-w-md flex-col">
                <div>
                  <p className="body-3 text-foreground font-medium">Assign to an ad set</p>
                  <p className="typo-caption text-muted-foreground">
                    The creative canvas opens after this ad belongs to an ad set.
                  </p>
                </div>
                <AdUngroupedAssignPanel
                  ad={preloadedAd}
                  adCampaigns={ungroupedAdCampaigns}
                  onAssigned={async () => {
                    const next = await fetchAd(preloadedAd.id)
                    handleAdUpdated(next)
                  }}
                />
              </div>
            </div>
          ) : isAdCreativeCanvas ? (
            <AdStudioLayout
              adSetId={preloadedAd.ad_set_id!}
              campaignId={preloadedAd.campaign_id}
              adId={selectedResource.id}
              adTitle={selectedResource.name || 'Untitled Ad'}
              initialAd={preloadedAd}
              onAdUpdated={handleAdUpdated}
              platform={adFullPlatform}
              onPlatformChange={setAdFullPlatform}
              placement={adFullPlacement}
              onPlacementChange={setAdFullPlacement}
              publishHostEl={adFullPublishHostEl}
              refreshHostEl={adFullRefreshHostEl}
              onPublishHostEl={setAdFullPublishHostEl}
              onRefreshHostEl={setAdFullRefreshHostEl}
              headerLeading={spacesDeepBackButton}
              headerTrailing={slideOverTrailingWithDeepExtras}
            />
          ) : (
            <>
              <div className="flex flex-1 overflow-hidden md:hidden">
                {adTab === 'preview' ? (
                  <AdPreview
                    adId={selectedResource.id}
                    viewport={adViewport}
                    onViewportChange={setAdViewport}
                    onAdUpdated={handleAdUpdated}
                    initialAd={preloadedAd}
                    singleImageForAllPlacements={!adPerPlacementMode}
                  />
                ) : (
                  <div className="flex-1 overflow-hidden">
                    <AdSettingsPanel
                      adId={selectedResource.id}
                      onAdUpdated={handleAdUpdated}
                      initialAd={preloadedAd}
                      onPerPlacementChange={handleAdPerPlacementChange}
                      onCollapseSettings={() => setAdTab('preview')}
                    />
                  </div>
                )}
              </div>

              <div ref={adDesktopSplitRef} className="hidden flex-1 overflow-hidden md:flex">
                <div className="min-w-0 flex-1 overflow-hidden">
                  <AdPreview
                    adId={selectedResource.id}
                    viewport={adViewport}
                    onViewportChange={setAdViewport}
                    onAdUpdated={handleAdUpdated}
                    initialAd={preloadedAd}
                    singleImageForAllPlacements={!adPerPlacementMode}
                    settingsOpen={adSettingsPanelOpen}
                    onToggleSettings={() => setAdSettingsOpen((prev) => !prev)}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      {adPreviewMenuOpen && preloadedAd && renderAdMenu
        ? renderAdMenu({
            ad: {
              id: preloadedAd.id,
              headline: preloadedAd.headline ?? '',
              primary_text: preloadedAd.primary_text ?? '',
              campaign_id: preloadedAd.campaign_id ?? null,
              ad_set_id: preloadedAd.ad_set_id ?? null,
            },
            anchorRef: adMenuButtonRef,
            onClose: () => setAdPreviewMenuOpen(false),
            onChanged: async () => {
              const next = await fetchAd(preloadedAd.id)
              handleAdUpdated(next)
            },
            onOpenFullView: slideOverOnOpenFullView
              ? () => {
                  setAdPreviewMenuOpen(false)
                  slideOverOnOpenFullView()
                }
              : undefined,
            onDeleted: onResourceDeleted,
          })
        : null}
    </>
  )
}
