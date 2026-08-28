import { createHash, randomBytes } from 'node:crypto'
import { Injectable, Logger, Optional } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ModuleRef } from '@nestjs/core'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'
import {
  findAssigneeReminderBySlackMessage,
  findSlackPersonByDisplayName,
} from '../../slack/repositories/slack-people-meeting-follow-up'
import { SlackPeopleRepository } from '../../slack/repositories/slack-people.repository'
import { SlackAgentToolsService } from '../../slack/services/slack-agent-tools.service'
import { SlackPeopleService } from '../../slack/services/slack-people.service'
import { UserAgentApiService } from '../../user-agent-api/services/user-agent-api.service'
import { SpacesRepository } from '../repositories/spaces.repository'
import { buildMeetingFollowUpActionLedger } from './meeting-follow-up-action-ledger'
import { createAssigneeReminderShadowActions } from './meeting-follow-up-assignee-reminders'
import {
  buildAssigneeReminderThreadContext,
  buildNameKnowledgePayload,
  type NameKnowledgeEntry,
} from './meeting-follow-up-name-knowledge'
import { loadMeetingFollowUpNameKnowledge } from './meeting-follow-up-name-knowledge.loader'
import {
  delegateConfirmedPageGraderCandidates,
  stampMeetingFollowUpActionLedger,
} from './meeting-follow-up-page-grader-delegation'
import {
  briefMeetingSummary,
  buildConfirmMessage,
  buildPostCallChannelMessage,
  buildProposedShareableRecapMessage,
  buildShareableConfirmReply,
  formatFollowUpLine,
  markdownLinksToSlack,
  resolveFathomUrl,
  resolveFollowUpOwner,
} from './meeting-follow-up-slack-message'
import { SlackOpenItemsService } from './slack-open-items.service'

export const SLACK_FOLLOW_UP_CONFIRM_KEY = 'slack_follow_up_confirm'
export const DEFAULT_CONFIRM_REACTION = 'white_check_mark'
export const DEFAULT_ADMIN_DM_EMAIL = 'dylan@dylanvanas.com'

export type SlackFollowUpConfirmPayload = {
  status: 'shadow' | 'pending' | 'approved' | 'failed'
  delivery_mode?: 'shadow' | 'active'
  channel_delivery?: 'disabled' | 'automatic'
  channel_id: string
  message_ts: string
  space_id: string
  space_item_ids: string[]
  confirm_reaction: string
  dm_email: string
  requested_at: string
  approved_at?: string
  approved_by_slack_user_id?: string
  shadow_action_id?: string
  /** Optional only for pending records created before agent-written drafts were introduced. */
  draft_message?: string
  /** Exact summary shown in Pixel's Slack review message. */
  review_summary?: string
  draft_rationale?: string
  draft_context_sources?: string[]
  /** Threaded proposed-recap message (separate from the review DM). */
  draft_message_ts?: string
  /** Per-assignee Shadow message proposals created with the review DM. */
  assignee_shadow_action_ids?: string[]
  assignee_sent_action_ids?: string[]
  agent_key?: 'vibey'
  skill_key?: 'post-call-delivery'
  revision_count?: number
  review_token_hash?: string
  review_token_expires_at?: string
  review_started_at?: string
}

/** Coordinates the multi-step Slack review, approval, and delivery workflow. */
@Injectable()
export class MeetingFollowUpSlackConfirmService {
  private readonly logger = new Logger(MeetingFollowUpSlackConfirmService.name)

  constructor(
    private readonly repo: SpacesRepository,
    private readonly config: ConfigService,
    private readonly moduleRef: ModuleRef,
    @Optional() private readonly slackTools?: SlackAgentToolsService,
    @Optional() private readonly userAgentApi?: UserAgentApiService,
    @Optional() private readonly slackPeopleRepo?: SlackPeopleRepository,
    @Optional() private readonly slackPeople?: SlackPeopleService,
    @Optional() private readonly cases?: SlackOpenItemsService,
  ) {}

  resolveSuggestionIds(
    action: Record<string, unknown>,
    steps: Array<Record<string, unknown>> | undefined,
  ): string[] {
    const fromAction = Array.isArray(action.suggestion_ids)
      ? action.suggestion_ids.filter((id): id is string => typeof id === 'string' && !!id.trim())
      : []
    if (fromAction.length > 0) return fromAction

    const list = Array.isArray(steps) ? steps : []
    for (let i = list.length - 1; i >= 0; i--) {
      const step = list[i]
      if (String(step?.type ?? '') !== 'agent_suggest_tasks') continue
      const ids = Array.isArray(step.suggestion_ids)
        ? step.suggestion_ids.filter((id): id is string => typeof id === 'string' && !!id.trim())
        : []
      if (ids.length > 0) return ids
    }
    return []
  }

  async requestConfirm(input: {
    supabase: SupabaseClient
    userId: string
    orgId: string | null
    spaceId: string
    callItemId: string
    callTitle: string
    suggestionIds: string[]
    deliveryMode?: 'shadow' | 'active'
    channelDelivery?: 'disabled' | 'automatic'
    destinationChannelId?: string
    dmEmail?: string
    confirmReaction?: string
  }): Promise<Record<string, unknown>> {
    const reviewToken = randomBytes(32).toString('base64url')
    const reviewTokenHash = createHash('sha256').update(reviewToken, 'utf8').digest('hex')
    const reviewTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const deliveryMode = input.deliveryMode === 'active' ? 'active' : 'shadow'
    const channelDelivery = input.channelDelivery === 'automatic' ? 'automatic' : 'disabled'
    if (deliveryMode === 'active' && !this.slackTools) {
      throw new Error('Slack tools service is not available')
    }
    const dmEmail = (
      input.dmEmail?.trim() ||
      this.config.get<string>('MEETING_FOLLOW_UP_SLACK_DM_EMAIL') ||
      process.env.MEETING_FOLLOW_UP_SLACK_DM_EMAIL ||
      DEFAULT_ADMIN_DM_EMAIL
    )
      .trim()
      .toLowerCase()
    const confirmReaction = (input.confirmReaction?.trim() || DEFAULT_CONFIRM_REACTION).replace(
      /^:/,
      '',
    )

    const followUps =
      input.suggestionIds.length > 0
        ? await this.repo.findItemsByIds(input.supabase, input.spaceId, input.suggestionIds)
        : []
    if (followUps.length > 0) {
      await stampMeetingFollowUpActionLedger(
        { repo: this.repo, logger: this.logger },
        input.supabase,
        {
          userId: input.userId,
          orgId: input.orgId,
          spaceId: input.spaceId,
          callItemId: input.callItemId,
          followUps,
          status: 'proposed',
        },
      )
      await this.recordPostCallCases(input, followUps)
    }

    const callItem =
      ((await this.repo.findItemById(input.supabase, input.spaceId, input.callItemId)) as Record<
        string,
        unknown
      > | null) ?? null

    const draft = await this.createPostCallDraft({
      supabase: input.supabase,
      userId: input.userId,
      orgId: input.orgId,
      spaceId: input.spaceId,
      callItem,
      followUps,
    })
    const reviewSummary = briefMeetingSummary(callItem, { includeNextSteps: false })

    const slackOrgId = await this.resolveSlackSendOrgId(input.supabase, input.userId, input.orgId)

    let shadowActionId: string | undefined
    if (slackOrgId && this.slackPeopleRepo) {
      const target = await this.slackPeopleRepo.findPersonByEmail(
        input.supabase,
        slackOrgId,
        dmEmail,
      )
      const action = await this.slackPeopleRepo.createShadowAction(input.supabase, {
        orgId: slackOrgId,
        userId: input.userId,
        agentKey: 'vibey',
        targetMemberId: target?.id ?? null,
        actionKind: 'workflow',
        proposedContent: draft.message,
        rationale: draft.rationale,
        metadata: {
          source: 'meeting_follow_up',
          target_email: dmEmail,
          call_item_id: input.callItemId,
          space_id: input.spaceId,
          skill_key: 'post-call-delivery',
          flow_delivery_mode: deliveryMode,
          context_sources: draft.context_sources,
        },
      })
      shadowActionId = action.id
    }

    const assigneeShadowActionIds = await this.createAssigneeReminderShadows({
      supabase: input.supabase,
      userId: input.userId,
      slackOrgId,
      spaceId: input.spaceId,
      callItemId: input.callItemId,
      callTitle: input.callTitle,
      callItem,
      followUps,
      nameKnowledge: draft.name_knowledge,
      // The chat review owns delegation. Keep reminder proposals reviewable,
      // but never deliver them before the operator completes that flow.
      deliveryMode: 'shadow',
    })

    if (deliveryMode === 'shadow') {
      const payload: SlackFollowUpConfirmPayload = {
        status: 'shadow',
        delivery_mode: 'shadow',
        channel_delivery: channelDelivery,
        channel_id: '',
        message_ts: '',
        space_id: input.spaceId,
        space_item_ids: followUps.map((item) => String((item as { id: string }).id)),
        confirm_reaction: confirmReaction,
        dm_email: dmEmail,
        requested_at: new Date().toISOString(),
        ...(shadowActionId ? { shadow_action_id: shadowActionId } : {}),
        ...(assigneeShadowActionIds.length > 0
          ? { assignee_shadow_action_ids: assigneeShadowActionIds }
          : {}),
        assignee_sent_action_ids: [],
        draft_message: draft.message,
        review_summary: reviewSummary,
        draft_rationale: draft.rationale,
        draft_context_sources: draft.context_sources,
        agent_key: 'vibey',
        skill_key: 'post-call-delivery',
        review_token_hash: reviewTokenHash,
        review_token_expires_at: reviewTokenExpiresAt,
      }
      await this.storeConfirmPayload(input, payload)
      return {
        delivery_mode: 'shadow',
        sent: false,
        dm_email: dmEmail,
        suggestion_count: followUps.length,
        suggestion_ids: payload.space_item_ids,
        assignee_shadow_count: assigneeShadowActionIds.length,
        assignee_shadow_action_ids: assigneeShadowActionIds,
        assignee_sent_action_ids: [],
      }
    }

    const slackTools = this.slackTools
    if (!slackTools) throw new Error('Slack tools service is not available')

    if (channelDelivery === 'automatic') {
      const destinationChannelId = String(input.destinationChannelId ?? '').trim()
      if (!destinationChannelId) {
        throw new Error('Automatic post-call channel delivery requires a destination channel')
      }
      const draftText = buildPostCallChannelMessage({
        callItem,
        followUps,
        shareableDraft: draft.message,
      })
      const sent = await slackTools.sendMessage(input.supabase, input.userId, slackOrgId, {
        channel_id: destinationChannelId,
        text: draftText,
        unfurl_links: false,
        unfurl_media: false,
      })
      const messageTs = String((sent as { ts?: string }).ts ?? '').trim()
      if (!messageTs) throw new Error('Slack channel delivery did not return a message ts')
      const payload: SlackFollowUpConfirmPayload = {
        status: 'approved',
        delivery_mode: 'active',
        channel_delivery: 'automatic',
        channel_id: destinationChannelId,
        message_ts: messageTs,
        space_id: input.spaceId,
        space_item_ids: followUps.map((item) => String((item as { id: string }).id)),
        confirm_reaction: confirmReaction,
        dm_email: dmEmail,
        requested_at: new Date().toISOString(),
        approved_at: new Date().toISOString(),
        draft_message: draft.message,
        review_summary: reviewSummary,
        draft_rationale: draft.rationale,
        draft_context_sources: draft.context_sources,
        agent_key: 'vibey',
        skill_key: 'post-call-delivery',
      }
      await this.storeConfirmPayload(input, payload)
      await this.resolvePostCallCases(input.supabase, input.orgId, input.callItemId, followUps)
      return {
        delivery_mode: 'active',
        channel_delivery: 'automatic',
        sent: true,
        channel_id: destinationChannelId,
        message_ts: messageTs,
        suggestion_count: followUps.length,
      }
    }

    const lookup = await slackTools.findUserByEmail(input.supabase, input.userId, slackOrgId, {
      email: dmEmail,
    })
    const slackUserId = String((lookup.user as { id?: string } | null | undefined)?.id ?? '').trim()
    if (!slackUserId) {
      throw new Error(`Slack user not found for email ${dmEmail}`)
    }

    const dm = await slackTools.openDm(input.supabase, input.userId, slackOrgId, {
      slack_user_id: slackUserId,
    })
    const channelId = String(dm.channel_id ?? '').trim()
    if (!channelId) throw new Error('Could not open Slack DM')

    const appUrl = (
      this.config.get<string>('APP_URL') ||
      process.env.APP_URL ||
      'https://app.roas.io'
    ).replace(/\/+$/, '')
    const meetingUrl = `${appUrl}/meeting-review/${encodeURIComponent(reviewToken)}`
    const reviewText = buildConfirmMessage({
      callTitle: input.callTitle,
      callItem,
      followUps,
      meetingUrl,
    })
    const noUnfurl = { unfurl_links: false, unfurl_media: false } as const
    const sent = await slackTools.sendMessage(input.supabase, input.userId, slackOrgId, {
      channel_id: channelId,
      text: reviewText,
      ...noUnfurl,
    })
    const messageTs = String((sent as { ts?: string }).ts ?? '').trim()
    if (!messageTs) throw new Error('Slack DM did not return a message ts')

    const payload: SlackFollowUpConfirmPayload = {
      status: 'pending',
      delivery_mode: 'active',
      channel_delivery: 'disabled',
      channel_id: channelId,
      message_ts: messageTs,
      space_id: input.spaceId,
      space_item_ids: followUps.map((item) => String((item as { id: string }).id)),
      confirm_reaction: confirmReaction,
      dm_email: dmEmail,
      requested_at: new Date().toISOString(),
      ...(shadowActionId ? { shadow_action_id: shadowActionId } : {}),
      ...(assigneeShadowActionIds.length > 0
        ? { assignee_shadow_action_ids: assigneeShadowActionIds }
        : {}),
      assignee_sent_action_ids: [],
      draft_message: draft.message,
      review_summary: reviewSummary,
      draft_rationale: draft.rationale,
      draft_context_sources: draft.context_sources,
      agent_key: 'vibey',
      skill_key: 'post-call-delivery',
      review_token_hash: reviewTokenHash,
      review_token_expires_at: reviewTokenExpiresAt,
    }

    await this.storeConfirmPayload(input, payload)

    return {
      delivery_mode: 'active',
      sent: true,
      channel_id: channelId,
      message_ts: messageTs,
      dm_email: dmEmail,
      suggestion_count: followUps.length,
      suggestion_ids: payload.space_item_ids,
      confirm_reaction: confirmReaction,
      assignee_shadow_count: assigneeShadowActionIds.length,
      assignee_shadow_action_ids: assigneeShadowActionIds,
      assignee_sent_action_ids: [],
    }
  }

  private async storeConfirmPayload(
    input: {
      supabase: SupabaseClient
      userId: string
      orgId: string | null
      spaceId: string
      callItemId: string
    },
    payload: SlackFollowUpConfirmPayload,
  ): Promise<void> {
    await this.repo.updateItem(
      input.supabase,
      input.userId,
      input.spaceId,
      input.callItemId,
      { custom_data: { [SLACK_FOLLOW_UP_CONFIRM_KEY]: payload } },
      input.orgId,
    )
  }

  private async deliverAssigneeShadows(input: {
    supabase: SupabaseClient
    userId: string
    orgId: string | null
    actionIds: string[]
  }): Promise<string[]> {
    if (input.actionIds.length === 0) return []
    if (!this.slackPeople) throw new Error('Slack people delivery service is unavailable')
    const sentIds: string[] = []
    for (const actionId of input.actionIds) {
      await this.slackPeople.reviewShadowAction(
        input.supabase,
        input.userId,
        input.orgId,
        actionId,
        'approved',
      )
      await this.slackPeople.sendShadowAction(input.supabase, input.userId, input.orgId, actionId)
      sentIds.push(actionId)
    }
    return sentIds
  }

  /**
   * Create one Shadow `message` proposal per follow-up assignee (matched Slack person).
   * Skips ignored / off / unmatched people. Does not send — People approve + Active send.
   */
  private async createAssigneeReminderShadows(input: {
    supabase: SupabaseClient
    userId: string
    slackOrgId: string | null
    spaceId: string
    callItemId: string
    callTitle: string
    callItem: Record<string, unknown> | null
    followUps: Array<Record<string, unknown>>
    nameKnowledge?: NameKnowledgeEntry[]
    deliveryMode: 'shadow' | 'active'
    onCreated?: (actionId: string, personDeliveryMode: string | null) => void
  }): Promise<string[]> {
    if (!input.slackOrgId || !this.slackPeopleRepo) return []
    return createAssigneeReminderShadowActions({
      supabase: input.supabase,
      userId: input.userId,
      slackOrgId: input.slackOrgId,
      spaceId: input.spaceId,
      callItemId: input.callItemId,
      callTitle: input.callTitle,
      fathomUrl: resolveFathomUrl(input.callItem),
      followUps: input.followUps,
      nameKnowledge: input.nameKnowledge ?? [],
      deliveryMode: input.deliveryMode,
      onCreated: input.onCreated,
      people: {
        createShadowAction: (supabase, payload) =>
          this.slackPeopleRepo!.createShadowAction(supabase, payload),
        findPersonByEmail: (supabase, orgId, email) =>
          this.slackPeopleRepo!.findPersonByEmail(supabase, orgId, email),
        findPersonByDisplayName: (supabase, orgId, name) => {
          const repositoryLookup = (
            this.slackPeopleRepo as SlackPeopleRepository & {
              findPersonByDisplayName?: (
                client: SupabaseClient,
                slackOrgId: string,
                displayName: string,
              ) => ReturnType<typeof findSlackPersonByDisplayName>
            }
          ).findPersonByDisplayName
          return repositoryLookup
            ? repositoryLookup.call(this.slackPeopleRepo, supabase, orgId, name)
            : findSlackPersonByDisplayName(this.slackPeopleRepo!, supabase, orgId, name)
        },
      },
      onSkip: (assigneeName, message) => {
        this.logger.warn(`Assignee reminder Shadow skipped for ${assigneeName}: ${message}`)
      },
    })
  }

  async handleReactionAdded(input: {
    channelId: string
    messageTs: string
    reaction: string
    slackUserId: string
  }): Promise<boolean> {
    const reaction = input.reaction.replace(/^:/, '').trim()
    if (!reaction) return false

    const supabase = this.resolveServiceSupabase()
    if (!supabase) {
      this.logger.warn('No service supabase for Slack follow-up confirm reaction')
      return false
    }

    const pending = await this.findPendingByMessage(supabase, input.channelId, input.messageTs)
    if (!pending) return false
    if (pending.payload.confirm_reaction !== reaction) return false
    if (pending.payload.status !== 'pending') return false

    return this.approvePending({
      supabase,
      pending,
      slackUserId: input.slackUserId,
    })
  }

  async handleThreadReply(input: {
    channelId: string
    threadTs: string
    text: string
    slackUserId: string
  }): Promise<boolean> {
    const feedback = input.text.trim()
    if (!feedback) return false
    const supabase = this.resolveServiceSupabase()
    if (!supabase) return false
    const pending = await this.findPendingByMessage(supabase, input.channelId, input.threadTs)
    if (!pending || pending.payload.status !== 'pending') return false

    const [callItem, followUps] = await Promise.all([
      this.repo.findItemById(supabase, pending.spaceId, pending.callItemId),
      this.repo.findItemsByIds(supabase, pending.spaceId, pending.payload.space_item_ids),
    ])
    const draft = await this.createPostCallDraft({
      supabase,
      userId: pending.userId,
      orgId: pending.orgId,
      spaceId: pending.spaceId,
      callItem: (callItem as Record<string, unknown> | null) ?? null,
      followUps,
      currentDraft: pending.payload.draft_message,
      feedback,
    })
    const slackOrgId = await this.resolveSlackSendOrgId(supabase, pending.userId, pending.orgId)
    let shadowActionId = pending.payload.shadow_action_id
    if (shadowActionId && slackOrgId && this.slackPeopleRepo) {
      const previous = await this.slackPeopleRepo.findShadowAction(
        supabase,
        slackOrgId,
        shadowActionId,
      )
      const replacement = await this.slackPeopleRepo.createShadowAction(supabase, {
        orgId: slackOrgId,
        userId: pending.userId,
        agentKey: 'vibey',
        targetMemberId: previous?.target_member_id ?? null,
        actionKind: 'workflow',
        proposedContent: draft.message,
        rationale: draft.rationale,
        metadata: {
          ...(previous?.metadata ?? {}),
          supersedes_shadow_action_id: shadowActionId,
          revision_feedback: feedback,
        },
      })
      await this.slackPeopleRepo.reviewShadowAction(supabase, {
        actionId: shadowActionId,
        orgId: slackOrgId,
        reviewedBy: pending.userId,
        status: 'dismissed',
      })
      shadowActionId = replacement.id
    }
    const nextPayload: SlackFollowUpConfirmPayload = {
      ...pending.payload,
      ...(shadowActionId ? { shadow_action_id: shadowActionId } : {}),
      draft_message: draft.message,
      draft_rationale: draft.rationale,
      draft_context_sources: draft.context_sources,
      revision_count: (pending.payload.revision_count ?? 0) + 1,
    }
    await this.repo.updateItem(
      supabase,
      pending.userId,
      pending.spaceId,
      pending.callItemId,
      { custom_data: { [SLACK_FOLLOW_UP_CONFIRM_KEY]: nextPayload } },
      pending.orgId,
    )
    if (this.slackTools) {
      await this.slackTools.sendMessage(supabase, pending.userId, slackOrgId, {
        channel_id: input.channelId,
        thread_ts: input.threadTs,
        text: `*Updated client-facing draft*\n\n${draft.message}\n\n_React :${pending.payload.confirm_reaction}: to the original review message when this is ready._`,
        unfurl_links: false,
        unfurl_media: false,
      })
    }
    return true
  }

  private async approvePending(input: {
    supabase: SupabaseClient
    pending: {
      callItemId: string
      userId: string
      orgId: string | null
      spaceId: string
      payload: SlackFollowUpConfirmPayload
    }
    slackUserId: string
  }): Promise<boolean> {
    const { pending, supabase, slackUserId } = input
    const ownerUserId = pending.userId
    const orgId = pending.orgId
    const nextPayload: SlackFollowUpConfirmPayload = {
      ...pending.payload,
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by_slack_user_id: slackUserId,
    }

    await this.repo.updateItem(
      supabase,
      ownerUserId,
      pending.spaceId,
      pending.callItemId,
      { custom_data: { [SLACK_FOLLOW_UP_CONFIRM_KEY]: nextPayload } },
      orgId,
    )

    const confirmedFollowUps = (await this.repo.findItemsByIds(
      supabase,
      pending.spaceId,
      pending.payload.space_item_ids,
    )) as Array<Record<string, unknown>>
    const followUpById = new Map(
      confirmedFollowUps.map((item) => [String(item.id ?? '').trim(), item]),
    )

    for (const itemId of pending.payload.space_item_ids) {
      try {
        const followUp = followUpById.get(itemId)
        await this.repo.updateItem(
          supabase,
          ownerUserId,
          pending.spaceId,
          itemId,
          {
            custom_data: {
              slack_follow_up_confirm_status: 'approved',
              ...(followUp
                ? {
                    action_ledger: buildMeetingFollowUpActionLedger({
                      item: followUp,
                      callItemId: pending.callItemId,
                      status: 'confirmed',
                    }),
                  }
                : {}),
            },
          },
          orgId,
        )
      } catch (err) {
        this.logger.warn(
          `Failed to stamp follow-up ${itemId} after Slack confirm: ${
            err instanceof Error ? err.message : String(err)
          }`,
        )
      }
    }

    await delegateConfirmedPageGraderCandidates(
      { repo: this.repo, moduleRef: this.moduleRef, logger: this.logger },
      {
        supabase,
        ownerUserId,
        orgId,
        spaceId: pending.spaceId,
        callItemId: pending.callItemId,
        followUps: confirmedFollowUps,
      },
    )
    await this.resolvePostCallCases(supabase, orgId, pending.callItemId, confirmedFollowUps)

    if (this.slackTools) {
      const [callItem, followUps] = await Promise.all([
        this.repo.findItemById(supabase, pending.spaceId, pending.callItemId),
        this.repo.findItemsByIds(supabase, pending.spaceId, pending.payload.space_item_ids),
      ])
      const reply = pending.payload.draft_message?.trim()
        ? pending.payload.draft_message
        : buildShareableConfirmReply({
            callItem: (callItem as Record<string, unknown> | null) ?? null,
            followUps,
          })
      const slackOrgId = await this.resolveSlackSendOrgId(supabase, ownerUserId, orgId)

      let claimedShadowAction: Awaited<
        ReturnType<SlackPeopleRepository['claimShadowActionForSend']>
      > = null
      if (pending.payload.shadow_action_id && slackOrgId && this.slackPeopleRepo) {
        const reviewed = await this.slackPeopleRepo.reviewShadowAction(supabase, {
          actionId: pending.payload.shadow_action_id,
          orgId: slackOrgId,
          reviewedBy: ownerUserId,
          status: 'approved',
        })
        if (!reviewed) return true
        claimedShadowAction = await this.slackPeopleRepo.claimShadowActionForSend(
          supabase,
          slackOrgId,
          reviewed.id,
        )
        if (!claimedShadowAction) return true
      }

      const sent = await this.slackTools
        .sendMessage(supabase, ownerUserId, slackOrgId, {
          channel_id: pending.payload.channel_id,
          text: reply,
          thread_ts: pending.payload.message_ts,
          unfurl_links: false,
          unfurl_media: false,
        })
        .catch((err) => {
          this.logger.warn(`Failed to reply after Slack confirm: ${err}`)
          return null
        })
      if (!sent && claimedShadowAction && slackOrgId && this.slackPeopleRepo) {
        await this.slackPeopleRepo.markShadowActionFailed(
          supabase,
          slackOrgId,
          claimedShadowAction.id,
        )
      }
      if (sent && claimedShadowAction && slackOrgId && this.slackPeopleRepo) {
        await this.slackPeopleRepo.markShadowActionSent(supabase, {
          actionId: claimedShadowAction.id,
          orgId: slackOrgId,
          sentBy: ownerUserId,
          slackTs: String((sent as { ts?: string }).ts ?? '').trim() || null,
          slackChannelId: pending.payload.channel_id,
          metadata: claimedShadowAction.metadata,
        })
      }
    }

    return true
  }

  private async recordPostCallCases(
    input: {
      supabase: SupabaseClient
      orgId: string | null
      spaceId: string
      callItemId: string
    },
    followUps: Array<Record<string, unknown>>,
  ): Promise<void> {
    if (!input.orgId || !this.cases) return
    for (const followUp of followUps) {
      const followUpId = String(followUp.id ?? '').trim()
      if (!followUpId) continue
      const summary = String(followUp.title ?? followUp.name ?? '').trim() || 'Post-call follow-up'
      await this.cases.recordExternal(input.supabase, {
        orgId: input.orgId,
        caseType: 'post_call',
        sourceType: 'post_call',
        sourceKey: `${input.callItemId}:${followUpId}`,
        summary,
        severity: 'normal',
        spaceId: input.spaceId,
        metadata: {
          call_item_id: input.callItemId,
          follow_up_item_id: followUpId,
          action_ledger_status: 'proposed',
        },
      })
    }
  }

  private async resolvePostCallCases(
    supabase: SupabaseClient,
    orgId: string | null,
    callItemId: string,
    followUps: Array<Record<string, unknown>>,
  ): Promise<void> {
    if (!orgId || !this.cases) return
    for (const followUp of followUps) {
      const followUpId = String(followUp.id ?? '').trim()
      if (!followUpId) continue
      await this.cases.applyExternalAction(supabase, {
        orgId,
        sourceType: 'post_call',
        sourceKey: `${callItemId}:${followUpId}`,
        action: 'resolve',
      })
    }
  }

  /**
   * When a human replies in an assignee-reminder DM thread, prepend call brief + action-item
   * context so Pixel can answer from the meeting summary (eyes + agent reply still go through
   * normal Slack chat).
   */
  async resolveAssigneeReminderThreadPrefix(input: {
    channelId: string
    threadTs: string
  }): Promise<string | null> {
    if (!this.slackPeopleRepo) return null
    const supabase = this.resolveServiceSupabase()
    if (!supabase) return null
    try {
      const lookupInput = {
        channelId: input.channelId,
        messageTs: input.threadTs,
      }
      const repositoryLookup = (
        this.slackPeopleRepo as SlackPeopleRepository & {
          findAssigneeReminderBySlackMessage?: (
            client: SupabaseClient,
            lookup: typeof lookupInput,
          ) => ReturnType<typeof findAssigneeReminderBySlackMessage>
        }
      ).findAssigneeReminderBySlackMessage
      const shadow = repositoryLookup
        ? await repositoryLookup.call(this.slackPeopleRepo, supabase, lookupInput)
        : await findAssigneeReminderBySlackMessage(supabase, lookupInput)
      if (!shadow) return null
      const meta =
        shadow.metadata && typeof shadow.metadata === 'object'
          ? (shadow.metadata as Record<string, unknown>)
          : {}
      const spaceId = String(meta.space_id ?? '').trim()
      const callItemId = String(meta.call_item_id ?? '').trim()
      const followUpIds = Array.isArray(meta.follow_up_ids)
        ? meta.follow_up_ids.filter((id): id is string => typeof id === 'string' && !!id.trim())
        : []
      const assigneeName = String(meta.assignee_name ?? '').trim() || null
      let callTitle = String(meta.call_title ?? '').trim() || null
      let callBrief: string | null = null
      let items: Array<Record<string, unknown>> = []

      if (spaceId && callItemId) {
        const callItem = (await this.repo.findItemById(supabase, spaceId, callItemId)) as Record<
          string,
          unknown
        > | null
        if (callItem) {
          if (!callTitle) {
            callTitle = String(callItem.title ?? '').trim() || null
          }
          // Purpose + takeaways only — assignee action items are listed separately below.
          callBrief = briefMeetingSummary(callItem, { includeNextSteps: false }) || null
        }
      }
      if (spaceId && followUpIds.length > 0) {
        items = (await this.repo.findItemsByIds(supabase, spaceId, followUpIds)) as Array<
          Record<string, unknown>
        >
      }

      return buildAssigneeReminderThreadContext({
        assigneeName,
        callTitle,
        callBrief,
        items,
      })
    } catch (err) {
      this.logger.warn(
        `Assignee reminder thread context skipped: ${
          err instanceof Error ? err.message : String(err)
        }`,
      )
      return null
    }
  }

  // Test / reuse wrappers around pure message helpers
  buildShareableConfirmReply = buildShareableConfirmReply
  buildConfirmMessage = buildConfirmMessage
  buildProposedShareableRecapMessage = buildProposedShareableRecapMessage
  formatFollowUpLine = formatFollowUpLine
  resolveFollowUpOwner = resolveFollowUpOwner
  briefMeetingSummary = briefMeetingSummary
  markdownLinksToSlack = markdownLinksToSlack
  resolveFathomUrl = resolveFathomUrl

  private async createPostCallDraft(input: {
    supabase: SupabaseClient
    userId: string
    orgId: string | null
    spaceId: string
    callItem: Record<string, unknown> | null
    followUps: Array<Record<string, unknown>>
    currentDraft?: string
    feedback?: string
  }): Promise<{
    message: string
    rationale: string
    context_sources: string[]
    name_knowledge: NameKnowledgeEntry[]
  }> {
    if (!this.userAgentApi) throw new Error('User agent API is not available')
    const internalToken =
      this.config.get<string>('INTERNAL_API_TOKEN') ?? process.env.INTERNAL_API_TOKEN ?? ''
    if (!internalToken) throw new Error('INTERNAL_API_TOKEN not configured')

    const slackOrgId = await this.resolveSlackSendOrgId(input.supabase, input.userId, input.orgId)
    const nameKnowledge = await loadMeetingFollowUpNameKnowledge({
      supabase: input.supabase,
      moduleRef: this.moduleRef,
      userId: input.userId,
      orgId: slackOrgId ?? input.orgId,
      slackPeopleRepo: this.slackPeopleRepo,
    })
    const nameLists = buildNameKnowledgePayload(nameKnowledge)

    const response = await this.userAgentApi.invoke(
      input.userId,
      '/api/agents/post-call-draft',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Internal-Token': internalToken },
        body: JSON.stringify({
          space_id: input.spaceId,
          owner_user_id: input.userId,
          org_id: input.orgId,
          agent_key: 'vibey',
          payload: {
            call: input.callItem,
            follow_ups: input.followUps,
            known_names: nameLists,
            ...(input.currentDraft ? { current_draft: input.currentDraft } : {}),
            ...(input.feedback ? { revision_feedback: input.feedback } : {}),
          },
        }),
      },
      { timeoutMs: 180_000, logTag: `meeting_follow_up_draft user=${input.userId}` },
    )
    if (!response.ok) throw new Error(`Post-call delivery returned ${response.status}`)
    const body = (await response.json()) as {
      draft?: { message?: string; rationale?: string; context_sources?: string[] }
    }
    const message = body.draft?.message?.trim() ?? ''
    const rationale = body.draft?.rationale?.trim() ?? ''
    if (!message || !rationale) throw new Error('Post-call delivery returned an invalid draft')
    return {
      message,
      rationale,
      context_sources: Array.isArray(body.draft?.context_sources)
        ? body.draft.context_sources.filter(
            (source): source is string => typeof source === 'string',
          )
        : [],
      name_knowledge: nameKnowledge,
    }
  }

  /** Call items can be personal (org_id null) while Slack is connected on an org. */
  private async resolveSlackSendOrgId(
    supabase: SupabaseClient,
    userId: string,
    preferredOrgId: string | null,
  ): Promise<string | null> {
    if (preferredOrgId) return preferredOrgId
    const { data, error } = await supabase
      .from('agent_channels')
      .select('org_id')
      .eq('user_id', userId)
      .eq('channel_type', 'slack')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      this.logger.warn(`resolveSlackSendOrgId failed: ${error.message}`)
      return preferredOrgId
    }
    if (typeof data?.org_id === 'string' && data.org_id.trim()) return data.org_id.trim()
    return preferredOrgId
  }

  private async findPendingByMessage(
    supabase: SupabaseClient,
    channelId: string,
    messageTs: string,
  ): Promise<{
    callItemId: string
    userId: string
    orgId: string | null
    spaceId: string
    payload: SlackFollowUpConfirmPayload
  } | null> {
    const { data, error } = await supabase
      .from('space_items')
      .select('id, space_id, user_id, org_id, custom_data')
      .eq(`custom_data->${SLACK_FOLLOW_UP_CONFIRM_KEY}->>channel_id`, channelId)
      .eq(`custom_data->${SLACK_FOLLOW_UP_CONFIRM_KEY}->>message_ts`, messageTs)
      .eq(`custom_data->${SLACK_FOLLOW_UP_CONFIRM_KEY}->>status`, 'pending')
      .limit(1)
      .maybeSingle()

    if (error) {
      this.logger.warn(`findPendingByMessage query failed: ${error.message}`)
      return null
    }
    if (!data) return null

    const customData =
      data.custom_data && typeof data.custom_data === 'object'
        ? (data.custom_data as Record<string, unknown>)
        : {}
    const raw = customData[SLACK_FOLLOW_UP_CONFIRM_KEY]
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
    return {
      callItemId: String(data.id),
      userId: String(data.user_id),
      orgId: typeof data.org_id === 'string' ? data.org_id : null,
      spaceId: String(data.space_id),
      payload: raw as SlackFollowUpConfirmPayload,
    }
  }

  private resolveServiceSupabase(): SupabaseClient | null {
    try {
      const svc = this.moduleRef.get(SupabaseServiceClient, { strict: false })
      return svc?.client ?? null
    } catch {
      return null
    }
  }
}
