import type { SlackWorkspaceUser } from '../types/slack.types'
import { SLACK_API_BASE, throwSlackError } from './slack-api-integration.shared'
import { SlackApiIntegrationCoreBase } from './slack-api-integration-core.base'

type SlackUserInfo = {
  id: string
  name: string
  real_name?: string
  profile?: {
    display_name?: string
    real_name?: string
    title?: string
    image_72?: string
    email?: string
  }
  is_bot?: boolean
  tz?: string
}

export abstract class SlackApiIntegrationUsersBase extends SlackApiIntegrationCoreBase {
  async listUsers(botToken: string): Promise<SlackWorkspaceUser[]> {
    const members: Array<Record<string, unknown>> = []
    let cursor: string | undefined
    do {
      const params = new URLSearchParams({ limit: '200' })
      if (cursor) params.set('cursor', cursor)
      const res = await fetch(`${SLACK_API_BASE}/users.list?${params.toString()}`, {
        headers: { Authorization: `Bearer ${botToken}` },
      })
      const json = (await res.json()) as {
        ok: boolean
        error?: string
        members?: Array<Record<string, unknown>>
        response_metadata?: { next_cursor?: string }
      }
      if (!json.ok) {
        this.logger.warn(`users.list failed: ${json.error}`)
        break
      }
      members.push(...(json.members ?? []))
      cursor = json.response_metadata?.next_cursor || undefined
    } while (cursor)
    return members as unknown as SlackWorkspaceUser[]
  }

  async getUserInfo(botToken: string, userId: string): Promise<SlackUserInfo | null> {
    const res = await fetch(`${SLACK_API_BASE}/users.info?user=${userId}`, {
      headers: { Authorization: `Bearer ${botToken}` },
    })
    const json = (await res.json()) as {
      ok: boolean
      error?: string
      user?: Record<string, unknown>
    }
    if (!json.ok) {
      this.logger.warn(`users.info failed for ${userId}: ${json.error}`)
      return null
    }
    return json.user as SlackUserInfo | null
  }

  async openDmChannel(botToken: string, userId: string): Promise<string | null> {
    const res = await fetch(`${SLACK_API_BASE}/conversations.open`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ users: userId }),
    })
    const json = (await res.json()) as { ok: boolean; error?: string; channel?: { id: string } }
    if (!json.ok) {
      this.logger.warn(`conversations.open failed: ${json.error}`)
      return null
    }
    return json.channel?.id ?? null
  }

  async usersLookupByEmail(botToken: string, email: string): Promise<SlackUserInfo | null> {
    const params = new URLSearchParams({ email })
    const res = await fetch(`${SLACK_API_BASE}/users.lookupByEmail?${params.toString()}`, {
      headers: { Authorization: `Bearer ${botToken}` },
    })
    const json = (await res.json()) as {
      ok: boolean
      error?: string
      user?: Record<string, unknown>
    }
    if (!json.ok) {
      if (json.error === 'users_not_found') return null
      throwSlackError(json.error, 'Slack users.lookupByEmail failed')
    }
    return (json.user ?? null) as SlackUserInfo | null
  }
}
