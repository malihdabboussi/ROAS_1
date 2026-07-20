import { BadRequestException, Injectable, Optional } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SearchApiService } from '../../integrations/searchapi/services/searchapi-api.service'
import { AdsResearchSearchRepository } from '../repositories/ads-research-search.repository'
import { SpacesRepository } from '../repositories/spaces.repository'
import type {
  AdAdvertiserRef,
  AdDetails,
  AdSearchKind,
  AdSearchPage,
  AdSearchResultItem,
  AdsResearchPlatform,
  SavedAdSearch,
  SavedAdSearchFilters,
  SavedAdSearchSummary,
} from '../types/ads-research.types'
import {
  asArr,
  asRec,
  normalizeAds,
  normalizeGoogleAdDetails,
  normalizeMetaAdDetails,
  normalizeTiktokAdDetails,
  pickStr,
} from './ads-research-normalizers'

const ADS_ENGINE_BY_PLATFORM: Record<AdsResearchPlatform, string> = {
  meta: 'meta_ad_library',
  tiktok: 'tiktok_ads_library',
  google: 'google_ads_transparency_center',
}

const ADVERTISER_ENGINE_BY_PLATFORM: Record<AdsResearchPlatform, string> = {
  meta: 'meta_ad_library_page_search',
  tiktok: 'tiktok_ads_library_advertiser_search',
  google: 'google_ads_transparency_center_advertiser_search',
}

const AD_DETAILS_ENGINE_BY_PLATFORM: Record<AdsResearchPlatform, string> = {
  meta: 'meta_ad_library_ad_details',
  tiktok: 'tiktok_ads_library_ad_details',
  google: 'google_ads_transparency_center_ad_details',
}

const TIKTOK_AGE_BRACKETS = ['13-17', '18-24', '25-34', '35-44', '45-54', '55+'] as const
const TIKTOK_GENDER_KEYS = ['female', 'male', 'unknown'] as const

type Rec = Record<string, unknown>

@Injectable()
export class AdsResearchSearchService {
  private readonly savedSearchesRepo: AdsResearchSearchRepository

  constructor(
    private readonly repo: SpacesRepository,
    private readonly searchApi: SearchApiService,
    @Optional()
    savedSearchesRepo?: AdsResearchSearchRepository,
  ) {
    this.savedSearchesRepo = savedSearchesRepo ?? new AdsResearchSearchRepository()
  }

  // -------------------------------------------------------------------------
  // Live search
  // -------------------------------------------------------------------------

  async searchAds(opts: {
    platform: AdsResearchPlatform
    kind: AdSearchKind
    query: string
    advertiser: AdAdvertiserRef | null
    nextPageToken?: string | null
    filters?: SavedAdSearchFilters | null
  }): Promise<AdSearchPage> {
    if (opts.platform === 'google' && opts.kind === 'topic') {
      throw new BadRequestException(
        'Google Ads Transparency has no keyword search — use a brand search',
      )
    }
    if (opts.kind === 'brand' && !opts.advertiser) {
      throw new BadRequestException('Brand searches require an advertiser')
    }
    if (opts.kind === 'topic' && !opts.query.trim()) {
      throw new BadRequestException('Search query is required')
    }

    const filters = opts.filters ?? {}
    const country = (filters.country ?? '').trim()
    const hasCountry = country !== '' && country.toLowerCase() !== 'all'

    const params: Record<string, string | undefined | null> = {
      next_page_token: opts.nextPageToken ?? undefined,
    }
    if (opts.platform === 'meta') {
      if (opts.kind === 'brand') params.page_id = opts.advertiser!.platform_ref
      else {
        // Unquoted queries match any word loosely ("AI Brain" → generic "AI"
        // ads); quoting forces phrase matching. Default on, user-toggleable.
        const query = opts.query.trim()
        const exact = filters.exact_phrase !== false
        params.q = exact && !query.startsWith('"') && query.includes(' ') ? `"${query}"` : query
      }
      params.active_status = 'all'
      if (hasCountry) params.country = country.toUpperCase()
    } else if (opts.platform === 'tiktok') {
      if (opts.kind === 'brand') params.advertiser_token = opts.advertiser!.platform_ref
      else params.q = opts.query.trim()
      // Default sort is recency, which surfaces tiny junk ads — sort by reach
      // so proven ads come first.
      params.sort_by = 'unique_users_seen_high_to_low'
      if (hasCountry) params.country = country.toUpperCase()
    } else {
      params.advertiser_id = opts.advertiser!.platform_ref
      if (hasCountry) params.region = country.toUpperCase()
    }

    const { status, body } = await this.searchApi.search(
      ADS_ENGINE_BY_PLATFORM[opts.platform],
      params,
    )
    if (status >= 400) {
      const message = pickStr(asRec(body), ['error', 'message']) ?? `status ${status}`
      throw new BadRequestException(`Ad search failed: ${message}`)
    }

    const root = asRec(body)
    const items = normalizeAds(opts.platform, root)
    const nextPageToken = pickStr(asRec(root.pagination), ['next_page_token'])
    return { items, next_page_token: nextPageToken }
  }

  async searchAdvertisers(opts: {
    platform: AdsResearchPlatform
    query: string
  }): Promise<AdAdvertiserRef[]> {
    const query = opts.query.trim()
    if (!query) throw new BadRequestException('Search query is required')

    const { status, body } = await this.searchApi.search(
      ADVERTISER_ENGINE_BY_PLATFORM[opts.platform],
      { q: query },
    )
    if (status >= 400) {
      const message = pickStr(asRec(body), ['error', 'message']) ?? `status ${status}`
      throw new BadRequestException(`Advertiser search failed: ${message}`)
    }

    const root = asRec(body)
    if (opts.platform === 'meta') {
      return asArr(root.page_results)
        .map((raw): AdAdvertiserRef | null => {
          const page = asRec(raw)
          const id = pickStr(page, ['page_id', 'id'])
          const name = pickStr(page, ['name'])
          if (!id || !name) return null
          return {
            id,
            name,
            image_url: pickStr(page, ['image_uri', 'image_url']),
            platform_ref: id,
            is_verified: pickStr(page, ['verification']) === 'VERIFIED',
          } satisfies AdAdvertiserRef
        })
        .filter((x): x is AdAdvertiserRef => x !== null)
    }

    // TikTok and Google both expose a flat advertisers list.
    const rawList =
      asArr(root.advertisers).length > 0 ? asArr(root.advertisers) : asArr(root.results)
    return rawList
      .map((raw): AdAdvertiserRef | null => {
        const adv = asRec(raw)
        const id = pickStr(adv, ['id', 'advertiser_id'])
        const name = pickStr(adv, ['name', 'advertiser', 'advertiser_name'])
        if (!id || !name) return null
        const token = pickStr(adv, ['token', 'advertiser_token'])
        return {
          id,
          name,
          image_url: pickStr(adv, ['image_url', 'avatar', 'profile_image']),
          platform_ref: opts.platform === 'tiktok' ? (token ?? id) : id,
          is_verified: adv.is_verified === true || adv.verified === true,
        } satisfies AdAdvertiserRef
      })
      .filter((x): x is AdAdvertiserRef => x !== null)
  }

  // -------------------------------------------------------------------------
  // Saved searches (frozen snapshots — sibling of space_topic_searches)
  // -------------------------------------------------------------------------

  async listSavedSearches(opts: {
    supabase: SupabaseClient
    spaceId: string
  }): Promise<SavedAdSearchSummary[]> {
    return this.savedSearchesRepo.listSavedSearches(opts.supabase, opts.spaceId)
  }

  async getSavedSearch(opts: {
    supabase: SupabaseClient
    spaceId: string
    searchId: string
  }): Promise<SavedAdSearch> {
    return this.savedSearchesRepo.getSavedSearch(opts.supabase, opts.spaceId, opts.searchId)
  }

  /**
   * Upserts by (space, platform, kind, query/advertiser) — searches auto-save
   * on run, so re-running the same query refreshes the existing row instead of
   * spamming the sidebar. A custom title set by the user survives re-runs.
   */
  async createSavedSearch(opts: {
    supabase: SupabaseClient
    userId: string
    orgId: string | null
    spaceId: string
    platform: AdsResearchPlatform
    kind: AdSearchKind
    title: string
    query: string
    advertiser: AdAdvertiserRef | null
    filters: SavedAdSearchFilters
    items: AdSearchResultItem[]
    nextPageToken: string | null
    missionId?: string | null
  }): Promise<SavedAdSearch> {
    const query = opts.query.trim()
    const title = opts.title.trim() || (opts.kind === 'brand' ? opts.advertiser?.name : query) || ''
    if (!title) throw new BadRequestException('A title or query is required')
    if (opts.kind === 'brand' && !opts.advertiser) {
      throw new BadRequestException('Brand searches require an advertiser')
    }

    const existing = await this.savedSearchesRepo.findSavedSearchByIdentity(opts.supabase, {
      spaceId: opts.spaceId,
      platform: opts.platform,
      kind: opts.kind,
      query,
      advertiser: opts.advertiser,
    })

    const lastRunAt = new Date().toISOString()
    if (existing) {
      const missionIds = opts.missionId
        ? [...new Set([...(existing.mission_ids ?? []), opts.missionId])]
        : (existing.mission_ids ?? [])
      return this.savedSearchesRepo.updateSavedSearchReturning(
        opts.supabase,
        existing.id,
        {
          results: opts.items,
          result_count: opts.items.length,
          next_page_token: opts.nextPageToken,
          last_run_at: lastRunAt,
          updated_at: lastRunAt,
          mission_ids: missionIds,
        },
        'Failed to save ad search',
      )
    }

    return this.savedSearchesRepo.createSavedSearch(opts.supabase, {
      user_id: opts.userId,
      org_id: opts.orgId,
      space_id: opts.spaceId,
      platform: opts.platform,
      kind: opts.kind,
      title,
      query,
      advertiser: opts.advertiser,
      filters: opts.filters ?? {},
      results: opts.items,
      result_count: opts.items.length,
      next_page_token: opts.nextPageToken,
      mission_ids: opts.missionId ? [opts.missionId] : [],
    })
  }

  async updateSavedSearch(opts: {
    supabase: SupabaseClient
    spaceId: string
    searchId: string
    title?: string
    filters?: SavedAdSearchFilters
    /** Replaces the frozen snapshot — used to persist Analyze details onto results. */
    results?: AdSearchResultItem[]
  }): Promise<void> {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (opts.title !== undefined) {
      const title = opts.title.trim()
      if (!title) throw new BadRequestException('Title cannot be empty')
      patch.title = title
    }
    if (opts.filters !== undefined) patch.filters = opts.filters
    if (opts.results !== undefined) {
      patch.results = opts.results
      patch.result_count = opts.results.length
    }
    await this.savedSearchesRepo.updateSavedSearch(
      opts.supabase,
      opts.spaceId,
      opts.searchId,
      patch,
      'Failed to update saved ad search',
    )
  }

  async deleteSavedSearch(opts: {
    supabase: SupabaseClient
    spaceId: string
    searchId: string
  }): Promise<void> {
    await this.savedSearchesRepo.deleteSavedSearch(opts.supabase, opts.spaceId, opts.searchId)
  }

  /** Re-runs the saved query and replaces the snapshot (one billed call). */
  async refreshSavedSearch(opts: {
    supabase: SupabaseClient
    spaceId: string
    searchId: string
  }): Promise<SavedAdSearch> {
    const saved = await this.getSavedSearch(opts)
    const page = await this.searchAds({
      platform: saved.platform,
      kind: saved.kind,
      query: saved.query,
      advertiser: saved.advertiser,
      filters: saved.filters,
    })

    const lastRunAt = new Date().toISOString()
    await this.savedSearchesRepo.updateSavedSearch(
      opts.supabase,
      opts.spaceId,
      opts.searchId,
      {
        results: page.items,
        result_count: page.items.length,
        next_page_token: page.next_page_token,
        last_run_at: lastRunAt,
        updated_at: lastRunAt,
      },
      'Failed to refresh saved ad search',
    )
    return {
      ...saved,
      results: page.items,
      result_count: page.items.length,
      next_page_token: page.next_page_token,
      last_run_at: lastRunAt,
    }
  }

  // -------------------------------------------------------------------------
  // Ad details (Analyze action — one billed call per ad)
  // -------------------------------------------------------------------------

  async getAdDetails(opts: {
    platform: AdsResearchPlatform
    adId: string
    /** Meta: preferred ad_details_token captured during search. */
    detailsToken?: string | null
    /** Google: the creative's advertiser (required by the engine). */
    advertiserId?: string | null
  }): Promise<AdDetails> {
    if (!opts.adId.trim()) throw new BadRequestException('Ad id is required')

    const params: Record<string, string | undefined | null> = {}
    if (opts.platform === 'meta') {
      if (opts.detailsToken) params.ad_details_token = opts.detailsToken
      else params.ad_archive_id = opts.adId
    } else if (opts.platform === 'tiktok') {
      params.ad_id = opts.adId
    } else {
      if (!opts.advertiserId) {
        throw new BadRequestException('Google ad details require the advertiser id')
      }
      params.advertiser_id = opts.advertiserId
      params.creative_id = opts.adId
    }

    const { status, body } = await this.searchApi.search(
      AD_DETAILS_ENGINE_BY_PLATFORM[opts.platform],
      params,
    )
    if (status >= 400) {
      const message = pickStr(asRec(body), ['error', 'message']) ?? `status ${status}`
      throw new BadRequestException(`Ad analysis failed: ${message}`)
    }

    const root = asRec(body)
    if (opts.platform === 'meta') return normalizeMetaAdDetails(opts.adId, root)
    if (opts.platform === 'tiktok') return normalizeTiktokAdDetails(opts.adId, root)
    return normalizeGoogleAdDetails(opts.adId, root)
  }

  // -------------------------------------------------------------------------
  // Bookmark ads into the space (swipe file)
  // -------------------------------------------------------------------------

  async saveAdsToSpace(opts: {
    supabase: SupabaseClient
    userId: string
    orgId: string | null
    spaceId: string
    platform: AdsResearchPlatform
    query: string
    items: AdSearchResultItem[]
  }): Promise<{ created_count: number; skipped_count: number; item_ids: string[] }> {
    if (opts.items.length === 0) throw new BadRequestException('No ads to save')

    const existing = await this.repo.findItemsBySpaceIdForAccess(opts.supabase, opts.spaceId)
    const existingAdIds = new Set(
      existing
        .filter((row) => ((row.custom_data ?? {}) as Rec)._view_type === 'ads_research')
        .map((row) => String(((row.custom_data ?? {}) as Rec).ad_id ?? ''))
        .filter(Boolean),
    )

    const itemIds: string[] = []
    let created = 0
    let skipped = 0
    for (const ad of opts.items) {
      if (!ad.ad_id || existingAdIds.has(ad.ad_id)) {
        skipped++
        continue
      }
      const customData: Rec = {
        _view_type: 'ads_research',
        _platform: ad.platform,
        _source: 'ad_search',
        _search_query: opts.query,
        ad_id: ad.ad_id,
        advertiser_name: ad.advertiser_name,
        advertiser_id: ad.advertiser_id,
        format: ad.format,
        creative_text: ad.creative_text,
        image_url: ad.image_url,
        video_url: ad.video_url,
        landing_url: ad.landing_url,
        first_shown: ad.first_shown,
        last_shown: ad.last_shown,
        days_running: ad.days_running,
        reach_estimate: ad.reach_estimate,
        is_active: ad.is_active,
        details_link: ad.details_link,
        details_token: ad.details_token ?? null,
        variant_count: ad.variant_count ?? null,
        ad_details: ad.details ?? null,
        transcript: ad.transcript ?? null,
        ad_breakdown: ad.breakdown ?? null,
      }
      const createdItem = await this.repo.createItem(
        opts.supabase,
        opts.userId,
        opts.spaceId,
        {
          title:
            ad.creative_text?.slice(0, 120) ||
            (ad.advertiser_name ? `${ad.advertiser_name} — ${ad.ad_id}` : ad.ad_id),
          custom_data: customData,
        },
        opts.orgId,
      )
      existingAdIds.add(ad.ad_id)
      itemIds.push(String(createdItem.id))
      created++
    }
    return { created_count: created, skipped_count: skipped, item_ids: itemIds }
  }
}
