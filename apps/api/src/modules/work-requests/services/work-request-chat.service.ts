import {
  BadRequestException,
  ConflictException,
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import type { Response } from 'express'
import { UserSessionMintService } from '@vibey/api-shared'
import { UserAgentApiService } from '../../user-agent-api/services/user-agent-api.service'
import { WorkRequestRepository } from '../repositories/work-request.repository'
import {
  ensureDraftResumeConversation,
  loadOwnedConversationId,
} from './work-request-conversation-stamp'
import {
  asRecord,
  hashWorkRequestReviewToken,
  readResumeConversationId,
  stringValue,
} from './work-request-review-security'

const MESSAGE_LIMIT = 100

@Injectable()
export class WorkRequestChatService {
  private readonly logger = new Logger(WorkRequestChatService.name)

  constructor(
    private readonly repository: WorkRequestRepository,
    private readonly userSessionMint: UserSessionMintService,
    private readonly userAgentApi: UserAgentApiService,
  ) {}

  async getReviewChat(token: string) {
    const { draft, conversationId } = await this.requireActiveReviewConversation(token)
    const conversation = await this.loadOwnedConversation(
      conversationId,
      draft.owner_user_id,
      draft.owner_org_id,
    )
    if (!conversation) throw new NotFoundException('Service Request chat not found')

    const { data, error } = await this.repository.client
      .from('messages')
      .select('id, conversation_id, role, content, metadata, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(MESSAGE_LIMIT)
    if (error) throw new Error(`Could not load Service Request chat: ${error.message}`)

    return {
      conversation_id: conversationId,
      messages: ((data ?? []) as Array<Record<string, unknown>>).reverse(),
    }
  }

  async streamReviewChat(token: string, content: string, res: Response) {
    const trimmed = content.trim()
    if (!trimmed) throw new BadRequestException('Message content is required')

    const { draft, conversationId } = await this.requireActiveReviewConversation(token)
    const conversation = await this.loadOwnedConversation(
      conversationId,
      draft.owner_user_id,
      draft.owner_org_id,
    )
    if (!conversation) throw new NotFoundException('Service Request chat not found')

    const accessToken = await this.userSessionMint.mintAccessToken(draft.owner_user_id)
    const requester = asRecord(draft.requester_metadata)
    const displayName = stringValue(requester.name) || 'Service Request reviewer'
    const internalToken = process.env.INTERNAL_API_TOKEN ?? ''

    const response = await this.userAgentApi.invoke(
      draft.owner_user_id,
      '/api/channel-chat',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Token': internalToken,
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          user_id: draft.owner_user_id,
          conversation_id: conversationId,
          content: trimmed,
          source: 'work_request_review',
          access_token: accessToken,
          org_id: draft.owner_org_id,
          channel_user: {
            platform_id: `work-request:${draft.id}`,
            display_name: displayName,
          },
        }),
      },
      {
        timeoutMs: 900_000,
        logTag: `work_request_review draft=${draft.id}`,
      },
    )

    if (!response.ok || !response.body) {
      const detail = await response.text().catch(() => '')
      this.logger.error(
        `Work Request review chat failed status=${response.status} draft=${draft.id} detail=${detail.slice(0, 400)}`,
      )
      throw new BadRequestException('Could not send the Service Request chat message')
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) res.write(decoder.decode(value, { stream: true }))
      }
      res.write(decoder.decode())
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.error(`Work Request review chat stream error: ${message}`)
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ type: 'error', error: message })}\n\n`)
        res.write('data: [DONE]\n\n')
      }
    } finally {
      if (!res.writableEnded) res.end()
    }
  }

  private async requireActiveReviewConversation(token: string) {
    let draft = await this.repository.findByTokenHash(hashWorkRequestReviewToken(token))
    if (!draft) throw new NotFoundException('Service Request link not found')
    if (draft.status === 'finalized') {
      throw new ConflictException('Service Request already submitted')
    }
    if (draft.status === 'revoked' || draft.review_token_revoked_at) {
      throw new GoneException('Service Request link revoked')
    }
    if (draft.status === 'expired' || Date.parse(draft.review_token_expires_at) <= Date.now()) {
      if (draft.status === 'draft') {
        await this.repository.update(draft.id, { status: 'expired' })
      }
      throw new GoneException('Service Request link expired')
    }
    draft = await ensureDraftResumeConversation({
      client: this.repository.client,
      draft,
      update: (id, values) => this.repository.update(id, values),
    })
    const conversationId = readResumeConversationId(draft.provenance)
    if (!conversationId) {
      throw new NotFoundException('Service Request chat is not available for this link')
    }
    return { draft, conversationId }
  }

  private async loadOwnedConversation(
    conversationId: string,
    ownerUserId: string,
    ownerOrgId: string | null,
  ) {
    const id = await loadOwnedConversationId({
      client: this.repository.client,
      conversationId,
      ownerUserId,
      ownerOrgId,
    })
    return id ? { id } : null
  }
}
