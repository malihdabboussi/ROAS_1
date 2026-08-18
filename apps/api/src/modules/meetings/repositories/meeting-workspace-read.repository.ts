import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  isFollowUpSpaceItem,
  isMeetingAgendaSpaceItem,
  mapFollowUpSpaceItemToMeetingAction,
} from '../domain/meeting-follow-up-actions'

@Injectable()
export class MeetingWorkspaceReadRepository {
  async getWorkspaceBundle(
    supabase: SupabaseClient,
    input: { spaceId: string; meetingItemId: string },
  ): Promise<Record<string, unknown> | null> {
    const { data: meeting, error: meetingError } = await supabase
      .from('space_items')
      .select('*')
      .eq('id', input.meetingItemId)
      .eq('space_id', input.spaceId)
      .maybeSingle()
    if (meetingError) throw new BadRequestException(meetingError.message)
    if (!meeting) return null

    const [workspace, recordings, legacyActions, contextLinks, snippets, children, prior] =
      await Promise.all([
        supabase
          .from('meeting_workspaces')
          .select('*')
          .eq('meeting_item_id', input.meetingItemId)
          .maybeSingle(),
        supabase
          .from('meeting_recordings')
          .select('*')
          .eq('meeting_item_id', input.meetingItemId)
          .order('recording_start_at', { ascending: true, nullsFirst: false }),
        supabase
          .from('meeting_actions')
          .select('*')
          .eq('meeting_item_id', input.meetingItemId)
          .order('created_at', { ascending: true }),
        supabase
          .from('meeting_context_links')
          .select('*')
          .eq('meeting_item_id', input.meetingItemId)
          .neq('confirmation_state', 'rejected')
          .order('created_at', { ascending: true }),
        supabase
          .from('meeting_snippets')
          .select('*')
          .eq('meeting_item_id', input.meetingItemId)
          .order('occurred_at', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: true }),
        supabase
          .from('space_items')
          .select(
            'id, title, source, status, priority, assignee_id, assignee_type, assignees, due_date, start_date, user_id, org_id, sort_order, notes, description, linked_mission_id, parent_item_id, doc_body, custom_data, created_at, updated_at',
          )
          .eq('space_id', input.spaceId)
          .or(
            `parent_item_id.eq.${input.meetingItemId},custom_data->>source_call_item_id.eq.${input.meetingItemId}`,
          )
          .order('created_at', { ascending: true }),
        supabase
          .from('meeting_workspaces')
          .select('meeting_item_id')
          .eq('next_meeting_item_id', input.meetingItemId)
          .maybeSingle(),
      ])
    for (const result of [
      workspace,
      recordings,
      legacyActions,
      contextLinks,
      snippets,
      children,
      prior,
    ]) {
      if (result.error) throw new BadRequestException(result.error.message)
    }

    const childRows = (children.data as Record<string, unknown>[]) ?? []
    const followUps = childRows.filter((row) => isFollowUpSpaceItem(row))
    const deliverables = childRows.filter(
      (row) => !isFollowUpSpaceItem(row) && !isMeetingAgendaSpaceItem(row),
    )
    // Meetings-space follow_ups are canonical; legacy meeting_actions only fill gaps.
    const actionsFromFollowUps = followUps.map(mapFollowUpSpaceItemToMeetingAction)
    const legacyActionRows = (legacyActions.data as Record<string, unknown>[]) ?? []
    const actions = actionsFromFollowUps.length > 0 ? actionsFromFollowUps : legacyActionRows

    let unresolvedCommitments: Record<string, unknown>[] = []
    const priorMeetingItemId = String(prior.data?.meeting_item_id ?? '').trim()
    if (priorMeetingItemId) {
      const { data, error } = await supabase
        .from('space_items')
        .select('id, title, source, status, custom_data, created_at, updated_at')
        .eq('space_id', input.spaceId)
        .or(
          `parent_item_id.eq.${priorMeetingItemId},custom_data->>source_call_item_id.eq.${priorMeetingItemId}`,
        )
        .order('created_at', { ascending: true })
      if (error) throw new BadRequestException(error.message)
      const priorFollowUps = ((data as Record<string, unknown>[]) ?? [])
        .filter((row) => isFollowUpSpaceItem(row))
        .map(mapFollowUpSpaceItemToMeetingAction)
        .filter((row) => String(row.status) !== 'resolved')
      if (priorFollowUps.length > 0) {
        unresolvedCommitments = priorFollowUps
      } else {
        const legacy = await supabase
          .from('meeting_actions')
          .select('*')
          .eq('meeting_item_id', priorMeetingItemId)
          .in('status', ['confirmed', 'in_progress', 'rolled_forward'])
          .order('created_at', { ascending: true })
        if (legacy.error) throw new BadRequestException(legacy.error.message)
        unresolvedCommitments = (legacy.data as Record<string, unknown>[]) ?? []
      }
    }

    return {
      meeting,
      workspace: workspace.data ?? null,
      recordings: recordings.data ?? [],
      actions,
      context_links: contextLinks.data ?? [],
      snippets: snippets.data ?? [],
      deliverables,
      continuity: {
        prior_meeting_item_id: priorMeetingItemId || null,
        unresolved_commitments: unresolvedCommitments,
      },
    }
  }
}
