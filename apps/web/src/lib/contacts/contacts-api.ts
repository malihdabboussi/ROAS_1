import { backendGet, backendPatch, backendPost } from '@/lib/api/backend-client'
import { cachedFetch } from '@/lib/cache/keyed-fetch-cache'

export interface Contact {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  tags: string[]
  source: string | null
  source_id: string | null
  custom_fields: Record<string, unknown> | null
  business_name: string | null
  website: string | null
  address?: string | null
  city: string | null
  state: string | null
  country: string | null
  contact_type?: string | null
  contact_type_source?: string | null
  contact_type_confidence?: number | null
  contact_type_set_at?: string | null
  contact_source?: string | null
  contact_source_detail?: string | null
  ip?: string | null
  user_agent?: string | null
  utm?: Record<string, string> | null
  funnel_title?: string | null
  created_at: string
  updated_at: string
}

export interface ContactsResponse {
  data: Contact[]
  total: number
}

export async function fetchContacts(opts: {
  search?: string
  sort?: string
  limit?: number
  offset?: number
}): Promise<ContactsResponse> {
  const params = new URLSearchParams()
  if (opts.search) params.set('search', opts.search)
  if (opts.sort) params.set('sort', opts.sort)
  if (opts.limit) params.set('limit', String(opts.limit))
  if (opts.offset) params.set('offset', String(opts.offset))
  return backendGet<ContactsResponse>(`/api/leads/contacts?${params.toString()}`)
}

export async function fetchDistinctContactSourceValues(opts?: {
  sampleLimit?: number
}): Promise<string[]> {
  const limit = opts?.sampleLimit ?? 500
  const res = await fetchContacts({ limit, offset: 0, sort: 'updated_at.desc' })
  const set = new Set<string>()
  for (const contact of res.data) {
    const source = contact.contact_source?.trim()
    if (source) set.add(source)
  }
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
}

export async function fetchContact(contactId: string): Promise<Contact> {
  // ttl 0 = promise dedupe only - collapses StrictMode/concurrent duplicates.
  return cachedFetch(`contact-detail:${contactId}`, () =>
    backendGet<Contact>(`/api/leads/contacts/${contactId}`),
  )
}

export async function updateContact(
  contactId: string,
  updates: Partial<
    Pick<
      Contact,
      | 'first_name'
      | 'last_name'
      | 'phone'
      | 'email'
      | 'tags'
      | 'custom_fields'
      | 'source'
      | 'business_name'
      | 'website'
      | 'address'
      | 'city'
      | 'state'
      | 'country'
      | 'contact_type'
      | 'contact_type_source'
      | 'contact_type_confidence'
      | 'contact_type_set_at'
      | 'contact_source'
    >
  >,
): Promise<Contact> {
  return backendPatch<Contact>(`/api/leads/contacts/${contactId}`, updates)
}

export async function addContactNoteApi(
  contactId: string,
  content: string,
  cardTint?: string | null,
): Promise<unknown> {
  return backendPost(`/api/leads/contacts/${contactId}/notes`, {
    content,
    card_tint: cardTint ?? null,
  })
}

export async function reclassifyContactApi(
  contactId: string,
  input: { new_contact_type: string; confirmed?: boolean },
): Promise<{
  requires_confirmation: boolean
  contact?: Contact
  summary: Record<string, unknown>
}> {
  return backendPost<{
    requires_confirmation: boolean
    contact?: Contact
    summary: Record<string, unknown>
  }>(`/api/leads/contacts/${contactId}/reclassify`, input)
}
