'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { getAdsResearchConfig } from '../../lib/ads-research-group-by'
import {
  deleteSavedAdSearch,
  listSavedAdSearches,
  updateSavedAdSearch,
  type AdBreakdown,
  type AdDetails,
  type AdSearchResultItem,
  type AdsResearchPlatform,
  type SavedAdSearchSummary,
} from '../../services/ads-research.service'
import { useSpacesStore } from '../../store/use-spaces-store'
import type { SpaceItem } from '../../types'
import type { ViewDef } from '../../types/space-schema'
import { RESEARCH_SIDEBAR_WIDTH_PX } from '../social-research/research-sidebar.utils'
import { AdAnalysisPanel } from './AdAnalysisPanel'
import { AdResearchEmptyMockup } from './AdResearchEmptyMockup'
import { AdResultsBody } from './AdResultsBody'
import { AdSearchPanel } from './AdSearchPanel'
import { AdsResearchSidebar } from './AdsResearchSidebar'

interface AdsResearchViewProps {
  view: ViewDef
  items: SpaceItem[]
  spaceId: string
}

type AdsResearchNav =
  | { section: 'search'; platform: AdsResearchPlatform; searchId: string | null; isNew: boolean }
  | { section: 'saved_ads' }

/** Maps a bookmarked space item back to the normalized ad shape for the card. */
function spaceItemToAdResult(item: SpaceItem): AdSearchResultItem | null {
  const cd = (item.custom_data ?? {}) as Record<string, unknown>
  const adId = typeof cd.ad_id === 'string' ? cd.ad_id : null
  if (!adId) return null
  const platform = cd._platform
  const str = (v: unknown) => (typeof v === 'string' && v !== '' ? v : null)
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
  return {
    ad_id: adId,
    platform:
      platform === 'meta' || platform === 'tiktok' || platform === 'google' ? platform : 'meta',
    advertiser_name: str(cd.advertiser_name),
    advertiser_id: str(cd.advertiser_id),
    format:
      cd.format === 'video' ||
      cd.format === 'image' ||
      cd.format === 'carousel' ||
      cd.format === 'text'
        ? cd.format
        : 'unknown',
    creative_text: str(cd.creative_text),
    image_url: str(cd.image_url),
    video_url: str(cd.video_url),
    landing_url: str(cd.landing_url),
    first_shown: str(cd.first_shown),
    last_shown: str(cd.last_shown),
    days_running: num(cd.days_running),
    reach_estimate: str(cd.reach_estimate),
    is_active: typeof cd.is_active === 'boolean' ? cd.is_active : null,
    details_link: str(cd.details_link),
    details_token: str(cd.details_token),
    variant_count: num(cd.variant_count),
    details:
      cd.ad_details && typeof cd.ad_details === 'object' && !Array.isArray(cd.ad_details)
        ? (cd.ad_details as AdDetails)
        : null,
    transcript: str(cd.transcript),
    breakdown:
      cd.ad_breakdown && typeof cd.ad_breakdown === 'object' && !Array.isArray(cd.ad_breakdown)
        ? (cd.ad_breakdown as AdBreakdown)
        : null,
  }
}

export function AdsResearchView({ view, items, spaceId }: AdsResearchViewProps) {
  const refresh = useSpacesStore((s) => s.refresh)
  const adsConfig = getAdsResearchConfig(view)
  const [nav, setNav] = useState<AdsResearchNav>({
    section: 'search',
    platform: 'meta',
    searchId: null,
    isNew: true,
  })
  const [savedSearches, setSavedSearches] = useState<SavedAdSearchSummary[]>([])
  const [searchLoadingId, setSearchLoadingId] = useState<string | null>(null)
  // Remounts the panel so a fresh draft never inherits prior panel state.
  const [draftSessionKey, setDraftSessionKey] = useState(0)
  const [selectedSavedAd, setSelectedSavedAd] = useState<{
    item: SpaceItem
    ad: AdSearchResultItem
  } | null>(null)

  const reloadSavedSearches = useCallback(() => {
    void listSavedAdSearches(spaceId)
      .then(setSavedSearches)
      .catch(() => undefined)
  }, [spaceId])

  useEffect(() => {
    reloadSavedSearches()
  }, [reloadSavedSearches])

  const savedAds = useMemo(
    () =>
      items
        .filter(
          (item) =>
            (item.custom_data as Record<string, unknown> | undefined)?._view_type ===
            'ads_research',
        )
        .map((item) => ({ item, ad: spaceItemToAdResult(item) }))
        .filter((entry): entry is { item: SpaceItem; ad: AdSearchResultItem } => entry.ad !== null),
    [items],
  )

  const renameSavedSearch = useCallback(
    async (summary: SavedAdSearchSummary, title: string) => {
      setSavedSearches((prev) => prev.map((s) => (s.id === summary.id ? { ...s, title } : s)))
      try {
        await updateSavedAdSearch(spaceId, summary.id, { title })
      } catch {
        // raw error surfaces via panel if needed
      }
    },
    [spaceId],
  )

  const removeSavedSearch = useCallback(
    async (summary: SavedAdSearchSummary) => {
      setSavedSearches((prev) => prev.filter((s) => s.id !== summary.id))
      setNav((prev) =>
        prev.section === 'search' && prev.searchId === summary.id
          ? { section: 'search', platform: summary.platform, searchId: null, isNew: true }
          : prev,
      )
      try {
        await deleteSavedAdSearch(spaceId, summary.id)
      } catch {
        // raw error
      }
    },
    [spaceId],
  )

  const startNewSearch = useCallback((platform: AdsResearchPlatform) => {
    setDraftSessionKey((key) => key + 1)
    setNav({ section: 'search', platform, searchId: null, isNew: true })
  }, [])

  const activeSearchNav = nav.section === 'search' ? nav : null
  const panelKey =
    activeSearchNav != null
      ? `${activeSearchNav.platform}:${activeSearchNav.searchId ?? `draft-${draftSessionKey}`}`
      : 'none'

  return (
    <div className="gap-spacing-2 pl-spacing-3 flex flex-1 overflow-hidden">
      <div
        className="pb-spacing-3 relative flex h-full min-h-0 shrink-0 flex-col overflow-hidden"
        style={{ width: `${RESEARCH_SIDEBAR_WIDTH_PX}px` }}
      >
        <div className="card-glass flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border-0">
          <AdsResearchSidebar
            savedSearches={savedSearches}
            activeSearchId={nav.section === 'search' && !nav.isNew ? nav.searchId : null}
            newSearchPlatform={nav.section === 'search' && nav.isNew ? nav.platform : null}
            searchLoadingId={searchLoadingId}
            savedAdsActive={nav.section === 'saved_ads'}
            savedAdsCount={savedAds.length}
            onNewSearch={(platform) => startNewSearch(platform)}
            onSelectSearch={(search) =>
              setNav({
                section: 'search',
                platform: search.platform,
                searchId: search.id,
                isNew: false,
              })
            }
            onRenameSearch={(s, title) => void renameSavedSearch(s, title)}
            onDeleteSearch={(s) => void removeSavedSearch(s)}
            onSelectSavedAds={() => setNav({ section: 'saved_ads' })}
          />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {activeSearchNav ? (
          <AdSearchPanel
            key={panelKey}
            platform={activeSearchNav.platform}
            spaceId={spaceId}
            adsConfig={adsConfig}
            activeSavedSearchId={!activeSearchNav.isNew ? activeSearchNav.searchId : null}
            onSavedSearchCreated={reloadSavedSearches}
            onActiveSavedSearchIdChange={(id) =>
              setNav((prev) =>
                prev.section === 'search'
                  ? { ...prev, searchId: id, isNew: id === null ? prev.isNew : false }
                  : prev,
              )
            }
            onLoadingSavedIdChange={setSearchLoadingId}
            onAdsSaved={refresh}
          />
        ) : savedAds.length === 0 ? (
          <div className="gap-spacing-6 px-spacing-8 pb-spacing-8 pt-spacing-4 flex flex-1 flex-col items-center justify-center text-center">
            <AdResearchEmptyMockup variant="saved" />
            <div className="space-y-spacing-1">
              <p className="title-h6 text-foreground">No saved ads yet</p>
              <p className="body-3 text-muted-foreground max-w-sm">
                Bookmark winning ads from any search. They land here as your swipe file.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4">
            <AdResultsBody
              ads={savedAds.map((entry) => entry.ad)}
              config={adsConfig}
              savedIds={new Set(savedAds.map((entry) => entry.ad.ad_id))}
              savingIds={new Set()}
              onAdClick={(ad) => {
                const entry = savedAds.find((e) => e.ad.ad_id === ad.ad_id)
                if (entry) setSelectedSavedAd(entry)
              }}
            />
          </div>
        )}
      </div>

      {selectedSavedAd && (
        <AdAnalysisPanel
          key={selectedSavedAd.item.id}
          ad={selectedSavedAd.ad}
          spaceId={spaceId}
          saved
          saving={false}
          onAdPatch={async (patch: Partial<AdSearchResultItem>) => {
            const item = selectedSavedAd.item
            const customData: Record<string, unknown> = {
              ...((item.custom_data ?? {}) as Record<string, unknown>),
            }
            if (patch.details !== undefined) customData.ad_details = patch.details
            if (patch.transcript !== undefined) customData.transcript = patch.transcript
            if (patch.breakdown !== undefined) customData.ad_breakdown = patch.breakdown
            setSelectedSavedAd((prev) => (prev ? { ...prev, ad: { ...prev.ad, ...patch } } : prev))
            await useSpacesStore.getState().updateItem(item.id, { custom_data: customData })
          }}
          onClose={() => setSelectedSavedAd(null)}
        />
      )}
    </div>
  )
}
