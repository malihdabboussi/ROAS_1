/**
 * Vibey credits charged per Ads Intelligence (SearchAPI) action.
 * SearchAPI bills per search; apply a flat 2× margin (~2–4 Vibey credits).
 */
export const SEARCHAPI_ACTION_CREDITS: Record<string, number> = {
  meta_ads_page_search: 4,
  meta_ads_search: 4,
  meta_ad_details: 4,
  tiktok_advertiser_search: 4,
  tiktok_ads_search: 4,
  tiktok_ad_details: 4,
  google_ads_advertiser_search: 4,
  google_ads_search: 4,
  google_ad_details: 4,
}

export function searchApiCreditsForAction(actionSlug: string): number {
  return SEARCHAPI_ACTION_CREDITS[actionSlug] ?? 4
}

export type SearchApiAgentAction =
  | 'meta_ads_page_search'
  | 'meta_ads_search'
  | 'meta_ad_details'
  | 'tiktok_advertiser_search'
  | 'tiktok_ads_search'
  | 'tiktok_ad_details'
  | 'google_ads_advertiser_search'
  | 'google_ads_search'
  | 'google_ad_details'

export const SEARCHAPI_ACTION_ENGINES: Record<SearchApiAgentAction, string> = {
  meta_ads_page_search: 'meta_ad_library_page_search',
  meta_ads_search: 'meta_ad_library',
  meta_ad_details: 'meta_ad_library_ad_details',
  tiktok_advertiser_search: 'tiktok_ads_library_advertiser_search',
  tiktok_ads_search: 'tiktok_ads_library',
  tiktok_ad_details: 'tiktok_ads_library_ad_details',
  google_ads_advertiser_search: 'google_ads_transparency_center_advertiser_search',
  google_ads_search: 'google_ads_transparency_center',
  google_ad_details: 'google_ads_transparency_center_ad_details',
}
