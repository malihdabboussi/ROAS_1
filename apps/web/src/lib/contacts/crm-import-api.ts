import { backendGet, backendPost } from '@/lib/api/backend-client'

export async function importContactsToCampaign(
  campaignId: string,
  contactIds: string[],
): Promise<{ imported: number }> {
  return backendPost<{ imported: number }>('/api/leads/campaign-import', {
    campaignId,
    contactIds,
  })
}

export async function importCrmContactsBatch(
  contacts: Array<{
    email: string
    first_name?: string | null
    last_name?: string | null
    phone?: string | null
    contact_source?: string | null
    contact_source_detail?: string | null
  }>,
): Promise<{ imported: number; skipped: number; contact_ids: string[] }> {
  return backendPost<{ imported: number; skipped: number; contact_ids: string[] }>(
    '/api/leads/contacts/import-batch',
    {
      contacts,
    },
  )
}

export type GhlListContact = {
  id: string
  email?: string
  firstName?: string
  lastName?: string
  name?: string
  phone?: string
}

export async function fetchGhlContactsForImport(): Promise<GhlListContact[]> {
  const res = await backendGet<{ success?: boolean; contacts?: GhlListContact[] }>(
    '/api/integrations/lhg/contacts',
  )
  return res.contacts ?? []
}

export type AcListContact = {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string
}

export async function fetchActiveCampaignContactsPage(params: {
  limit?: number
  offset?: number
  search?: string
}): Promise<{
  contacts: AcListContact[]
  total: number
  limit: number
  offset: number
}> {
  const sp = new URLSearchParams()
  if (params.limit != null) sp.set('limit', String(params.limit))
  if (params.offset != null) sp.set('offset', String(params.offset))
  if (params.search?.trim()) sp.set('search', params.search.trim())
  const q = sp.toString()
  return backendGet<{
    success?: boolean
    contacts: AcListContact[]
    total: number
    limit: number
    offset: number
  }>(`/api/integrations/active-campaign/crm-import-contacts${q ? `?${q}` : ''}`)
}

export type CrmSyncSource = 'activecampaign' | 'gohighlevel'

export type CrmSyncJobStatus = {
  id: string
  user_id: string
  source: string
  status: string
  job_id: string | null
  total_remote: number | null
  fetched: number
  imported: number
  skipped: number
  last_error: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export async function startCrmSync(
  source: CrmSyncSource,
): Promise<{ jobId: string; status: string }> {
  return backendPost<{ jobId: string; status: string }>('/api/leads/crm-sync', { source })
}

export async function getCrmSyncStatus(jobId: string): Promise<CrmSyncJobStatus> {
  return backendGet<CrmSyncJobStatus>(`/api/leads/crm-sync/${encodeURIComponent(jobId)}`)
}

const CRM_IMPORT_BATCH_MAX = 5000

export async function importCrmContactsInBatches(
  contacts: Array<{
    email: string
    first_name?: string | null
    last_name?: string | null
    phone?: string | null
    contact_source?: string | null
    contact_source_detail?: string | null
  }>,
): Promise<{ imported: number; skipped: number; contact_ids: string[] }> {
  let imported = 0
  let skipped = 0
  const contact_ids: string[] = []
  for (let i = 0; i < contacts.length; i += CRM_IMPORT_BATCH_MAX) {
    const slice = contacts.slice(i, i + CRM_IMPORT_BATCH_MAX)
    const r = await importCrmContactsBatch(slice)
    imported += r.imported
    skipped += r.skipped
    if (r.contact_ids?.length) contact_ids.push(...r.contact_ids)
  }
  return { imported, skipped, contact_ids }
}
