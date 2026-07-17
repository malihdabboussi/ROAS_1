import {
  backendDelete,
  backendGet,
  backendPatch,
  backendPost,
  type BackendFetchOptions,
} from '@/lib/api/backend-client'
import {
  fetchSpaceItem,
  fetchSpaceItemById,
  fetchSpaceItems,
  fetchSpaces as fetchSpacesBase,
  fetchSpacesPage as fetchSpacesPageBase,
  renameItemCommentAttachment as renameItemCommentAttachmentApi,
  updateSpaceItem,
  visualizeSpaceDoc,
  type FetchSpacesOptions,
  type FetchSpacesPageOptions,
  type FetchSpacesPageResult,
  type SpaceItemActivity,
  type SpaceItemFetchOptions,
  type VisualizeDocResult,
} from '@/lib/spaces/spaces-api'
import { normalizeSpaceLegacyViews, omitSchemaAutomations } from '../lib/view-customization-merge'
import type { Space, SpaceItem } from '../types'

export { fetchSpaceItem, fetchSpaceItemById, fetchSpaceItems, updateSpaceItem, visualizeSpaceDoc }
export type { SpaceItemActivity }
export type { SpaceItemFetchOptions }
export type { FetchSpacesPageOptions, FetchSpacesPageResult }
export type { VisualizeDocResult }

export type SpaceShareLevel = 'admin' | 'edit' | 'view'
export type SpaceShareEntityType = 'user' | 'org'
export type SpaceItemShareEntityType = SpaceShareEntityType | 'email'

export interface SpaceItemShareRecord {
  id: string
  item_id: string
  space_id: string
  org_id: string | null
  entity_type: SpaceItemShareEntityType
  entity_id: string
  level: SpaceShareLevel
  inherit_to_children: boolean
  created_by: string
  created_at: string
  invite_token?: string | null
  invited_email?: string | null
  invite_expires_at?: string | null
}

export interface SpaceShareRecord {
  id: string
  space_id: string
  org_id: string | null
  entity_type: SpaceShareEntityType
  entity_id: string
  level: SpaceShareLevel
  allowed_view_ids: string[] | null
  created_by: string
  created_at: string
}

export interface SharedItemResponse {
  share_type: 'public' | 'invite'
  access_level: SpaceShareLevel
  space: Pick<Space, 'id' | 'title' | 'visibility'>
  item: SpaceItem
}

export interface SharedSpaceRosterEntry {
  participant_id: string
  kind: 'agent' | 'human'
  display_name: string
  avatar_url: string | null
  user_id: string | null
  agent_key: string | null
}

export interface SharedSpaceResponse {
  access_level: 'view'
  space: Space
  items: SpaceItem[]
  roster: SharedSpaceRosterEntry[]
  campaign: { id: string; name: string } | null
}

export interface SpaceUserState {
  space_id: string
  is_favorite: boolean
  is_hidden: boolean
  updated_at: string
}

export async function fetchSpaceUserState(): Promise<SpaceUserState[]> {
  return backendGet<SpaceUserState[]>('/api/spaces/user-state')
}

export async function updateSpaceUserState(
  spaceId: string,
  patch: { is_favorite?: boolean; is_hidden?: boolean },
): Promise<SpaceUserState> {
  return backendPatch<SpaceUserState>(`/api/spaces/${spaceId}/user-state`, patch)
}

export async function fetchSpaces(
  opts?: FetchSpacesOptions,
  backend?: BackendFetchOptions,
): Promise<Space[]> {
  return fetchSpacesBase<Space>(opts, backend)
}

export async function fetchSpacesPage(
  opts?: FetchSpacesPageOptions,
  backend?: BackendFetchOptions,
): Promise<FetchSpacesPageResult<Space>> {
  return fetchSpacesPageBase<Space>(opts, backend)
}

export async function fetchSharedWithMe(): Promise<Space[]> {
  return backendGet<Space[]>('/api/spaces/shared-with-me')
}

export async function fetchSpaceById(spaceId: string): Promise<Space> {
  const s = await backendGet<Space>(`/api/spaces/${spaceId}`)
  return normalizeSpaceLegacyViews(s)
}

function spaceSchemaPayloadForApi(schema: unknown): unknown {
  if (schema === null || typeof schema !== 'object' || Array.isArray(schema)) return schema
  return omitSchemaAutomations({ ...(schema as Record<string, unknown>) })
}

export async function createSpace(input: {
  title: string
  description?: string
  campaign_id?: string
  visibility?: 'private' | 'team'
  schema?: unknown
  default_share_level?: SpaceShareLevel
}): Promise<Space> {
  const body =
    input.schema !== undefined
      ? { ...input, schema: spaceSchemaPayloadForApi(input.schema) }
      : input
  return backendPost<Space>('/api/spaces', body)
}

export async function ensureDefaultSpace(): Promise<Space> {
  return backendPost<Space>('/api/spaces/ensure-default', {})
}

export async function ensureGeneralSpace(): Promise<Space> {
  return backendPost<Space>('/api/spaces/ensure-general', {})
}

export async function updateSpace(
  spaceId: string,
  payload: Partial<Pick<Space, 'title' | 'description' | 'campaign_id' | 'visibility' | 'schema'>>,
  backend?: BackendFetchOptions,
): Promise<Space> {
  const body =
    payload.schema !== undefined
      ? { ...payload, schema: spaceSchemaPayloadForApi(payload.schema) }
      : payload
  return backendPatch<Space>(`/api/spaces/${spaceId}`, body, backend)
}

export async function deleteSpace(spaceId: string): Promise<void> {
  return backendDelete(`/api/spaces/${spaceId}`)
}

export async function createSpaceItem(
  spaceId: string,
  input: {
    title: string
    status?: string
    priority?: string | null
    assignee_type?: string
    assignee_id?: string | null
    assignees?: Array<{ type: 'human' | 'agent'; id: string }>
    start_date?: string | null
    due_date?: string | null
    description?: string | null
    notes?: string | null
    doc_body?: string | null
    custom_data?: Record<string, unknown>
    parent_item_id?: string | null
    form_id?: string | null
    sort_order?: number
  },
): Promise<SpaceItem> {
  return backendPost<SpaceItem>(`/api/spaces/${spaceId}/items`, input)
}

/**
 * True batch PATCH — one request, one server-side permission pass + row fetch
 * for the whole set (vs one heavy pipeline per item). Used by drag-and-drop
 * reorders that renumber many siblings at once.
 */
export async function updateSpaceItemsBatch(
  spaceId: string,
  updates: Array<{ item_id: string; payload: Record<string, unknown> }>,
): Promise<SpaceItem[]> {
  return backendPatch<SpaceItem[]>(`/api/spaces/${spaceId}/items/batch`, { updates })
}

export async function deleteSpaceItem(spaceId: string, itemId: string): Promise<void> {
  return backendDelete(`/api/spaces/${spaceId}/items/${itemId}`)
}

export interface UndoAgentTaskEditsResult {
  success: boolean
  direction: 'undo' | 'redo'
  undone: number
  skipped: Array<{
    activity_id: string
    item_id: string
    field?: string
    reason: string
  }>
  items: SpaceItem[]
}

export async function undoAgentTaskEdits(
  spaceId: string,
  input: {
    agent_message_id: string
    direction: 'undo' | 'redo'
    mode?: 'strict' | 'force'
  },
): Promise<UndoAgentTaskEditsResult> {
  return backendPost<UndoAgentTaskEditsResult>(`/api/spaces/${spaceId}/items/undo`, input)
}

export async function transferSpaceItem(
  sourceSpaceId: string,
  itemId: string,
  input: { target_space_id: string; mode: 'move' | 'copy' },
): Promise<SpaceItem> {
  return backendPost<SpaceItem>(
    `/api/spaces/${sourceSpaceId}/items/${itemId}/transfer-to-space`,
    input,
  )
}

export interface DuplicateSpaceItemInclude {
  status?: boolean
  priority?: boolean
  assignees?: boolean
  start_date?: boolean
  due_date?: boolean
  description?: boolean
  notes?: boolean
  /** Keys to copy from `custom_data` (e.g. tags + each user-defined field). */
  custom_field_ids?: string[]
  subtasks?: boolean
  recurrence?: boolean
  mission?: boolean
  comments?: boolean
  documents?: boolean
  deliverables?: boolean
}

export async function duplicateSpaceItem(
  spaceId: string,
  itemId: string,
  input: { include: DuplicateSpaceItemInclude; title?: string },
): Promise<SpaceItem> {
  return backendPost<SpaceItem>(`/api/spaces/${spaceId}/items/${itemId}/duplicate`, input)
}

export async function fetchSubtasks(spaceId: string, parentItemId: string): Promise<SpaceItem[]> {
  return backendGet<SpaceItem[]>(`/api/spaces/${spaceId}/items/${parentItemId}/subtasks`)
}

export interface PushToAgentOptions {
  include?: Record<string, boolean>
  preferred_agent_keys?: string[]
  extra_notes?: string
}

export async function pushItemToAgent(
  spaceId: string,
  itemId: string,
  options?: PushToAgentOptions,
): Promise<SpaceItem> {
  return backendPost<SpaceItem>(
    `/api/spaces/${spaceId}/items/${itemId}/push-to-agent`,
    options ?? {},
  )
}

// ---------------------------------------------------------------------------
// View overrides (per-user personal view config)
// ---------------------------------------------------------------------------

export interface SpaceViewOverride {
  id: string
  space_id: string
  user_id: string
  view_id: string
  overrides: Record<string, unknown>
  created_at: string
  updated_at: string
}

export async function fetchViewOverrides(spaceId: string): Promise<SpaceViewOverride[]> {
  return backendGet<SpaceViewOverride[]>(`/api/spaces/${spaceId}/view-overrides`)
}

export async function upsertViewOverride(
  spaceId: string,
  viewId: string,
  overrides: Record<string, unknown>,
): Promise<SpaceViewOverride> {
  return backendPatch<SpaceViewOverride>(`/api/spaces/${spaceId}/view-overrides/${viewId}`, {
    overrides,
  })
}

export async function deleteViewOverride(spaceId: string, viewId: string): Promise<void> {
  return backendDelete(`/api/spaces/${spaceId}/view-overrides/${viewId}`)
}

export async function fetchSpaceShares(
  spaceId: string,
): Promise<{ effective_level: SpaceShareLevel; shares: SpaceShareRecord[] }> {
  return backendGet<{ effective_level: SpaceShareLevel; shares: SpaceShareRecord[] }>(
    `/api/spaces/${spaceId}/shares`,
  )
}

export async function upsertSpaceShare(
  spaceId: string,
  input: {
    entity_type: SpaceShareEntityType
    entity_id: string
    level: SpaceShareLevel
    allowed_view_ids?: string[] | null
  },
): Promise<SpaceShareRecord> {
  return backendPost<SpaceShareRecord>(`/api/spaces/${spaceId}/shares`, input)
}

export async function deleteSpaceShare(
  spaceId: string,
  shareId: string,
): Promise<{ deleted: boolean }> {
  return backendDelete<{ deleted: boolean }>(`/api/spaces/${spaceId}/shares/${shareId}`)
}

// ─── Per-view shares ────────────────────────────────────────────────────────

export interface SpaceViewShareRecord {
  id: string
  space_id: string
  view_id: string
  org_id: string | null
  entity_type: SpaceShareEntityType
  entity_id: string
  level: SpaceShareLevel
  created_by: string
  created_at: string
}

export async function fetchSpaceViewShares(
  spaceId: string,
  viewId: string,
): Promise<{ effective_level: SpaceShareLevel; shares: SpaceViewShareRecord[] }> {
  return backendGet<{ effective_level: SpaceShareLevel; shares: SpaceViewShareRecord[] }>(
    `/api/spaces/${spaceId}/views/${encodeURIComponent(viewId)}/shares`,
  )
}

export async function upsertSpaceViewShare(
  spaceId: string,
  viewId: string,
  input: {
    entity_type: SpaceShareEntityType
    entity_id: string
    level: SpaceShareLevel
  },
): Promise<SpaceViewShareRecord> {
  return backendPost<SpaceViewShareRecord>(
    `/api/spaces/${spaceId}/views/${encodeURIComponent(viewId)}/shares`,
    input,
  )
}

export async function deleteSpaceViewShare(
  spaceId: string,
  viewId: string,
  shareId: string,
): Promise<{ deleted: boolean }> {
  return backendDelete<{ deleted: boolean }>(
    `/api/spaces/${spaceId}/views/${encodeURIComponent(viewId)}/shares/${shareId}`,
  )
}

export async function makeSpacePrivate(spaceId: string): Promise<Space> {
  return backendPost<Space>(`/api/spaces/${spaceId}/make-private`, {})
}

export async function makeSpaceTeam(spaceId: string): Promise<Space> {
  return backendPost<Space>(`/api/spaces/${spaceId}/make-team`, {})
}

export async function fetchSpaceItemShares(
  spaceId: string,
  itemId: string,
): Promise<{ effective_level: SpaceShareLevel; shares: SpaceItemShareRecord[] }> {
  return backendGet<{ effective_level: SpaceShareLevel; shares: SpaceItemShareRecord[] }>(
    `/api/spaces/${spaceId}/items/${itemId}/shares`,
  )
}

export async function upsertSpaceItemShare(
  spaceId: string,
  itemId: string,
  input: {
    entity_type: SpaceShareEntityType
    entity_id: string
    level: SpaceShareLevel
    inherit_to_children?: boolean
  },
): Promise<SpaceItemShareRecord> {
  return backendPost<SpaceItemShareRecord>(`/api/spaces/${spaceId}/items/${itemId}/shares`, input)
}

export async function deleteSpaceItemShare(
  spaceId: string,
  itemId: string,
  shareId: string,
): Promise<{ deleted: boolean }> {
  return backendDelete<{ deleted: boolean }>(
    `/api/spaces/${spaceId}/items/${itemId}/shares/${shareId}`,
  )
}

export async function enableSpaceItemShareLink(
  spaceId: string,
  itemId: string,
): Promise<{ share_link_enabled: boolean; share_token: string | null }> {
  return backendPost<{ share_link_enabled: boolean; share_token: string | null }>(
    `/api/spaces/${spaceId}/items/${itemId}/share-link`,
    {},
  )
}

export async function disableSpaceItemShareLink(
  spaceId: string,
  itemId: string,
): Promise<{ share_link_enabled: boolean; share_token: string | null }> {
  return backendDelete<{ share_link_enabled: boolean; share_token: string | null }>(
    `/api/spaces/${spaceId}/items/${itemId}/share-link`,
  )
}

export async function inviteSpaceItemByEmail(
  spaceId: string,
  itemId: string,
  input: { email: string; level: SpaceShareLevel },
): Promise<SpaceItemShareRecord> {
  return backendPost<SpaceItemShareRecord>(
    `/api/spaces/${spaceId}/items/${itemId}/share-invite`,
    input,
  )
}

export async function enableSpaceShareLink(
  spaceId: string,
): Promise<{ share_link_enabled: boolean; share_token: string | null }> {
  return backendPost<{ share_link_enabled: boolean; share_token: string | null }>(
    `/api/spaces/${spaceId}/share-link`,
    {},
  )
}

export async function disableSpaceShareLink(
  spaceId: string,
): Promise<{ share_link_enabled: boolean; share_token: string | null }> {
  return backendDelete<{ share_link_enabled: boolean; share_token: string | null }>(
    `/api/spaces/${spaceId}/share-link`,
  )
}

export async function fetchSharedItem(token: string): Promise<SharedItemResponse> {
  return backendGet<SharedItemResponse>(`/api/spaces/shared/item/${token}`, { orgId: null })
}

export async function fetchSharedSpace(token: string): Promise<SharedSpaceResponse> {
  const res = await backendGet<SharedSpaceResponse>(`/api/spaces/shared/space/${token}`, {
    orgId: null,
  })
  return { ...res, space: normalizeSpaceLegacyViews(res.space) }
}

export async function saveViewForEveryone(
  spaceId: string,
  viewId: string,
  resolvedView: Record<string, unknown>,
): Promise<{ saved: boolean }> {
  return backendPost<{ saved: boolean }>(
    `/api/spaces/${spaceId}/views/${viewId}/save-for-everyone`,
    {
      overrides: resolvedView,
    },
  )
}

// ---------------------------------------------------------------------------
// Activity
// ---------------------------------------------------------------------------

export async function fetchItemActivity(
  spaceId: string,
  itemId: string,
): Promise<SpaceItemActivity[]> {
  return backendGet<SpaceItemActivity[]>(`/api/spaces/${spaceId}/items/${itemId}/activity`)
}

export interface ActivityMention {
  type:
    | 'user'
    | 'agent'
    | 'task'
    | 'doc'
    | 'channel'
    | 'space'
    | 'mission'
    | 'person'
    | 'conversation'
  user_id?: string
  agent_key?: string
  entity_id?: string
  label?: string
}

export type LinkPreviewProvider =
  | 'drive'
  | 'youtube'
  | 'loom'
  | 'vimeo'
  | 'figma'
  | 'internal'
  | 'generic'

export interface LinkPreview {
  url: string
  provider: LinkPreviewProvider
  title: string | null
  description: string | null
  imageUrl: string | null
  iconUrl: string | null
  siteName: string | null
  driveFileId?: string
  mimeType?: string
  entityKind?: string
  entityId?: string
}

export async function addItemComment(
  spaceId: string,
  itemId: string,
  message: string,
  options?: {
    attachments?: { filename: string; mimeType: string; sizeBytes?: number; fileUrl: string }[]
    mentions?: ActivityMention[]
    skill_keys?: string[]
  },
): Promise<SpaceItemActivity> {
  return backendPost<SpaceItemActivity>(`/api/spaces/${spaceId}/items/${itemId}/activity`, {
    event_type: 'comment',
    message,
    ...(options?.attachments?.length ? { attachments: options.attachments } : {}),
    ...(options?.mentions?.length ? { mentions: options.mentions } : {}),
    ...(options?.skill_keys?.length ? { skill_keys: options.skill_keys } : {}),
  })
}

export async function updateItemComment(
  spaceId: string,
  itemId: string,
  activityId: string,
  message: string,
): Promise<SpaceItemActivity> {
  return backendPatch<SpaceItemActivity>(
    `/api/spaces/${spaceId}/items/${itemId}/activity/${activityId}`,
    { message },
  )
}

export async function renameItemCommentAttachment(
  spaceId: string,
  itemId: string,
  activityId: string,
  fileUrl: string,
  filename: string,
): Promise<SpaceItemActivity> {
  return renameItemCommentAttachmentApi(spaceId, itemId, activityId, fileUrl, filename)
}

export async function deleteItemComment(
  spaceId: string,
  itemId: string,
  activityId: string,
): Promise<void> {
  await backendDelete(`/api/spaces/${spaceId}/items/${itemId}/activity/${activityId}`)
}

export interface InvokeTaskAgentOptions {
  agent_key: string
  agent_label?: string
  include?: Record<string, boolean>
  extra_notes?: string
  skill_keys?: string[]
  mentions?: ActivityMention[]
  attachments?: { filename: string; mimeType: string; fileUrl: string; sizeBytes?: number }[]
}

export async function invokeTaskAgent(
  spaceId: string,
  itemId: string,
  options: InvokeTaskAgentOptions,
): Promise<{ activity: SpaceItemActivity; accepted: boolean }> {
  return backendPost<{ activity: SpaceItemActivity; accepted: boolean }>(
    `/api/spaces/${spaceId}/items/${itemId}/invoke-agent`,
    options,
  )
}

export async function cancelTaskAgent(
  spaceId: string,
  itemId: string,
): Promise<{ accepted: boolean; cancelled: boolean; activity_id?: string }> {
  return backendPost<{ accepted: boolean; cancelled: boolean; activity_id?: string }>(
    `/api/spaces/${spaceId}/items/${itemId}/cancel-agent`,
    {},
  )
}
