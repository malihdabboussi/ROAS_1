/**
 * Ads research: thin API client for the SearchAPI.io-backed ad library
 * research (Meta Ad Library, TikTok Ads Library, Google Ads Transparency).
 * Search execution and snapshot persistence run on the API
 * (AdsResearchSearchService).
 */
import { backendDelete, backendGet, backendPatch, backendPost } from '@/lib/api/backend-client'
import { cachedFetch, invalidateCachedFetch } from '@/lib/cache/keyed-fetch-cache'

export type AdsResearchPlatform = 'meta' | 'tiktok' | 'google'

/** 'topic' = keyword search; 'brand' = one advertiser. Google is brand-only. */
export type AdSearchKind = 'topic' | 'brand'

export async function ensureAdsResearchAgencyTeam(
  campaignId: string,
): Promise<{ ok: true; agents: Array<{ agent_key: string }> }> {
  return backendPost('/api/agents/ensure-agency-team', { campaign_id: campaignId })
}

export const ADS_RESEARCH_PLATFORMS: readonly AdsResearchPlatform[] = [
  'meta',
  'tiktok',
  'google',
] as const

export const ADS_PLATFORM_LABELS: Record<AdsResearchPlatform, string> = {
  meta: 'Meta Ads',
  tiktok: 'TikTok Ads',
  google: 'Google Ads',
}

export const ADS_PLATFORM_SHORT: Record<AdsResearchPlatform, string> = {
  meta: 'META',
  tiktok: 'TT',
  google: 'G',
}

/** Google Ads Transparency has no keyword search upstream. */
export function adSearchKindsForPlatform(platform: AdsResearchPlatform): AdSearchKind[] {
  return platform === 'google' ? ['brand'] : ['topic', 'brand']
}

export interface AdCountryOption {
  id: string
  label: string
}

/** Meta Ad Library covers ads worldwide. */
const META_AD_COUNTRIES: AdCountryOption[] = [
  { id: 'ALL', label: 'Worldwide' },
  { id: 'US', label: 'United States' },
  { id: 'GB', label: 'United Kingdom' },
  { id: 'CA', label: 'Canada' },
  { id: 'AU', label: 'Australia' },
  { id: 'IL', label: 'Israel' },
  { id: 'DE', label: 'Germany' },
  { id: 'FR', label: 'France' },
  { id: 'ES', label: 'Spain' },
  { id: 'IT', label: 'Italy' },
  { id: 'NL', label: 'Netherlands' },
  { id: 'SE', label: 'Sweden' },
  { id: 'BR', label: 'Brazil' },
  { id: 'MX', label: 'Mexico' },
  { id: 'IN', label: 'India' },
  { id: 'JP', label: 'Japan' },
  { id: 'AE', label: 'United Arab Emirates' },
  { id: 'TR', label: 'Turkey' },
]

/**
 * TikTok's ad library is an EU transparency database — only EU/EEA countries,
 * the UK, and Turkey are valid (upstream constraint, verified via the API).
 */
const TIKTOK_AD_COUNTRIES: AdCountryOption[] = [
  { id: 'all', label: 'All (EU + UK)' },
  { id: 'GB', label: 'United Kingdom' },
  { id: 'IE', label: 'Ireland' },
  { id: 'DE', label: 'Germany' },
  { id: 'FR', label: 'France' },
  { id: 'ES', label: 'Spain' },
  { id: 'IT', label: 'Italy' },
  { id: 'NL', label: 'Netherlands' },
  { id: 'SE', label: 'Sweden' },
  { id: 'DK', label: 'Denmark' },
  { id: 'FI', label: 'Finland' },
  { id: 'NO', label: 'Norway' },
  { id: 'AT', label: 'Austria' },
  { id: 'BE', label: 'Belgium' },
  { id: 'PT', label: 'Portugal' },
  { id: 'PL', label: 'Poland' },
  { id: 'CZ', label: 'Czechia' },
  { id: 'GR', label: 'Greece' },
  { id: 'RO', label: 'Romania' },
  { id: 'HU', label: 'Hungary' },
  { id: 'CH', label: 'Switzerland' },
  { id: 'TR', label: 'Turkey' },
]

/** Country options per platform; null = no country filter (Google brand search). */
export function adCountryOptionsForPlatform(
  platform: AdsResearchPlatform,
): AdCountryOption[] | null {
  if (platform === 'meta') return META_AD_COUNTRIES
  if (platform === 'tiktok') return TIKTOK_AD_COUNTRIES
  return null
}

/** English-market default beats worldwide-mixed-language results. */
export function defaultAdCountryForPlatform(platform: AdsResearchPlatform): string {
  if (platform === 'meta') return 'US'
  if (platform === 'tiktok') return 'GB'
  return 'ALL'
}

export interface AdAdvertiserRef {
  id: string
  name: string
  image_url: string | null
  platform_ref: string
  is_verified?: boolean
}

export type AdCreativeFormat = 'video' | 'image' | 'carousel' | 'text' | 'unknown'

export interface AdSearchResultItem {
  ad_id: string
  platform: AdsResearchPlatform
  advertiser_name: string | null
  advertiser_id: string | null
  format: AdCreativeFormat
  creative_text: string | null
  image_url: string | null
  video_url: string | null
  landing_url: string | null
  first_shown: string | null
  last_shown: string | null
  days_running: number | null
  reach_estimate: string | null
  is_active: boolean | null
  details_link: string | null
  /** Meta only: token for the ad-details engine (preferred over the ad id). */
  details_token?: string | null
  /** Meta only: running copies of this creative (deduped to one card). */
  variant_count?: number | null
  /** Filled by the Analyze action; persisted back onto the saved snapshot. */
  details?: AdDetails | null
  /** Spoken script of the ad video — filled by the Analyze action. */
  transcript?: string | null
  /** Marketer-facing deconstruction — filled by the Analyze action. */
  breakdown?: AdBreakdown | null
}

export interface AdBreakdownBeat {
  title: string
  purpose: 'hook' | 'problem' | 'agitate' | 'demo' | 'proof' | 'offer' | 'cta' | 'other'
  summary: string
}

/** Marketer-facing ad deconstruction — ads analog of the social VideoBreakdown. */
export interface AdBreakdown {
  hook: { quote: string | null; technique: string }
  angle: string
  target_audience: string
  pain_or_desire: string
  framework: string
  beats: AdBreakdownBeat[]
  offer: string | null
  cta: string | null
  why_it_works: string
  steal_this: string[]
  model: string
  generated_at: string
}

export interface AdDetailsVariation {
  title: string | null
  text: string | null
  image_url: string | null
  video_url: string | null
  link: string | null
  cta: string | null
}

export interface AdDetailsTargeting {
  locations: Array<{ name: string; detail: string | null }>
  age_ranges: string[]
  genders: string[]
  audience_size: string | null
  signals: string[]
}

/** Normalized output of the per-platform ad-details engines (Analyze action). */
export interface AdDetails {
  platform: AdsResearchPlatform
  ad_id: string
  advertiser_name: string | null
  advertiser_location: string | null
  /** Meta: the page's About tagline. */
  advertiser_about?: string | null
  /** Meta: Facebook page likes. */
  page_likes?: number | null
  /** Meta: linked Instagram account. */
  ig_username?: string | null
  ig_followers?: number | null
  /** Meta: page category (e.g. "Product/service"). */
  page_category?: string | null
  payer: string | null
  topic: string | null
  first_shown: string | null
  last_shown: string | null
  total_impressions: string | null
  targeting: AdDetailsTargeting | null
  variations: AdDetailsVariation[]
  analyzed_at: string
}

export interface SavedAdSearchFilters {
  sort_mode?: 'recency' | 'days_running'
  /** Country/region filter ('ALL' / 'all' = worldwide; TikTok is EU/UK-only). */
  country?: string
  /** Meta topic searches: phrase-match the query (quotes). Default true. */
  exact_phrase?: boolean
}

export interface SavedAdSearchSummary {
  id: string
  platform: AdsResearchPlatform
  kind: AdSearchKind
  title: string
  query: string
  advertiser: AdAdvertiserRef | null
  filters: SavedAdSearchFilters
  result_count: number
  mission_ids: string[]
  created_at: string
  last_run_at: string
}

export interface SavedAdSearch extends SavedAdSearchSummary {
  results: AdSearchResultItem[]
  next_page_token: string | null
}

function adsResearchPath(spaceId: string, suffix: string): string {
  return `/api/spaces/${spaceId}/ads-research${suffix}`
}

function savedAdSearchesCacheKey(spaceId: string): string {
  return `ad-searches:${spaceId}`
}

export async function listSavedAdSearches(spaceId: string): Promise<SavedAdSearchSummary[]> {
  const res = await cachedFetch(
    savedAdSearchesCacheKey(spaceId),
    () =>
      backendGet<{ success: boolean; searches: SavedAdSearchSummary[] }>(
        adsResearchPath(spaceId, '/searches'),
      ),
    { ttlMs: 60_000 },
  )
  return res.searches
}

export async function getSavedAdSearch(spaceId: string, searchId: string): Promise<SavedAdSearch> {
  const res = await backendGet<{ success: boolean; search: SavedAdSearch }>(
    adsResearchPath(spaceId, `/searches/${searchId}`),
  )
  return res.search
}

export async function createSavedAdSearch(
  spaceId: string,
  payload: {
    platform: AdsResearchPlatform
    kind: AdSearchKind
    title?: string
    query: string
    advertiser?: AdAdvertiserRef | null
    filters?: SavedAdSearchFilters
    items: AdSearchResultItem[]
    next_page_token?: string | null
  },
): Promise<SavedAdSearch> {
  const res = await backendPost<{ success: boolean; search: SavedAdSearch }>(
    adsResearchPath(spaceId, '/searches'),
    payload,
  )
  invalidateCachedFetch(savedAdSearchesCacheKey(spaceId))
  return res.search
}

export async function refreshSavedAdSearch(
  spaceId: string,
  searchId: string,
): Promise<SavedAdSearch> {
  const res = await backendPost<{ success: boolean; search: SavedAdSearch }>(
    adsResearchPath(spaceId, `/searches/${searchId}/refresh`),
    {},
  )
  invalidateCachedFetch(savedAdSearchesCacheKey(spaceId))
  return res.search
}

export async function updateSavedAdSearch(
  spaceId: string,
  searchId: string,
  patch: {
    title?: string
    filters?: SavedAdSearchFilters
    /** Replaces the frozen snapshot — used to persist Analyze details onto results. */
    results?: AdSearchResultItem[]
  },
): Promise<void> {
  await backendPatch<{ success: boolean }>(adsResearchPath(spaceId, `/searches/${searchId}`), patch)
  invalidateCachedFetch(savedAdSearchesCacheKey(spaceId))
}

export async function deleteSavedAdSearch(spaceId: string, searchId: string): Promise<void> {
  await backendDelete<{ success: boolean }>(adsResearchPath(spaceId, `/searches/${searchId}`))
  invalidateCachedFetch(savedAdSearchesCacheKey(spaceId))
}

export async function searchAds(
  spaceId: string,
  platform: AdsResearchPlatform,
  payload: {
    kind: AdSearchKind
    query?: string
    advertiser?: AdAdvertiserRef | null
    next_page_token?: string | null
    filters?: SavedAdSearchFilters | null
  },
): Promise<{ items: AdSearchResultItem[]; nextPageToken: string | null }> {
  const res = await backendPost<{
    success: boolean
    items: AdSearchResultItem[]
    next_page_token: string | null
  }>(adsResearchPath(spaceId, `/${platform}/search`), payload, { resilient: true })
  return { items: res.items, nextPageToken: res.next_page_token }
}

export async function searchAdAdvertisers(
  spaceId: string,
  platform: AdsResearchPlatform,
  query: string,
): Promise<AdAdvertiserRef[]> {
  const res = await backendGet<{ success: boolean; advertisers: AdAdvertiserRef[] }>(
    adsResearchPath(spaceId, `/${platform}/advertisers?q=${encodeURIComponent(query)}`),
  )
  return res.advertisers
}

/**
 * Runs the marketer analysis; returns a patch to merge onto the ad
 * (breakdown + transcript, plus details/media when the server had to enrich
 * a content-less Google creative first).
 */
export async function breakdownAd(
  spaceId: string,
  platform: AdsResearchPlatform,
  ad: AdSearchResultItem,
): Promise<Partial<AdSearchResultItem>> {
  const res = await backendPost<{ success: boolean; patch: Partial<AdSearchResultItem> }>(
    adsResearchPath(spaceId, `/${platform}/ad-breakdown`),
    { ad },
  )
  return res.patch
}

export async function getAdDetails(
  spaceId: string,
  platform: AdsResearchPlatform,
  payload: { ad_id: string; details_token?: string | null; advertiser_id?: string | null },
): Promise<AdDetails> {
  const res = await backendPost<{ success: boolean; details: AdDetails }>(
    adsResearchPath(spaceId, `/${platform}/ad-details`),
    payload,
  )
  return res.details
}

export async function saveAdsToSpace(
  spaceId: string,
  platform: AdsResearchPlatform,
  query: string,
  items: AdSearchResultItem[],
): Promise<{ createdCount: number; skippedCount: number; itemIds: string[] }> {
  const res = await backendPost<{
    success: boolean
    created_count: number
    skipped_count: number
    item_ids: string[]
  }>(adsResearchPath(spaceId, `/${platform}/save`), { query, items })
  return {
    createdCount: res.created_count,
    skippedCount: res.skipped_count,
    itemIds: res.item_ids,
  }
}
