'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, ChevronRight, Loader2, Megaphone, Search } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { cn } from '@/lib/utils/cn'
import {
  adCountryOptionsForPlatform,
  ADS_PLATFORM_LABELS,
  adSearchKindsForPlatform,
  createSavedAdSearch,
  defaultAdCountryForPlatform,
  getSavedAdSearch,
  refreshSavedAdSearch,
  saveAdsToSpace,
  searchAdAdvertisers,
  searchAds,
  updateSavedAdSearch,
  type AdAdvertiserRef,
  type AdSearchKind,
  type AdSearchResultItem,
  type AdsResearchPlatform,
  type SavedAdSearch,
  type SavedAdSearchFilters,
} from '../../services/ads-research.service'
import { useAdsResearchToolbarBridgeStore } from '../../store/use-ads-research-toolbar-bridge'
import type { AdsResearchConfig } from '../../types/space-schema'
import { AdAnalysisPanel } from './AdAnalysisPanel'
import { AdResearchEmptyMockup } from './AdResearchEmptyMockup'
import { AdResultsBody } from './AdResultsBody'

interface AdSearchPanelProps {
  platform: AdsResearchPlatform
  spaceId: string
  /** Toolbar prefs (group by / layout / sort) from `ads_research_config`. */
  adsConfig: AdsResearchConfig
  /** When set, the panel loads this frozen snapshot instead of a draft. */
  activeSavedSearchId: string | null
  /** Fired after a run auto-saves so the sidebar list reloads. */
  onSavedSearchCreated: () => void
  onActiveSavedSearchIdChange: (id: string | null) => void
  onLoadingSavedIdChange: (id: string | null) => void
  /** Fired after ads are bookmarked so the Saved ads feed refreshes. */
  onAdsSaved: () => void
}

/**
 * Ad library search panel for one platform: Topic (keyword) or Brand
 * (advertiser) searches. Runs auto-save as frozen snapshots — reopening a
 * saved search costs nothing; Refresh re-runs it (one billed call).
 */
export function AdSearchPanel({
  platform,
  spaceId,
  adsConfig,
  activeSavedSearchId,
  onSavedSearchCreated,
  onActiveSavedSearchIdChange,
  onLoadingSavedIdChange,
  onAdsSaved,
}: AdSearchPanelProps) {
  const kinds = adSearchKindsForPlatform(platform)
  const countryOptions = adCountryOptionsForPlatform(platform)
  const [kind, setKind] = useState<AdSearchKind>(kinds[0]!)
  const [query, setQuery] = useState('')
  const [country, setCountry] = useState(defaultAdCountryForPlatform(platform))
  const [exactPhrase, setExactPhrase] = useState(true)
  const [advertiser, setAdvertiser] = useState<AdAdvertiserRef | null>(null)
  const [advertiserOptions, setAdvertiserOptions] = useState<AdAdvertiserRef[]>([])
  const [advertiserLookupLoading, setAdvertiserLookupLoading] = useState(false)
  const [advertiserDropdownOpen, setAdvertiserDropdownOpen] = useState(false)
  const [results, setResults] = useState<AdSearchResultItem[]>([])
  const [activeQueryLabel, setActiveQueryLabel] = useState('')
  const [nextPageToken, setNextPageToken] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeSaved, setActiveSaved] = useState<SavedAdSearch | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [savedAdIds, setSavedAdIds] = useState<Set<string>>(new Set())
  const [savingAdIds, setSavingAdIds] = useState<Set<string>>(new Set())
  const [selectedAd, setSelectedAd] = useState<AdSearchResultItem | null>(null)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [countryMenuOpen, setCountryMenuOpen] = useState(false)
  const [countryMenuPos, setCountryMenuPos] = useState<{ top: number; left: number } | null>(null)
  const advertiserLookupSeq = useRef(0)
  const countryBtnRef = useRef<HTMLButtonElement | null>(null)
  const countryMenuRef = useRef<HTMLDivElement | null>(null)
  const registerToolbarBridge = useAdsResearchToolbarBridgeStore((s) => s.register)
  const clearToolbarBridge = useAdsResearchToolbarBridgeStore((s) => s.clear)

  const panelKey = `${spaceId}:${platform}:${activeSavedSearchId ?? 'draft'}`

  // Google has no keyword search upstream — force brand mode.
  const effectiveKind: AdSearchKind = kinds.includes(kind) ? kind : kinds[0]!

  const hasAdvancedControls =
    countryOptions !== null || (platform === 'meta' && effectiveKind === 'topic')

  const selectedCountryLabel =
    countryOptions?.find((option) => option.id === country)?.label ?? country

  // Menu renders in a portal (the animated Advanced row clips overflow), so
  // position it off the trigger rect and track scroll/resize while open.
  const positionCountryMenu = useCallback(() => {
    const rect = countryBtnRef.current?.getBoundingClientRect()
    if (!rect) return
    const w = 176
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - w - 8))
    setCountryMenuPos({ top: rect.bottom + 4, left })
  }, [])

  useEffect(() => {
    if (!countryMenuOpen) {
      setCountryMenuPos(null)
      return
    }
    positionCountryMenu()
    const handleOutside = (e: MouseEvent) => {
      const t = e.target as Node
      if (!countryMenuRef.current?.contains(t) && !countryBtnRef.current?.contains(t)) {
        setCountryMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside, true)
    window.addEventListener('scroll', positionCountryMenu, true)
    window.addEventListener('resize', positionCountryMenu)
    return () => {
      document.removeEventListener('mousedown', handleOutside, true)
      window.removeEventListener('scroll', positionCountryMenu, true)
      window.removeEventListener('resize', positionCountryMenu)
    }
  }, [countryMenuOpen, positionCountryMenu])

  useEffect(() => {
    if (!advancedOpen) setCountryMenuOpen(false)
  }, [advancedOpen])

  // Advertiser typeahead (brand mode) — debounced lookup of the platform's
  // advertiser-search engine. Each fired lookup is one billed call.
  useEffect(() => {
    if (effectiveKind !== 'brand' || advertiser || query.trim().length < 2) {
      setAdvertiserOptions([])
      return
    }
    const seq = ++advertiserLookupSeq.current
    const t = setTimeout(() => {
      setAdvertiserLookupLoading(true)
      searchAdAdvertisers(spaceId, platform, query.trim())
        .then((options) => {
          if (advertiserLookupSeq.current !== seq) return
          setAdvertiserOptions(options.slice(0, 8))
          setAdvertiserDropdownOpen(true)
        })
        .catch(() => undefined)
        .finally(() => {
          if (advertiserLookupSeq.current === seq) setAdvertiserLookupLoading(false)
        })
    }, 450)
    return () => clearTimeout(t)
  }, [advertiser, effectiveKind, platform, query, spaceId])

  const loadSavedSearchById = useCallback(
    async (searchId: string) => {
      onLoadingSavedIdChange(searchId)
      setLoadingMore(false)
      setError(null)
      try {
        const full = await getSavedAdSearch(spaceId, searchId)
        setActiveSaved(full)
        setSavedAdIds(new Set())
      } catch {
        setError("Couldn't open that saved search.")
        onActiveSavedSearchIdChange(null)
      } finally {
        onLoadingSavedIdChange(null)
      }
    },
    [onActiveSavedSearchIdChange, onLoadingSavedIdChange, spaceId],
  )

  useEffect(() => {
    setLoadingMore(false)
  }, [activeSavedSearchId, platform])

  useEffect(() => {
    if (!activeSavedSearchId) {
      setActiveSaved(null)
      return
    }
    if (activeSaved?.id === activeSavedSearchId) return
    void loadSavedSearchById(activeSavedSearchId)
  }, [activeSaved?.id, activeSavedSearchId, loadSavedSearchById])

  const draftFilters: SavedAdSearchFilters = useMemo(
    () => ({ country, exact_phrase: exactPhrase }),
    [country, exactPhrase],
  )

  const persistSnapshot = useCallback(
    async (items: AdSearchResultItem[], pageToken: string | null) => {
      const search = await createSavedAdSearch(spaceId, {
        platform,
        kind: effectiveKind,
        query: effectiveKind === 'brand' ? (advertiser?.name ?? query.trim()) : query.trim(),
        advertiser: effectiveKind === 'brand' ? advertiser : null,
        filters: { country, exact_phrase: exactPhrase },
        items,
        next_page_token: pageToken,
      })
      onSavedSearchCreated()
      return search
    },
    [
      advertiser,
      country,
      effectiveKind,
      exactPhrase,
      onSavedSearchCreated,
      platform,
      query,
      spaceId,
    ],
  )

  const runSearch = useCallback(async () => {
    if (searching) return
    if (effectiveKind === 'brand' && !advertiser) return
    if (effectiveKind === 'topic' && !query.trim()) return
    setSearching(true)
    setError(null)
    setLoadingMore(false)
    setActiveSaved(null)
    onActiveSavedSearchIdChange(null)
    try {
      const page = await searchAds(spaceId, platform, {
        kind: effectiveKind,
        query: query.trim(),
        advertiser: effectiveKind === 'brand' ? advertiser : null,
        filters: draftFilters,
      })
      setResults(page.items)
      setNextPageToken(page.nextPageToken)
      setActiveQueryLabel(
        effectiveKind === 'brand' ? (advertiser?.name ?? query.trim()) : query.trim(),
      )
      setSavedAdIds(new Set())
      if (page.items.length > 0) {
        const search = await persistSnapshot(page.items, page.nextPageToken)
        onActiveSavedSearchIdChange(search.id)
        setActiveSaved(search)
      }
    } catch {
      setError("Search didn't go through. Try again.")
    } finally {
      setSearching(false)
    }
  }, [
    advertiser,
    draftFilters,
    effectiveKind,
    onActiveSavedSearchIdChange,
    persistSnapshot,
    platform,
    query,
    searching,
    spaceId,
  ])

  const loadMore = useCallback(async () => {
    const token = activeSaved?.next_page_token ?? nextPageToken
    const current = activeSaved?.results ?? results
    if (!token || loadingMore) return
    setLoadingMore(true)
    setError(null)
    try {
      const page = await searchAds(spaceId, platform, {
        kind: activeSaved?.kind ?? effectiveKind,
        query: activeSaved?.query ?? query.trim(),
        advertiser: activeSaved?.advertiser ?? (effectiveKind === 'brand' ? advertiser : null),
        next_page_token: token,
        filters: activeSaved?.filters ?? draftFilters,
      })
      const seen = new Set(current.map((ad) => ad.ad_id))
      const merged = [...current, ...page.items.filter((ad) => !seen.has(ad.ad_id))]
      setResults(merged)
      setNextPageToken(page.nextPageToken)
      const search = await persistSnapshot(merged, page.nextPageToken)
      setActiveSaved(search)
    } catch {
      setError("Couldn't load more results.")
    } finally {
      setLoadingMore(false)
    }
  }, [
    activeSaved,
    advertiser,
    draftFilters,
    effectiveKind,
    loadingMore,
    nextPageToken,
    persistSnapshot,
    platform,
    query,
    results,
    spaceId,
  ])

  const refreshActiveSaved = useCallback(async () => {
    if (!activeSaved || refreshing) return
    setRefreshing(true)
    setError(null)
    try {
      const updated = await refreshSavedAdSearch(spaceId, activeSaved.id)
      setActiveSaved(updated)
      onSavedSearchCreated()
    } catch {
      setError("Refresh didn't go through. Try again.")
    } finally {
      setRefreshing(false)
    }
  }, [activeSaved, onSavedSearchCreated, refreshing, spaceId])

  useEffect(() => {
    registerToolbarBridge({
      panelKey,
      canRefreshSaved: Boolean(activeSaved),
      refreshingSaved: refreshing,
      refreshSavedSearch: () => {
        void refreshActiveSaved()
      },
    })
    return () => clearToolbarBridge(panelKey)
  }, [
    activeSaved,
    clearToolbarBridge,
    panelKey,
    refreshActiveSaved,
    refreshing,
    registerToolbarBridge,
  ])

  const saveAd = useCallback(
    async (ad: AdSearchResultItem) => {
      setSavingAdIds((prev) => new Set(prev).add(ad.ad_id))
      try {
        await saveAdsToSpace(spaceId, ad.platform, activeSaved?.query ?? activeQueryLabel, [ad])
        setSavedAdIds((prev) => new Set(prev).add(ad.ad_id))
        onAdsSaved()
      } finally {
        setSavingAdIds((prev) => {
          const next = new Set(prev)
          next.delete(ad.ad_id)
          return next
        })
      }
    },
    [activeQueryLabel, activeSaved, onAdsSaved, spaceId],
  )

  /** Merge Analyze output (transcript/breakdown/details) onto the result and freeze it on the snapshot. */
  const persistAdPatch = useCallback(
    async (adId: string, patch: Partial<AdSearchResultItem>) => {
      const apply = (list: AdSearchResultItem[]) =>
        list.map((a) => (a.ad_id === adId ? { ...a, ...patch } : a))
      setResults((prev) => apply(prev))
      setSelectedAd((prev) => (prev && prev.ad_id === adId ? { ...prev, ...patch } : prev))
      if (activeSaved) {
        const updatedResults = apply(activeSaved.results)
        setActiveSaved({ ...activeSaved, results: updatedResults })
        await updateSavedAdSearch(spaceId, activeSaved.id, { results: updatedResults })
      }
    },
    [activeSaved, spaceId],
  )

  const displayResults = activeSaved?.results ?? results
  const displayPlatform = activeSaved?.platform ?? platform
  const hasMore = Boolean(activeSaved?.next_page_token ?? nextPageToken)

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      {activeSaved ? (
        <div className="border-border flex shrink-0 items-center gap-3 border-b px-4 py-2.5">
          <div className="gap-spacing-2 flex min-w-0 flex-wrap items-center">
            {activeSaved.kind === 'brand' && activeSaved.advertiser?.image_url ? (
              <img
                src={activeSaved.advertiser.image_url}
                alt=""
                className="h-5 w-5 shrink-0 rounded-full object-cover"
              />
            ) : null}
            <span className="body-3 text-foreground font-medium">{activeSaved.title}</span>
            <span className="body-4 text-muted-foreground">
              {ADS_PLATFORM_LABELS[activeSaved.platform]} ·{' '}
              {activeSaved.kind === 'brand' ? 'Brand' : 'Topic'}
            </span>
          </div>
        </div>
      ) : (
        <div className="gap-spacing-2 px-spacing-4 py-spacing-3 flex shrink-0 flex-col items-center">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {kinds.length > 1 ? (
              <div className="flex items-center gap-1">
                {kinds.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      setKind(k)
                      setAdvertiser(null)
                      setAdvertiserOptions([])
                    }}
                    className={cn(
                      'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                      effectiveKind === k
                        ? 'bg-[var(--color-hover-subtle)] text-[var(--foreground)]'
                        : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]',
                    )}
                  >
                    {k === 'topic' ? 'Topic' : 'Brand'}
                  </button>
                ))}
              </div>
            ) : (
              <p className="body-4 text-muted-foreground">
                Google ads research is brand-based. Search for an advertiser.
              </p>
            )}
          </div>

          <div className="relative flex w-full max-w-md flex-col">
            <div className="relative w-full">
              <div className="border-border bg-secondary gap-spacing-2 py-spacing-1 pl-spacing-3 pr-spacing-1 h-spacing-9 focus-within:border-[var(--color-muted-foreground)]/40 flex w-full items-center rounded-full border transition-colors">
                <Search className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                {advertiser ? (
                  <span className="gap-spacing-1 flex min-w-0 flex-1 items-center">
                    {advertiser.image_url ? (
                      <img
                        src={advertiser.image_url}
                        alt=""
                        className="h-4 w-4 shrink-0 rounded-full object-cover"
                      />
                    ) : null}
                    <span className="body-3 text-foreground truncate">{advertiser.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setAdvertiser(null)
                        setQuery('')
                      }}
                      className="body-4 shrink-0 text-[var(--color-muted-foreground)] hover:text-[var(--foreground)]"
                    >
                      Change
                    </button>
                  </span>
                ) : (
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && effectiveKind === 'topic') void runSearch()
                      if (e.key === 'Escape') setAdvertiserDropdownOpen(false)
                    }}
                    placeholder={
                      effectiveKind === 'brand' ? 'Search a brand or advertiser' : 'Search a topic'
                    }
                    className="body-3 text-foreground h-full min-w-0 flex-1 border-0 bg-transparent outline-none placeholder:text-[var(--color-muted-foreground)]"
                  />
                )}
                <button
                  type="button"
                  onClick={() => void runSearch()}
                  disabled={searching || (effectiveKind === 'topic' ? !query.trim() : !advertiser)}
                  className="button-glass-primary body-3 gap-spacing-1 h-spacing-7 px-spacing-4 inline-flex shrink-0 items-center justify-center rounded-full font-medium disabled:opacity-50"
                >
                  {(searching || advertiserLookupLoading) && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  Search
                </button>
              </div>
              {effectiveKind === 'brand' &&
                !advertiser &&
                advertiserDropdownOpen &&
                advertiserOptions.length > 0 && (
                  <div className="border-border absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border bg-[var(--color-background)] shadow-xl">
                    <p className="body-4 text-muted-foreground border-b border-[var(--border)] px-3 py-1.5 uppercase tracking-wider">
                      Advertisers
                    </p>
                    {advertiserOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          setAdvertiser(option)
                          setAdvertiserDropdownOpen(false)
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-[var(--color-hover-subtle)]"
                      >
                        {option.image_url ? (
                          <img
                            src={option.image_url}
                            alt=""
                            className="h-5 w-5 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <Megaphone className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                        )}
                        <span className="body-3 text-foreground min-w-0 flex-1 truncate">
                          {option.name}
                        </span>
                        {option.is_verified ? (
                          <span className="badge-glass badge-glass-muted shrink-0 rounded px-1 py-px text-[9px] font-semibold">
                            VERIFIED
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                )}
            </div>

            {hasAdvancedControls ? (
              <div className="mt-spacing-2 h-spacing-7 flex items-center justify-center">
                <div className="h-spacing-7 inline-flex items-center">
                  <button
                    type="button"
                    onClick={() => setAdvancedOpen((open) => !open)}
                    className="body-4 text-muted-foreground hover:text-foreground h-spacing-7 inline-flex shrink-0 items-center gap-0.5 transition-colors"
                    aria-expanded={advancedOpen}
                  >
                    Advanced
                    <ChevronRight className="h-3 w-3 shrink-0" />
                  </button>
                  <AnimatePresence initial={false}>
                    {advancedOpen ? (
                      <motion.div
                        key="advanced-panel"
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 'auto', opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        className="ml-spacing-2 h-spacing-7 flex items-center overflow-hidden whitespace-nowrap"
                      >
                        <div className="gap-spacing-2 flex items-center">
                          {countryOptions ? (
                            <button
                              ref={countryBtnRef}
                              type="button"
                              onClick={() => setCountryMenuOpen((open) => !open)}
                              className={cn(
                                'body-3 h-spacing-7 inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors',
                                countryMenuOpen
                                  ? 'bg-[var(--color-hover-subtle)] text-[var(--foreground)]'
                                  : 'text-[var(--foreground)] hover:bg-[var(--color-hover-subtle)]',
                              )}
                              aria-expanded={countryMenuOpen}
                              aria-haspopup="listbox"
                            >
                              {selectedCountryLabel}
                              <ChevronDown
                                className={cn(
                                  'h-3 w-3 shrink-0 text-[var(--color-muted-foreground)] transition-transform duration-200',
                                  countryMenuOpen && 'rotate-180',
                                )}
                              />
                            </button>
                          ) : null}
                          {platform === 'meta' && effectiveKind === 'topic' ? (
                            <button
                              type="button"
                              onClick={() => setExactPhrase((v) => !v)}
                              title="Match the exact phrase instead of any word"
                              className={cn(
                                'body-3 h-spacing-7 inline-flex shrink-0 items-center rounded-lg px-3 text-xs font-medium transition-colors',
                                exactPhrase
                                  ? 'bg-[var(--color-hover-subtle)] text-[var(--foreground)]'
                                  : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]',
                              )}
                            >
                              Exact phrase
                            </button>
                          ) : null}
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {error && (
        <p className="body-3 shrink-0 px-4 pt-3 text-[var(--color-destructive)]">{error}</p>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {searching ? (
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <VibeyLoadingOrb
              text={`Searching ${ADS_PLATFORM_LABELS[platform]}...`}
              state="processing"
              size="lg"
            />
          </div>
        ) : displayResults.length === 0 ? (
          <div className="gap-spacing-6 px-spacing-8 pb-spacing-8 pt-spacing-4 flex min-h-0 flex-1 flex-col items-center justify-center text-center">
            <AdResearchEmptyMockup variant={displayPlatform} />
            <div className="space-y-spacing-1">
              <p className="title-h6 text-foreground">Spy on the ads already winning</p>
              <p className="body-3 text-muted-foreground max-w-sm">
                Search a topic or a brand to pull live ads from the{' '}
                {ADS_PLATFORM_LABELS[displayPlatform]} library. Long-running ads are proven winners.
                Bookmark them to your space.
              </p>
            </div>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <AdResultsBody
              ads={displayResults}
              config={adsConfig}
              savedIds={savedAdIds}
              savingIds={savingAdIds}
              onSave={(ad) => void saveAd(ad)}
              onAdClick={(ad) => setSelectedAd(ad)}
            />
            {hasMore && (
              <div className="flex justify-center pt-4">
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  disabled={loadingMore}
                  className="button-compact button-glass-primary flex items-center gap-1.5 disabled:opacity-50"
                >
                  {loadingMore && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Load more
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {countryMenuOpen &&
        countryOptions &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={countryMenuRef}
            className="dropdown-menu-solid fixed z-[100001] max-h-60 w-44 overflow-y-auto rounded-xl py-1 shadow-lg"
            style={{
              top: countryMenuPos?.top ?? 0,
              left: countryMenuPos?.left ?? 0,
              visibility: countryMenuPos ? 'visible' : 'hidden',
            }}
          >
            {countryOptions.map((option) => {
              const isSelected = country === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    setCountry(option.id)
                    setCountryMenuOpen(false)
                  }}
                  className="flex w-full items-center justify-between px-3 py-1.5 text-xs transition-colors hover:bg-[var(--color-hover-subtle)]"
                >
                  <span className="text-[var(--foreground)]">{option.label}</span>
                  {isSelected ? (
                    <Check className="h-3 w-3 shrink-0 text-[var(--color-primary)]" />
                  ) : null}
                </button>
              )
            })}
          </div>,
          document.body,
        )}

      {selectedAd && (
        <AdAnalysisPanel
          key={selectedAd.ad_id}
          ad={selectedAd}
          spaceId={spaceId}
          saved={savedAdIds.has(selectedAd.ad_id)}
          saving={savingAdIds.has(selectedAd.ad_id)}
          onSave={() => void saveAd(selectedAd)}
          onAdPatch={(patch) => persistAdPatch(selectedAd.ad_id, patch)}
          onClose={() => setSelectedAd(null)}
        />
      )}
    </div>
  )
}
