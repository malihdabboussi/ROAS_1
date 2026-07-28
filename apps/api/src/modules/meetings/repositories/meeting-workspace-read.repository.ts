import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

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

    const [workspace, recordings, actions, contextLinks, snippets, deliverables, prior] =
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
          .select('id, title, source, doc_body, custom_data, created_at, updated_at')
          .eq('parent_item_id', input.meetingItemId)
          .eq('space_id', input.spaceId)
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
      actions,
      contextLinks,
      snippets,
      deliverables,
      prior,
    ]) {
      if (result.error) throw new BadRequestException(result.error.message)
    }

    let unresolvedCommitments: Record<string, unknown>[] = []
    const priorMeetingItemId = String(prior.data?.meeting_item_id ?? '').trim()
    if (priorMeetingItemId) {
      const { data, error } = await supabase
        .from('meeting_actions')
        .select('*')
        .eq('meeting_item_id', priorMeetingItemId)
        .in('status', ['confirmed', 'in_progress', 'rolled_forward'])
        .order('created_at', { ascending: true })
      if (error) throw new BadRequestException(error.message)
      unresolvedCommitments = (data as Record<string, unknown>[]) ?? []
    }

    return {
      meeting,
      workspace: workspace.data ?? null,
      recordings: recordings.data ?? [],
      actions: actions.data ?? [],
      context_links: contextLinks.data ?? [],
      snippets: snippets.data ?? [],
      deliverables: deliverables.data ?? [],
      continuity: {
        prior_meeting_item_id: priorMeetingItemId || null,
        unresolved_commitments: unresolvedCommitments,
      },
    }
  }
}
