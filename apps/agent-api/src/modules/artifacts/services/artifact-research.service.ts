import { Injectable } from '@nestjs/common'
import type { ArtifactActionHandler } from './artifact-action.registry'

type JsonRecord = Record<string, unknown>
type SocialResearchPlatform = 'instagram' | 'tiktok' | 'youtube'
type AdsResearchPlatform = 'meta' | 'tiktok' | 'google'
type AdsResearchKind = 'topic' | 'brand'

const SOCIAL_PLATFORMS = new Set<SocialResearchPlatform>(['instagram', 'tiktok', 'youtube'])
const ADS_PLATFORMS = new Set<AdsResearchPlatform>(['meta', 'tiktok', 'google'])
const ADS_KINDS = new Set<AdsResearchKind>(['topic', 'brand'])

const SOCIAL_VIEW_TYPE_BY_PLATFORM: Record<SocialResearchPlatform, string> = {
  instagram: 'instagram_research',
  tiktok: 'tiktok_research',
  youtube: 'youtube_research',
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function recordValue(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : null
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function saveLimit(value: unknown): number {
  const raw =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== ''
        ? Number(value)
        : 0
  if (!Number.isFinite(raw) || raw <= 0) return 0
  return Math.min(Math.floor(raw), 25)
}

function resultRecord(value: unknown): JsonRecord {
  return recordValue(value) ?? {}
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Research request failed'
}

@Injectable()
export class ArtifactResearchService {
  getHandlers(target: Record<string, any>): Record<string, ArtifactActionHandler> {
    return {
      run_social_research_search: (data, sessionKey) =>
        this.runSocialResearchSearch(target, data, sessionKey),
      run_ads_research_search: (data, sessionKey) =>
        this.runAdsResearchSearch(target, data, sessionKey),
      search_ads_research_advertisers: (data, sessionKey) =>
        this.searchAdsResearchAdvertisers(target, data, sessionKey),
    }
  }

  private async runSocialResearchSearch(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ): Promise<unknown> {
    const spaceId = stringValue(input.space_id)
    const query = stringValue(input.query)
    const platformRaw = stringValue(input.platform)?.toLowerCase() ?? ''
    if (!spaceId) return { success: false, error: 'space_id is required' }
    if (!query) return { success: false, error: 'query is required' }
    if (!SOCIAL_PLATFORMS.has(platformRaw as SocialResearchPlatform)) {
      return { success: false, error: 'platform must be one of: instagram, tiktok, youtube' }
    }

    const platform = platformRaw as SocialResearchPlatform
    const title = stringValue(input.title) ?? query
    const filters = recordValue(input.filters) ?? {}
    const cursor = stringValue(input.cursor)
    const saveTopN = saveLimit(input.save_top_n)

    try {
      const page = resultRecord(
        await target.mainApiCall(
          'POST',
          `/api/spaces/${spaceId}/social-research/${platform}/topic-search`,
          sessionKey,
          { query, ...(cursor ? { cursor } : {}) },
        ),
      )
      const items = arrayValue(page.items)
      const nextCursor = stringValue(page.next_cursor)
      const savedSearch = items.length
        ? (resultRecord(
            await target.mainApiCall(
              'POST',
              `/api/spaces/${spaceId}/social-research/topic-searches`,
              sessionKey,
              {
                platform,
                title,
                query,
                filters,
                items,
                next_cursor: nextCursor,
              },
            ),
          ).search ?? null)
        : null
      const savedItems =
        saveTopN > 0 && items.length > 0
          ? await target.mainApiCall(
              'POST',
              `/api/spaces/${spaceId}/social-research/${platform}/topic-search/save`,
              sessionKey,
              { query, items: items.slice(0, saveTopN) },
            )
          : null

      return {
        success: true,
        action: 'run_social_research_search',
        space_id: spaceId,
        platform,
        query,
        result_count: items.length,
        next_cursor: nextCursor,
        saved_search_created: Boolean(savedSearch),
        saved_search: savedSearch,
        saved_items: savedItems,
        items,
        space_refresh: {
          space_id: spaceId,
          saved_searches: ['social_research'],
          view_types: [SOCIAL_VIEW_TYPE_BY_PLATFORM[platform]],
        },
      }
    } catch (err) {
      const msg = errorMessage(err)
      target.logger?.error?.(`[run_social_research_search] ${msg}`)
      return { success: false, error: msg }
    }
  }

  private async runAdsResearchSearch(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ): Promise<unknown> {
    const spaceId = stringValue(input.space_id)
    const query = stringValue(input.query)
    const platformRaw = stringValue(input.platform)?.toLowerCase() ?? ''
    const kindRaw = stringValue(input.kind)?.toLowerCase() ?? ''
    if (!spaceId) return { success: false, error: 'space_id is required' }
    if (!query) return { success: false, error: 'query is required' }
    if (!ADS_PLATFORMS.has(platformRaw as AdsResearchPlatform)) {
      return { success: false, error: 'platform must be one of: meta, tiktok, google' }
    }
    if (!ADS_KINDS.has(kindRaw as AdsResearchKind)) {
      return { success: false, error: 'kind must be one of: topic, brand' }
    }

    const platform = platformRaw as AdsResearchPlatform
    const kind = kindRaw as AdsResearchKind
    const advertiser = recordValue(input.advertiser)
    if (platform === 'google' && kind === 'topic') {
      return { success: false, error: 'Google ads research supports brand searches only' }
    }
    if (kind === 'brand' && !advertiser) {
      return { success: false, error: 'Brand searches require an advertiser object' }
    }

    const filters = recordValue(input.filters) ?? {}
    const nextPageToken = stringValue(input.next_page_token)
    const title =
      stringValue(input.title) ?? (kind === 'brand' ? stringValue(advertiser?.name) : null) ?? query
    const saveTopN = saveLimit(input.save_top_n)
    const missionId = await this.resolveMissionId(target, sessionKey)

    try {
      const page = resultRecord(
        await target.mainApiCall(
          'POST',
          `/api/spaces/${spaceId}/ads-research/${platform}/search`,
          sessionKey,
          {
            kind,
            query,
            advertiser,
            filters,
            ...(nextPageToken ? { next_page_token: nextPageToken } : {}),
          },
        ),
      )
      const items = arrayValue(page.items)
      const nextToken = stringValue(page.next_page_token)
      const savedSearch = items.length
        ? (resultRecord(
            await target.mainApiCall(
              'POST',
              `/api/spaces/${spaceId}/ads-research/searches`,
              sessionKey,
              {
                platform,
                kind,
                title,
                query,
                advertiser,
                filters,
                items,
                next_page_token: nextToken,
                ...(missionId ? { mission_id: missionId } : {}),
              },
            ),
          ).search ?? null)
        : null
      const savedItems =
        saveTopN > 0 && items.length > 0
          ? await target.mainApiCall(
              'POST',
              `/api/spaces/${spaceId}/ads-research/${platform}/save`,
              sessionKey,
              { query, items: items.slice(0, saveTopN) },
            )
          : null

      return {
        success: true,
        action: 'run_ads_research_search',
        space_id: spaceId,
        platform,
        kind,
        query,
        advertiser,
        result_count: items.length,
        next_page_token: nextToken,
        saved_search_created: Boolean(savedSearch),
        saved_search: savedSearch,
        saved_items: savedItems,
        items,
        space_refresh: {
          space_id: spaceId,
          saved_searches: ['ads_research'],
          view_types: ['ads_research'],
        },
      }
    } catch (err) {
      const msg = errorMessage(err)
      target.logger?.error?.(`[run_ads_research_search] ${msg}`)
      return { success: false, error: msg }
    }
  }

  private async resolveMissionId(
    target: Record<string, any>,
    sessionKey?: string,
  ): Promise<string | null> {
    if (!sessionKey || typeof target.resolveMissionContext !== 'function') {
      return null
    }
    try {
      const userId = target.resolveUserId(sessionKey)
      const context = await target.resolveMissionContext(sessionKey, userId)
      return stringValue(context?.missionId)
    } catch {
      return null
    }
  }

  private async searchAdsResearchAdvertisers(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ): Promise<unknown> {
    const spaceId = stringValue(input.space_id)
    const query = stringValue(input.query)
    const platformRaw = stringValue(input.platform)?.toLowerCase() ?? ''
    if (!spaceId) return { success: false, error: 'space_id is required' }
    if (!query) return { success: false, error: 'query is required' }
    if (!ADS_PLATFORMS.has(platformRaw as AdsResearchPlatform)) {
      return { success: false, error: 'platform must be one of: meta, tiktok, google' }
    }

    const platform = platformRaw as AdsResearchPlatform
    const params = new URLSearchParams({ q: query })
    try {
      const result = await target.mainApiCall(
        'GET',
        `/api/spaces/${spaceId}/ads-research/${platform}/advertisers?${params.toString()}`,
        sessionKey,
      )
      return {
        success: true,
        action: 'search_ads_research_advertisers',
        space_id: spaceId,
        platform,
        query,
        ...resultRecord(result),
      }
    } catch (err) {
      const msg = errorMessage(err)
      target.logger?.error?.(`[search_ads_research_advertisers] ${msg}`)
      return { success: false, error: msg }
    }
  }
}
