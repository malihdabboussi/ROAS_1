import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class MeetingRecapRepository {
  async listActions(
    supabase: SupabaseClient,
    meetingItemId: string,
  ): Promise<Record<string, unknown>[]> {
    const { data, error } = await supabase
      .from('meeting_actions')
      .select('*')
      .eq('meeting_item_id', meetingItemId)
      .neq('status', 'dismissed')
      .order('created_at', { ascending: true })
    if (error) throw new BadRequestException(error.message)
    return (data as Record<string, unknown>[]) ?? []
  }

  async upsertRecap(
    supabase: SupabaseClient,
    input: {
      meetingItemId: string
      spaceId: string
      userId: string
      orgId: string | null
      title: string
      docBody: string
    },
  ): Promise<string> {
    const { data: workspace, error: workspaceError } = await supabase
      .from('meeting_workspaces')
      .select('recap_doc_item_id')
      .eq('meeting_item_id', input.meetingItemId)
      .single()
    if (workspaceError) throw new BadRequestException(workspaceError.message)
    const recapId = String(workspace?.recap_doc_item_id ?? '').trim()
    if (recapId) {
      const { error } = await supabase
        .from('space_items')
        .update({ title: input.title, doc_body: input.docBody })
        .eq('id', recapId)
        .eq('space_id', input.spaceId)
      if (error) throw new BadRequestException(error.message)
      return recapId
    }

    const { data, error } = await supabase
      .from('space_items')
      .insert({
        space_id: input.spaceId,
        user_id: input.userId,
        org_id: input.orgId,
        parent_item_id: input.meetingItemId,
        title: input.title,
        doc_body: input.docBody,
        source: 'fathom',
        custom_data: {
          _view_type: 'doc',
          entry_type: 'meeting_recap',
          meeting_item_id: input.meetingItemId,
          unified_provider_recap: true,
        },
      })
      .select('id')
      .single()
    if (error) throw new BadRequestException(error.message)
    const createdId = String(data.id)
    const { error: linkError } = await supabase
      .from('meeting_workspaces')
      .update({ recap_doc_item_id: createdId })
      .eq('meeting_item_id', input.meetingItemId)
    if (linkError) throw new BadRequestException(linkError.message)
    return createdId
  }
}
