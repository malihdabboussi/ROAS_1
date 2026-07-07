import type { SlackApiPostMessageResponse, SlackHistoryMessage } from '../types/slack.types'
import { SLACK_API_BASE, throwSlackError } from './slack-api-integration.shared'
import { SlackApiIntegrationUsersBase } from './slack-api-integration-users.base'

export abstract class SlackApiIntegrationHistorySearchBase extends SlackApiIntegrationUsersBase {
  async getChannelHistory(
    botToken: string,
    channelId: string,
    limit = 10,
  ): Promise<SlackHistoryMessage[]> {
    const params = new URLSearchParams({ channel: channelId, limit: String(limit) })
    const res = await fetch(`${SLACK_API_BASE}/conversations.history?${params.toString()}`, {
      headers: { Authorization: `Bearer ${botToken}` },
    })
    const json = (await res.json()) as {
      ok: boolean
      error?: string
      messages?: Array<Record<string, unknown>>
    }
    if (!json.ok) {
      this.logger.warn(`conversations.history failed for ${channelId}: ${json.error}`)
      return []
    }
    return (json.messages ?? []) as SlackHistoryMessage[]
  }

  async getChannelHistorySince(
    botToken: string,
    channelId: string,
    oldestTs: string,
  ): Promise<SlackHistoryMessage[]> {
    const messages: SlackHistoryMessage[] = []
    let cursor: string | undefined
    do {
      const params = new URLSearchParams({
        channel: channelId,
        oldest: oldestTs,
        inclusive: 'false',
        limit: '200',
      })
      if (cursor) params.set('cursor', cursor)
      const res = await fetch(`${SLACK_API_BASE}/conversations.history?${params.toString()}`, {
        headers: { Authorization: `Bearer ${botToken}` },
      })
      const json = (await res.json()) as {
        ok: boolean
        error?: string
        messages?: Array<Record<string, unknown>>
        response_metadata?: { next_cursor?: string }
      }
      if (!json.ok) throwSlackError(json.error, 'Slack conversations.history failed')
      messages.push(...((json.messages ?? []) as SlackHistoryMessage[]))
      cursor = json.response_metadata?.next_cursor || undefined
    } while (cursor)
    return messages
  }

  async searchMessages(
    botToken: string,
    query: string,
    opts?: {
      count?: number
      sort?: 'score' | 'timestamp'
      sort_dir?: 'asc' | 'desc'
      cursor?: string
    },
  ): Promise<{
    ok: boolean
    error?: string
    messages?: {
      total?: number
      matches?: Array<{
        iid?: string
        text?: string
        user?: string
        username?: string
        ts?: string
        permalink?: string
        channel?: { id?: string; name?: string }
      }>
      pagination?: { total_count?: number; page?: number; per_page?: number }
      paging?: { total?: number; count?: number; page?: number; pages?: number }
    }
  }> {
    const params = new URLSearchParams({ query })
    if (opts?.count != null) params.set('count', String(opts.count))
    if (opts?.sort) params.set('sort', opts.sort)
    if (opts?.sort_dir) params.set('sort_dir', opts.sort_dir)
    if (opts?.cursor) params.set('cursor', opts.cursor)
    const res = await fetch(`${SLACK_API_BASE}/search.messages?${params.toString()}`, {
      headers: { Authorization: `Bearer ${botToken}` },
    })
    const json = (await res.json()) as {
      ok: boolean
      error?: string
      messages?: {
        total?: number
        matches?: Array<Record<string, unknown>>
        pagination?: Record<string, unknown>
        paging?: Record<string, unknown>
      }
    }
    if (!json.ok) {
      throwSlackError(json.error, 'Slack search.messages failed')
    }
    return json as {
      ok: boolean
      messages?: {
        total?: number
        matches?: Array<{
          iid?: string
          text?: string
          user?: string
          username?: string
          ts?: string
          permalink?: string
          channel?: { id?: string; name?: string }
        }>
        pagination?: { total_count?: number; page?: number; per_page?: number }
        paging?: { total?: number; count?: number; page?: number; pages?: number }
      }
    }
  }

  async searchFiles(
    botToken: string,
    query: string,
    opts?: {
      count?: number
      sort?: 'score' | 'timestamp'
      sort_dir?: 'asc' | 'desc'
      cursor?: string
    },
  ): Promise<{
    ok: boolean
    error?: string
    files?: {
      total?: number
      matches?: Array<{
        id?: string
        name?: string
        title?: string
        mimetype?: string
        filetype?: string
        user?: string
        permalink?: string
        url_private?: string
        size?: number
        created?: number
      }>
    }
  }> {
    const params = new URLSearchParams({ query })
    if (opts?.count != null) params.set('count', String(opts.count))
    if (opts?.sort) params.set('sort', opts.sort)
    if (opts?.sort_dir) params.set('sort_dir', opts.sort_dir)
    if (opts?.cursor) params.set('cursor', opts.cursor)
    const res = await fetch(`${SLACK_API_BASE}/search.files?${params.toString()}`, {
      headers: { Authorization: `Bearer ${botToken}` },
    })
    const json = (await res.json()) as {
      ok: boolean
      error?: string
      files?: {
        total?: number
        matches?: Array<Record<string, unknown>>
      }
    }
    if (!json.ok) {
      throwSlackError(json.error, 'Slack search.files failed')
    }
    return json as {
      ok: boolean
      files?: {
        total?: number
        matches?: Array<{
          id?: string
          name?: string
          title?: string
          mimetype?: string
          filetype?: string
          user?: string
          permalink?: string
          url_private?: string
          size?: number
          created?: number
        }>
      }
    }
  }

  async conversationsReplies(
    botToken: string,
    channelId: string,
    threadTs: string,
    opts?: { limit?: number; cursor?: string },
  ): Promise<SlackHistoryMessage[]> {
    const params = new URLSearchParams({ channel: channelId, ts: threadTs })
    if (opts?.limit != null) params.set('limit', String(opts.limit))
    if (opts?.cursor) params.set('cursor', opts.cursor)
    const res = await fetch(`${SLACK_API_BASE}/conversations.replies?${params.toString()}`, {
      headers: { Authorization: `Bearer ${botToken}` },
    })
    const json = (await res.json()) as {
      ok: boolean
      error?: string
      messages?: Array<Record<string, unknown>>
    }
    if (!json.ok) throwSlackError(json.error, 'Slack conversations.replies failed')
    return (json.messages ?? []) as SlackHistoryMessage[]
  }

  async conversationsRepliesAll(
    botToken: string,
    channelId: string,
    threadTs: string,
  ): Promise<SlackHistoryMessage[]> {
    const messages: SlackHistoryMessage[] = []
    let cursor: string | undefined
    do {
      const params = new URLSearchParams({ channel: channelId, ts: threadTs, limit: '200' })
      if (cursor) params.set('cursor', cursor)
      const res = await fetch(`${SLACK_API_BASE}/conversations.replies?${params.toString()}`, {
        headers: { Authorization: `Bearer ${botToken}` },
      })
      const json = (await res.json()) as {
        ok: boolean
        error?: string
        messages?: Array<Record<string, unknown>>
        response_metadata?: { next_cursor?: string }
      }
      if (!json.ok) throwSlackError(json.error, 'Slack conversations.replies failed')
      messages.push(...((json.messages ?? []) as SlackHistoryMessage[]))
      cursor = json.response_metadata?.next_cursor || undefined
    } while (cursor)
    return messages
  }

  async chatUpdate(
    botToken: string,
    channelId: string,
    ts: string,
    text: string,
  ): Promise<SlackApiPostMessageResponse> {
    const res = await fetch(`${SLACK_API_BASE}/chat.update`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ channel: channelId, ts, text, mrkdwn: true }),
    })
    const json = (await res.json()) as SlackApiPostMessageResponse
    if (!json.ok) throwSlackError(json.error, 'Slack chat.update failed')
    return json
  }

  async chatDelete(botToken: string, channelId: string, ts: string): Promise<void> {
    const res = await fetch(`${SLACK_API_BASE}/chat.delete`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ channel: channelId, ts }),
    })
    const json = (await res.json()) as { ok: boolean; error?: string }
    if (!json.ok) throwSlackError(json.error, 'Slack chat.delete failed')
  }
}
