import { backendGet } from '@/lib/api/backend-client'

export type EntitySearchKind =
  | 'task'
  | 'doc'
  | 'channel'
  | 'space'
  | 'mission'
  | 'person'
  | 'agent'
  | 'conversation'

export interface EntitySearchResult {
  kind: EntitySearchKind
  id: string
  label: string
  subtitle: string | null
  iconUrl: string | null
  url: string | null
  /** For tasks: status option id (e.g. 'todo', 'in_progress', 'in_review', 'done'). */
  status?: string | null
  /** For tasks: status option color name from the space schema (e.g. 'cyan', 'amber', a hex). */
  statusColor?: string | null
  /** For tasks: status option label from the space schema (e.g. 'In Progress'). */
  statusLabel?: string | null
}

export async function searchEntities(
  query: string,
  opts?: {
    types?: EntitySearchKind[]
    limit?: number
    offset?: number
    campaignId?: string | null
  },
): Promise<EntitySearchResult[]> {
  const params = new URLSearchParams()
  if (query) params.set('q', query)
  if (opts?.types?.length) params.set('types', opts.types.join(','))
  if (opts?.limit) params.set('limit', String(opts.limit))
  if (opts?.offset) params.set('offset', String(opts.offset))
  if (opts?.campaignId) params.set('campaign_id', opts.campaignId)
  const res = await backendGet<{ results: EntitySearchResult[] }>(
    `/api/entity-search?${params.toString()}`,
  )
  return res.results
}
