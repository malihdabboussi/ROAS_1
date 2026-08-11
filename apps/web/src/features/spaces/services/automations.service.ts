import {
  backendDelete,
  backendGet,
  backendPatch,
  backendPost,
  type BackendFetchOptions,
} from '@/lib/api/backend-client'
import { fetchAutomationRuns } from '@/lib/flows/automation-runs-api'
import type { AutomationRun } from '@/lib/flows/automation-runs-api'
import {
  fetchAutomationTemplates,
  installAutomationTemplate as installFlowAutomationTemplate,
} from '@/lib/flows/automation-template-api'
import type { SpaceAutomation } from '../types/space-schema'

export { fetchAutomationRuns, fetchAutomationTemplates }
export type { AutomationRun }

export interface AutomationPickerOption {
  id: string
  label: string
  description?: string | null
}

export async function fetchAutomations(spaceId: string): Promise<SpaceAutomation[]> {
  const result = await backendGet<SpaceAutomation[]>(`/api/spaces/${spaceId}/automations`)
  return result
}

export async function installAutomationTemplate(
  spaceId: string,
  templateKey: string,
): Promise<SpaceAutomation> {
  return installFlowAutomationTemplate<SpaceAutomation>(spaceId, templateKey)
}

export type CreateAutomationBody =
  | Omit<SpaceAutomation, 'id' | 'created_at' | 'updated_at'>
  | {
      is_draft: true
      name: string
      enabled: boolean
      trigger: SpaceAutomation['trigger']
      actions: SpaceAutomation['actions']
    }

export async function createAutomation(
  spaceId: string,
  input: CreateAutomationBody,
): Promise<SpaceAutomation> {
  return backendPost<SpaceAutomation>(`/api/spaces/${spaceId}/automations`, input)
}

export async function updateAutomation(
  spaceId: string,
  automationId: string,
  payload: Partial<Pick<SpaceAutomation, 'name' | 'enabled' | 'trigger' | 'actions' | 'is_draft'>>,
): Promise<SpaceAutomation> {
  const result = await backendPatch<SpaceAutomation>(
    `/api/spaces/${spaceId}/automations/${automationId}`,
    payload,
  )
  return result
}

export async function deleteAutomation(spaceId: string, automationId: string): Promise<void> {
  return backendDelete(`/api/spaces/${spaceId}/automations/${automationId}`)
}

export interface RecentCompletedAutomationRun {
  id: string
  space_id: string
  item_id: string | null
  automation_id: string | null
  status: 'success' | 'partial'
  created_at: string
  automation_name: string | null
  space_title: string | null
}

export async function fetchRecentCompletedAutomationRuns(input?: {
  limit?: number
  feedScope?: 'workspace' | 'personal' | 'all' | 'org'
  feedOrgId?: string | null
  campaignId?: string | null
  mineOnly?: boolean
  backend?: BackendFetchOptions
}): Promise<RecentCompletedAutomationRun[]> {
  const params = new URLSearchParams()
  params.set('limit', String(input?.limit ?? 50))
  if (input?.feedScope) params.set('feed_scope', input.feedScope)
  if (input?.feedOrgId) params.set('feed_org_id', input.feedOrgId)
  if (input?.campaignId) params.set('campaign_id', input.campaignId)
  if (input?.mineOnly === false) params.set('mine_only', 'false')
  return backendGet<RecentCompletedAutomationRun[]>(
    `/api/spaces/recent-automation-runs?${params.toString()}`,
    input?.backend ?? {},
  )
}

export interface FathomSourceOptions {
  self: { user_integration_id: string; scope_mode: string } | null
  users: Array<{ user_integration_id: string; user_id: string; display_name: string }>
  teams: Array<{ team_id: string; name: string; icon: string | null; color: string | null }>
}

export async function fetchFathomSources(spaceId: string): Promise<FathomSourceOptions> {
  return backendGet<FathomSourceOptions>(`/api/spaces/${spaceId}/automations/fathom-sources`)
}

export async function testAutomation(
  spaceId: string,
  automationId: string,
  itemId?: string,
  preview = false,
): Promise<
  | { renderedActions: { type: string; rendered: string }[] }
  | { preview: true; action_results: Record<string, unknown>[] }
> {
  const query = preview ? '?preview=true' : ''
  return backendPost(`/api/spaces/${spaceId}/automations/${automationId}/test${query}`, {
    ...(itemId ? { item_id: itemId } : {}),
  })
}

export async function searchAutomationContacts(input: {
  search?: string
  limit?: number
  offset?: number
}): Promise<{ options: AutomationPickerOption[]; hasMore: boolean }> {
  const params = new URLSearchParams()
  params.set('limit', String(input.limit ?? 25))
  params.set('offset', String(input.offset ?? 0))
  params.set('sort', 'created_at.desc')
  if (input.search) params.set('search', input.search)
  const res = await backendGet<{
    contacts?: Array<{
      id: string
      email?: string | null
      first_name?: string | null
      last_name?: string | null
      business_name?: string | null
    }>
    hasMore?: boolean
  }>(`/api/leads/contacts?${params.toString()}`)
  return {
    options: (res.contacts ?? []).map((contact) => {
      const name = [contact.first_name, contact.last_name].filter(Boolean).join(' ').trim()
      return {
        id: contact.id,
        label: name || contact.email || contact.business_name || contact.id,
        description:
          contact.email && contact.email !== name ? contact.email : contact.business_name,
      }
    }),
    hasMore: !!res.hasMore,
  }
}

export async function searchAutomationChannels(input: {
  search?: string
  limit?: number
  offset?: number
}): Promise<{ options: AutomationPickerOption[]; hasMore: boolean }> {
  const params = new URLSearchParams()
  if (input.search) params.set('q', input.search)
  params.set('types', 'channel')
  params.set('limit', String(input.limit ?? 25))
  params.set('offset', String(input.offset ?? 0))
  const res = await backendGet<{
    results: Array<{ id: string; label: string; subtitle?: string | null }>
  }>(`/api/entity-search?${params.toString()}`)
  const rows = res.results ?? []
  return {
    options: rows.map((row) => ({ id: row.id, label: row.label, description: row.subtitle })),
    hasMore: rows.length >= (input.limit ?? 25),
  }
}

export async function searchAutomationForms(input: {
  campaignId?: string | null
  search?: string
  limit?: number
  offset?: number
}): Promise<{ options: AutomationPickerOption[]; hasMore: boolean }> {
  if (!input.campaignId) return { options: [], hasMore: false }
  const forms = await backendGet<
    Array<{ id: string; name?: string | null; status?: string | null }>
  >(`/api/forms?campaign_id=${encodeURIComponent(input.campaignId)}`)
  const q = (input.search ?? '').trim().toLowerCase()
  const filtered = q
    ? forms.filter((form) => (form.name ?? form.id).toLowerCase().includes(q))
    : forms
  const offset = input.offset ?? 0
  const limit = input.limit ?? 25
  return {
    options: filtered.slice(offset, offset + limit).map((form) => ({
      id: form.id,
      label: form.name ?? form.id,
      description: form.status ?? null,
    })),
    hasMore: offset + limit < filtered.length,
  }
}

export async function searchAutomationArtifacts(input: {
  campaignId?: string | null
  kind?: string | null
  search?: string
  limit?: number
  offset?: number
}): Promise<{ options: AutomationPickerOption[]; hasMore: boolean }> {
  if (!input.campaignId) return { options: [], hasMore: false }
  if (input.kind === 'form') return searchAutomationForms(input)
  if (input.kind === 'email') {
    const emails = await backendGet<
      Array<{
        id: string
        subject?: string | null
        status?: string | null
        updated_at?: string | null
      }>
    >(`/api/campaigns/${encodeURIComponent(input.campaignId)}/emails`)
    const q = (input.search ?? '').trim().toLowerCase()
    const filtered = q
      ? emails.filter((email) => (email.subject ?? email.id).toLowerCase().includes(q))
      : emails
    const offset = input.offset ?? 0
    const limit = input.limit ?? 25
    return {
      options: filtered.slice(offset, offset + limit).map((email) => ({
        id: email.id,
        label: email.subject ?? email.id,
        description: email.status ?? null,
      })),
      hasMore: offset + limit < filtered.length,
    }
  }
  if (input.kind === 'funnel' || input.kind === 'website') {
    const funnels = await backendGet<
      Array<{ id: string; title?: string | null; name?: string | null; status?: string | null }>
    >(`/api/funnels?campaign_id=${encodeURIComponent(input.campaignId)}`)
    const q = (input.search ?? '').trim().toLowerCase()
    const filtered = q
      ? funnels.filter((funnel) =>
          (funnel.title ?? funnel.name ?? funnel.id).toLowerCase().includes(q),
        )
      : funnels
    const offset = input.offset ?? 0
    const limit = input.limit ?? 25
    return {
      options: filtered.slice(offset, offset + limit).map((funnel) => ({
        id: funnel.id,
        label: funnel.title ?? funnel.name ?? funnel.id,
        description: funnel.status ?? null,
      })),
      hasMore: offset + limit < filtered.length,
    }
  }
  return { options: [], hasMore: false }
}

export async function searchAutomationComposioAccounts(input: {
  toolkit?: string | null
  search?: string
  limit?: number
  offset?: number
}): Promise<{ options: AutomationPickerOption[]; hasMore: boolean }> {
  const res = await backendGet<{
    accounts?: Array<{
      id: string
      status?: string
      toolkitSlug?: string
      toolkit_slug?: string
      toolkit?: { slug?: string }
      connection_label?: string | null
      scope_mode?: string | null
    }>
  }>('/api/integrations/composio/accounts')
  const q = (input.search ?? '').trim().toLowerCase()
  const toolkit = input.toolkit?.trim().toLowerCase()
  const rows = (res.accounts ?? []).filter((account) => {
    const slug = String(account.toolkitSlug ?? account.toolkit_slug ?? account.toolkit?.slug ?? '')
      .trim()
      .toLowerCase()
    if (toolkit && slug !== toolkit) return false
    if (String(account.status ?? '').toUpperCase() !== 'ACTIVE') return false
    if (!q) return true
    return account.id.toLowerCase().includes(q) || slug.includes(q)
  })
  const offset = input.offset ?? 0
  const limit = input.limit ?? 25
  return {
    options: rows.slice(offset, offset + limit).map((account) => {
      const slug = String(
        account.toolkitSlug ?? account.toolkit_slug ?? account.toolkit?.slug ?? '',
      )
      const label = account.connection_label?.trim()
      return {
        id: account.id,
        label: label || `${slug || 'Account'} · ${account.id.slice(0, 8)}`,
        description:
          account.scope_mode === 'org_shared' ? 'Shared with this org' : (account.status ?? null),
      }
    }),
    hasMore: offset + limit < rows.length,
  }
}

export async function searchCursorConnections(input: {
  search?: string
  limit?: number
  offset?: number
}): Promise<{ options: AutomationPickerOption[]; hasMore: boolean }> {
  const res = await backendGet<{
    connections?: Array<{ id: string; label: string; scope_mode: string; is_default: boolean }>
  }>('/api/integrations/cursor/connections')
  const q = (input.search ?? '').trim().toLowerCase()
  const rows = (res.connections ?? []).filter((row) => {
    if (!q) return true
    return row.label.toLowerCase().includes(q) || row.id.toLowerCase().includes(q)
  })
  const offset = input.offset ?? 0
  const limit = input.limit ?? 25
  return {
    options: rows.slice(offset, offset + limit).map((row) => ({
      id: row.id,
      label: row.is_default ? `${row.label} (default)` : row.label,
      description: row.scope_mode === 'org_shared' ? 'Org shared' : 'Personal',
    })),
    hasMore: offset + limit < rows.length,
  }
}

export async function searchGitHubReposForAutomation(input: {
  search?: string
  limit?: number
  offset?: number
}): Promise<{ options: AutomationPickerOption[]; hasMore: boolean }> {
  const res = await backendGet<{
    repos?: Array<{ full_name: string; html_url: string; default_branch: string }>
  }>('/api/integrations/github/repos')
  const q = (input.search ?? '').trim().toLowerCase()
  const rows = (res.repos ?? []).filter((repo) => {
    if (!q) return true
    return repo.full_name.toLowerCase().includes(q) || repo.html_url.toLowerCase().includes(q)
  })
  const offset = input.offset ?? 0
  const limit = input.limit ?? 25
  return {
    options: rows.slice(offset, offset + limit).map((repo) => ({
      id: repo.html_url,
      label: repo.full_name,
      description: repo.default_branch,
    })),
    hasMore: offset + limit < rows.length,
  }
}
