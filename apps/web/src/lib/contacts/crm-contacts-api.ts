import { backendGet } from '@/lib/api/backend-client'
import { cachedFetch } from '@/lib/cache/keyed-fetch-cache'
import { getOrgScopedKey } from '@/lib/utils/org-storage'

export type CrmSort =
  | 'created_at.desc'
  | 'created_at.asc'
  | 'email.asc'
  | 'email.desc'
  | 'name.asc'
  | 'name.desc'

export type CrmStatusFilter = 'all' | 'lead' | 'customer' | 'archived'

export type FilterOperator = 'is' | 'is_not' | 'is_empty' | 'is_not_empty'
export type MultiSelectLogic = 'any' | 'all'

export type FilterField = {
  operator: FilterOperator
  value: string | string[] | null
  multiSelectLogic?: MultiSelectLogic
}

export type FilterState = Record<string, FilterField>

export type CrmContactRow = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  tags: string[]
  contact_type: 'lead' | 'customer' | string
  contact_type_source?: string | null
  contact_type_confidence?: number | null
  contact_type_set_at?: string | null
  contact_source: string | null
  contact_source_detail?: string | null
  is_archived: boolean
  business_name: string | null
  website: string | null
  address: string | null
  city: string | null
  state: string | null
  country: string | null
  created_at: string
  updated_at: string

  // Enriched from membership tables
  funnel_id: string | null
  funnel_title: string | null
  source_domain: string | null
  page_slug: string | null
  /** Latest manual contact note (CRM list Notes column preview). */
  latest_note_preview?: string | null
}

export interface ListCrmContactsResponse {
  contacts: CrmContactRow[]
  total: number
  hasMore: boolean
}

export interface ListCrmFunnelsResponse {
  funnels: Array<{ id: string; title: string | null }>
}

export async function listCrmContacts(params: {
  limit?: number
  offset?: number
  sort?: CrmSort
  search?: string
  filters?: FilterState
  includeArchived?: boolean
  contactType?: string
  campaignId?: string
  segmentId?: string
}): Promise<ListCrmContactsResponse> {
  const searchParams = new URLSearchParams()
  if (params.limit) searchParams.set('limit', params.limit.toString())
  if (params.offset) searchParams.set('offset', params.offset.toString())
  if (params.sort) searchParams.set('sort', params.sort)
  if (params.search) searchParams.set('search', params.search)
  if (params.filters && Object.keys(params.filters).length > 0) {
    searchParams.set('filters', JSON.stringify(params.filters))
  }
  if (params.includeArchived) searchParams.set('includeArchived', 'true')
  if (params.contactType) searchParams.set('contactType', params.contactType)
  if (params.campaignId) searchParams.set('campaignId', params.campaignId)
  if (params.segmentId) searchParams.set('segmentId', params.segmentId)

  const query = searchParams.toString()
  // ttl 0 = promise dedupe only — collapses StrictMode double-effects and
  // concurrent duplicate mounts into one request; every settled call refetches.
  return cachedFetch(`crm-contacts:${query}`, () =>
    backendGet<ListCrmContactsResponse>(`/api/leads/crm/list${query ? `?${query}` : ''}`),
  )
}

const CRM_FUNNELS_TTL_MS = 60_000

export async function listCrmFunnels(): Promise<ListCrmFunnelsResponse> {
  return cachedFetch(
    getOrgScopedKey('crm-funnels'),
    () => backendGet<ListCrmFunnelsResponse>('/api/leads/crm/funnels'),
    { ttlMs: CRM_FUNNELS_TTL_MS },
  )
}
