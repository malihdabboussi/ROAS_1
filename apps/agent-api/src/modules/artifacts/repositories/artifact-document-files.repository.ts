import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryError = { message: string }

@Injectable()
export class ArtifactDocumentFilesRepository {
  async findConversation(
    supabase: SupabaseClient,
    conversationId: string,
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .maybeSingle()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async createConversationDocument(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<{ data: Record<string, unknown>; error: QueryError | null }> {
    return (await supabase.from('conversation_documents').insert(payload).select().single()) as {
      data: Record<string, unknown>
      error: QueryError | null
    }
  }

  async findMission(
    serviceClient: SupabaseClient,
    missionId: string,
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await serviceClient
      .from('missions')
      .select('id, user_id, campaign_id, org_id, space_id')
      .eq('id', missionId)
      .maybeSingle()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async findSubtaskMission(
    serviceClient: SupabaseClient,
    subtaskId: string,
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await serviceClient
      .from('mission_subtasks')
      .select('mission_id, user_id')
      .eq('id', subtaskId)
      .maybeSingle()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async saveMissionDeliverable(
    serviceClient: SupabaseClient,
    input: {
      payload: Record<string, unknown>
      updateId?: string | null
      idempotencyKey?: string | null
      missionId: string
      userId: string
    },
  ): Promise<{ data: Record<string, unknown>; error: QueryError | null }> {
    const query = input.updateId
      ? serviceClient
          .from('mission_deliverables')
          .update(input.payload)
          .eq('id', input.updateId)
          .eq('mission_id', input.missionId)
          .eq('user_id', input.userId)
      : input.idempotencyKey
        ? serviceClient
            .from('mission_deliverables')
            .upsert(input.payload, { onConflict: 'idempotency_key' })
        : serviceClient.from('mission_deliverables').insert(input.payload)
    return (await query.select('id, type, title, file_url, file_name, metadata').single()) as {
      data: Record<string, unknown>
      error: QueryError | null
    }
  }

  async findSubtaskExecutionState(
    serviceClient: SupabaseClient,
    input: { subtaskId: string; missionId: string; userId: string },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await serviceClient
      .from('mission_subtasks')
      .select('id, mission_id, user_id, execution_state')
      .eq('id', input.subtaskId)
      .eq('mission_id', input.missionId)
      .eq('user_id', input.userId)
      .maybeSingle()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async updateSubtaskExecutionState(
    serviceClient: SupabaseClient,
    input: {
      subtaskId: string
      missionId: string
      userId: string
      executionState: Record<string, unknown>
      updatedAt: string
    },
  ): Promise<void> {
    await serviceClient
      .from('mission_subtasks')
      .update({
        execution_state: input.executionState,
        updated_at: input.updatedAt,
      })
      .eq('id', input.subtaskId)
      .eq('mission_id', input.missionId)
      .eq('user_id', input.userId)
  }

  async uploadFileBytes(
    serviceClient: SupabaseClient,
    input: { bytes: Uint8Array; fileName: string; userId: string; mimeType: string },
  ): Promise<{ success: boolean; url?: string; path?: string; error?: string }> {
    const filePath = `${input.userId}/documents/${Date.now()}-${input.fileName}`
    const { error: uploadErr } = await serviceClient.storage
      .from('media')
      .upload(filePath, Buffer.from(input.bytes), { contentType: input.mimeType, upsert: false })
    if (uploadErr) {
      return { success: false, error: `Upload failed: ${uploadErr.message}` }
    }
    const { data: signed } = await serviceClient.storage
      .from('media')
      .createSignedUrl(filePath, 365 * 24 * 60 * 60)
    return { success: true, url: signed?.signedUrl ?? '', path: filePath }
  }
}
