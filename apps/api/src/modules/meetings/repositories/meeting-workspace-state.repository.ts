import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { findMatchingMeetingAction } from '../domain/meeting-action-dedupe'
import {
  isFollowUpSpaceItem,
  mapFollowUpSpaceItemToMeetingAction,
  meetingActionStatusToFollowUpStatus,
} from '../domain/meeting-follow-up-actions'
import { planProviderFollowUpUpserts } from '../domain/upsert-provider-follow-ups'
import type { FathomSourceAction } from '../providers/fathom-meeting-source'

type MeetingScope = {
  meetingItemId: string
  spaceId: string
  userId: string
  orgId: string | null
}

@Injectable()
export class MeetingWorkspaceStateRepository {
  async updateWorkspace(
    supabase: SupabaseClient,
    meetingItemId: string,
    patch: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const { data, error } = await supabase
      .from('meeting_workspaces')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('meeting_item_id', meetingItemId)
      .select()
      .single()
    if (error) throw new BadRequestException(error.message)
    return data as Record<string, unknown>
  }

  async createSnippet(
    supabase: SupabaseClient,
    input: MeetingScope & {
      sourceType: string
      text: string
      sourceRecordingId?: string | null
      authorName?: string | null
      occurredAt?: string | null
      sourceLabel?: string | null
    },
  ): Promise<Record<string, unknown>> {
    const { data, error } = await supabase
      .from('meeting_snippets')
      .insert({
        meeting_item_id: input.meetingItemId,
        space_id: input.spaceId,
        user_id: input.userId,
        org_id: input.orgId,
        source_recording_id: input.sourceRecordingId ?? null,
        source_type: input.sourceType,
        text: input.text,
        author_name: input.authorName ?? null,
        occurred_at: input.occurredAt ?? null,
        source_label: input.sourceLabel ?? null,
      })
      .select()
      .single()
    if (error) throw new BadRequestException(error.message)
    return data as Record<string, unknown>
  }

  async updateAction(
    supabase: SupabaseClient,
    input: {
      spaceId?: string
      meetingItemId: string
      actionId: string
      patch: Record<string, unknown>
    },
  ): Promise<Record<string, unknown>> {
    const followUp = await this.findFollowUpAction(supabase, input)
    if (followUp) {
      const nextStatus = meetingActionStatusToFollowUpStatus(input.patch.status)
      const currentCustom = record(followUp.custom_data)
      const dismissed = String(input.patch.status ?? '') === 'dismissed'
      const { data, error } = await supabase
        .from('space_items')
        .update({
          status: nextStatus,
          custom_data: {
            ...currentCustom,
            dismissed_at: dismissed ? new Date().toISOString() : null,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.actionId)
        .eq('space_id', String(followUp.space_id ?? input.spaceId ?? ''))
        .select('id, title, source, status, custom_data, created_at, updated_at')
        .single()
      if (error) throw new BadRequestException(error.message)
      return mapFollowUpSpaceItemToMeetingAction(data as Record<string, unknown>)
    }

    const { data, error } = await supabase
      .from('meeting_actions')
      .update({ ...input.patch, updated_at: new Date().toISOString() })
      .eq('id', input.actionId)
      .eq('meeting_item_id', input.meetingItemId)
      .select()
      .single()
    if (error) throw new BadRequestException(error.message)
    return data as Record<string, unknown>
  }

  async listActiveActions(
    supabase: SupabaseClient,
    meetingItemId: string,
    spaceId?: string,
  ): Promise<Record<string, unknown>[]> {
    if (spaceId) {
      const followUps = await this.listFollowUpActions(supabase, spaceId, meetingItemId)
      if (followUps.length > 0) return followUps.map(mapFollowUpSpaceItemToMeetingAction)
    }
    const { data, error } = await supabase
      .from('meeting_actions')
      .select('*')
      .eq('meeting_item_id', meetingItemId)
      .neq('status', 'dismissed')
      .order('created_at', { ascending: true })
    if (error) throw new BadRequestException(error.message)
    return (data as Record<string, unknown>[]) ?? []
  }

  async createManualAction(
    supabase: SupabaseClient,
    input: MeetingScope & {
      title: string
      assigneeName?: string | null
    },
  ): Promise<Record<string, unknown>> {
    const title = input.title.trim()
    const existing = await this.listActiveActions(supabase, input.meetingItemId, input.spaceId)
    const match = findMatchingMeetingAction(existing, title)
    if (match) {
      return this.updateAction(supabase, {
        spaceId: input.spaceId,
        meetingItemId: input.meetingItemId,
        actionId: String(match.id),
        patch: { status: String(match.status ?? 'confirmed') },
      })
    }

    // Write the same Meetings-space follow_up row Programs → Meetings shows.
    const { data: meeting, error: meetingError } = await supabase
      .from('space_items')
      .select('id, title, user_id, org_id')
      .eq('id', input.meetingItemId)
      .eq('space_id', input.spaceId)
      .maybeSingle()
    if (meetingError) throw new BadRequestException(meetingError.message)
    if (!meeting) throw new BadRequestException('Meeting not found')

    const { data, error } = await supabase
      .from('space_items')
      .insert({
        space_id: input.spaceId,
        user_id: input.userId || meeting.user_id,
        org_id: input.orgId ?? meeting.org_id ?? null,
        title,
        status: 'logged',
        source: 'manual',
        parent_item_id: input.meetingItemId,
        custom_data: {
          entry_type: 'follow_up',
          source_call_item_id: input.meetingItemId,
          source_call: String(meeting.title ?? '').trim() || null,
          ...(input.assigneeName?.trim()
            ? { suggested_assignee_name: input.assigneeName.trim() }
            : {}),
        },
      })
      .select('id, title, source, status, custom_data, created_at, updated_at')
      .single()
    if (error) throw new BadRequestException(error.message)
    return mapFollowUpSpaceItemToMeetingAction(data as Record<string, unknown>)
  }

  /**
   * Exact Fathom actions → follow_up space_items (Programs Action items + Home).
   * Merges into matching manual rows by normalized title.
   */
  async upsertProviderFollowUps(
    supabase: SupabaseClient,
    input: MeetingScope & {
      actions: readonly FathomSourceAction[]
      meetingTitle?: string | null
    },
  ): Promise<string[]> {
    if (input.actions.length === 0) return []

    const { data: meeting, error: meetingError } = await supabase
      .from('space_items')
      .select('id, title, user_id, org_id')
      .eq('id', input.meetingItemId)
      .eq('space_id', input.spaceId)
      .maybeSingle()
    if (meetingError) throw new BadRequestException(meetingError.message)
    if (!meeting) throw new BadRequestException('Meeting not found')

    const existing = await this.listFollowUpActions(supabase, input.spaceId, input.meetingItemId)
    const plans = planProviderFollowUpUpserts({
      meetingItemId: input.meetingItemId,
      meetingTitle: input.meetingTitle?.trim() || String(meeting.title ?? '').trim() || null,
      actions: input.actions,
      existingFollowUps: existing,
    })

    const ids: string[] = []
    const userId = input.userId || String(meeting.user_id ?? '')
    const orgId = input.orgId ?? (meeting.org_id ? String(meeting.org_id) : null)

    for (const plan of plans) {
      if (plan.kind === 'update') {
        const { data, error } = await supabase
          .from('space_items')
          .update({
            title: plan.title,
            status: plan.status,
            custom_data: plan.customData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', plan.itemId)
          .eq('space_id', input.spaceId)
          .select('id')
          .single()
        if (error) throw new BadRequestException(error.message)
        ids.push(String(data.id))
        continue
      }

      const { data, error } = await supabase
        .from('space_items')
        .insert({
          space_id: input.spaceId,
          user_id: userId,
          org_id: orgId,
          title: plan.title,
          status: plan.status,
          source: 'fathom',
          parent_item_id: input.meetingItemId,
          custom_data: plan.customData,
        })
        .select('id')
        .single()
      if (error) throw new BadRequestException(error.message)
      ids.push(String(data.id))
    }

    return ids
  }

  private async listFollowUpActions(
    supabase: SupabaseClient,
    spaceId: string,
    meetingItemId: string,
  ): Promise<Record<string, unknown>[]> {
    const { data, error } = await supabase
      .from('space_items')
      .select('id, title, source, status, custom_data, created_at, updated_at, space_id')
      .eq('space_id', spaceId)
      .or(
        `parent_item_id.eq.${meetingItemId},custom_data->>source_call_item_id.eq.${meetingItemId}`,
      )
      .order('created_at', { ascending: true })
    if (error) throw new BadRequestException(error.message)
    return ((data as Record<string, unknown>[]) ?? []).filter((row) => isFollowUpSpaceItem(row))
  }

  private async findFollowUpAction(
    supabase: SupabaseClient,
    input: { spaceId?: string; meetingItemId: string; actionId: string },
  ): Promise<Record<string, unknown> | null> {
    const { data, error } = await supabase
      .from('space_items')
      .select('id, title, source, status, custom_data, space_id, parent_item_id')
      .eq('id', input.actionId)
      .maybeSingle()
    if (error) throw new BadRequestException(error.message)
    if (!data || !isFollowUpSpaceItem(data as Record<string, unknown>)) return null
    const custom = record((data as Record<string, unknown>).custom_data)
    const linked =
      String((data as Record<string, unknown>).parent_item_id ?? '') === input.meetingItemId ||
      String(custom.source_call_item_id ?? '') === input.meetingItemId
    if (!linked) return null
    if (input.spaceId && String((data as Record<string, unknown>).space_id) !== input.spaceId) {
      return null
    }
    return data as Record<string, unknown>
  }
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}
