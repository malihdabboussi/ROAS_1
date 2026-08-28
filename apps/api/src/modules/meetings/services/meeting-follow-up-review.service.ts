import { createHash } from 'node:crypto'
import { BadRequestException, GoneException, Injectable, NotFoundException } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import type { Response } from 'express'
import { SupabaseServiceClient, UserSessionMintService } from '@vibey/api-shared'
import { PageGraderApiService } from '../../integrations/page-grader/services/page-grader-api.service'
import { UserAgentApiService } from '../../user-agent-api/services/user-agent-api.service'
import {
  isFollowUpSpaceItem,
  mapFollowUpSpaceItemToMeetingAction,
} from '../domain/meeting-follow-up-actions'

@Injectable()
export class MeetingFollowUpReviewService {
  constructor(
    private readonly serviceClient: SupabaseServiceClient,
    private readonly userSessionMint: UserSessionMintService,
    private readonly userAgentApi: UserAgentApiService,
    private readonly moduleRef: ModuleRef,
  ) {}

  async getReview(token: string) {
    const call = await this.requireCall(token)
    return this.getReviewForCall(call)
  }

  private async getReviewForCall(call: Record<string, unknown>) {
    const custom = record(call.custom_data)
    const slack = record(custom.slack_follow_up_confirm)
    const [workspace, space, children, integrations] = await Promise.all([
      this.client
        .from('meeting_workspaces')
        .select('conversation_id')
        .eq('meeting_item_id', String(call.id))
        .maybeSingle(),
      this.client.from('spaces').select('schema').eq('id', String(call.space_id)).maybeSingle(),
      this.client
        .from('space_items')
        .select(
          'id, title, source, status, custom_data, parent_item_id, space_id, due_date, assignee_type, assignee_id, assignees, description, priority',
        )
        .eq('space_id', String(call.space_id))
        .or(
          `parent_item_id.eq.${String(call.id)},custom_data->>source_call_item_id.eq.${String(call.id)}`,
        )
        .order('created_at', { ascending: true }),
      this.client
        .from('user_integrations')
        .select('org_id, metadata')
        .eq('user_id', String(call.user_id))
        .eq('integration_id', 'page_grader')
        .eq('status', 'connected'),
    ])
    for (const result of [workspace, space, children, integrations]) {
      if (result.error) throw new BadRequestException(result.error.message)
    }
    const actions = ((children.data ?? []) as Record<string, unknown>[])
      .filter(isFollowUpSpaceItem)
      .map(mapFollowUpSpaceItemToMeetingAction)
      .filter((action) => action.status !== 'dismissed')
    const clientCampaign = record(custom.client_campaign)
    const schema = record(space.data)
    const fields = resolveMeetingFields(custom, schema)
    return {
      meeting: {
        id: String(call.id),
        space_id: String(call.space_id),
        title: String(call.title ?? 'Meeting'),
        summary: firstText(
          slack.review_summary,
          custom.meeting_summary,
          custom.summary,
          call.description,
        ),
        client_workspace: firstText(
          clientCampaign.client_name,
          custom.client_workspace_name,
          custom.client_name,
        ),
        client_campaign: Object.keys(clientCampaign).length > 0 ? clientCampaign : null,
        attendee_ids: fields.attendees.value,
        attendees: resolveAttendeeLabels(custom, schema),
        call_kind: fields.call_kind.value,
        call_status: fields.call_status.value,
        fields,
        follow_ups: actions.map((action) => ({
          id: String(action.id),
          title: String(action.title),
          status: String(action.status),
          owner: firstText(action.canonical_assignee_name),
          due_date: firstText(action.due_at),
        })),
        follow_up_message: firstText(slack.draft_message),
        conversation_id: firstText(workspace.data?.conversation_id),
      },
      client_workspaces: resolveClientOptions(integrations.data ?? [], clientCampaign),
      expires_at: firstText(slack.review_token_expires_at),
      review_started: Boolean(firstText(slack.review_started_at)),
    }
  }

  async updateReview(
    token: string,
    input: {
      summary: string
      client_campaign: Record<string, unknown> | null
      attendee_ids: string[]
      call_kind: string
      call_status: string
      follow_up_message: string
      dismissed_follow_up_ids: string[]
      follow_ups: Array<{ id: string; title: string; owner: string; due_date: string }>
    },
  ) {
    const call = await this.requireCall(token)
    await this.updateReviewForCall(call, input)
    return this.getReviewForCall(call)
  }

  private async updateReviewForCall(
    call: Record<string, unknown>,
    input: {
      summary: string
      client_campaign: Record<string, unknown> | null
      attendee_ids: string[]
      call_kind: string
      call_status: string
      follow_up_message: string
      dismissed_follow_up_ids: string[]
      follow_ups: Array<{ id: string; title: string; owner: string; due_date: string }>
    },
  ) {
    const custom = record(call.custom_data)
    const slack = record(custom.slack_follow_up_confirm)
    const updatedCustomData = {
      ...custom,
      meeting_summary: input.summary,
      client_campaign: input.client_campaign,
      attendees: input.attendee_ids,
      call_kind: input.call_kind,
      call_status: input.call_status,
      slack_follow_up_confirm: {
        ...slack,
        review_summary: input.summary,
        draft_message: input.follow_up_message,
        review_started_at: firstText(slack.review_started_at) || new Date().toISOString(),
      },
    }
    const { error } = await this.client
      .from('space_items')
      .update({
        custom_data: updatedCustomData,
      })
      .eq('id', String(call.id))
      .eq('space_id', String(call.space_id))
    if (error) throw new BadRequestException(error.message)
    call.custom_data = updatedCustomData
    if (input.dismissed_follow_up_ids.length > 0) {
      const rows = await this.client
        .from('space_items')
        .select('id, custom_data, parent_item_id, source')
        .in('id', input.dismissed_follow_up_ids)
        .eq('space_id', String(call.space_id))
      if (rows.error) throw new BadRequestException(rows.error.message)
      await Promise.all(
        ((rows.data ?? []) as Record<string, unknown>[])
          .filter((row) => {
            const rowCustom = record(row.custom_data)
            return (
              isFollowUpSpaceItem(row) &&
              (String(row.parent_item_id ?? '') === String(call.id) ||
                String(rowCustom.source_call_item_id ?? '') === String(call.id))
            )
          })
          .map((row) =>
            this.client
              .from('space_items')
              .update({
                custom_data: {
                  ...record(row.custom_data),
                  dismissed_at: new Date().toISOString(),
                },
              })
              .eq('id', String(row.id)),
          ),
      )
    }
    const followUpIds = input.follow_ups.map((followUp) => followUp.id)
    const existingFollowUps = followUpIds.length
      ? await this.client
          .from('space_items')
          .select('id, custom_data')
          .in('id', followUpIds)
          .eq('space_id', String(call.space_id))
      : { data: [], error: null }
    if (existingFollowUps.error) throw new BadRequestException(existingFollowUps.error.message)
    const customById = new Map(
      ((existingFollowUps.data ?? []) as Record<string, unknown>[]).map((row) => [
        String(row.id),
        record(row.custom_data),
      ]),
    )
    const followUpUpdates = await Promise.all(
      input.follow_ups.map((followUp) =>
        this.client
          .from('space_items')
          .update({
            title: followUp.title,
            due_date: followUp.due_date,
            custom_data: {
              ...customById.get(followUp.id),
              suggested_assignee_name: followUp.owner,
            },
          })
          .eq('id', followUp.id)
          .eq('space_id', String(call.space_id)),
      ),
    )
    const updateError = followUpUpdates.find((result) => result.error)?.error
    if (updateError) throw new BadRequestException(updateError.message)
  }

  async createDelegationPreview(token: string) {
    const call = await this.requireCall(token)
    return this.createDelegationPreviewForCall(call)
  }

  async createAuthenticatedDelegationPreview(
    userId: string,
    input: {
      space_id: string
      meeting_item_id: string
      summary: string
      client_campaign: Record<string, unknown> | null
      attendee_ids: string[]
      call_kind: string
      call_status: string
      follow_up_message: string
      dismissed_follow_up_ids: string[]
      follow_ups: Array<{ id: string; title: string; owner: string; due_date: string }>
    },
  ) {
    const call = await this.requireOwnedCall(userId, input.space_id, input.meeting_item_id)
    await this.updateReviewForCall(call, input)
    return this.createDelegationPreviewForCall(call)
  }

  private async createDelegationPreviewForCall(call: Record<string, unknown>) {
    const review = await this.getReviewForCall(call)
    const campaign = record(review.meeting.client_campaign)
    const clientId = firstText(campaign.client_id)
    const campaignId = firstText(campaign.campaign_id)
    if (!clientId || !campaignId) {
      throw new BadRequestException('Choose a mapped Client Workspace before task review')
    }
    const tasks = review.meeting.follow_ups as Array<{
      title: string
      owner: string
      due_date: string
    }>
    if (tasks.length === 0) throw new BadRequestException('Add at least one follow-up to review')
    if (tasks.some((task) => !task.owner || !task.due_date)) {
      throw new BadRequestException('Every follow-up needs a responsible person and due date')
    }
    const pageGrader = this.moduleRef.get(PageGraderApiService, { strict: false })
    const rawText = tasks
      .map(
        (task, index) =>
          `${index + 1}. WHAT: ${task.title}\nWHO: ${task.owner}\nWHEN: ${task.due_date}`,
      )
      .join('\n\n')
    const result = await pageGrader.createDelegationPreview(String(call.user_id), {
      client_id: clientId,
      client_ref: clientId,
      campaign_id: campaignId,
      raw_text: rawText,
      source: 'roas_platform',
      idempotency_key: `meeting-post-call:${String(call.id)}`,
    })
    const custom = record(call.custom_data)
    const slack = record(custom.slack_follow_up_confirm)
    const { error } = await this.client
      .from('space_items')
      .update({
        custom_data: {
          ...custom,
          slack_follow_up_confirm: {
            ...slack,
            delegation_preview: result,
            task_review_started_at: new Date().toISOString(),
          },
        },
      })
      .eq('id', String(call.id))
      .eq('space_id', String(call.space_id))
    if (error) throw new BadRequestException(error.message)
    return result
  }

  async getChat(token: string) {
    const { meeting } = await this.getReview(token)
    if (!meeting.conversation_id) throw new NotFoundException('Meeting review chat not found')
    const { data, error } = await this.client
      .from('messages')
      .select('id, conversation_id, role, content, metadata, created_at')
      .eq('conversation_id', meeting.conversation_id)
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) throw new BadRequestException(error.message)
    return { conversation_id: meeting.conversation_id, messages: (data ?? []).reverse() }
  }

  async streamChat(token: string, content: string, res: Response) {
    const call = await this.requireCall(token)
    const review = await this.getReview(token)
    const conversationId = review.meeting.conversation_id
    if (!conversationId) throw new NotFoundException('Meeting review chat not found')
    const userId = String(call.user_id)
    const accessToken = await this.userSessionMint.mintAccessToken(userId)
    const response = await this.userAgentApi.invoke(
      userId,
      '/api/channel-chat',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Token': process.env.INTERNAL_API_TOKEN ?? '',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          user_id: userId,
          conversation_id: conversationId,
          content: content.trim(),
          source: 'meeting_follow_up_review',
          access_token: accessToken,
          org_id: call.org_id ?? null,
          channel_user: {
            platform_id: `meeting-review:${String(call.id)}`,
            display_name: 'Meeting follow-up reviewer',
          },
        }),
      },
      { timeoutMs: 900_000, logTag: `meeting_follow_up_review call=${String(call.id)}` },
    )
    if (!response.ok || !response.body) {
      throw new BadRequestException('Could not send the meeting review chat message')
    }
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()
    const reader = response.body.getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) res.write(value)
    }
    res.end()
  }

  private get client() {
    return this.serviceClient.client
  }

  private async requireCall(token: string): Promise<Record<string, unknown>> {
    const hash = createHash('sha256').update(token, 'utf8').digest('hex')
    const { data, error } = await this.client
      .from('space_items')
      .select('id, space_id, user_id, org_id, title, description, custom_data')
      .eq('custom_data->slack_follow_up_confirm->>review_token_hash', hash)
      .maybeSingle()
    if (error) throw new BadRequestException(error.message)
    if (!data) throw new NotFoundException('Meeting review link not found')
    const expiry = firstText(
      record(record(record(data).custom_data).slack_follow_up_confirm).review_token_expires_at,
    )
    if (!expiry || Date.parse(expiry) <= Date.now())
      throw new GoneException('Meeting review link expired')
    return data as Record<string, unknown>
  }

  private async requireOwnedCall(
    userId: string,
    spaceId: string,
    meetingItemId: string,
  ): Promise<Record<string, unknown>> {
    const { data, error } = await this.client
      .from('space_items')
      .select('id, space_id, user_id, org_id, title, description, custom_data')
      .eq('id', meetingItemId)
      .eq('space_id', spaceId)
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw new BadRequestException(error.message)
    if (!data) throw new NotFoundException('Meeting review not found')
    return data as Record<string, unknown>
  }
}

function resolveClientOptions(rows: unknown[], current: Record<string, unknown>) {
  const options = new Map<
    string,
    { id: string; name: string; campaign_id: string; space_id: string | null }
  >()
  for (const rowValue of rows) {
    const row = record(rowValue)
    const scopeMap = record(record(row.metadata).client_scope_map)
    for (const [id, value] of Object.entries(scopeMap)) {
      const entry = record(value)
      const campaignId = firstText(entry.campaign_id)
      if (!campaignId) continue
      options.set(id, {
        id,
        name: firstText(entry.campaign_name) || 'Client workspace',
        campaign_id: campaignId,
        space_id: firstText(entry.space_id),
      })
    }
  }
  const currentId = firstText(current.client_id)
  const currentCampaignId = firstText(current.campaign_id)
  if (currentId && currentCampaignId && !options.has(currentId)) {
    options.set(currentId, {
      id: currentId,
      name: firstText(current.client_name, current.campaign_name) || 'Client workspace',
      campaign_id: currentCampaignId,
      space_id: firstText(current.space_id, current.roas_space_id) || null,
    })
  }
  return [...options.values()].sort((a, b) => a.name.localeCompare(b.name))
}

function resolveMeetingFields(custom: Record<string, unknown>, space: Record<string, unknown>) {
  const fields = Array.isArray(record(space.schema).fields)
    ? (record(space.schema).fields as Array<Record<string, unknown>>)
    : []
  const pick = (id: string, value: unknown, fallbackName: string) => {
    const field = fields.find((candidate) => String(candidate.id ?? '') === id) ?? {}
    return {
      id,
      name: firstText(field.name) || fallbackName,
      type: firstText(field.type) || (id === 'attendees' ? 'multi_select' : 'select'),
      options: Array.isArray(field.options) ? field.options : [],
      value:
        id === 'attendees' ? (Array.isArray(value) ? value.map(String) : []) : firstText(value),
    }
  }
  return {
    call_kind: pick('call_kind', custom.call_kind, 'Call Kind'),
    call_status: pick('call_status', custom.call_status, 'Call status'),
    attendees: pick('attendees', custom.attendees, 'Attendees'),
  }
}

function resolveAttendeeLabels(custom: Record<string, unknown>, space: Record<string, unknown>) {
  const ids = Array.isArray(custom.attendees) ? custom.attendees.map(String) : []
  const fields = Array.isArray(record(space.schema).fields)
    ? (record(space.schema).fields as Array<Record<string, unknown>>)
    : []
  const options = fields.find((field) => String(field.id ?? '') === 'attendees')?.options
  if (!Array.isArray(options)) return savedAttendeeLabels(custom)
  const labels = ids.flatMap((id) => {
    const option = options.find((candidate) => String(record(candidate).id ?? '') === id)
    const label = firstText(record(option).label)
    return label ? [label] : []
  })
  return labels.length > 0 ? [...new Set(labels)] : savedAttendeeLabels(custom)
}

function savedAttendeeLabels(custom: Record<string, unknown>) {
  return Array.isArray(custom.attendee_labels)
    ? [
        ...new Set(
          custom.attendee_labels
            .map(String)
            .map((label) => label.trim())
            .filter(Boolean),
        ),
      ]
    : []
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function firstText(...values: unknown[]): string {
  return (
    values.find((value): value is string => typeof value === 'string' && !!value.trim())?.trim() ??
    ''
  )
}
