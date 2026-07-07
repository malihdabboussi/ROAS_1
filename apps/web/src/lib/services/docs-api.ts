import { backendPatch } from '@/lib/api/backend-client'
import type { ConversationDocument } from '@/lib/artifacts/artifact-types'

export async function updateConvDoc(
  id: string,
  patch: {
    title?: string
    content?: ({ html?: string } & Record<string, unknown>) | Record<string, unknown>
    metadata?: Record<string, unknown>
  },
): Promise<ConversationDocument> {
  return backendPatch<ConversationDocument>(`/api/documents/${id}`, patch)
}

export async function updateMissionDeliverable(
  id: string,
  patch: {
    title?: string
    content?: string | null
    metadata?: Record<string, unknown>
  },
): Promise<Record<string, unknown>> {
  return backendPatch<Record<string, unknown>>(`/api/missions/deliverables/${id}`, patch)
}
