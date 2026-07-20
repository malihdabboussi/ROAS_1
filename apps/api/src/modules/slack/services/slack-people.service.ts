import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SlackApiIntegration } from '../integrations/slack-api.integration'
import { SlackPeopleRepository } from '../repositories/slack-people.repository'
import type {
  SlackDeliveryMode,
  SlackRelationshipKind,
  SlackShadowActionStatus,
} from '../types/slack.types'
import { SlackSenderResolverService } from './slack-sender-resolver.service'

@Injectable()
export class SlackPeopleService {
  constructor(
    private readonly peopleRepository: SlackPeopleRepository,
    private readonly senderResolver: SlackSenderResolverService,
    private readonly slackApi: SlackApiIntegration,
  ) {}

  async listPeople(supabase: SupabaseClient, orgId?: string | null) {
    if (!orgId) throw new BadRequestException('Slack people require organization context')
    const integration = await this.peopleRepository.findOrgSlackIntegration(supabase, orgId)
    if (!integration) return { connected: false, people: [] }

    await this.senderResolver.seedContactIdentifiersFromWorkspace(supabase, {
      botToken: integration.access_token,
      userId: integration.user_id,
      orgId,
    })
    const people = await this.peopleRepository.listPeople(supabase, orgId)
    const linkedUserIds = [
      ...new Set(people.map((person) => person.vibey_user_id).filter((id): id is string => !!id)),
    ]
    const brains = await this.peopleRepository.listDefaultUserBrains(supabase, linkedUserIds)
    const brainByOwnerId = new Map(brains.map((brain) => [brain.owner_id, brain]))
    return {
      connected: true,
      people: people.map((person) => {
        const brain = person.vibey_user_id ? brainByOwnerId.get(person.vibey_user_id) : null
        return {
          ...person,
          brain_id: brain?.id ?? null,
          brain_name: brain?.name ?? null,
        }
      }),
    }
  }

  async updateRelationshipKind(
    supabase: SupabaseClient,
    orgId: string | null | undefined,
    personId: string,
    relationshipKind: SlackRelationshipKind,
  ) {
    if (!orgId) throw new BadRequestException('Slack people require organization context')
    const person = await this.peopleRepository.updateRelationshipKind(supabase, {
      id: personId,
      orgId,
      relationshipKind,
    })
    return { person }
  }

  async confirmSuggestedIdentity(
    supabase: SupabaseClient,
    orgId: string | null | undefined,
    personId: string,
  ) {
    if (!orgId) throw new BadRequestException('Slack people require organization context')
    const person = await this.peopleRepository.confirmSuggestedIdentity(supabase, orgId, personId)
    if (!person) throw new ConflictException('This identity suggestion is no longer available')
    const brains = await this.peopleRepository.listDefaultUserBrains(
      supabase,
      person.vibey_user_id ? [person.vibey_user_id] : [],
    )
    const brain = brains[0]
    return {
      person: {
        ...person,
        brain_id: brain?.id ?? null,
        brain_name: brain?.name ?? null,
      },
    }
  }

  async getPersonActivity(
    supabase: SupabaseClient,
    orgId: string | null | undefined,
    personId: string,
  ) {
    if (!orgId) throw new BadRequestException('Slack people require organization context')
    const person = await this.peopleRepository.findPerson(supabase, orgId, personId)
    if (!person) throw new NotFoundException('Slack person not found')
    const integration = await this.peopleRepository.findOrgSlackIntegration(supabase, orgId)
    if (!integration) throw new ConflictException('Slack is not connected for this organization')
    const [channelId, actions] = await Promise.all([
      this.slackApi.openDmChannel(integration.access_token, person.platform_id),
      this.peopleRepository.listPersonShadowActions(supabase, orgId, personId),
    ])
    if (!channelId) throw new ConflictException('Could not open this Slack conversation')
    const history = await this.slackApi.getChannelHistory(integration.access_token, channelId, 100)
    const botUserId =
      typeof integration.metadata?.bot_user_id === 'string'
        ? integration.metadata.bot_user_id
        : null
    const messages = history
      .filter((message) => typeof message.ts === 'string' && typeof message.text === 'string')
      .map((message) => ({
        ts: message.ts as string,
        text: message.text as string,
        direction:
          message.bot_id || (botUserId && message.user === botUserId)
            ? ('outbound' as const)
            : ('inbound' as const),
      }))
      .sort((a, b) => Number(b.ts) - Number(a.ts))
    return { channel_id: channelId, messages, actions }
  }

  async updateDeliveryMode(
    supabase: SupabaseClient,
    orgId: string | null | undefined,
    personId: string,
    deliveryMode: SlackDeliveryMode,
  ) {
    if (!orgId) throw new BadRequestException('Slack people require organization context')
    const person = await this.peopleRepository.updateDeliveryMode(supabase, {
      id: personId,
      orgId,
      deliveryMode,
    })
    return { person }
  }

  async listShadowActions(
    supabase: SupabaseClient,
    orgId: string | null | undefined,
    limit?: number,
  ) {
    if (!orgId) throw new BadRequestException('Shadow Mode requires organization context')
    const actions = await this.peopleRepository.listShadowActions(supabase, orgId, limit)
    return { actions }
  }

  async createTestProposal(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    personId: string,
  ) {
    if (!orgId) throw new BadRequestException('Shadow Mode requires organization context')
    const person = await this.peopleRepository.findPerson(supabase, orgId, personId)
    if (!person) throw new NotFoundException('Slack person not found')
    if (person.relationship_kind === 'ignored') {
      throw new ConflictException('Ignored people cannot receive proposals')
    }
    if (person.delivery_mode === 'off') {
      throw new ConflictException('Turn on Shadow Mode before creating a proposal')
    }
    const action = await this.peopleRepository.createShadowAction(supabase, {
      orgId,
      userId,
      agentKey: 'vibey',
      targetMemberId: personId,
      actionKind: 'message',
      proposedContent: 'Quick check-in — anything blocking you today?',
      rationale: 'Test proposal created by an administrator to verify the Shadow review flow.',
      metadata: { source: 'admin_test' },
    })
    return { action }
  }

  async reviewShadowAction(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    actionId: string,
    status: Extract<SlackShadowActionStatus, 'approved' | 'dismissed'>,
  ) {
    if (!orgId) throw new BadRequestException('Shadow Mode requires organization context')
    const action = await this.peopleRepository.reviewShadowAction(supabase, {
      actionId,
      orgId,
      reviewedBy: userId,
      status,
    })
    if (!action) throw new ConflictException('This proposal has already been reviewed')
    return { action }
  }

  async sendShadowAction(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    actionId: string,
  ) {
    if (!orgId) throw new BadRequestException('Shadow Mode requires organization context')
    const action = await this.peopleRepository.findShadowAction(supabase, orgId, actionId)
    if (!action) throw new NotFoundException('Shadow proposal not found')
    if (action.status !== 'approved') {
      throw new ConflictException('Approve this proposal before sending it')
    }
    if (!action.target || action.target.delivery_mode !== 'active') {
      throw new ConflictException('Set this person to Active before sending')
    }
    const integration = await this.peopleRepository.findOrgSlackIntegration(supabase, orgId)
    if (!integration) throw new ConflictException('Slack is not connected for this organization')
    const claimed = await this.peopleRepository.claimShadowActionForSend(supabase, orgId, actionId)
    if (!claimed) throw new ConflictException('This proposal is already being sent or changed')
    let result: { ts?: string }
    try {
      const channelId = await this.slackApi.openDmChannel(
        integration.access_token,
        action.target.platform_id,
      )
      if (!channelId) throw new ConflictException('Could not open a Slack conversation')
      result = await this.slackApi.postMessage(
        integration.access_token,
        channelId,
        action.proposed_content,
      )
    } catch (cause) {
      await this.peopleRepository.markShadowActionFailed(supabase, orgId, actionId)
      throw cause
    }
    const sent = await this.peopleRepository.markShadowActionSent(supabase, {
      actionId,
      orgId,
      sentBy: userId,
      slackTs: result.ts ?? null,
      metadata: action.metadata,
    })
    if (!sent) throw new ConflictException('This proposal changed before it could be sent')
    return { action: sent }
  }
}
