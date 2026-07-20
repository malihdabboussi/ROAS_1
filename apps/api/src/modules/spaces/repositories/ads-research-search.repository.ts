import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  AdAdvertiserRef,
  AdSearchKind,
  AdSearchResultItem,
  AdsResearchPlatform,
  SavedAdSearch,
  SavedAdSearchFilters,
  SavedAdSearchSummary,
} from '../types/ads-research.types'

const SAVED_SEARCH_SELECT =
  'id, platform, kind, title, query, advertiser, filters, results, result_count, next_page_token, mission_ids, created_at, last_run_at'

@Injectable()
export class AdsResearchSearchRepository {
  async listSavedSearches(
    supabase: SupabaseClient,
    spaceId: string,
  ): Promise<SavedAdSearchSummary[]> {
    const { data, error } = await supabase
      .from('space_ad_searches')
      .select(
        'id, platform, kind, title, query, advertiser, filters, result_count, mission_ids, created_at, last_run_at',
      )
      .eq('space_id', spaceId)
      .order('created_at', { ascending: false })
    if (error) throw new BadRequestException(`Failed to list saved ad searches: ${error.message}`)
    return (data ?? []) as SavedAdSearchSummary[]
  }

  async getSavedSearch(
    supabase: SupabaseClient,
    spaceId: string,
    searchId: string,
  ): Promise<SavedAdSearch> {
    const { data, error } = await supabase
      .from('space_ad_searches')
      .select(SAVED_SEARCH_SELECT)
      .eq('space_id', spaceId)
      .eq('id', searchId)
      .maybeSingle()
    if (error) throw new BadRequestException(`Failed to load saved ad search: ${error.message}`)
    if (!data) throw new BadRequestException('Saved ad search not found')
    return data as SavedAdSearch
  }

  async findSavedSearchByIdentity(
    supabase: SupabaseClient,
    args: {
      spaceId: string
      platform: AdsResearchPlatform
      kind: AdSearchKind
      query: string
      advertiser: AdAdvertiserRef | null
    },
  ): Promise<{ id: string; mission_ids: string[] } | null> {
    let query = supabase
      .from('space_ad_searches')
      .select('id, mission_ids')
      .eq('space_id', args.spaceId)
      .eq('platform', args.platform)
      .eq('kind', args.kind)
    query =
      args.kind === 'brand'
        ? query.eq('advertiser->>id', args.advertiser!.id)
        : query.ilike('query', args.query)
    const { data } = await query.limit(1)
    return (data?.[0] as { id: string; mission_ids: string[] } | undefined) ?? null
  }

  async updateSavedSearchReturning(
    supabase: SupabaseClient,
    searchId: string,
    patch: Record<string, unknown>,
    errorLabel: string,
  ): Promise<SavedAdSearch> {
    const { data, error } = await supabase
      .from('space_ad_searches')
      .update(patch)
      .eq('id', searchId)
      .select(SAVED_SEARCH_SELECT)
      .single()
    if (error) throw new BadRequestException(`${errorLabel}: ${error.message}`)
    return data as SavedAdSearch
  }

  async createSavedSearch(
    supabase: SupabaseClient,
    payload: {
      user_id: string
      org_id: string | null
      space_id: string
      platform: AdsResearchPlatform
      kind: AdSearchKind
      title: string
      query: string
      advertiser: AdAdvertiserRef | null
      filters: SavedAdSearchFilters
      results: AdSearchResultItem[]
      result_count: number
      next_page_token: string | null
      mission_ids: string[]
    },
  ): Promise<SavedAdSearch> {
    const { data, error } = await supabase
      .from('space_ad_searches')
      .insert(payload)
      .select(SAVED_SEARCH_SELECT)
      .single()
    if (error) throw new BadRequestException(`Failed to save ad search: ${error.message}`)
    return data as SavedAdSearch
  }

  async updateSavedSearch(
    supabase: SupabaseClient,
    spaceId: string,
    searchId: string,
    patch: Record<string, unknown>,
    errorLabel: string,
  ): Promise<void> {
    const { error } = await supabase
      .from('space_ad_searches')
      .update(patch)
      .eq('space_id', spaceId)
      .eq('id', searchId)
    if (error) throw new BadRequestException(`${errorLabel}: ${error.message}`)
  }

  async deleteSavedSearch(
    supabase: SupabaseClient,
    spaceId: string,
    searchId: string,
  ): Promise<void> {
    const { error } = await supabase
      .from('space_ad_searches')
      .delete()
      .eq('space_id', spaceId)
      .eq('id', searchId)
    if (error) throw new BadRequestException(`Failed to delete saved ad search: ${error.message}`)
  }
}
