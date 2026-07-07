import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  SavedTopicSearch,
  SavedTopicSearchFilters,
  SavedTopicSearchSummary,
  SocialResearchPlatform,
  TopicSearchResultItem,
} from '../types/social-research.types'

const SAVED_TOPIC_SEARCH_SELECT =
  'id, platform, title, query, filters, results, result_count, next_cursor, created_at, last_run_at'

@Injectable()
export class SocialResearchTopicSearchRepository {
  async findExistingMediaIds(
    supabase: SupabaseClient,
    spaceId: string,
    viewType: string,
    mediaIds: string[],
  ): Promise<Set<string>> {
    if (mediaIds.length === 0) return new Set()
    const { data } = await supabase
      .from('space_items')
      .select('id, custom_data->>media_id')
      .eq('space_id', spaceId)
      .eq('custom_data->>_view_type', viewType)
      .in('custom_data->>media_id', mediaIds)
    return new Set(
      (data ?? [])
        .map((row) => (row as Record<string, unknown>)['media_id'])
        .filter((id): id is string => typeof id === 'string' && id.length > 0),
    )
  }

  async listSavedSearches(
    supabase: SupabaseClient,
    spaceId: string,
  ): Promise<SavedTopicSearchSummary[]> {
    const { data, error } = await supabase
      .from('space_topic_searches')
      .select('id, platform, title, query, filters, result_count, created_at, last_run_at')
      .eq('space_id', spaceId)
      .order('created_at', { ascending: false })
    if (error) throw new BadRequestException(`Failed to list saved searches: ${error.message}`)
    return (data ?? []) as SavedTopicSearchSummary[]
  }

  async getSavedSearch(
    supabase: SupabaseClient,
    spaceId: string,
    searchId: string,
  ): Promise<SavedTopicSearch> {
    const { data, error } = await supabase
      .from('space_topic_searches')
      .select(SAVED_TOPIC_SEARCH_SELECT)
      .eq('space_id', spaceId)
      .eq('id', searchId)
      .maybeSingle()
    if (error) throw new BadRequestException(`Failed to load saved search: ${error.message}`)
    if (!data) throw new BadRequestException('Saved search not found')
    return data as SavedTopicSearch
  }

  async findSavedSearchByQuery(
    supabase: SupabaseClient,
    spaceId: string,
    platform: SocialResearchPlatform,
    query: string,
  ): Promise<{ id: string; title: string; results: TopicSearchResultItem[] } | null> {
    const { data } = await supabase
      .from('space_topic_searches')
      .select('id, title, results')
      .eq('space_id', spaceId)
      .eq('platform', platform)
      .ilike('query', query)
      .limit(1)
    return (data?.[0] as { id: string; title: string; results: TopicSearchResultItem[] }) ?? null
  }

  async updateSavedSearchReturning(
    supabase: SupabaseClient,
    searchId: string,
    patch: Record<string, unknown>,
    errorLabel: string,
  ): Promise<SavedTopicSearch> {
    const { data, error } = await supabase
      .from('space_topic_searches')
      .update(patch)
      .eq('id', searchId)
      .select(SAVED_TOPIC_SEARCH_SELECT)
      .single()
    if (error) throw new BadRequestException(`${errorLabel}: ${error.message}`)
    return data as SavedTopicSearch
  }

  async createSavedSearch(
    supabase: SupabaseClient,
    payload: {
      user_id: string
      org_id: string | null
      space_id: string
      platform: SocialResearchPlatform
      title: string
      query: string
      filters: SavedTopicSearchFilters
      results: TopicSearchResultItem[]
      result_count: number
      next_cursor: string | null
    },
  ): Promise<SavedTopicSearch> {
    const { data, error } = await supabase
      .from('space_topic_searches')
      .insert(payload)
      .select(SAVED_TOPIC_SEARCH_SELECT)
      .single()
    if (error) throw new BadRequestException(`Failed to save search: ${error.message}`)
    return data as SavedTopicSearch
  }

  async updateSavedSearch(
    supabase: SupabaseClient,
    spaceId: string,
    searchId: string,
    patch: Record<string, unknown>,
    errorLabel: string,
  ): Promise<void> {
    const { error } = await supabase
      .from('space_topic_searches')
      .update(patch)
      .eq('space_id', spaceId)
      .eq('id', searchId)
    if (error) throw new BadRequestException(`${errorLabel}: ${error.message}`)
  }

  async updateSavedSearchWithSpaceReturning(
    supabase: SupabaseClient,
    spaceId: string,
    searchId: string,
    patch: Record<string, unknown>,
    errorLabel: string,
  ): Promise<SavedTopicSearch> {
    const { data, error } = await supabase
      .from('space_topic_searches')
      .update(patch)
      .eq('space_id', spaceId)
      .eq('id', searchId)
      .select(SAVED_TOPIC_SEARCH_SELECT)
      .single()
    if (error) throw new BadRequestException(`${errorLabel}: ${error.message}`)
    return data as SavedTopicSearch
  }

  async deleteSavedSearch(
    supabase: SupabaseClient,
    spaceId: string,
    searchId: string,
  ): Promise<void> {
    const { error } = await supabase
      .from('space_topic_searches')
      .delete()
      .eq('space_id', spaceId)
      .eq('id', searchId)
    if (error) throw new BadRequestException(`Failed to delete saved search: ${error.message}`)
  }
}
