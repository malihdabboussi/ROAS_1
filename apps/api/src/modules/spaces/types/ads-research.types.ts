/** Ad library platforms served by SearchAPI.io. */
export type AdsResearchPlatform = 'meta' | 'tiktok' | 'google'

/**
 * 'topic' = keyword search over ad content; 'brand' = all ads from one
 * advertiser. Google Ads Transparency has no keyword search upstream, so
 * google searches are always 'brand'.
 */
export type AdSearchKind = 'topic' | 'brand'

/**
 * Advertiser reference resolved by the per-platform advertiser-search engines.
 * `platform_ref` is the value the ads engine wants for a brand search:
 * Meta page_id, TikTok advertiser_token (falls back to advertiser id),
 * Google advertiser id.
 */
export interface AdAdvertiserRef {
  id: string
  name: string
  image_url: string | null
  platform_ref: string
  is_verified?: boolean
}

export type AdCreativeFormat = 'video' | 'image' | 'carousel' | 'text' | 'unknown'

/** One normalized ad creative across all three ad libraries. */
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
  /** ISO datetime strings; null when the library doesn't expose them. */
  first_shown: string | null
  last_shown: string | null
  /** Longevity signal — long-running ads are proven winners. */
  days_running: number | null
  /** TikTok-only estimated audience range (e.g. "10K-100K"). */
  reach_estimate: string | null
  is_active: boolean | null
  /** Platform transparency page for this creative, when available. */
  details_link: string | null
  /** Meta only: token for the ad-details engine (preferred over ad_archive_id). */
  details_token?: string | null
  /**
   * Meta only: number of near-identical running copies of this creative
   * (collation_count). Results are deduped by collation_id — one card per
   * creative; a high count is itself a winning-ad signal.
   */
  variant_count?: number | null
  /** Filled by the Analyze action; persisted back onto the saved snapshot. */
  details?: AdDetails | null
  /** Spoken script of the ad video — filled by the Analyze action. */
  transcript?: string | null
  /** Marketer-facing deconstruction — filled by the Analyze action. */
  breakdown?: AdBreakdown | null
}

/** One beat of the ad's script structure. */
export interface AdBreakdownBeat {
  title: string
  purpose: 'hook' | 'problem' | 'agitate' | 'demo' | 'proof' | 'offer' | 'cta' | 'other'
  summary: string
}

/**
 * Marketer-facing ad deconstruction (LLM) — the ads analog of the social
 * research VideoBreakdown. Stored frozen on the result/item.
 */
export interface AdBreakdown {
  hook: { quote: string | null; technique: string }
  angle: string
  target_audience: string
  pain_or_desire: string
  /** Named structure, e.g. "Problem–Agitate–Solve", "UGC testimonial". */
  framework: string
  beats: AdBreakdownBeat[]
  offer: string | null
  cta: string | null
  why_it_works: string
  /** 2-4 transferable patterns to apply to your own ads. */
  steal_this: string[]
  model: string
  generated_at: string
}

/** One creative variant returned by the ad-details engines. */
export interface AdDetailsVariation {
  title: string | null
  text: string | null
  image_url: string | null
  video_url: string | null
  link: string | null
  cta: string | null
}

export interface AdDetailsTargeting {
  /** Regions/countries the ad ran in, with impressions share when exposed. */
  locations: Array<{ name: string; detail: string | null }>
  age_ranges: string[]
  genders: string[]
  audience_size: string | null
  /** Free-form targeting notes (contextual, customer list, demographics). */
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
  /** Meta political/issue ads: who paid for the ad. */
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
  /**
   * Country/region filter passed to the ad library engine. 'ALL' / 'all' =
   * worldwide. TikTok's library is EU/UK-only — see TIKTOK_AD_COUNTRIES.
   */
  country?: string
  /** Meta topic searches: wrap the query in quotes for phrase matching. Default true. */
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
  created_at: string
  last_run_at: string
}

export interface SavedAdSearch extends SavedAdSearchSummary {
  results: AdSearchResultItem[]
  next_page_token: string | null
}

export interface AdSearchPage {
  items: AdSearchResultItem[]
  /** Opaque SearchAPI pagination token. Null = no more pages. */
  next_page_token: string | null
}
