import { Injectable, Logger, Optional } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ModuleRef } from '@nestjs/core'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'
import { SlackAgentToolsService } from '../../slack/services/slack-agent-tools.service'
import { SpacesRepository } from '../repositories/spaces.repository'

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
    const text = this.buildConfirmMessage({
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
      const reply = this.buildShareableConfirmReply({
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

  buildShareableConfirmReply(input: {
    callItem: Record<string, unknown> | null
    followUps: Array<Record<string, unknown>>
  }): string {
    const title = String(input.callItem?.title ?? 'Meeting').trim() || 'Meeting'
    const summary = this.briefMeetingSummary(input.callItem)
    const fathomUrl = this.resolveFathomUrl(input.callItem)
    const lines = input.followUps.map((item, index) => this.formatFollowUpLine(item, index))

    return [
      `*Confirmed — shareable follow-up*`,
      `*${title}*`,
      '',
      ...(summary ? [`*Summary:*`, summary, ''] : []),
      ...(fathomUrl ? [`<${fathomUrl}|Open Fathom recording>`, ''] : []),
      `*Follow-ups*`,
      ...lines,
      '',
      `_Confirmed in ROAS. Not sent to Page Grader yet._`,
    ].join('\n')
  }

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

  buildConfirmMessage(input: {
    callTitle: string
    callItem: Record<string, unknown> | null
    followUps: Array<Record<string, unknown>>
    confirmReaction: string
    meetingUrl: string
  }): string {
    const title = String(input.callTitle || 'Meeting').trim() || 'Meeting'
    const summary = this.briefMeetingSummary(input.callItem)
    const fathomUrl = this.resolveFathomUrl(input.callItem)
    const lines = input.followUps.map((item, index) => this.formatFollowUpLine(item, index))

    return [
      `*Meeting follow-ups ready for review*`,
      `*${title}*`,
      '',
      ...(summary ? [`*Summary:* ${summary}`, ''] : []),
      ...(fathomUrl ? [`<${fathomUrl}|Open Fathom recording>`, ''] : []),
      `Here's what I pulled from the call:`,
      ...lines,
      '',
      `React with :${input.confirmReaction}: to confirm these follow-ups in ROAS.`,
      `Reply in this thread if anything should change (feedback loop ships next).`,
      `<${input.meetingUrl}|Open in Meetings>`,
    ].join('\n')
  }

  formatFollowUpLine(item: Record<string, unknown>, index: number): string {
    const title = String(item.title ?? 'Untitled').trim() || 'Untitled'
    const owner = this.resolveFollowUpOwner(item)
    return owner
      ? `${index + 1}. ${title} — _owner: ${owner}_`
      : `${index + 1}. ${title} — _owner: unassigned_`
  }

  resolveFollowUpOwner(item: Record<string, unknown>): string | null {
    const customData =
      item.custom_data && typeof item.custom_data === 'object'
        ? (item.custom_data as Record<string, unknown>)
        : {}
    const suggestedName = String(customData.suggested_assignee_name ?? '').trim()
    if (suggestedName) return suggestedName
    const suggestedEmail = String(customData.suggested_assignee_email ?? '').trim()
    if (suggestedEmail) return suggestedEmail

    const assignees = Array.isArray(item.assignees) ? item.assignees : []
    for (const raw of assignees) {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue
      const row = raw as Record<string, unknown>
      const label = String(row.name ?? row.email ?? row.id ?? '').trim()
      if (label) return label
    }

    if (item.assignee_type === 'human' && typeof item.assignee_id === 'string') {
      return item.assignee_id
    }
    return null
  }

  briefMeetingSummary(callItem: Record<string, unknown> | null): string {
    if (!callItem) return ''
    const customData =
      callItem.custom_data && typeof callItem.custom_data === 'object'
        ? (callItem.custom_data as Record<string, unknown>)
        : {}
    const fromCustom = String(customData.summary ?? '').trim()
    const fromDescription = String(callItem.description ?? '').trim()
    const raw = fromCustom || fromDescription
    if (!raw) return ''

    return raw
      .replace(/^#+\s*/gm, '')
      .replace(/\*\*/g, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  resolveFathomUrl(callItem: Record<string, unknown> | null): string | null {
    if (!callItem) return null
    const customData =
      callItem.custom_data && typeof callItem.custom_data === 'object'
        ? (callItem.custom_data as Record<string, unknown>)
        : {}
    for (const key of ['fathom_url', 'recording_url', 'meeting_url', 'url'] as const) {
      const value = String(customData[key] ?? '').trim()
      if (value.startsWith('http')) return value
    }
    const columnUrl = String(callItem.recording_url ?? '').trim()
    return columnUrl.startsWith('http') ? columnUrl : null
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
