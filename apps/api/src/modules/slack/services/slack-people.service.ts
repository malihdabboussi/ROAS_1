import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SlackApiIntegration } from '../integrations/slack-api.integration'
import { SlackPeopleBrainRepository } from '../repositories/slack-people-brain.repository'
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
    private readonly peopleBrainRepository: SlackPeopleBrainRepository,
    private readonly senderResolver: SlackSenderResolverService,
    private readonly slackApi: SlackApiIntegration,
  ) {}

  async listPeople(supabase: SupabaseClient, orgId?: string | null) {
    if (!orgId) throw new BadRequestException('Slack people require organization context')
    const integration = await this.peopleRepository.findOrgSlackIntegration(supabase, orgId)
    if (!integration) return { connected: false, people: [] }

    const workspace = await this.senderResolver.seedContactIdentifiersFromWorkspace(supabase, {
      botToken: integration.access_token,
      userId: integration.user_id,
      orgId,
    })
    const [people, portalUsers] = await Promise.all([
      this.peopleRepository.listPeople(supabase, orgId),
      this.peopleRepository.listPortalUsers(supabase, orgId),
    ])
    const linkedUserIds = [
      ...new Set(people.map((person) => person.vibey_user_id).filter((id): id is string => !!id)),
    ]
    const managedBrainIds = people
      .map((person) => person.person_brain_id)
      .filter((id): id is string => !!id)
    const [brains, managedBrains] = await Promise.all([
      this.peopleBrainRepository.listDefaultUserBrains(supabase, linkedUserIds),
      this.peopleBrainRepository.listManagedPersonBrains(supabase, managedBrainIds),
    ])
    const brainByOwnerId = new Map(brains.map((brain) => [brain.owner_id, brain]))
    const managedBrainById = new Map(managedBrains.map((brain) => [brain.id, brain]))
    return {
      connected: true,
      portal_users: portalUsers,
      people: people.map((person) => {
        const managedBrain = person.person_brain_id
          ? managedBrainById.get(person.person_brain_id)
          : null
        const portalBrain = person.vibey_user_id ? brainByOwnerId.get(person.vibey_user_id) : null
        const brain = managedBrain ?? portalBrain
        return {
          ...person,
          slack_channels: workspace.channelNamesByMember.get(person.platform_id) ?? [],
          brain_id: brain?.id ?? null,
          brain_name: brain?.name ?? null,
          brain_kind: managedBrain
            ? ('managed_person' as const)
            : portalBrain
              ? ('portal_user' as const)
              : null,
        }
      }),
    }
  }

  async listChannels(supabase: SupabaseClient, orgId?: string | null) {
    if (!orgId) throw new BadRequestException('Slack channels require organization context')
    const integration = await this.peopleRepository.findOrgSlackIntegration(supabase, orgId)
    if (!integration) return { connected: false, channels: [] }
    const channels = await this.slackApi.listConversations(integration.access_token)
    return {
      connected: true,
      channels: channels
        .filter((channel) => channel.is_member !== false && !channel.is_im)
        .map((channel) => ({
          id: channel.id,
          name: channel.name,
          is_private: channel.is_private === true,
        }))
        .sort((left, right) => left.name.localeCompare(right.name)),
    }
  }

  async getChannelActivity(
    supabase: SupabaseClient,
    orgId: string | null | undefined,
    channelId: string,
  ) {
    if (!orgId) throw new BadRequestException('Slack channels require organization context')
    const integration = await this.peopleRepository.findOrgSlackIntegration(supabase, orgId)
    if (!integration) throw new ConflictException('Slack is not connected for this organization')
    const channels = await this.slackApi.listConversations(integration.access_token)
    const channel = channels.find(
      (candidate) =>
        candidate.id === channelId && candidate.is_member !== false && !candidate.is_im,
    )
    if (!channel) throw new NotFoundException('Slack channel is not visible to Pixel')

    const [history, people] = await Promise.all([
      this.slackApi.getChannelHistory(integration.access_token, channelId, 100),
      this.peopleRepository.listPeople(supabase, orgId),
    ])
    const replies = await Promise.all(
      history
        .filter((message) => Number(message.reply_count ?? 0) > 0 && typeof message.ts === 'string')
        .map((message) =>
          this.slackApi
            .conversationsRepliesAll(integration.access_token, channelId, message.ts as string)
            .catch(() => []),
        ),
    )
    const namesBySlackId = new Map(
      people.map((person) => [person.platform_id, person.display_name]),
    )
    const messagesByTs = new Map(
      [...history, ...replies.flat()]
        .filter((message) => typeof message.ts === 'string')
        .map((message) => [message.ts as string, message]),
    )
    const botUserId =
      typeof integration.metadata?.bot_user_id === 'string'
        ? integration.metadata.bot_user_id
        : null
    const messages = [...messagesByTs.values()]
      .filter((message) => typeof message.ts === 'string' && typeof message.text === 'string')
      .map((message) => ({
        ts: message.ts as string,
        text: message.text as string,
        sender_name:
          message.bot_id || (botUserId && message.user === botUserId)
            ? 'Pixel'
            : (namesBySlackId.get(String(message.user ?? '')) ?? 'Slack member'),
        direction:
          message.bot_id || (botUserId && message.user === botUserId)
            ? ('outbound' as const)
            : ('inbound' as const),
        thread_ts:
          typeof message.thread_ts === 'string'
            ? message.thread_ts
            : Number(message.reply_count ?? 0) > 0
              ? (message.ts as string)
              : null,
        is_thread_reply: Boolean(message.thread_ts && message.thread_ts !== message.ts),
      }))
      .sort((left, right) => Number(left.ts) - Number(right.ts))
    return { channel: { id: channel.id, name: channel.name }, messages }
  }

  async mapIdentity(
    supabase: SupabaseClient,
    orgId: string | null | undefined,
    personId: string,
    userId: string,
  ) {
    if (!orgId) throw new BadRequestException('Slack people require organization context')
    const isActive = await this.peopleRepository.isActivePortalUser(supabase, orgId, userId)
    if (!isActive) throw new ConflictException('Select an active member of this organization')
    const person = await this.peopleRepository.mapIdentity(supabase, {
      id: personId,
      orgId,
      userId,
    })
    const [brains, managedBrains] = await Promise.all([
      this.peopleBrainRepository.listDefaultUserBrains(supabase, [userId]),
      this.peopleBrainRepository.listManagedPersonBrains(
        supabase,
        person.person_brain_id ? [person.person_brain_id] : [],
      ),
    ])
    const managedBrain = managedBrains[0]
    const brain = managedBrain ?? brains[0]
    return {
      person: {
        ...person,
        brain_id: brain?.id ?? null,
        brain_name: brain?.name ?? null,
        brain_kind: managedBrain
          ? ('managed_person' as const)
          : brain
            ? ('portal_user' as const)
            : null,
      },
    }
  }

  async createPersonBrain(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    personId: string,
  ) {
    if (!orgId) throw new BadRequestException('Slack people require organization context')
    const person = await this.peopleRepository.findPerson(supabase, orgId, personId)
    if (!person) throw new NotFoundException('Slack person not found')
    const brain = await this.peopleBrainRepository.createManagedPersonBrain(supabase, {
      personId,
      orgId,
      ownerId: userId,
    })
    return {
      person: {
        ...person,
        person_brain_id: brain.id,
        brain_id: brain.id,
        brain_name: brain.name,
        brain_kind: 'managed_person' as const,
      },
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
    const [brains, managedBrains] = await Promise.all([
      this.peopleBrainRepository.listDefaultUserBrains(
        supabase,
        person.vibey_user_id ? [person.vibey_user_id] : [],
      ),
      this.peopleBrainRepository.listManagedPersonBrains(
        supabase,
        person.person_brain_id ? [person.person_brain_id] : [],
      ),
    ])
    const managedBrain = managedBrains[0]
    const brain = managedBrain ?? brains[0]
    return {
      person: {
        ...person,
        brain_id: brain?.id ?? null,
        brain_name: brain?.name ?? null,
        brain_kind: managedBrain
          ? ('managed_person' as const)
          : brain
            ? ('portal_user' as const)
            : null,
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
    const threadReplies = await Promise.all(
      history
        .filter((message) => Number(message.reply_count ?? 0) > 0 && typeof message.ts === 'string')
        .map((message) =>
          this.slackApi
            .conversationsRepliesAll(integration.access_token, channelId, message.ts as string)
            .catch(() => []),
        ),
    )
    const historyByTs = new Map(
      [...history, ...threadReplies.flat()]
        .filter((message) => typeof message.ts === 'string')
        .map((message) => [message.ts as string, message]),
    )
    const botUserId =
      typeof integration.metadata?.bot_user_id === 'string'
        ? integration.metadata.bot_user_id
        : null
    const messages = [...historyByTs.values()]
      .filter((message) => typeof message.ts === 'string' && typeof message.text === 'string')
      .map((message) => {
        const ts = message.ts as string
        const threadTs = message.thread_ts ?? (Number(message.reply_count ?? 0) > 0 ? ts : null)
        return {
          ts,
          text: message.text as string,
          direction:
            message.bot_id || (botUserId && message.user === botUserId)
              ? ('outbound' as const)
              : ('inbound' as const),
          thread_ts: threadTs,
          is_thread_reply: Boolean(threadTs && threadTs !== ts),
          reply_count: Number(message.reply_count ?? 0),
        }
      })
      .sort((a, b) => Number(a.ts) - Number(b.ts))
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
    return this.createProposal(
      supabase,
      userId,
      orgId,
      personId,
      'Quick check-in — anything blocking you today?',
      'admin_test',
    )
  }

  async createProposal(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    personId: string,
    proposedContent: string,
    source = 'admin_shadow_conversation',
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
      proposedContent,
      rationale:
        source === 'admin_test'
          ? 'Test proposal created by an administrator to verify the Shadow review flow.'
          : 'Drafted in the managed Shadow conversation for administrator review.',
      metadata: { source },
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
    if (action.action_kind !== 'message') {
      throw new ConflictException('This proposal is for review and cannot be sent to Slack')
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
