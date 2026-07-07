import type { SupabaseClient } from '@supabase/supabase-js'

type DocEditPayload = { title?: unknown; doc_body?: unknown }
type DocConversationSyncRepository = {
  updateLinkedConversationDocument(
    supabase: SupabaseClient,
    conversationDocumentId: string,
    updates: Record<string, unknown>,
  ): Promise<{ error: { message: string } | null }>
}

/**
 * Agent-created Space Docs keep a linked conversation_documents row
 * (custom_data._conversation_document_id) that chat and agent actions read.
 * Docs UI edits land on space_items only, so title/body changes must write
 * through to the linked row or the two surfaces drift apart.
 *
 * Best-effort by design: RLS only allows the conversation owner and
 * conversation editors to write conversation_documents, so a shared-space
 * member's edit may not sync. Agent reads resolve the newest copy, so a
 * skipped write-back degrades to stale-but-recoverable, never wrong.
 */
export async function syncDocEditToConversationDocument(
  repository: DocConversationSyncRepository,
  supabase: SupabaseClient,
  item: Record<string, unknown> | null | undefined,
  payload: DocEditPayload,
): Promise<{ synced: boolean; error?: string }> {
  if (!item) return { synced: false }
  if (payload.title === undefined && payload.doc_body === undefined) return { synced: false }
  const customData =
    item.custom_data && typeof item.custom_data === 'object' && !Array.isArray(item.custom_data)
      ? (item.custom_data as Record<string, unknown>)
      : null
  const conversationDocumentId =
    typeof customData?._conversation_document_id === 'string' &&
    customData._conversation_document_id.trim().length > 0
      ? customData._conversation_document_id
      : null
  if (!conversationDocumentId) return { synced: false }

  const updates: Record<string, unknown> = {}
  if (typeof payload.title === 'string' && payload.title.trim().length > 0) {
    updates.title = payload.title
  }
  if (typeof payload.doc_body === 'string') updates.content = payload.doc_body
  if (Object.keys(updates).length === 0) return { synced: false }
  updates.updated_at = new Date().toISOString()

  const { error } = await repository.updateLinkedConversationDocument(
    supabase,
    conversationDocumentId,
    updates,
  )
  if (error) return { synced: false, error: error.message }
  return { synced: true }
}
