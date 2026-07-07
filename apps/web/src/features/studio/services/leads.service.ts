import { backendGet, backendPost } from '@/lib/api/backend-client'

export {
  fetchActiveCampaignContactsPage,
  fetchGhlContactsForImport,
  getCrmSyncStatus,
  importContactsToCampaign,
  importCrmContactsBatch,
  importCrmContactsInBatches,
  startCrmSync,
} from '@/lib/contacts/crm-import-api'
export type {
  AcListContact,
  CrmSyncJobStatus,
  CrmSyncSource,
  GhlListContact,
} from '@/lib/contacts/crm-import-api'

export interface Lead {
  id: string
  email: string
  name: string | null
  phone: string | null
  funnel_id: string | null
  campaign_id: string | null
  contact_type: string
  source_domain: string | null
  page_slug: string | null
  created_at: string
}

export type CrmSort =
  | 'created_at.desc'
  | 'created_at.asc'
  | 'email.asc'
  | 'email.desc'
  | 'name.asc'
  | 'name.desc'

export type CrmContactRow = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  tags: string[]
  contact_type: 'lead' | 'customer' | string
  contact_source: string | null
  is_archived: boolean
  created_at: string
  updated_at: string
  funnel_id: string | null
  funnel_title: string | null
  source_domain: string | null
  page_slug: string | null
}

export interface CrmContactsResponse {
  contacts: CrmContactRow[]
  total: number
  hasMore: boolean
}

export async function fetchLeadsByCampaign(campaignId: string): Promise<Lead[]> {
  return backendGet<Lead[]>(`/api/leads?campaign_id=${campaignId}`)
}

export async function fetchCampaignContacts(params: {
  campaignId: string
  limit?: number
  offset?: number
  sort?: CrmSort
  search?: string
  contactType?: 'lead' | 'customer'
}): Promise<CrmContactsResponse> {
  const sp = new URLSearchParams()
  sp.set('campaignId', params.campaignId)
  if (params.limit) sp.set('limit', params.limit.toString())
  if (params.offset) sp.set('offset', params.offset.toString())
  if (params.sort) sp.set('sort', params.sort)
  if (params.search) sp.set('search', params.search)
  if (params.contactType) sp.set('contactType', params.contactType)
  return backendGet<CrmContactsResponse>(`/api/leads/crm/list?${sp.toString()}`)
}

export async function fetchAllContacts(params: {
  limit?: number
  offset?: number
  sort?: CrmSort
  search?: string
}): Promise<CrmContactsResponse> {
  const sp = new URLSearchParams()
  if (params.limit) sp.set('limit', params.limit.toString())
  if (params.offset) sp.set('offset', params.offset.toString())
  if (params.sort) sp.set('sort', params.sort)
  if (params.search) sp.set('search', params.search)
  return backendGet<CrmContactsResponse>(`/api/leads/crm/list?${sp.toString()}`)
}

export async function createCrmContact(input: {
  email: string
  first_name?: string
  last_name?: string
  phone?: string
}): Promise<{ id: string }> {
  return backendPost<{ id: string }>('/api/leads/contacts', input)
}
