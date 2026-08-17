import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type MeetingScope = {
  meetingItemId: string
  spaceId: string
  userId: string
  orgId: string | null
}

@Injectable()
export class MeetingWorkspaceAgendaRepository {
  async ensureAgendaDocument(
    supabase: SupabaseClient,
    input: MeetingScope & { title: string },
  ): Promise<string> {
    const { data: workspace, error: workspaceError } = await supabase
      .from('meeting_workspaces')
      .select('agenda_doc_item_id')
      .eq('meeting_item_id', input.meetingItemId)
      .maybeSingle()
    if (workspaceError) throw new BadRequestException(workspaceError.message)
    if (!workspace) throw new BadRequestException('Meeting workspace not found')
    const existingId = String(workspace.agenda_doc_item_id ?? '').trim()
    if (existingId) return existingId

    const { data: children, error: childrenError } = await supabase
      .from('space_items')
      .select('id, custom_data')
      .eq('space_id', input.spaceId)
      .eq('parent_item_id', input.meetingItemId)
    if (childrenError) throw new BadRequestException(childrenError.message)
    const orphan = ((children as Record<string, unknown>[]) ?? []).find((row) => {
      const custom =
        row.custom_data && typeof row.custom_data === 'object' && !Array.isArray(row.custom_data)
          ? (row.custom_data as Record<string, unknown>)
          : {}
      return String(custom.entry_type ?? '') === 'meeting_agenda' && String(row.id ?? '').trim()
    })
    const orphanId = String(orphan?.id ?? '').trim()
    if (orphanId) {
      await linkAgendaDocument(supabase, input.meetingItemId, orphanId)
      return orphanId
    }

    const title = `Agenda — ${input.title}`.slice(0, 500)
    const { data, error } = await supabase
      .from('space_items')
      .insert({
        space_id: input.spaceId,
        user_id: input.userId,
        org_id: input.orgId,
        parent_item_id: input.meetingItemId,
        title,
        doc_body: '',
        source: 'manual',
        custom_data: {
          _view_type: 'doc',
          entry_type: 'meeting_agenda',
          meeting_item_id: input.meetingItemId,
        },
      })
      .select('id')
      .single()
    if (error) throw new BadRequestException(error.message)
    const createdId = String(data.id)
    await linkAgendaDocument(supabase, input.meetingItemId, createdId)
    return createdId
  }
}

async function linkAgendaDocument(
  supabase: SupabaseClient,
  meetingItemId: string,
  agendaDocItemId: string,
): Promise<void> {
  const { error } = await supabase
    .from('meeting_workspaces')
    .update({ agenda_doc_item_id: agendaDocItemId })
    .eq('meeting_item_id', meetingItemId)
  if (error) throw new BadRequestException(error.message)
}
