import { backendGet, backendPost } from '@/lib/api/backend-client'

export type AgencyClient = {
  id: string
  name: string
  display_name?: string
  status: string
  pipeline_stage?: string
  website_url?: string | null
  logo_url?: string | null
  industry?: string | null
  overview?: string | null
  happy_factor?: number | null
  account_manager?: { id: string; name: string; email: string | null } | null
  counts?: { campaigns: number; open_tasks: number; open_requests: number }
  mapping?: {
    campaign_id: string
    campaign_name?: string
    space_id?: string | null
    space_title?: string | null
  } | null
  [key: string]: unknown
}

export type AgencyClientCampaign = {
  id: string
  client_id: string
  name: string
  description?: string | null
  campaign_overview?: string | null
  status: string | null
  platform_status: string
  start_date: string | null
  end_date: string | null
  event_date: string | null
  budget_amount: number | null
  budget_type: string | null
  currency: string | null
  next_action: string | null
  roas_space_id?: string | null
  clients?: { id: string; name: string; friendly_name?: string | null }
  [key: string]: unknown
}

export type AgencyClientWorkspace = {
  client: AgencyClient
  campaigns: AgencyClientCampaign[]
  tasks: Array<Record<string, unknown>>
  requests: Array<Record<string, unknown>>
  mapping: NonNullable<AgencyClient['mapping']>
  campaign_spaces: Array<{
    page_grader_campaign_id: string
    space_id: string
    space_title: string
  }>
}

export async function fetchAgencyClients(search = '', sync = true) {
  const params = new URLSearchParams()
  if (search.trim()) params.set('q', search.trim())
  params.set('sync', String(sync))
  return backendGet<{ clients: AgencyClient[]; sync_errors: Array<Record<string, string>> }>(
    `/api/integrations/page-grader/agency/clients?${params}`,
  )
}

export async function fetchAgencyClient(clientId: string) {
  const response = await backendGet<{ workspace: AgencyClientWorkspace }>(
    `/api/integrations/page-grader/agency/clients/${encodeURIComponent(clientId)}`,
  )
  return response.workspace
}

export async function fetchAgencyClientCampaigns(clientId?: string) {
  const params = new URLSearchParams()
  if (clientId) params.set('client_id', clientId)
  const query = params.size ? `?${params}` : ''
  return backendGet<{ campaigns: AgencyClientCampaign[] }>(
    `/api/integrations/page-grader/agency/client-campaigns${query}`,
  )
}

export async function updateAgencyWorkspaceEntity(
  clientId: string,
  input: {
    kind: 'client' | 'campaign' | 'task' | 'request'
    entity_id?: string
    patch: Record<string, unknown>
  },
) {
  return backendPost(
    `/api/integrations/page-grader/agency/clients/${encodeURIComponent(clientId)}/update`,
    input,
  )
}
