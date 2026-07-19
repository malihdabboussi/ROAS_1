import { backendGet, backendPost } from '@/lib/api/backend-client'
import type {
  PageGraderClientScopeMap,
  PageGraderClientTagMap,
  PageGraderTaskTypeOption,
  PageGraderWorkKind,
} from '../lib/page-grader-client-tag'
import { FALLBACK_PAGE_GRADER_TASK_TYPES } from '../lib/page-grader-client-tag'

export type PageGraderClient = {
  id: string
  name: string
  status: string
}

export type PageGraderSendItemResult = {
  space_item_id: string
  status: 'created' | 'skipped_already_sent' | 'failed'
  work_id?: string
  work_url?: string
  error?: string
}

export type PageGraderMetaContext = {
  client: { id: string; name: string }
  connected: boolean
  accounts: Array<Record<string, unknown>>
  recommended_ad_account_id: string | null
  pages: Array<Record<string, unknown>>
  pixels: Array<Record<string, unknown>>
  campaigns: Array<Record<string, unknown>>
  provenance: { source: 'page_grader'; generated_at: string }
}

export type PageGraderClientScopeMappingInput = {
  clientId: string
  campaignId: string
  campaignName?: string
  spaceId?: string | null
  spaceTitle?: string | null
}

export async function listPageGraderClients(q?: string): Promise<{
  clients: PageGraderClient[]
  clientTagMap: PageGraderClientTagMap
  clientScopeMap: PageGraderClientScopeMap
}> {
  const qs = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''
  const res = await backendGet<{
    success: boolean
    clients: PageGraderClient[]
    client_tag_map?: PageGraderClientTagMap
    client_scope_map?: PageGraderClientScopeMap
  }>(`/api/integrations/page-grader/clients${qs}`)
  return {
    clients: res?.clients ?? [],
    clientTagMap:
      res?.client_tag_map && typeof res.client_tag_map === 'object' ? res.client_tag_map : {},
    clientScopeMap:
      res?.client_scope_map && typeof res.client_scope_map === 'object' ? res.client_scope_map : {},
  }
}

export async function savePageGraderClientScopeMap(
  mappings: PageGraderClientScopeMappingInput[],
): Promise<PageGraderClientScopeMap> {
  const res = await backendPost<{
    success: boolean
    client_scope_map?: PageGraderClientScopeMap
  }>('/api/integrations/page-grader/client-scope-map', {
    mappings: mappings.map((row) => ({
      client_id: row.clientId,
      campaign_id: row.campaignId,
      ...(row.campaignName ? { campaign_name: row.campaignName } : {}),
      space_id: row.spaceId ?? null,
      ...(row.spaceTitle ? { space_title: row.spaceTitle } : {}),
    })),
  })
  return res?.client_scope_map && typeof res.client_scope_map === 'object'
    ? res.client_scope_map
    : {}
}

export async function getMappedPageGraderMetaContext(input: {
  campaignId: string
  spaceId?: string | null
}): Promise<PageGraderMetaContext | null> {
  const { clients, clientScopeMap } = await listPageGraderClients()
  const client = clients.find((item) => {
    const scope = clientScopeMap[item.id]
    return (
      (input.spaceId && scope?.space_id === input.spaceId) ||
      scope?.campaign_id === input.campaignId
    )
  })
  if (!client) return null
  const response = await backendGet<{ meta_context?: PageGraderMetaContext }>(
    `/api/integrations/page-grader/clients/${encodeURIComponent(client.id)}/meta-context`,
  )
  return response.meta_context ?? null
}

export async function listPageGraderTaskTypes(): Promise<PageGraderTaskTypeOption[]> {
  try {
    const res = await backendGet<{
      success: boolean
      task_types?: PageGraderTaskTypeOption[]
    }>('/api/integrations/page-grader/task-types')
    if (Array.isArray(res?.task_types) && res.task_types.length > 0) {
      return res.task_types.filter(
        (row) =>
          row &&
          typeof row.id === 'string' &&
          row.id.trim() &&
          typeof row.label === 'string' &&
          row.label.trim(),
      )
    }
  } catch {
    // Fall through to local Portal-aligned list when edge function is not deployed yet.
  }
  return FALLBACK_PAGE_GRADER_TASK_TYPES
}

export type PageGraderAssignee = {
  id: string
  name: string
  email: string | null
}

export async function listPageGraderAssignees(q?: string): Promise<PageGraderAssignee[]> {
  const qs = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''
  const res = await backendGet<{
    success: boolean
    assignees?: PageGraderAssignee[]
  }>(`/api/integrations/page-grader/assignees${qs}`)
  return Array.isArray(res?.assignees) ? res.assignees : []
}

export async function sendSpaceItemsToPageGrader(input: {
  clientId: string
  spaceId: string
  spaceItemIds: string[]
  note?: string
  /** YYYY-MM-DD deadline for Page Grader + SpaceAS Space item write-back */
  dueDate?: string
  workKind?: PageGraderWorkKind
  taskType: string
  clientTagId?: string
  clientTagLabel?: string
  assignee?: {
    pageGraderUserId?: string
    email?: string
    name?: string
  } | null
}): Promise<{ success: boolean; results: PageGraderSendItemResult[] }> {
  const res = await backendPost<{ success: boolean; results: PageGraderSendItemResult[] }>(
    '/api/integrations/page-grader/send',
    {
      client_id: input.clientId,
      space_id: input.spaceId,
      space_item_ids: input.spaceItemIds,
      work_kind: input.workKind ?? 'task_request',
      task_type: input.taskType,
      ...(input.note?.trim() ? { note: input.note.trim() } : {}),
      ...(input.dueDate?.trim() ? { due_date: input.dueDate.trim().slice(0, 10) } : {}),
      ...(input.clientTagId ? { client_tag_id: input.clientTagId } : {}),
      ...(input.clientTagLabel ? { client_tag_label: input.clientTagLabel } : {}),
      ...(input.assignee
        ? {
            assignee: {
              ...(input.assignee.pageGraderUserId
                ? { page_grader_user_id: input.assignee.pageGraderUserId }
                : {}),
              ...(input.assignee.email ? { email: input.assignee.email } : {}),
              ...(input.assignee.name ? { name: input.assignee.name } : {}),
            },
          }
        : {}),
    },
  )
  return {
    success: Boolean(res?.success),
    results: Array.isArray(res?.results) ? res.results : [],
  }
}
