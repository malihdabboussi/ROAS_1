import {
  backendGet,
  backendPatch,
  backendPost,
  type BackendFetchOptions,
} from '@/lib/api/backend-client'
import type { SpaceItem } from './space-item-types'

export type SpaceFieldType =
  | 'text'
  | 'number'
  | 'select'
  | 'multi_select'
  | 'date'
  | 'url'
  | 'media'
  | 'assignee'
  | 'contact'
  | 'checkbox'
  | 'currency'
  | 'email'
  | 'phone'
  | 'rating'
  | 'progress'
  | 'duration'
  | 'created_at'
  | 'updated_at'
  | 'mission'

export type SpaceStatusCategory = 'not_started' | 'active' | 'done' | 'closed'

export interface SpaceSelectOption {
  id: string
  label: string
  color?: string
  group?: SpaceStatusCategory
}

export interface SpaceFieldDef {
  id: string
  name: string
  type: SpaceFieldType
  options?: SpaceSelectOption[]
  tag_custom_swatches?: string[]
  system?: boolean
  required?: boolean
}

export interface SpaceViewSummary {
  id?: string
  type: string
  name?: string
  contacts_config?: {
    tag_options?: SpaceSelectOption[]
    contact_type_options?: SpaceSelectOption[]
  }
  visible_fields?: string[]
}

export interface SpaceSchemaSummary {
  version: 1
  fields: SpaceFieldDef[]
  views: SpaceViewSummary[]
  icon?: string
  icon_color?: string
}

export interface SpaceSummary {
  id: string
  org_id?: string | null
  user_id?: string | null
  title: string
  description?: string | null
  campaign_id: string | null
  visibility?: 'private' | 'team'
  schema: SpaceSchemaSummary
  created_at?: string
  updated_at?: string
}

const FIELD_TYPES_HIDDEN_FROM_UI: ReadonlySet<SpaceFieldType> = new Set(['duration'])

export function isSpaceFieldVisibleInUi(field: SpaceFieldDef): boolean {
  return !FIELD_TYPES_HIDDEN_FROM_UI.has(field.type)
}

export const DEFAULT_FLOW_AUTOMATION_FIELDS: SpaceFieldDef[] = [
  { id: 'title', name: 'Name', type: 'text', system: true, required: true },
  {
    id: 'status',
    name: 'Status',
    type: 'select',
    system: true,
    required: true,
    options: [
      { id: 'todo', label: 'To Do', color: 'cyan', group: 'not_started' },
      { id: 'in_progress', label: 'In Progress', color: 'amber', group: 'active' },
      { id: 'in_review', label: 'In Review', color: 'violet', group: 'active' },
      { id: 'needs_revision', label: 'Needs revision', color: 'orange', group: 'active' },
      { id: 'done', label: 'Completed', color: 'emerald', group: 'closed' },
      { id: 'archived', label: 'Closed', color: 'slate', group: 'closed' },
    ],
  },
  {
    id: 'priority',
    name: 'Priority',
    type: 'select',
    system: true,
    required: true,
    options: [
      { id: 'low', label: 'Low', color: 'slate' },
      { id: 'medium', label: 'Medium', color: 'blue' },
      { id: 'high', label: 'High', color: 'orange' },
      { id: 'urgent', label: 'Urgent', color: 'red' },
    ],
  },
  { id: 'assignee', name: 'Assignee', type: 'assignee', system: true },
  { id: 'due_date', name: 'Due Date', type: 'date', system: true },
  { id: 'tags', name: 'Tags', type: 'multi_select', system: true, options: [] },
  { id: 'category', name: 'Category', type: 'select', options: [] },
  { id: 'start_date', name: 'Start Date', type: 'date' },
  { id: 'notes', name: 'Notes', type: 'text' },
  { id: 'email', name: 'Email', type: 'email' },
  { id: 'phone', name: 'Phone', type: 'phone' },
  { id: 'url', name: 'URL', type: 'url' },
  { id: 'number', name: 'Number', type: 'number' },
  { id: 'currency', name: 'Currency', type: 'currency' },
  { id: 'checkbox', name: 'Checkbox', type: 'checkbox' },
  { id: 'rating', name: 'Rating', type: 'rating' },
  { id: 'progress', name: 'Progress', type: 'progress' },
  { id: 'created_at', name: 'Created', type: 'created_at', system: true },
  { id: 'updated_at', name: 'Updated', type: 'updated_at', system: true },
  { id: 'mission', name: 'Mission', type: 'mission', system: true },
]

export interface FetchSpacesOptions {
  campaign_id?: string
  general?: boolean
  limit?: number
}

export interface FetchSpacesPageOptions extends FetchSpacesOptions {
  cursor?: string | null
}

export interface FetchSpacesPageResult<TSpace = SpaceSummary> {
  items: TSpace[]
  nextCursor: string | null
}

const SPACE_LIST_MAX_LIMIT = 100

function spaceListLimit(limit: number): number {
  return Math.min(Math.max(Math.trunc(limit), 1), SPACE_LIST_MAX_LIMIT)
}

function spacesListPath(opts?: FetchSpacesPageOptions, paginated = false): string {
  const params = new URLSearchParams()
  if (typeof opts?.limit === 'number' && Number.isFinite(opts.limit)) {
    params.set('limit', String(spaceListLimit(opts.limit)))
  }
  if (opts?.campaign_id) params.set('campaign_id', opts.campaign_id)
  if (opts?.general) params.set('general', 'true')
  if (paginated) params.set('paginated', 'true')
  if (opts?.cursor) params.set('cursor', opts.cursor)
  return `/api/spaces?${params.toString()}`
}

export async function fetchSpaces<TSpace = SpaceSummary>(
  opts?: FetchSpacesOptions,
  backend?: BackendFetchOptions,
): Promise<TSpace[]> {
  return backendGet<TSpace[]>(spacesListPath(opts), backend)
}

export async function fetchSpacesPage<TSpace = SpaceSummary>(
  opts?: FetchSpacesPageOptions,
  backend?: BackendFetchOptions,
): Promise<FetchSpacesPageResult<TSpace>> {
  const response = await backendGet<{ items: TSpace[]; next_cursor: string | null }>(
    spacesListPath(opts, true),
    backend,
  )
  return { items: response.items, nextCursor: response.next_cursor }
}

export type SpaceItemFetchOptions = {
  item_kind?: 'all' | 'task' | 'doc' | 'view_item'
  parent_scope?: 'all' | 'top_level' | 'children'
  q?: string
  limit?: number
}

export async function fetchSpaceItems(
  spaceId: string,
  opts?: SpaceItemFetchOptions,
): Promise<SpaceItem[]> {
  const params = new URLSearchParams()
  if (opts?.item_kind) params.set('item_kind', opts.item_kind)
  if (opts?.parent_scope) params.set('parent_scope', opts.parent_scope)
  if (opts?.q) params.set('q', opts.q)
  if (opts?.limit) params.set('limit', String(opts.limit))
  const query = params.toString()
  return backendGet<SpaceItem[]>(`/api/spaces/${spaceId}/items${query ? `?${query}` : ''}`)
}

type SpaceDocEntitySearchResult = {
  kind: 'doc'
  id: string
  label: string
  url: string | null
}

function spaceItemRouteFromEntityUrl(
  url: string | null,
): { spaceId: string; itemId: string } | null {
  const match = typeof url === 'string' ? /^\/spaces\/([^/]+)\/([^/?#]+)/.exec(url) : null
  if (!match?.[1] || !match[2]) return null
  return { spaceId: match[1], itemId: match[2] }
}

function docSearchQueries(title?: string | null): string[] {
  const normalized = (title ?? '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
  const firstSegment = normalized.split(/[\u2014-]/)[0]?.trim() ?? ''
  return [...new Set([normalized, firstSegment, ''].filter((q) => q.length === 0 || q.length >= 3))]
}

async function fetchSpaceItemByEntitySearch(
  itemId: string,
  title?: string | null,
): Promise<SpaceItem | null> {
  for (const query of docSearchQueries(title)) {
    const params = new URLSearchParams({ types: 'doc', limit: '50' })
    if (query) params.set('q', query)
    const res = await backendGet<{ results: SpaceDocEntitySearchResult[] }>(
      `/api/entity-search?${params.toString()}`,
    )
    const match = res.results.find((row) => row.id === itemId)
    const route = spaceItemRouteFromEntityUrl(match?.url ?? null)
    if (!route) continue
    const items = await fetchSpaceItems(route.spaceId)
    const item = items.find((row) => row.id === route.itemId) ?? null
    if (item) return item
  }
  return null
}

export async function fetchSpaceItemById(
  itemId: string,
  title?: string | null,
): Promise<SpaceItem> {
  try {
    return await backendGet<SpaceItem>(`/api/spaces/items/${itemId}`)
  } catch (cause) {
    const foundViaSearch = await fetchSpaceItemByEntitySearch(itemId, title)
    if (foundViaSearch) return foundViaSearch
    throw cause
  }
}

export async function fetchSpaceItem(spaceId: string, itemId: string): Promise<SpaceItem> {
  try {
    return await backendGet<SpaceItem>(`/api/spaces/${spaceId}/items/${itemId}`)
  } catch {
    try {
      const items = await fetchSpaceItems(spaceId)
      const item = items.find((row) => row.id === itemId)
      if (item) return item
    } catch {
      /* list fallback failed - try global lookup */
    }
    return fetchSpaceItemById(itemId)
  }
}

export async function updateSpaceItem(
  spaceId: string,
  itemId: string,
  payload: Record<string, unknown>,
): Promise<SpaceItem> {
  return backendPatch<SpaceItem>(`/api/spaces/${spaceId}/items/${itemId}`, payload)
}

export interface VisualizeDocResult {
  success: true
  item_id: string
  space_id: string
  title: string
  html: string
  source_hash: string
  custom_data: Record<string, unknown>
}

export async function visualizeSpaceDoc(
  spaceId: string,
  itemId: string,
  input?: { style_hint?: string; prompt?: string; force?: boolean },
): Promise<VisualizeDocResult> {
  return backendPost<VisualizeDocResult>(
    `/api/spaces/${spaceId}/items/${itemId}/visualize-doc`,
    input ?? {},
  )
}

export interface SpaceItemActivity {
  id: string
  item_id: string
  space_id: string
  user_id: string
  org_id: string | null
  event_type: string
  payload: Record<string, unknown>
  created_at: string
}

export async function renameItemCommentAttachment(
  spaceId: string,
  itemId: string,
  activityId: string,
  fileUrl: string,
  filename: string,
): Promise<SpaceItemActivity> {
  return backendPatch<SpaceItemActivity>(
    `/api/spaces/${spaceId}/items/${itemId}/activity/${activityId}`,
    { attachment_rename: { file_url: fileUrl, filename } },
  )
}
