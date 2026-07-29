import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { authorizeOrganizationWideAiData } from '@vibey/api-shared'
import { SlackApiIntegration } from '../integrations/slack-api.integration'
import { SlackRuntimeRepository } from '../repositories/slack-runtime.repository'
import type { SlackResolvedSender } from '../types/slack.types'
import { SlackSenderResolverService } from './slack-sender-resolver.service'
import {
  SLACK_ACCESS_CHECK_FAILED_MESSAGE,
  SLACK_ACCESS_DENIED_MESSAGE,
  SLACK_CHANNEL_ACCESS_DENIED_MESSAGE,
} from './slack-service.shared'

export interface SlackRequestPrincipal {
  sender: SlackResolvedSender
  relationshipKind: 'internal'
  isConnectionOwner: boolean
  personalBrainAccess: boolean
  organizationWideDataAccess: boolean
}

export type SlackAccessDecision =
  | { allowed: true; principal: SlackRequestPrincipal }
  | {
      allowed: false
      reason: 'identity_unavailable' | 'sender_not_internal' | 'channel_not_internal'
    }

interface AuthorizeSlackRequestInput {
  supabase: SupabaseClient
  botToken: string
  ownerUserId: string
  ownerSlackUserId: string | null
  orgId: string | null
  slackUserId: string
  channelId: string
  isDirectMessage: boolean
}

@Injectable()
export class SlackAccessControlService {
  private readonly logger = new Logger(SlackAccessControlService.name)

  constructor(
    private readonly slackApi: SlackApiIntegration,
    private readonly senderResolver: SlackSenderResolverService,
    private readonly runtimeRepository: SlackRuntimeRepository,
  ) {}

  async authorizeAndRespond(
    input: Omit<AuthorizeSlackRequestInput, 'slackUserId'> & {
      slackUserId: string | undefined
      threadTs: string | undefined
    },
  ): Promise<SlackRequestPrincipal | null> {
    const slackUserId = input.slackUserId
    if (!slackUserId) {
      await this.slackApi
        .postMessage(input.botToken, input.channelId, SLACK_ACCESS_DENIED_MESSAGE, input.threadTs)
        .catch((error) => this.logger.error(`Failed to post Slack access feedback: ${error}`))
      return null
    }
    const decision = await this.authorize({ ...input, slackUserId })
    if (decision.allowed) return decision.principal

    const message =
      decision.reason === 'channel_not_internal'
        ? SLACK_CHANNEL_ACCESS_DENIED_MESSAGE
        : decision.reason === 'identity_unavailable'
          ? SLACK_ACCESS_CHECK_FAILED_MESSAGE
          : SLACK_ACCESS_DENIED_MESSAGE
    await this.slackApi
      .postMessage(input.botToken, input.channelId, message, input.threadTs)
      .catch((error) => this.logger.error(`Failed to post Slack access feedback: ${error}`))
    this.logger.warn(
      `[SlackAccess] denied reason=${decision.reason} slackUser=${input.slackUserId} channel=${input.channelId}`,
    )
    return null
  }

  async authorize(input: AuthorizeSlackRequestInput): Promise<SlackAccessDecision> {
    let resolved: Map<string, SlackResolvedSender>
    try {
      const memberIds = input.isDirectMessage
        ? [input.slackUserId]
        : await this.slackApi.listConversationMembers(input.botToken, input.channelId)
      resolved = await this.senderResolver.resolveSlackSenders(input.supabase, {
        botToken: input.botToken,
        userId: input.ownerUserId,
        orgId: input.orgId,
        slackUserIds: [...new Set([input.slackUserId, ...memberIds])],
      })
    } catch (error) {
      this.logger.warn(
        `Slack access identity resolution failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
      return { allowed: false, reason: 'identity_unavailable' }
    }

    const sender = resolved.get(input.slackUserId)
    const isConnectionOwner =
      input.ownerSlackUserId !== null && input.slackUserId === input.ownerSlackUserId
    if (!sender || sender.isBot || (!isConnectionOwner && sender.relationshipKind !== 'internal')) {
      return { allowed: false, reason: 'sender_not_internal' }
    }

    if (
      !input.isDirectMessage &&
      [...resolved.values()].some(
        (member) =>
          !member.isBot &&
          member.slackUserId !== input.ownerSlackUserId &&
          member.relationshipKind !== 'internal',
      )
    ) {
      return { allowed: false, reason: 'channel_not_internal' }
    }

    const platformUserId = sender.vibeyUserId ?? (isConnectionOwner ? input.ownerUserId : null)
    let organizationWideDataAccess = false
    if (input.orgId && platformUserId) {
      try {
        const membership = await this.runtimeRepository.findAiDataAdminMembership(
          input.supabase,
          input.orgId,
          platformUserId,
        )
        const access = authorizeOrganizationWideAiData({
          requestedOrgId: input.orgId,
          resourceOrgId: input.orgId,
          resourceKind: 'organization_knowledge',
          membership: membership
            ? {
                id: membership.id,
                userId: membership.user_id,
                orgId: membership.org_id,
                role: membership.role,
                status: membership.status,
                aiDataAdmin: membership.ai_data_admin,
              }
            : null,
        })
        organizationWideDataAccess = access.allowed
        await this.runtimeRepository
          .recordAiDataAccessAudit(input.supabase, {
            orgId: input.orgId,
            orgMemberId: membership?.id ?? null,
            userId: platformUserId,
            resourceType: 'organization_knowledge',
            resourceId: input.channelId,
            outcome: access.allowed ? 'allowed' : 'denied',
            reason: access.reason,
            metadata: { slack_user_id: input.slackUserId, is_direct_message: input.isDirectMessage },
          })
          .catch((error) => this.logger.warn(`Failed to audit AI data access: ${error}`))
      } catch (error) {
        this.logger.warn(`AI data capability check failed closed: ${error}`)
      }
    }

    return {
      allowed: true,
      principal: {
        sender,
        relationshipKind: 'internal',
        isConnectionOwner,
        personalBrainAccess: isConnectionOwner,
        organizationWideDataAccess,
      },
    }
  }
}
