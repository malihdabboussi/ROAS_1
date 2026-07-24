import { createHmac, timingSafeEqual } from 'crypto'
import { Logger } from '@nestjs/common'
import type {
  SlackApiJoinConversationResponse,
  SlackApiListConversationsResponse,
  SlackApiPostMessageResponse,
  SlackBlock,
  SlackCompleteUploadExternalResponse,
  SlackFileInfoResponse,
  SlackGetUploadUrlExternalResponse,
  SlackOAuthAccessResponse,
  SlackWorkspaceChannel,
} from '../types/slack.types'
import { SLACK_API_BASE, throwSlackError } from './slack-api-integration.shared'

export abstract class SlackApiIntegrationCoreBase {
  protected readonly logger = new Logger('SlackApiIntegration')

  verifyRequestSignature(
    rawBody: Buffer,
    timestamp: string,
    signature: string,
    signingSecret: string,
  ) {
    const now = Math.floor(Date.now() / 1000)
    const ts = Number(timestamp)
    if (!Number.isFinite(ts)) return false
    if (Math.abs(now - ts) > 60 * 5) return false

    const baseString = `v0:${timestamp}:${rawBody.toString('utf8')}`
    const digest = createHmac('sha256', signingSecret).update(baseString).digest('hex')
    const expected = `v0=${digest}`

    const expectedBuffer = Buffer.from(expected)
    const actualBuffer = Buffer.from(signature)
    if (expectedBuffer.length !== actualBuffer.length) return false
    return timingSafeEqual(expectedBuffer, actualBuffer)
  }

  async oauthAccess(
    clientId: string,
    clientSecret: string,
    code: string,
    redirectUri: string,
  ): Promise<SlackOAuthAccessResponse> {
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    })
    const res = await fetch(`${SLACK_API_BASE}/oauth.v2.access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    const json = (await res.json()) as SlackOAuthAccessResponse
    if (!json.ok) {
      this.logger.error(`Slack OAuth failed: ${json.error}`)
      throwSlackError(json.error, 'Slack OAuth failed')
    }
    return json
  }

  async listConversations(botToken: string): Promise<SlackWorkspaceChannel[]> {
    const channels: NonNullable<SlackApiListConversationsResponse['channels']> = []
    let cursor: string | undefined
    do {
      const params = new URLSearchParams({
        types: 'public_channel,private_channel,mpim,im',
        exclude_archived: 'true',
        limit: '1000',
      })
      if (cursor) params.set('cursor', cursor)
      const res = await fetch(`${SLACK_API_BASE}/conversations.list?${params.toString()}`, {
        headers: { Authorization: `Bearer ${botToken}` },
      })
      const json = (await res.json()) as SlackApiListConversationsResponse
      if (!json.ok) throwSlackError(json.error, 'Slack conversations.list failed')
      channels.push(...(json.channels ?? []))
      cursor = json.response_metadata?.next_cursor || undefined
    } while (cursor)

    return channels
      .filter((channel) => !!channel.id && !!channel.name)
      .map((channel) => ({
        id: channel.id,
        name: channel.name,
        is_member: channel.is_member,
        is_private: channel.is_private,
        is_im: channel.is_im,
      }))
  }

  async listConversationMembers(botToken: string, channelId: string): Promise<string[]> {
    const members: string[] = []
    let cursor: string | undefined
    do {
      const params = new URLSearchParams({ channel: channelId, limit: '200' })
      if (cursor) params.set('cursor', cursor)
      const res = await fetch(`${SLACK_API_BASE}/conversations.members?${params.toString()}`, {
        headers: { Authorization: `Bearer ${botToken}` },
      })
      const json = (await res.json()) as {
        ok: boolean
        error?: string
        members?: string[]
        response_metadata?: { next_cursor?: string }
      }
      if (!json.ok) throwSlackError(json.error, 'Slack conversations.members failed')
      members.push(...(json.members ?? []))
      cursor = json.response_metadata?.next_cursor || undefined
    } while (cursor)
    return members
  }

  async joinConversation(botToken: string, channelId: string): Promise<void> {
    const res = await fetch(`${SLACK_API_BASE}/conversations.join`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ channel: channelId }),
    })
    const json = (await res.json()) as SlackApiJoinConversationResponse
    if (!json.ok) throwSlackError(json.error, 'Slack conversations.join failed')
  }

  async postMessage(
    botToken: string,
    channelId: string,
    text: string,
    threadTs?: string,
    options?: { unfurlLinks?: boolean; unfurlMedia?: boolean; replyBroadcast?: boolean },
  ): Promise<SlackApiPostMessageResponse> {
    const body: Record<string, unknown> = {
      channel: channelId,
      text,
      mrkdwn: true,
      unfurl_links: options?.unfurlLinks ?? true,
      unfurl_media: options?.unfurlMedia ?? true,
    }
    if (threadTs) body.thread_ts = threadTs
    if (threadTs && options?.replyBroadcast) body.reply_broadcast = true

    const res = await fetch(`${SLACK_API_BASE}/chat.postMessage`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    const json = (await res.json()) as SlackApiPostMessageResponse
    if (!json.ok) throwSlackError(json.error, 'Slack chat.postMessage failed')
    return json
  }

  async postBlockMessage(
    botToken: string,
    channelId: string,
    fallbackText: string,
    blocks: SlackBlock[],
    threadTs?: string,
  ): Promise<SlackApiPostMessageResponse> {
    const body: Record<string, unknown> = {
      channel: channelId,
      text: fallbackText,
      blocks,
      unfurl_links: true,
      unfurl_media: true,
    }
    if (threadTs) body.thread_ts = threadTs

    const res = await fetch(`${SLACK_API_BASE}/chat.postMessage`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    const json = (await res.json()) as SlackApiPostMessageResponse
    if (!json.ok) {
      this.logger.warn(`postBlockMessage failed (${json.error}), falling back to plain text`)
      return this.postMessage(botToken, channelId, fallbackText, threadTs)
    }
    return json
  }

  async uploadExternalFileToChannel(
    botToken: string,
    channelId: string,
    fileBytes: Buffer,
    filename: string,
    threadTs?: string,
  ): Promise<{ file_id: string; permalink: string | null }> {
    if (fileBytes.length === 0) {
      throw new Error('Slack external upload requires non-empty file')
    }

    const getRes = await fetch(`${SLACK_API_BASE}/files.getUploadURLExternal`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename,
        length: fileBytes.length,
      }),
    })
    const getJson = (await getRes.json()) as SlackGetUploadUrlExternalResponse
    if (!getJson.ok || !getJson.upload_url || !getJson.file_id) {
      throwSlackError(getJson.error, 'files.getUploadURLExternal failed')
    }

    const binaryRes = await fetch(getJson.upload_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: new Uint8Array(fileBytes),
    })
    if (!binaryRes.ok) {
      throw new Error(`Slack upload URL returned ${binaryRes.status}`)
    }

    const completeBody: Record<string, unknown> = {
      files: [{ id: getJson.file_id, title: filename }],
      channel_id: channelId,
    }
    if (threadTs) completeBody.thread_ts = threadTs

    const completeRes = await fetch(`${SLACK_API_BASE}/files.completeUploadExternal`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(completeBody),
    })
    const completeJson = (await completeRes.json()) as SlackCompleteUploadExternalResponse
    if (!completeJson.ok) {
      throwSlackError(completeJson.error, 'files.completeUploadExternal failed')
    }

    const completedFile = completeJson.files?.find((file) => file.id === getJson.file_id)
    return {
      file_id: getJson.file_id,
      permalink:
        completedFile && 'permalink' in completedFile && typeof completedFile.permalink === 'string'
          ? completedFile.permalink
          : null,
    }
  }

  async getFileInfo(botToken: string, fileId: string): Promise<SlackFileInfoResponse> {
    const res = await fetch(`${SLACK_API_BASE}/files.info?file=${fileId}`, {
      headers: { Authorization: `Bearer ${botToken}` },
    })
    return (await res.json()) as SlackFileInfoResponse
  }

  async downloadFile(
    botToken: string,
    url: string,
  ): Promise<{ buffer: Buffer; contentType: string }> {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${botToken}` },
    })
    if (!response.ok) {
      throw new Error(`Slack file download failed: ${response.status} ${response.statusText}`)
    }
    const contentType = response.headers.get('content-type') ?? 'application/octet-stream'
    const arrayBuffer = await response.arrayBuffer()
    return { buffer: Buffer.from(arrayBuffer), contentType }
  }

  async addReaction(
    botToken: string,
    channelId: string,
    timestamp: string,
    name: string,
  ): Promise<boolean> {
    try {
      const response = await fetch(`${SLACK_API_BASE}/reactions.add`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ channel: channelId, timestamp, name }),
      })
      const result = (await response.json()) as { ok: boolean; error?: string }
      if (result.ok || result.error === 'already_reacted') return true
      this.logger.warn(`reactions.add failed: ${result.error ?? 'unknown_error'}`)
      return false
    } catch (err) {
      this.logger.warn(`reactions.add failed: ${err}`)
      return false
    }
  }

  async removeReaction(
    botToken: string,
    channelId: string,
    timestamp: string,
    name: string,
  ): Promise<void> {
    try {
      await fetch(`${SLACK_API_BASE}/reactions.remove`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ channel: channelId, timestamp, name }),
      })
    } catch (err) {
      this.logger.warn(`reactions.remove failed: ${err}`)
    }
  }
}
