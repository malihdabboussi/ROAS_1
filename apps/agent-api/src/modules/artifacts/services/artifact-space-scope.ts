import type { SupabaseClient } from '@supabase/supabase-js'
import { ArtifactSpaceItemsRepository } from '../repositories/artifact-space-items.repository'
import { buildDocumentSpaceItemFieldPayload, recordFrom } from './artifact-space-item-field-payload'

const spaceItemsRepository = new ArtifactSpaceItemsRepository()

export function getActiveSpaceId(input: Record<string, unknown>): string | null {
  const raw = input.space_id
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : null
}

function isFlowsConceptSpaceSchema(schema: unknown): boolean {
  if (!schema || typeof schema !== 'object') return false
  const customData = (schema as Record<string, unknown>).custom_data
  if (!customData || typeof customData !== 'object') return false
  return (customData as Record<string, unknown>).vibey_flows_concept_space === true
}

/**
 * Resolve which space should own a dual-written Space Doc.
 * Prefer explicit chat scope `space_id`; otherwise pin to the campaign's
 * most recently updated non–Flow-concepts space (Flow concepts is Flows-only).
 */
export async function resolveDocumentSpaceId(
  supabase: SupabaseClient,
  input: Record<string, unknown>,
  campaignId: string | null | undefined,
): Promise<string | null> {
  const explicit = getActiveSpaceId(input)
  if (explicit) return explicit
  if (typeof campaignId !== 'string' || campaignId.trim().length === 0) return null

  const { data, error } = await supabase
    .from('spaces')
    .select('id, schema, updated_at')
    .eq('campaign_id', campaignId.trim())
    .order('updated_at', { ascending: false })
    .limit(20)
  if (error || !data || data.length === 0) return null

  const preferred =
    data.find((row) => !isFlowsConceptSpaceSchema(row.schema)) ?? data[0] ?? null
  const id = preferred?.id
  return typeof id === 'string' && id.trim().length > 0 ? id.trim() : null
}

export function withSpaceId(
  input: Record<string, unknown>,
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const spaceId = getActiveSpaceId(input)
  return spaceId ? { ...payload, space_id: spaceId } : payload
}

export async function createSpaceDocItem(
  supabase: SupabaseClient,
  input: {
    spaceId: string
    userId: string
    orgId?: string | null
    title: string
    docBody: string | null
    documentType: string
    sourceId: string
    conversationDocumentId?: string | null
    fileUrl?: string | null
    fileName?: string | null
    mimeType?: string | null
    fieldInput?: Record<string, unknown>
  },
): Promise<{ id: string; warnings: string[] }> {
  const fieldPayload = await buildDocumentSpaceItemFieldPayload(
    supabase,
    input.spaceId,
    input.fieldInput ?? {},
  )
  const { custom_data: fieldCustomData, ...spaceFields } = fieldPayload.payload
  const customData: Record<string, unknown> = {
    ...recordFrom(fieldCustomData),
    _view_type: 'doc',
    _doc_source: 'space',
    _doc_type: input.documentType,
    _source_id: input.sourceId,
  }
  if (input.conversationDocumentId)
    customData._conversation_document_id = input.conversationDocumentId
  if (input.fileUrl) customData._doc_file_url = input.fileUrl
  if (input.fileName) customData._doc_file_name = input.fileName
  if (input.mimeType) customData._doc_mime_type = input.mimeType

  const { data, error } = await spaceItemsRepository.createSpaceDocItem(supabase, {
    space_id: input.spaceId,
    user_id: input.userId,
    org_id: input.orgId ?? null,
    title: input.title || 'Untitled',
    doc_body: input.docBody,
    ...spaceFields,
    source: 'agent',
    custom_data: customData,
  })
  if (error) throw error
  if (!data?.id) throw new Error('Space doc item was not created')
  return { id: String(data.id), warnings: fieldPayload.warnings }
}
