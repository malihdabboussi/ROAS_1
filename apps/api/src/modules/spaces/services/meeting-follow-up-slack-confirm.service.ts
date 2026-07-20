import { Injectable, Logger, Optional } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ModuleRef } from '@nestjs/core'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'
import { SlackAgentToolsService } from '../../slack/services/slack-agent-tools.service'
import { SpacesRepository } from '../repositories/spaces.repository'
import {
  briefMeetingSummary,
  buildConfirmMessage,
  buildShareableConfirmReply,
  formatFollowUpLine,
  markdownLinksToSlack,
  resolveFathomUrl,
  resolveFollowUpOwner,
} from './meeting-follow-up-slack-message'

export const SLACK_FOLLOW_UP_CONFIRM_KEY = 'slack_follow_up_confirm'
export const DEFAULT_CONFIRM_REACTION = 'white_check_mark'
export const DEFAULT_ADMIN_DM_EMAIL = 'dylan@dylanvanas.com'

export type SlackFollowUpConfirmPayload = {
  status: 'pending' | 'approved' | 'failed'
  channel_id: string
  message_ts: string
  space_id: string
  space_item_ids: string[]
  confirm_reaction: string
  dm_email: string
  requested_at: string
  approved_at?: string
  approved_by_slack_user_id?: string
}

@Injectable()
export class MeetingFollowUpSlackConfirmService {
  private readonly logger = new Logger(MeetingFollowUpSlackConfirmService.name)

  constructor(
    private readonly repo: SpacesRepository,
    private readonly config: ConfigService,
    private readonly moduleRef: ModuleRef,
    @Optional() private readonly slackTools?: SlackAgentToolsService,
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
    dmEmail?: string
    confirmReaction?: string
  }): Promise<Record<string, unknown>> {
    if (!this.slackTools) throw new Error('Slack tools service is not available')
    if (input.suggestionIds.length === 0) {
      return { skipped: true, reason: 'no_follow_ups' }
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

    const followUps = await this.repo.findItemsByIds(
      input.supabase,
      input.spaceId,
      input.suggestionIds,
    )
    if (followUps.length === 0) {
      return { skipped: true, reason: 'follow_ups_not_found' }
    }

    const callItem =
      ((await this.repo.findItemById(input.supabase, input.spaceId, input.callItemId)) as Record<
        string,
        unknown
      > | null) ?? null

    const lookup = await this.slackTools.findUserByEmail(
      input.supabase,
      input.userId,
      input.orgId,
      { email: dmEmail },
    )
    const slackUserId = String((lookup.user as { id?: string } | null | undefined)?.id ?? '').trim()
    if (!slackUserId) {
      throw new Error(`Slack user not found for email ${dmEmail}`)
    }

    const dm = await this.slackTools.openDm(input.supabase, input.userId, input.orgId, {
      slack_user_id: slackUserId,
    })
    const channelId = String(dm.channel_id ?? '').trim()
    if (!channelId) throw new Error('Could not open Slack DM')

    const appUrl = (
      this.config.get<string>('APP_URL') ||
      process.env.APP_URL ||
      'https://app.roas.io'
    ).replace(/\/+$/, '')
    const meetingUrl = `${appUrl}/spaces/${input.spaceId}?item=${input.callItemId}`
    const text = buildConfirmMessage({
      callTitle: input.callTitle,
      callItem,
      followUps,
      confirmReaction,
      meetingUrl,
    })

    const sent = await this.slackTools.sendMessage(input.supabase, input.userId, input.orgId, {
      channel_id: channelId,
      text,
    })
    const messageTs = String((sent as { ts?: string }).ts ?? '').trim()
    if (!messageTs) throw new Error('Slack DM did not return a message ts')

    const payload: SlackFollowUpConfirmPayload = {
      status: 'pending',
      channel_id: channelId,
      message_ts: messageTs,
      space_id: input.spaceId,
      space_item_ids: followUps.map((item) => String((item as { id: string }).id)),
      confirm_reaction: confirmReaction,
      dm_email: dmEmail,
      requested_at: new Date().toISOString(),
    }

    await this.repo.updateItem(
      input.supabase,
      input.userId,
      input.spaceId,
      input.callItemId,
      { custom_data: { [SLACK_FOLLOW_UP_CONFIRM_KEY]: payload } },
      input.orgId,
    )

    return {
      channel_id: channelId,
      message_ts: messageTs,
      dm_email: dmEmail,
      suggestion_count: followUps.length,
      suggestion_ids: payload.space_item_ids,
      confirm_reaction: confirmReaction,
    }
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

    for (const itemId of pending.payload.space_item_ids) {
      try {
        await this.repo.updateItem(
          supabase,
          ownerUserId,
          pending.spaceId,
          itemId,
          {
            custom_data: {
              slack_follow_up_confirm_status: 'approved',
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

    if (this.slackTools) {
      const [callItem, followUps] = await Promise.all([
        this.repo.findItemById(supabase, pending.spaceId, pending.callItemId),
        this.repo.findItemsByIds(supabase, pending.spaceId, pending.payload.space_item_ids),
      ])
      const reply = buildShareableConfirmReply({
        callItem: (callItem as Record<string, unknown> | null) ?? null,
        followUps,
      })
      const slackOrgId = await this.resolveSlackSendOrgId(supabase, ownerUserId, orgId)

      await this.slackTools
        .sendMessage(supabase, ownerUserId, slackOrgId, {
          channel_id: pending.payload.channel_id,
          text: reply,
          thread_ts: pending.payload.message_ts,
        })
        .catch((err) => this.logger.warn(`Failed to reply after Slack confirm: ${err}`))
    }

    return true
  }

  // Test / reuse wrappers around pure message helpers
  buildShareableConfirmReply = buildShareableConfirmReply
  buildConfirmMessage = buildConfirmMessage
  formatFollowUpLine = formatFollowUpLine
  resolveFollowUpOwner = resolveFollowUpOwner
  briefMeetingSummary = briefMeetingSummary
  markdownLinksToSlack = markdownLinksToSlack
  resolveFathomUrl = resolveFathomUrl

  /** Call items can be personal (org_id null) while Slack is connected on an org. */
  private async resolveSlackSendOrgId(
    supabase: SupabaseClient,
    userId: string,
    preferredOrgId: string | null,
  ): Promise<string | null> {
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
