import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

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
      meetingItemId: string
      actionId: string
      patch: Record<string, unknown>
    },
  ): Promise<Record<string, unknown>> {
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
}
