/**
 * Ensure Service Request drafts carry a ROAS conversation id for shared review chat.
 */

import type { WorkRequestDraftRow } from '../repositories/work-request.repository'
import { asRecord, readResumeConversationId, stringValue } from './work-request-review-security'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function mergeConversationIntoProvenance(
  provenance: Record<string, unknown>,
  conversationId: string,
): Record<string, unknown> {
  const context = asRecord(provenance.context)
  return {
    ...provenance,
    conversation_id: conversationId,
    context: {
      ...context,
      conversation_id: conversationId,
    },
  }
}

export function readSlackThreadProvenance(provenance: unknown): {
  channelId: string
  threadTs: string
} {
  const root = asRecord(provenance)
  const context = asRecord(root.context)
  return {
    channelId:
      stringValue(root.channel_id) ||
      stringValue(root.slack_channel_id) ||
      stringValue(context.channel_id) ||
      stringValue(context.slack_channel_id),
    threadTs:
      stringValue(root.thread_ts) ||
      stringValue(root.slack_thread_ts) ||
      stringValue(context.thread_ts) ||
      stringValue(context.slack_thread_ts),
  }
}

export async function resolveConversationFromSlackProvenance(input: {
  client: {
    from: (table: string) => any
  }
  draft: WorkRequestDraftRow
}): Promise<string | null> {
  if (readResumeConversationId(input.draft.provenance)) return null
  const { channelId, threadTs } = readSlackThreadProvenance(input.draft.provenance)
  if (!channelId || !threadTs) return null

  let query = input.client
    .from('conversations')
    .select('id')
    .eq('user_id', input.draft.owner_user_id)
    .eq('metadata->>slack_channel_id', channelId)
    .eq('metadata->>slack_thread_ts', threadTs)
  query = input.draft.owner_org_id
    ? query.eq('org_id', input.draft.owner_org_id)
    : query.is('org_id', null)

  const { data, error } = await query.limit(2)
  if (error) throw new Error(`Could not resolve Service Request chat: ${error.message}`)
  const rows = (data ?? []) as Array<{ id: string }>
  if (rows.length !== 1) return null
  const id = stringValue(rows[0]?.id)
  return UUID_RE.test(id) ? id : null
}

export async function loadOwnedConversationId(input: {
  client: {
    from: (table: string) => any
  }
  conversationId: string
  ownerUserId: string
  ownerOrgId: string | null
}): Promise<string | null> {
  if (!UUID_RE.test(input.conversationId)) return null
  let query = input.client
    .from('conversations')
    .select('id')
    .eq('id', input.conversationId)
    .eq('user_id', input.ownerUserId)
  query = input.ownerOrgId ? query.eq('org_id', input.ownerOrgId) : query.is('org_id', null)
  const { data, error } = await query.maybeSingle()
  if (error) throw new Error(`Could not verify Service Request chat: ${error.message}`)
  const id = stringValue(asRecord(data).id)
  return UUID_RE.test(id) ? id : null
}

export async function ensureDraftResumeConversation(input: {
  client: {
    from: (table: string) => any
  }
  draft: WorkRequestDraftRow
  update: (id: string, values: Record<string, unknown>) => Promise<WorkRequestDraftRow>
}): Promise<WorkRequestDraftRow> {
  if (readResumeConversationId(input.draft.provenance)) return input.draft
  const resolved = await resolveConversationFromSlackProvenance({
    client: input.client,
    draft: input.draft,
  })
  if (!resolved) return input.draft
  return input.update(input.draft.id, {
    provenance: mergeConversationIntoProvenance(asRecord(input.draft.provenance), resolved),
  })
}

export async function mergeIncomingDraftConversation(input: {
  client: {
    from: (table: string) => any
  }
  draft: WorkRequestDraftRow
  provenance: Record<string, unknown>
  update: (id: string, values: Record<string, unknown>) => Promise<WorkRequestDraftRow>
}): Promise<WorkRequestDraftRow> {
  if (readResumeConversationId(input.draft.provenance)) return input.draft
  const incoming = readResumeConversationId(input.provenance)
  if (!incoming) return input.draft
  const owned = await loadOwnedConversationId({
    client: input.client,
    conversationId: incoming,
    ownerUserId: input.draft.owner_user_id,
    ownerOrgId: input.draft.owner_org_id,
  })
  if (!owned) return input.draft
  return input.update(input.draft.id, {
    provenance: mergeConversationIntoProvenance(asRecord(input.draft.provenance), owned),
  })
}
