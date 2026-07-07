import type {
  CrmContactRow,
  CrmSort,
  FilterState,
  ListCrmContactsResponse,
} from '@/lib/contacts/crm-contacts-api'
import { backendGet, backendPatch, backendPost } from '@/lib/api/backend-client'
import { cachedFetch } from '@/lib/cache/keyed-fetch-cache'

export type { CrmContactRow, CrmSort, FilterState, ListCrmContactsResponse }

export interface ContactActivityEvent {
  id: string
  event_type:
    | 'funnel_submission'
    | 'campaign_joined'
    | 'note_added'
    | 'contact_created'
    | 'field_change'
    | 'conversation_started'
    | 'conversation_message_activity'
  /** Actor / author: `display_name`, `avatar_url`; field_change includes `field`, `from`, `to` */
  payload: Record<string, unknown>
  created_at: string
  user_id?: string | null
}

export interface ContactActivityResponse {
  events: ContactActivityEvent[]
}

export async function fetchContacts(opts: {
  /** Campaign scope; pass null for all org contacts. */
  campaignId: string | null
  limit?: number
  offset?: number
  sort?: CrmSort
  search?: string
  filters?: FilterState
  includeArchived?: boolean
  contactType?: 'lead' | 'customer'
  segmentId?: string | null
}): Promise<ListCrmContactsResponse> {
  const params = new URLSearchParams()
  if (opts.campaignId) params.set('campaignId', opts.campaignId)
  if (opts.limit) params.set('limit', opts.limit.toString())
  if (opts.offset) params.set('offset', opts.offset.toString())
  if (opts.sort) params.set('sort', opts.sort)
  if (opts.search) params.set('search', opts.search)
  if (opts.filters && Object.keys(opts.filters).length > 0) {
    params.set('filters', JSON.stringify(opts.filters))
  }
  if (opts.includeArchived) params.set('includeArchived', 'true')
  if (opts.contactType) params.set('contactType', opts.contactType)
  if (opts.segmentId) params.set('segmentId', opts.segmentId)
  const query = params.toString()
  // ttl 0 = promise dedupe only (StrictMode/dual-mount safe); sequential calls refetch.
  return cachedFetch(`crm-contacts:${query}`, () =>
    backendGet<ListCrmContactsResponse>(`/api/leads/crm/list?${query}`),
  )
}

export async function fetchContactActivity(contactId: string): Promise<ContactActivityResponse> {
  return cachedFetch(`contact-activity:${contactId}`, () =>
    backendGet<ContactActivityResponse>(`/api/leads/contacts/${contactId}/activity`),
  )
}

export async function addContactNote(
  contactId: string,
  content: string,
  cardTint?: string | null,
): Promise<ContactActivityEvent> {
  return backendPost<ContactActivityEvent>(`/api/leads/contacts/${contactId}/notes`, {
    content,
    card_tint: cardTint ?? null,
  })
}

export async function updateContactNote(
  contactId: string,
  noteId: string,
  updates: { content?: string; card_tint?: string | null },
): Promise<{ id: string; content: string; card_tint: string | null }> {
  return backendPatch(`/api/leads/contacts/${contactId}/notes/${noteId}`, updates)
}
