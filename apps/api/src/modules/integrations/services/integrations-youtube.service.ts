import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'
import { ComposioService } from '../../composio/services/composio.service'
import { IntegrationsRepository } from '../repositories/integrations.repository'
import { IntegrationsCoreService } from './integrations-core.service'

export type YoutubeAuthenticatedChannel = {
  id: string
  name: string
  handle?: string
}

function normalizeMetadata(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>
  return {}
}

/** Walk Composio YouTube tool payloads (same paths as social-insights extractYoutubeItems). */
export function extractYoutubeChannelItems(
  res: Record<string, unknown> | null,
): Array<Record<string, unknown>> {
  if (!res || typeof res !== 'object') return []

  const stack: unknown[] = [res, (res as Record<string, unknown>).data]
  const data = (res as Record<string, unknown>).data
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>
    stack.push(d.data, d.items, d.response_dict, d.response_data)
    const responseDict = d.response_dict
    if (responseDict && typeof responseDict === 'object') {
      stack.push((responseDict as Record<string, unknown>).items)
    }
    const responseData = d.response_data
    if (responseData && typeof responseData === 'object') {
      stack.push((responseData as Record<string, unknown>).items)
    }
  }

  for (const node of stack) {
    if (Array.isArray(node)) {
      return node.filter((x) => x && typeof x === 'object') as Array<Record<string, unknown>>
    }
    if (node && typeof node === 'object') {
      const items = (node as Record<string, unknown>).items
      if (Array.isArray(items)) {
        return items.filter((x) => x && typeof x === 'object') as Array<Record<string, unknown>>
      }
    }
  }
  return []
}

function normalizeYoutubeChannelId(raw: unknown): string {
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    const ucMatch = trimmed.match(/UC[\w-]{22,}/)
    return ucMatch?.[0] ?? trimmed
  }
  if (raw && typeof raw === 'object') {
    const row = raw as Record<string, unknown>
    return normalizeYoutubeChannelId(row.channelId ?? row.channel_id ?? row.id)
  }
  return ''
}

export function composioYoutubeToolError(res: Record<string, unknown> | null): string | null {
  if (!res || typeof res !== 'object') return null
  if (res.successful === false) {
    const err = res.error
    if (typeof err === 'string' && err.trim()) return err.trim()
    if (err && typeof err === 'object') {
      const msg = (err as Record<string, unknown>).message
      if (typeof msg === 'string' && msg.trim()) return msg.trim()
    }
  }
  const data = res.data
  if (data && typeof data === 'object') {
    const nested = (data as Record<string, unknown>).error
    if (typeof nested === 'string' && nested.trim()) return nested.trim()
  }
  return null
}

/** Parse Composio YOUTUBE_GET_CHANNEL_STATISTICS (mine) and similar list payloads. */
export function parseYoutubeChannelsResponse(
  res: Record<string, unknown> | null,
): YoutubeAuthenticatedChannel[] {
  const items = extractYoutubeChannelItems(res)
  const out: YoutubeAuthenticatedChannel[] = []
  const seen = new Set<string>()

  for (const row of items) {
    const id = normalizeYoutubeChannelId(row.id ?? row.channel_id ?? row.channelId)
    if (!id || !id.startsWith('UC') || seen.has(id)) continue

    const snippet =
      row.snippet && typeof row.snippet === 'object'
        ? (row.snippet as Record<string, unknown>)
        : null
    const title =
      (typeof snippet?.title === 'string' && snippet.title.trim()) ||
      (typeof row.title === 'string' && row.title.trim()) ||
      `Channel ${id}`
    const customUrl = typeof snippet?.customUrl === 'string' ? snippet.customUrl.trim() : undefined

    seen.add(id)
    out.push({ id, name: title, handle: customUrl })
  }

  return out
}

export function parseYoutubeChannelsFromPlaylistsResponse(
  res: Record<string, unknown> | null,
): YoutubeAuthenticatedChannel[] {
  const items = extractYoutubeChannelItems(res)
  const out: YoutubeAuthenticatedChannel[] = []
  const seen = new Set<string>()

  for (const row of items) {
    const snippet =
      row.snippet && typeof row.snippet === 'object'
        ? (row.snippet as Record<string, unknown>)
        : null
    const id = normalizeYoutubeChannelId(snippet?.channelId)
    if (!id || !id.startsWith('UC') || seen.has(id)) continue
    const title =
      (typeof snippet?.channelTitle === 'string' && snippet.channelTitle.trim()) || `Channel ${id}`
    seen.add(id)
    out.push({ id, name: title })
  }

  return out
}

@Injectable()
export class IntegrationsYoutubeService {
  private readonly logger = new Logger(IntegrationsYoutubeService.name)

  constructor(
    private readonly repository: IntegrationsRepository,
    private readonly composio: ComposioService,
    private readonly core: IntegrationsCoreService,
  ) {}

  async listAuthenticatedChannels(
    supabase: SupabaseClient,
    user: { id: string },
    scope: RequestScope,
    options: { user_integration_id: string },
  ): Promise<Record<string, unknown>> {
    const rowId = options.user_integration_id?.trim()
    if (!rowId) {
      return { success: false, error: 'user_integration_id is required', channels: [] }
    }

    const row = await this.core.getIntegrationRowForScope(supabase, scope, rowId)
    if (!row) {
      return { success: false, error: 'Integration connection not found', channels: [] }
    }
    if (String(row.integration_id ?? '').toLowerCase() !== 'youtube') {
      return { success: false, error: 'Connection is not a YouTube integration', channels: [] }
    }
    if (String(row.status ?? '').toLowerCase() !== 'connected') {
      return { success: false, error: 'YouTube is not connected', channels: [] }
    }

    const metadata = normalizeMetadata(row.metadata)
    const connectedAccountId =
      typeof metadata.composio_connected_account_id === 'string'
        ? metadata.composio_connected_account_id.trim()
        : ''
    if (!connectedAccountId) {
      return { success: false, error: 'Missing Composio connected account', channels: [] }
    }

    try {
      let raw = (await this.composio.executeTool(
        'YOUTUBE_GET_CHANNEL_STATISTICS',
        user.id,
        { mine: true, part: 'snippet,statistics' },
        connectedAccountId,
      )) as Record<string, unknown> | null

      const composioError = composioYoutubeToolError(raw)
      const itemCount = extractYoutubeChannelItems(raw).length
      let channels = parseYoutubeChannelsResponse(raw)
      if (composioError) {
        return { success: false, error: composioError, channels: [] }
      }
      if (channels.length === 0) {
        const playlistsRaw = (await this.composio.executeTool(
          'YOUTUBE_LIST_USER_PLAYLISTS',
          user.id,
          { part: 'snippet,contentDetails', maxResults: 5 },
          connectedAccountId,
        )) as Record<string, unknown> | null
        channels = parseYoutubeChannelsFromPlaylistsResponse(playlistsRaw)
      }
      if (channels.length === 0) {
        return {
          success: true,
          channels: [],
          hint: 'No YouTube channels found for this Google account. Ensure YouTube Data API scopes are granted.',
        }
      }

      return { success: true, channels }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to list YouTube channels'
      this.logger.warn(`[youtube] list channels failed: ${message}`)
      return { success: false, error: message, channels: [] }
    }
  }

  async setSelectedChannel(
    supabase: SupabaseClient,
    user: { id: string },
    scope: RequestScope,
    body: { user_integration_id: string; channel_id: string; channel_name: string },
  ): Promise<Record<string, unknown>> {
    const rowId = body.user_integration_id?.trim()
    const channelId = body.channel_id?.trim()
    const channelName = body.channel_name?.trim()

    if (!rowId || !channelId || !channelName) {
      return {
        success: false,
        error: 'user_integration_id, channel_id, and channel_name are required',
      }
    }
    if (!channelId.startsWith('UC')) {
      return { success: false, error: 'channel_id must be a YouTube channel ID (UC...)' }
    }

    const row = await this.core.getIntegrationRowForScope(supabase, scope, rowId)
    if (!row) return { success: false, error: 'Integration connection not found' }
    if (String(row.integration_id ?? '').toLowerCase() !== 'youtube') {
      return { success: false, error: 'Connection is not a YouTube integration' }
    }

    const metadata = normalizeMetadata(row.metadata)
    const connectedAccountId =
      typeof metadata.composio_connected_account_id === 'string'
        ? metadata.composio_connected_account_id.trim()
        : ''

    const nextMetadata = {
      ...metadata,
      youtube_channel_id: channelId,
      youtube_channel_name: channelName,
    }

    const { error } = await this.core.updateIntegrationById(supabase, rowId, {
      metadata: nextMetadata,
    })
    if (error) return { success: false, error: error.message }

    if (connectedAccountId) {
      let cicQuery = this.repository
        .table(supabase, 'campaign_integration_connections')
        .select('id, metadata')
        .eq('integration_id', 'youtube')
        .eq('composio_connected_account_id', connectedAccountId)
        .eq('status', 'connected')

      if (scope.orgId) {
        cicQuery = cicQuery.eq('org_id', scope.orgId)
      } else {
        cicQuery = cicQuery.eq('user_id', user.id).is('org_id', null)
      }

      const { data: cicRows } = await cicQuery
      const now = new Date().toISOString()
      for (const cic of cicRows ?? []) {
        const cicMd = normalizeMetadata(cic.metadata)
        await this.repository
          .table(supabase, 'campaign_integration_connections')
          .update({
            metadata: {
              ...cicMd,
              youtube_channel_id: channelId,
              youtube_channel_name: channelName,
            },
            updated_at: now,
          })
          .eq('id', cic.id)
      }
    }

    return {
      success: true,
      user_integration_id: rowId,
      youtube_channel_id: channelId,
      youtube_channel_name: channelName,
    }
  }
}
