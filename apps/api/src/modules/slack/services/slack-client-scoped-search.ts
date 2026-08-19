/**
 * Client-scoped Slack retrieval: resolve the client's channels via the Client
 * Context Bundle (or explicit channel_ids), search each channel with an `in:`
 * needle, and merge with per-channel coverage. Never falls back to a
 * whole-workspace search — a client question is answered from the client's
 * channels or reported as "no mapped channel", so Pixel can always name the
 * channel it looked in.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveSlackClientContext, type SlackClientChannel } from './slack-client-context'

export const CLIENT_SCOPE_MAX_CHANNELS = 5

export type SlackScopedSearchResult = {
  success: true
  search_mode: string
  coverage: { status: 'complete' | 'partial'; [key: string]: unknown }
  messages?: { total?: number; matches?: unknown[] }
  [key: string]: unknown
}

export type SlackClientScopedSearchParams = {
  query: string
  count: number
  client_id?: string
  client_name?: string
  channel_ids?: string
}

type SearchMatch = Record<string, unknown> & { ts?: string; channel?: unknown }

export function slackChannelSearchNeedle(channel: SlackClientChannel): string {
  return channel.channelName
    ? `in:#${channel.channelName.replace(/^#/, '')}`
    : `in:${channel.channelId}`
}

export async function searchSlackMessagesForClient(input: {
  supabase: SupabaseClient
  orgId: string | null | undefined
  params: SlackClientScopedSearchParams
  searchOnce: (query: string) => Promise<SlackScopedSearchResult>
}) {
  const { params } = input
  const bundle =
    input.orgId && (params.client_id || params.client_name)
      ? await resolveSlackClientContext(input.supabase, {
          orgId: input.orgId,
          clientId: params.client_id ?? null,
          clientName: params.client_name ?? null,
        })
      : null
  const explicitIds = (params.channel_ids ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
  const channels: SlackClientChannel[] = [
    ...(bundle?.slackChannels ?? []),
    ...explicitIds
      .filter((id) => !bundle?.slackChannels.some((channel) => channel.channelId === id))
      .map((id) => ({ channelId: id, channelName: null, source: 'observation' as const })),
  ].slice(0, CLIENT_SCOPE_MAX_CHANNELS)

  const clientContext = bundle
    ? {
        client_id: bundle.clientId,
        client_name: bundle.clientName,
        campaign_ids: bundle.campaigns.map((campaign) => campaign.id),
        campaign_brain_ids: bundle.campaignBrainIds,
        slack_channels: bundle.slackChannels.map((channel) => ({
          id: channel.channelId,
          name: channel.channelName,
        })),
      }
    : null

  if (channels.length === 0) {
    return {
      success: true as const,
      search_mode: 'client_scoped' as const,
      client_context: clientContext,
      channels_searched: [],
      coverage: {
        status: 'partial' as const,
        reason: bundle ? 'client_has_no_mapped_slack_channel' : 'client_not_resolved',
        results_returned: 0,
      },
      messages: { total: 0, matches: [] as SearchMatch[] },
      agent_instruction: bundle
        ? `${bundle.clientName ?? 'This client'} has no mapped Slack channel yet. Use SLACK_LIST_CHANNELS to find the client channel by name, then search with channel_ids=. Do not report the message as absent.`
        : 'Could not resolve that client to a campaign. Use list_clients / list_campaigns to get the client id, then retry with client_id=. Do not report the message as absent.',
    }
  }

  const perChannel = await Promise.all(
    channels.map(async (channel) => {
      try {
        const result = await input.searchOnce(
          `${params.query} ${slackChannelSearchNeedle(channel)}`,
        )
        const matches = ((result.messages?.matches ?? []) as SearchMatch[]).map((match) => ({
          ...match,
          channel:
            match.channel && typeof match.channel === 'object'
              ? match.channel
              : { id: channel.channelId, name: channel.channelName ?? undefined },
        }))
        return {
          channel: { id: channel.channelId, name: channel.channelName },
          search_mode: result.search_mode,
          coverage: result.coverage,
          matches,
          error: null as string | null,
        }
      } catch (error) {
        return {
          channel: { id: channel.channelId, name: channel.channelName },
          search_mode: 'error' as const,
          coverage: { status: 'partial' as const },
          matches: [] as SearchMatch[],
          error: error instanceof Error ? error.message : String(error),
        }
      }
    }),
  )

  const merged = perChannel
    .flatMap((entry) => entry.matches)
    .sort((left, right) => Number(right.ts ?? 0) - Number(left.ts ?? 0))
    .slice(0, params.count)
  const allComplete = perChannel.every(
    (entry) => !entry.error && entry.coverage?.status === 'complete',
  )
  return {
    success: true as const,
    search_mode: 'client_scoped' as const,
    client_context: clientContext,
    channels_searched: perChannel.map((entry) => ({
      channel: entry.channel,
      search_mode: entry.search_mode,
      coverage: entry.coverage,
      matches: entry.matches.length,
      ...(entry.error ? { error: entry.error } : {}),
    })),
    coverage: {
      status: allComplete ? ('complete' as const) : ('partial' as const),
      channels_scanned: perChannel.length,
      results_returned: merged.length,
    },
    messages: { total: merged.length, matches: merged },
  }
}
