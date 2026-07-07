'use client'

import { create } from 'zustand'
import { backendPatch } from '@/lib/api/backend-client'
import { cachedFetch } from '@/lib/cache/keyed-fetch-cache'
import { createClient } from '@/lib/supabase/client'
import { fetchTeamRoster, type TeamRosterEntry } from '@/lib/team/team-roster-api'
import { cachedSpaces } from '../hooks/use-cached-spaces'
import { nextSpaceItemSortOrder } from '../lib/space-list-dnd-apply'
import {
  mergeSessionDraftPartial,
  normalizeSpaceLegacyViews,
  omitSchemaAutomations,
  VIEW_CUSTOMIZE_NESTED_KEYS,
} from '../lib/view-customization-merge'
import {
  createSpaceItem as createSpaceItemRequest,
  createSpace as createSpaceRequest,
  deleteSpaceItem as deleteSpaceItemRequest,
  deleteSpace as deleteSpaceRequest,
  deleteViewOverride as deleteViewOverrideRequest,
  duplicateSpaceItem as duplicateSpaceItemRequest,
  ensureDefaultSpace as ensureDefaultSpaceRequest,
  fetchSpaceItems,
  fetchViewOverrides,
  pushItemToAgent as pushItemToAgentRequest,
  undoAgentTaskEdits as undoAgentTaskEditsRequest,
  updateSpaceItem as updateSpaceItemRequest,
  updateSpaceItemsBatch as updateSpaceItemsBatchRequest,
  upsertViewOverride as upsertViewOverrideRequest,
  type DuplicateSpaceItemInclude,
  type SpaceItemFetchOptions,
  type UndoAgentTaskEditsResult,
} from '../services/spaces.service'
import type { Space, SpaceItem, SpaceItemRealtimeChange } from '../types'
import type { ViewDef } from '../types/space-schema'
import { NEW_SPACE_SCHEMA } from '../types/space-schema'

const STORAGE_KEY = 'vibey.spaces.nav'
const pendingItemMutationCounts = new Map<string, number>()
const queuedRealtimeItemChanges = new Map<string, SpaceItemRealtimeChange>()

/**
 * Stale-while-revalidate caches so switching back to a space paints the last
 * known rows instantly instead of wiping to an empty list while refetching.
 * Items are keyed by `${spaceId}:${queryKey}` (query key = item_kind filter).
 */
const itemsCacheBySpaceQuery = new Map<string, SpaceItem[]>()
const viewOverridesCacheBySpace = new Map<string, Record<string, Partial<ViewDef>>>()

function itemsCacheKey(spaceId: string, queryKey: string): string {
  return `${spaceId}:${queryKey}`
}

function clearSpaceCaches(spaceId: string) {
  viewOverridesCacheBySpace.delete(spaceId)
  for (const key of itemsCacheBySpaceQuery.keys()) {
    if (key.startsWith(`${spaceId}:`)) itemsCacheBySpaceQuery.delete(key)
  }
}

interface PersistedNav {
  activeSpaceId?: string | null
  viewBySpace?: Record<string, string>
  conversationBySpace?: Record<string, string>
  chatWidth?: number
  artifactPreviewWidth?: number
  chatCollapsed?: boolean
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function looksLikeUuid(s: string): boolean {
  return UUID_RE.test(s)
}

function readNav(): PersistedNav {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as PersistedNav) : {}
  } catch {
    return {}
  }
}

function writeNav(patch: Partial<PersistedNav>) {
  if (typeof window === 'undefined') return
  try {
    const cur = readNav()
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...cur, ...patch }))
  } catch {
    /* ignore quota / private mode */
  }
}

function readStoredViewId(spaceId: string): string | null {
  const id = readNav().viewBySpace?.[spaceId]
  return typeof id === 'string' && id.length > 0 ? id : null
}

function persistActiveViewId(spaceId: string, viewId: string) {
  const cur = readNav()
  writeNav({ viewBySpace: { ...(cur.viewBySpace ?? {}), [spaceId]: viewId } })
}

function clearPersistedViewIdForSpace(spaceId: string) {
  const cur = readNav()
  const next = { ...(cur.viewBySpace ?? {}) }
  delete next[spaceId]
  writeNav({ viewBySpace: next })
}

function readStoredSpaceId(): string | null {
  const id = readNav().activeSpaceId
  return typeof id === 'string' && id.length > 0 ? id : null
}

function persistActiveSpaceId(spaceId: string | null) {
  writeNav({ activeSpaceId: spaceId })
}

export function readStoredConversationId(spaceId: string): string | null {
  const id = readNav().conversationBySpace?.[spaceId]
  return typeof id === 'string' && id.length > 0 ? id : null
}

function conversationStorageKey(spaceId: string, agentKey?: string | null): string {
  const key = typeof agentKey === 'string' && agentKey.trim().length > 0 ? agentKey.trim() : null
  return key ? `${spaceId}:${key}` : spaceId
}

export function readStoredAgentConversationId(
  spaceId: string,
  agentKey: string | null,
): string | null {
  const conversations = readNav().conversationBySpace ?? {}
  const id = conversations[conversationStorageKey(spaceId, agentKey)]
  if (typeof id === 'string' && id.length > 0) return id

  const legacyId = agentKey === 'vibey' ? conversations[spaceId] : null
  return typeof legacyId === 'string' && legacyId.length > 0 ? legacyId : null
}

export function persistActiveConversationId(
  spaceId: string,
  conversationId: string | null,
  agentKey?: string | null,
) {
  const cur = readNav()
  const next = { ...(cur.conversationBySpace ?? {}) }
  const key = conversationStorageKey(spaceId, agentKey)
  if (conversationId) next[key] = conversationId
  else delete next[key]
  if (agentKey === 'vibey') {
    if (conversationId) next[spaceId] = conversationId
    else delete next[spaceId]
  }
  writeNav({ conversationBySpace: next })
}

export function readStoredSpacesChatWidth(): number | null {
  const width = readNav().chatWidth
  return typeof width === 'number' && Number.isFinite(width) ? width : null
}

export function persistSpacesChatWidth(width: number) {
  writeNav({ chatWidth: width })
}

export function readStoredArtifactPreviewWidth(): number | null {
  const width = readNav().artifactPreviewWidth
  return typeof width === 'number' && Number.isFinite(width) ? width : null
}

export function persistArtifactPreviewWidth(width: number) {
  writeNav({ artifactPreviewWidth: width })
}

export function readStoredSpacesChatCollapsed(): boolean {
  return readNav().chatCollapsed === true
}

export function persistSpacesChatCollapsed(collapsed: boolean) {
  writeNav({ chatCollapsed: collapsed })
}

function resolveActiveViewIdForSpace(
  space: Space | null,
  ...candidates: (string | null | undefined)[]
): string | null {
  const views = space?.schema?.views
  if (!views?.length) return null
  const allowedViewIds = space?.share_meta?.allowed_view_ids
  const eligibleViews = allowedViewIds
    ? views.filter((view) => allowedViewIds.includes(view.id))
    : views
  if (!eligibleViews.length) return null
  for (const c of candidates) {
    if (c && eligibleViews.some((v) => v.id === c)) return c
  }
  return eligibleViews[0]?.id ?? null
}

function itemFetchOptionsForView(view: ViewDef | null | undefined): SpaceItemFetchOptions {
  if (!view) return {}
  if (
    view.type === 'list' ||
    view.type === 'table' ||
    view.type === 'kanban' ||
    view.type === 'calendar'
  ) {
    return { item_kind: 'task' }
  }
  return {}
}

function itemFetchQueryKeyForView(view: ViewDef | null | undefined): string {
  return itemFetchOptionsForView(view).item_kind ?? 'all'
}

interface SpacesState {
  spaces: Space[]
  activeSpaceId: string | null
  activeViewId: string | null
  items: SpaceItem[]
  loading: boolean
  /** SpaceId for which items have been fetched at least once. null until first successful load. */
  itemsLoadedForSpaceId: string | null
  itemsLoadedForQueryKey: string | null
  loadError: string | null
  roster: TeamRosterEntry[]
  rosterLoaded: boolean
  currentUserId: string | null

  /** Per-user view overrides keyed by view_id. */
  viewOverrides: Record<string, Partial<ViewDef>>
  /** In-memory draft patches keyed by view_id (when autosave is off). */
  sessionViewDrafts: Record<string, Partial<ViewDef>>

  /**
   * Set by the sidebar context menu (Sharing, Automations) when navigating
   * to /spaces. SpaceItemsContainer reads + clears this on mount and opens
   * the matching modal for the active space.
   */
  pendingMenuAction: { spaceId: string; action: 'share' | 'automations' } | null

  loadSpaces: () => Promise<void>
  loadRoster: () => Promise<void>
  setActiveSpace: (spaceId: string | null) => void
  setActiveView: (viewId: string | null) => void
  loadItems: (spaceId: string, view?: ViewDef | null) => Promise<void>
  applyRealtimeItemChange: (change: SpaceItemRealtimeChange) => void
  loadViewOverrides: (spaceId: string) => Promise<void>
  patchViewOverride: (viewId: string, patch: Partial<ViewDef>) => Promise<void>
  resetViewOverride: (viewId: string) => Promise<void>
  /** Returns the org view merged with user overrides. */
  getResolvedView: (viewId: string) => ViewDef | null
  applySessionDraft: (viewId: string, patch: Partial<ViewDef>) => void
  clearSessionDraft: (viewId: string) => void
  createSpace: (title: string) => Promise<Space>
  ensureDefaultSpace: () => Promise<Space>
  deleteSpace: (spaceId: string) => Promise<void>
  createItem: (title: string, extra?: Record<string, unknown>) => Promise<SpaceItem | null>
  duplicateItem: (
    spaceId: string,
    itemId: string,
    input: { include: DuplicateSpaceItemInclude; title?: string },
  ) => Promise<SpaceItem | null>
  updateItem: (itemId: string, payload: Partial<SpaceItem>) => Promise<void>
  /** One optimistic merge + a single batch PATCH (e.g. doc tree / list reorder). */
  updateItemsBatch: (
    updates: Array<{ itemId: string; payload: Partial<SpaceItem> }>,
  ) => Promise<void>
  deleteItem: (itemId: string) => Promise<void>
  undoAgentTaskEdits: (
    messageId: string,
    direction: 'undo' | 'redo',
    mode?: 'strict' | 'force',
  ) => Promise<UndoAgentTaskEditsResult | null>
  pushToAgent: (
    itemId: string,
    options?: import('../components/cells/MissionSendDropdown').MissionSendOptions,
  ) => Promise<void>
  patchActiveSpaceSchema: (schema: Record<string, unknown>) => void
  refresh: () => Promise<void>
  /** Bumps to focus the inline add composer (list/table/kanban) without opening the task modal. */
  inlineTaskComposerFocusNonce: number
  requestInlineTaskComposerFocus: () => void

  chatCollapsed: boolean
  setChatCollapsed: (collapsed: boolean) => void
  /** Hint set by the collapsed rail so the chat panel reacts on first render after expand. */
  chatRailIntent: 'new' | 'list' | null
  setChatRailIntent: (intent: 'new' | 'list' | null) => void

  pendingOpenConversationId: string | null
  openConversationInSpaceChat: (conversationId: string) => void
  clearPendingOpenConversation: () => void

  /** Bumped to open the “+ View” catalog from `ViewSwitcher` (e.g. empty space onboarding). */
  addViewCatalogOpenNonce: number
  requestOpenAddViewCatalog: () => void
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  return 'Unknown error'
}

function beginPendingItemMutation(itemId: string) {
  pendingItemMutationCounts.set(itemId, (pendingItemMutationCounts.get(itemId) ?? 0) + 1)
}

function endPendingItemMutation(itemId: string) {
  const next = (pendingItemMutationCounts.get(itemId) ?? 0) - 1
  if (next > 0) pendingItemMutationCounts.set(itemId, next)
  else pendingItemMutationCounts.delete(itemId)
}

function hasPendingItemMutation(itemId: string): boolean {
  return (pendingItemMutationCounts.get(itemId) ?? 0) > 0
}

function shouldReplayQueuedRealtimeChange(
  change: SpaceItemRealtimeChange,
  localUpdatedAt: string | null | undefined,
): boolean {
  if (change.type === 'delete' || !localUpdatedAt) return true
  const remoteTime = Date.parse(String(change.item.updated_at ?? ''))
  const localTime = Date.parse(localUpdatedAt)
  if (!Number.isFinite(remoteTime) || !Number.isFinite(localTime)) return true
  return remoteTime >= localTime
}

function isMatchingOptimisticCreate(
  local: SpaceItem,
  incoming: SpaceItem,
  currentUserId: string | null,
): boolean {
  return (
    local.id.startsWith('temp:') &&
    local.space_id === incoming.space_id &&
    local.user_id === (currentUserId ?? '') &&
    incoming.user_id === (currentUserId ?? '') &&
    local.title === incoming.title &&
    (local.parent_item_id ?? null) === (incoming.parent_item_id ?? null) &&
    (local.sort_order ?? 0) === (incoming.sort_order ?? 0) &&
    local.status === incoming.status
  )
}

function mergeFetchedItemsWithPending(
  localItems: SpaceItem[],
  fetchedItems: SpaceItem[],
  currentUserId: string | null,
) {
  const matchedOptimisticIds = new Set(
    fetchedItems
      .filter((incoming) =>
        localItems.some((local) => isMatchingOptimisticCreate(local, incoming, currentUserId)),
      )
      .map((item) => item.id),
  )
  const visibleFetchedItems = fetchedItems.filter((item) => !matchedOptimisticIds.has(item.id))
  const fetchedById = new Set(visibleFetchedItems.map((item) => item.id))
  const localById = new Map(localItems.map((item) => [item.id, item]))
  const merged = visibleFetchedItems.map((item) => {
    const local = localById.get(item.id)
    return local && hasPendingItemMutation(item.id) ? local : item
  })
  const preservedLocal = localItems.filter(
    (item) =>
      item.id.startsWith('temp:') || (hasPendingItemMutation(item.id) && !fetchedById.has(item.id)),
  )
  return [...merged, ...preservedLocal.filter((item) => !fetchedById.has(item.id))]
}

/**
 * Optimistic item patch. `custom_data` is shallow-merged because that is what
 * the server persists (spaces.repository `updateItem` merges the existing row's
 * custom_data with the patch) — replacing it locally would drop keys the
 * server keeps and let stale partial copies clobber newer values.
 */
function applyItemPatch(item: SpaceItem, payload: Partial<SpaceItem>): SpaceItem {
  return {
    ...item,
    ...payload,
    ...(payload.custom_data !== undefined
      ? { custom_data: { ...(item.custom_data ?? {}), ...payload.custom_data } }
      : {}),
  } as SpaceItem
}

function mergeViewWithOverride(orgView: ViewDef, override: Partial<ViewDef> | undefined): ViewDef {
  if (!override) return orgView
  const merged = { ...orgView } as Record<string, unknown>
  for (const [key, val] of Object.entries(override)) {
    if (val === undefined) continue
    if (
      VIEW_CUSTOMIZE_NESTED_KEYS.includes(key as (typeof VIEW_CUSTOMIZE_NESTED_KEYS)[number]) &&
      typeof val === 'object' &&
      val !== null &&
      !Array.isArray(val)
    ) {
      const base =
        typeof merged[key] === 'object' && merged[key] !== null && !Array.isArray(merged[key])
          ? (merged[key] as Record<string, unknown>)
          : {}
      merged[key] = { ...base, ...(val as Record<string, unknown>) }
    } else {
      merged[key] = val
    }
  }
  return merged as unknown as ViewDef
}

export const useSpacesStore = create<SpacesState>((set, get) => ({
  spaces: [],
  activeSpaceId: null,
  activeViewId: null,
  items: [],
  loading: true,
  itemsLoadedForSpaceId: null,
  itemsLoadedForQueryKey: null,
  loadError: null,
  roster: [],
  rosterLoaded: false,
  currentUserId: null,
  viewOverrides: {},
  sessionViewDrafts: {},
  pendingMenuAction: null,
  inlineTaskComposerFocusNonce: 0,

  requestInlineTaskComposerFocus: () =>
    set((s) => ({ inlineTaskComposerFocusNonce: s.inlineTaskComposerFocusNonce + 1 })),

  addViewCatalogOpenNonce: 0,

  requestOpenAddViewCatalog: () =>
    set((s) => ({ addViewCatalogOpenNonce: s.addViewCatalogOpenNonce + 1 })),

  chatCollapsed: typeof window !== 'undefined' ? readStoredSpacesChatCollapsed() : false,
  setChatCollapsed: (collapsed) => {
    persistSpacesChatCollapsed(collapsed)
    set({ chatCollapsed: collapsed })
  },
  chatRailIntent: null,
  setChatRailIntent: (intent) => set({ chatRailIntent: intent }),

  pendingOpenConversationId: null,
  openConversationInSpaceChat: (conversationId) =>
    set({ pendingOpenConversationId: conversationId }),
  clearPendingOpenConversation: () => set({ pendingOpenConversationId: null }),

  loadRoster: async () => {
    try {
      const [roster, { data }] = await Promise.all([
        cachedFetch('team-roster:all', () => fetchTeamRoster({ kind: 'all' })),
        createClient().auth.getUser(),
      ])
      set({ roster, rosterLoaded: true, currentUserId: data.user?.id ?? null })
    } catch {
      set({ rosterLoaded: true })
    }
  },

  loadSpaces: async () => {
    set({ loading: true, loadError: null })
    try {
      const spaces = cachedSpaces.peek() ?? (await cachedSpaces.reload())
      const currentActiveSpaceId = get().activeSpaceId ?? readStoredSpaceId()
      const hasActive = currentActiveSpaceId
        ? spaces.some((space) => space.id === currentActiveSpaceId)
        : false
      const nextActiveSpaceId = hasActive ? currentActiveSpaceId : (spaces[0]?.id ?? null)
      persistActiveSpaceId(nextActiveSpaceId)
      const nextActiveSpace = spaces.find((space) => space.id === nextActiveSpaceId) ?? null
      const persistedViewId = nextActiveSpaceId ? readStoredViewId(nextActiveSpaceId) : null
      const nextActiveViewId = resolveActiveViewIdForSpace(
        nextActiveSpace,
        hasActive ? get().activeViewId : null,
        persistedViewId,
      )
      const nextActiveView =
        nextActiveSpace?.schema?.views?.find((view) => view.id === nextActiveViewId) ?? null

      set((state) => ({
        spaces,
        activeSpaceId: nextActiveSpaceId,
        activeViewId: nextActiveViewId,
        items: hasActive ? state.items : [],
        loading: false,
        itemsLoadedForSpaceId: hasActive ? state.itemsLoadedForSpaceId : null,
        itemsLoadedForQueryKey: hasActive ? state.itemsLoadedForQueryKey : null,
        loadError: null,
      }))

      if (nextActiveSpaceId) {
        await Promise.all([
          get().loadItems(nextActiveSpaceId, nextActiveView),
          get().loadViewOverrides(nextActiveSpaceId),
        ])
      }
    } catch (error) {
      set({
        loading: false,
        loadError: getErrorMessage(error),
        spaces: [],
        activeSpaceId: null,
        activeViewId: null,
        items: [],
        itemsLoadedForSpaceId: null,
        itemsLoadedForQueryKey: null,
      })
    }
  },

  setActiveSpace: (spaceId) => {
    const {
      activeSpaceId: prevSpaceId,
      items: prevItems,
      itemsLoadedForSpaceId: prevLoadedSpaceId,
      itemsLoadedForQueryKey: prevLoadedQueryKey,
      viewOverrides: prevOverrides,
    } = get()
    if (prevSpaceId === spaceId) return
    // Snapshot the outgoing space (including local optimistic edits) so
    // switching back paints instantly while a background refetch runs.
    if (prevSpaceId && prevLoadedSpaceId === prevSpaceId && prevLoadedQueryKey) {
      itemsCacheBySpaceQuery.set(itemsCacheKey(prevSpaceId, prevLoadedQueryKey), prevItems)
      viewOverridesCacheBySpace.set(prevSpaceId, prevOverrides)
    }
    const selected = get().spaces.find((space) => space.id === spaceId) ?? null
    const persisted = spaceId ? readStoredViewId(spaceId) : null
    const nextViewId = resolveActiveViewIdForSpace(selected, persisted)
    const nextView = selected?.schema?.views?.find((view) => view.id === nextViewId) ?? null
    const nextQueryKey = itemFetchQueryKeyForView(nextView)
    const cachedItems = spaceId
      ? itemsCacheBySpaceQuery.get(itemsCacheKey(spaceId, nextQueryKey))
      : undefined
    const cachedOverrides = spaceId ? viewOverridesCacheBySpace.get(spaceId) : undefined
    persistActiveSpaceId(spaceId)
    set({
      activeSpaceId: spaceId,
      activeViewId: nextViewId,
      items: cachedItems ?? [],
      itemsLoadedForSpaceId: cachedItems && spaceId ? spaceId : null,
      itemsLoadedForQueryKey: cachedItems ? nextQueryKey : null,
      viewOverrides: cachedOverrides ?? {},
      sessionViewDrafts: {},
    })
    if (spaceId) {
      void get().loadItems(spaceId, nextView)
      void get().loadViewOverrides(spaceId)
    }
  },

  setActiveView: (viewId) => {
    const { activeSpaceId, spaces, items, itemsLoadedForSpaceId, itemsLoadedForQueryKey } = get()
    const activeSpace = spaces.find((space) => space.id === activeSpaceId) ?? null
    const nextView = activeSpace?.schema?.views?.find((view) => view.id === viewId) ?? null
    const nextQueryKey = itemFetchQueryKeyForView(nextView)
    const queryChanged = itemsLoadedForQueryKey !== null && itemsLoadedForQueryKey !== nextQueryKey
    if (queryChanged && activeSpaceId && itemsLoadedForSpaceId === activeSpaceId) {
      itemsCacheBySpaceQuery.set(itemsCacheKey(activeSpaceId, itemsLoadedForQueryKey!), items)
    }
    const cachedItems =
      queryChanged && activeSpaceId
        ? itemsCacheBySpaceQuery.get(itemsCacheKey(activeSpaceId, nextQueryKey))
        : undefined
    set({
      activeViewId: viewId,
      ...(queryChanged
        ? {
            items: cachedItems ?? get().items,
            itemsLoadedForSpaceId: cachedItems ? activeSpaceId : null,
            itemsLoadedForQueryKey: cachedItems ? nextQueryKey : null,
          }
        : {}),
    })
    if (!activeSpaceId) return
    if (viewId) persistActiveViewId(activeSpaceId, viewId)
    else clearPersistedViewIdForSpace(activeSpaceId)
    if (queryChanged) void get().loadItems(activeSpaceId, nextView)
  },

  loadViewOverrides: async (spaceId) => {
    try {
      const rows = await cachedFetch(`space-view-overrides:${spaceId}`, () =>
        fetchViewOverrides(spaceId),
      )
      const map: Record<string, Partial<ViewDef>> = {}
      for (const row of rows) {
        map[row.view_id] = row.overrides as Partial<ViewDef>
      }
      viewOverridesCacheBySpace.set(spaceId, map)
      if (get().activeSpaceId !== spaceId) return
      set({ viewOverrides: map })
    } catch {
      viewOverridesCacheBySpace.delete(spaceId)
      if (get().activeSpaceId !== spaceId) return
      set({ viewOverrides: {} })
    }
  },

  patchViewOverride: async (viewId, patch) => {
    const { activeSpaceId, viewOverrides } = get()
    if (!activeSpaceId) return
    const prev = viewOverrides[viewId] ?? {}
    const next = { ...prev, ...patch }
    set({ viewOverrides: { ...viewOverrides, [viewId]: next } })
    try {
      await upsertViewOverrideRequest(activeSpaceId, viewId, next as Record<string, unknown>)
    } catch (e) {
      set({ viewOverrides: { ...get().viewOverrides, [viewId]: prev } })
      throw e
    }
  },

  resetViewOverride: async (viewId) => {
    const { activeSpaceId, viewOverrides } = get()
    if (!activeSpaceId) return
    const prev = viewOverrides[viewId]
    const next = { ...viewOverrides }
    delete next[viewId]
    set({ viewOverrides: next })
    try {
      await deleteViewOverrideRequest(activeSpaceId, viewId)
    } catch (e) {
      if (prev) set({ viewOverrides: { ...get().viewOverrides, [viewId]: prev } })
      throw e
    }
  },

  getResolvedView: (viewId) => {
    const { spaces, activeSpaceId, viewOverrides } = get()
    const space = spaces.find((s) => s.id === activeSpaceId)
    const orgView = space?.schema?.views?.find((v) => v.id === viewId)
    if (!orgView) return null
    return mergeViewWithOverride(orgView, viewOverrides[viewId])
  },

  applySessionDraft: (viewId, patch) => {
    const { sessionViewDrafts } = get()
    const prev = sessionViewDrafts[viewId] ?? {}
    set({
      sessionViewDrafts: {
        ...sessionViewDrafts,
        [viewId]: mergeSessionDraftPartial(prev, patch),
      },
    })
  },

  clearSessionDraft: (viewId) => {
    const { sessionViewDrafts } = get()
    const next = { ...sessionViewDrafts }
    delete next[viewId]
    set({ sessionViewDrafts: next })
  },

  loadItems: async (spaceId, view) => {
    const queryKey = itemFetchQueryKeyForView(view)
    try {
      // ttl 0 = concurrent calls (StrictMode double-effects, duplicate mounts)
      // share one request; sequential calls still refetch.
      const items = await cachedFetch(`space-items:${spaceId}:${queryKey}`, () =>
        fetchSpaceItems(spaceId, itemFetchOptionsForView(view)),
      )
      if (get().activeSpaceId !== spaceId) {
        itemsCacheBySpaceQuery.set(itemsCacheKey(spaceId, queryKey), items)
        return
      }
      set((state) => ({
        items: mergeFetchedItemsWithPending(state.items, items, state.currentUserId),
        itemsLoadedForSpaceId: spaceId,
        itemsLoadedForQueryKey: queryKey,
        loadError: null,
      }))
      itemsCacheBySpaceQuery.set(itemsCacheKey(spaceId, queryKey), get().items)
    } catch (error) {
      if (get().activeSpaceId !== spaceId) return
      itemsCacheBySpaceQuery.delete(itemsCacheKey(spaceId, queryKey))
      set({
        items: [],
        itemsLoadedForSpaceId: spaceId,
        itemsLoadedForQueryKey: queryKey,
        loadError: getErrorMessage(error),
      })
    }
  },

  applyRealtimeItemChange: (change) => {
    const { activeSpaceId, currentUserId } = get()
    if (!activeSpaceId) return
    if (change.type === 'delete') {
      if (hasPendingItemMutation(change.itemId)) {
        queuedRealtimeItemChanges.set(change.itemId, change)
        return
      }
      set((state) => ({ items: state.items.filter((item) => item.id !== change.itemId) }))
      return
    }
    const incoming = change.item
    if (incoming.space_id !== activeSpaceId) return
    if (hasPendingItemMutation(incoming.id)) {
      queuedRealtimeItemChanges.set(incoming.id, change)
      return
    }
    set((state) => {
      if (state.items.some((item) => isMatchingOptimisticCreate(item, incoming, currentUserId))) {
        return state
      }
      const exists = state.items.some((item) => item.id === incoming.id)
      return {
        items: exists
          ? state.items.map((item) => (item.id === incoming.id ? incoming : item))
          : [...state.items, incoming],
      }
    })
  },

  createSpace: async (title) => {
    const raw = await createSpaceRequest({ title, schema: NEW_SPACE_SCHEMA })
    const space = normalizeSpaceLegacyViews(raw)
    set((s) => ({ spaces: [space, ...s.spaces] }))
    cachedSpaces.mutate((prev) => [space, ...(prev ?? [])])
    return space
  },

  ensureDefaultSpace: async () => {
    const raw = await ensureDefaultSpaceRequest()
    const space = normalizeSpaceLegacyViews(raw)
    set((s) => {
      const exists = s.spaces.some((existing) => existing.id === space.id)
      return { spaces: exists ? s.spaces : [space, ...s.spaces] }
    })
    cachedSpaces.mutate((prev) => {
      const current = prev ?? []
      return current.some((existing) => existing.id === space.id) ? current : [space, ...current]
    })
    return space
  },

  deleteSpace: async (spaceId) => {
    await deleteSpaceRequest(spaceId)
    clearSpaceCaches(spaceId)
    const { activeSpaceId } = get()
    set((s) => ({
      spaces: s.spaces.filter((space) => space.id !== spaceId),
      ...(activeSpaceId === spaceId ? { activeSpaceId: null, activeViewId: null, items: [] } : {}),
    }))
    cachedSpaces.mutate((prev) => (prev ?? []).filter((space) => space.id !== spaceId))
  },

  createItem: async (title, extra) => {
    const { activeSpaceId, spaces, currentUserId, items } = get()
    if (!activeSpaceId) return null
    const space = spaces.find((sp) => sp.id === activeSpaceId)
    const nowIso = new Date().toISOString()
    const tempId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? `temp:${crypto.randomUUID()}`
        : `temp:${Math.random().toString(36).slice(2)}${Date.now()}`
    const extras = (extra ?? {}) as Record<string, unknown>
    const parentItemId = (extras.parent_item_id as string | null | undefined) ?? null
    const sort_order = nextSpaceItemSortOrder(
      items,
      parentItemId,
      extras.sort_order as number | undefined,
    )
    const optimisticAssignees = (extras.assignees as SpaceItem['assignees'] | undefined) ?? []
    const optimistic: SpaceItem = {
      id: tempId,
      space_id: activeSpaceId,
      org_id: space?.org_id ?? '',
      user_id: currentUserId ?? '',
      title,
      status: (extras.status as SpaceItem['status']) ?? 'todo',
      priority: (extras.priority as SpaceItem['priority']) ?? null,
      assignee_type:
        (extras.assignee_type as SpaceItem['assignee_type']) ??
        optimisticAssignees[0]?.type ??
        'unassigned',
      assignee_id: (extras.assignee_id as string | null) ?? null,
      assignees: optimisticAssignees,
      start_date: (extras.start_date as string | null) ?? null,
      due_date: (extras.due_date as string | null) ?? null,
      recurrence: null,
      parent_item_id: (extras.parent_item_id as string | null) ?? null,
      recurrence_parent_id: null,
      description: null,
      notes: null,
      doc_body: (extras.doc_body as string | null) ?? null,
      source: 'manual',
      linked_mission_id: null,
      form_id: (extras.form_id as string | null) ?? null,
      task_execution_status: null,
      is_private: false,
      share_link_enabled: false,
      share_token: null,
      sort_order,
      custom_data: (extras.custom_data as Record<string, unknown>) ?? {},
      created_at: nowIso,
      updated_at: nowIso,
    }
    beginPendingItemMutation(tempId)
    set((s) => ({ items: [...s.items, optimistic] }))
    try {
      const item = await createSpaceItemRequest(activeSpaceId, {
        title,
        sort_order,
        ...extra,
      })
      set((s) => ({
        items: [...s.items.filter((i) => i.id !== tempId && i.id !== item.id), item],
      }))
      return item
    } catch (error) {
      set((s) => ({ items: s.items.filter((i) => i.id !== tempId) }))
      throw error
    } finally {
      endPendingItemMutation(tempId)
    }
  },

  duplicateItem: async (spaceId, itemId, input) => {
    const { activeSpaceId, items } = get()
    const isActiveSpace = activeSpaceId === spaceId
    const source = isActiveSpace ? items.find((i) => i.id === itemId) : null
    // Subtask tree duplication is server-recursive; faking that locally is
    // error-prone (schema drift if backend `buildDuplicateItemPayload` evolves).
    // For single-item duplicates we can safely build the optimistic row.
    const canOptimistic = !!source && input.include.subtasks !== true
    let tempId: string | null = null
    if (canOptimistic && source) {
      const include = input.include
      const baseTitle =
        typeof input.title === 'string' && input.title.trim().length > 0
          ? input.title.trim()
          : `${source.title || 'Untitled'} (copy)`
      const fieldIds = include.custom_field_ids ?? []
      const optimisticCustomData: Record<string, unknown> = {}
      if (fieldIds.length > 0) {
        const sourceCd = source.custom_data ?? {}
        for (const id of fieldIds) {
          if (Object.prototype.hasOwnProperty.call(sourceCd, id)) {
            optimisticCustomData[id] = (sourceCd as Record<string, unknown>)[id]
          }
        }
      }
      const nowIso = new Date().toISOString()
      tempId =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? `temp:${crypto.randomUUID()}`
          : `temp:${Math.random().toString(36).slice(2)}${Date.now()}`
      const optimistic: SpaceItem = {
        id: tempId,
        space_id: spaceId,
        org_id: source.org_id,
        user_id: source.user_id,
        title: baseTitle,
        status: include.status ? source.status : 'todo',
        priority: include.priority ? source.priority : null,
        assignee_type: include.assignees ? source.assignee_type : 'unassigned',
        assignee_id: include.assignees ? source.assignee_id : null,
        assignees: include.assignees ? source.assignees : [],
        start_date: include.start_date ? source.start_date : null,
        // Backend force-includes due_date when recurrence is selected.
        due_date: include.due_date || include.recurrence ? source.due_date : null,
        recurrence: include.recurrence ? source.recurrence : null,
        parent_item_id: source.parent_item_id,
        recurrence_parent_id: null,
        description: include.description ? source.description : null,
        notes: include.notes ? source.notes : null,
        doc_body: source.doc_body,
        source: 'manual',
        linked_mission_id: include.mission ? source.linked_mission_id : null,
        form_id: null,
        task_execution_status: null,
        is_private: false,
        share_link_enabled: false,
        share_token: null,
        sort_order: items.length,
        custom_data: optimisticCustomData,
        created_at: nowIso,
        updated_at: nowIso,
      }
      beginPendingItemMutation(tempId)
      set((s) => ({ items: [...s.items, optimistic] }))
    }
    try {
      const item = await duplicateSpaceItemRequest(spaceId, itemId, input)
      if (get().activeSpaceId !== spaceId) return item
      if (tempId) {
        set((s) => ({
          items: [...s.items.filter((i) => i.id !== tempId && i.id !== item.id), item],
        }))
      } else {
        set((s) => ({ items: [...s.items, item] }))
      }
      return item
    } catch (error) {
      if (tempId) {
        const removeId = tempId
        set((s) => ({ items: s.items.filter((i) => i.id !== removeId) }))
      }
      throw error
    } finally {
      if (tempId) endPendingItemMutation(tempId)
    }
  },

  updateItem: async (itemId, payload) => {
    const { activeSpaceId, items } = get()
    if (!activeSpaceId) return
    const updateT0 = performance.now()
    const payloadKeys = Object.keys(payload)
    const previous = items.find((i) => i.id === itemId)
    let localUpdatedAt: string | null = null
    beginPendingItemMutation(itemId)
    set((s) => ({
      items: s.items.map((i) => (i.id === itemId ? applyItemPatch(i, payload) : i)),
    }))
    const optimisticMs = performance.now() - updateT0
    // #region agent log
    fetch('http://127.0.0.1:7839/ingest/973bb75b-1c39-437d-a840-d2b78f7741fd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '9bfce5' },
      body: JSON.stringify({
        sessionId: '9bfce5',
        location: 'use-spaces-store.ts:updateItem-optimistic',
        message: 'updateItem optimistic set complete',
        hypothesisId: 'H-B',
        data: {
          itemId,
          payloadKeys,
          itemCount: items.length,
          optimisticMs: Math.round(optimisticMs * 100) / 100,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {})
    // #endregion
    try {
      if (payload.status !== undefined) {
        if (itemId.startsWith('cdoc:')) {
          const docId = itemId.slice('cdoc:'.length)
          if (looksLikeUuid(docId)) {
            await backendPatch(`/api/documents/${docId}`, {
              metadata: { _space_item_status: payload.status },
            })
            return
          }
        }
        if (itemId.startsWith('mdel:')) {
          const delId = itemId.slice('mdel:'.length)
          if (looksLikeUuid(delId)) {
            await backendPatch(`/api/missions/deliverables/${delId}`, {
              metadata: { _space_item_status: payload.status },
            })
            return
          }
        }
      }
      const updated = await updateSpaceItemRequest(activeSpaceId, itemId, payload)
      localUpdatedAt = updated.updated_at
      // Keep the optimistic state as source of truth; only adopt server-derived
      // updated_at so subsequent diffs use the latest timestamp. Replacing the
      // whole item caused flashes (stale frames between optimistic and server
      // response) and let late responses clobber newer in-flight edits.
      set((s) => ({
        items: s.items.map((i) => (i.id === itemId ? { ...i, updated_at: updated.updated_at } : i)),
      }))
      // #region agent log
      fetch('http://127.0.0.1:7839/ingest/973bb75b-1c39-437d-a840-d2b78f7741fd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '9bfce5' },
        body: JSON.stringify({
          sessionId: '9bfce5',
          location: 'use-spaces-store.ts:updateItem-api-done',
          message: 'updateItem API round-trip complete',
          hypothesisId: 'H-D',
          data: {
            itemId,
            payloadKeys,
            totalMs: Math.round((performance.now() - updateT0) * 100) / 100,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {})
      // #endregion
    } catch (error) {
      if (previous) {
        set((s) => ({ items: s.items.map((i) => (i.id === itemId ? previous : i)) }))
      }
      throw error
    } finally {
      endPendingItemMutation(itemId)
      const queued = queuedRealtimeItemChanges.get(itemId)
      if (queued && !hasPendingItemMutation(itemId)) {
        queuedRealtimeItemChanges.delete(itemId)
        if (shouldReplayQueuedRealtimeChange(queued, localUpdatedAt)) {
          get().applyRealtimeItemChange(queued)
        }
      }
    }
  },

  updateItemsBatch: async (updates) => {
    const { activeSpaceId } = get()
    if (!activeSpaceId || updates.length === 0) return
    const itemsBefore = get().items.map((i) => ({ ...i }))
    const patchById = new Map(updates.map((u) => [u.itemId, u.payload]))
    let localUpdatedAtById = new Map<string, string | null | undefined>()
    updates.forEach((update) => beginPendingItemMutation(update.itemId))
    set((s) => ({
      items: s.items.map((i) => {
        const payload = patchById.get(i.id)
        return payload ? applyItemPatch(i, payload) : i
      }),
    }))
    try {
      // One PATCH /items/batch for real rows; ids the batch endpoint can't take
      // (temp:/cdoc:/mdel: virtual items) keep the legacy per-item request.
      const batchable = updates.filter((u) => looksLikeUuid(u.itemId))
      const singles = updates.filter((u) => !looksLikeUuid(u.itemId))
      const [batchResults, singleResults] = await Promise.all([
        batchable.length > 0
          ? updateSpaceItemsBatchRequest(
              activeSpaceId,
              batchable.map((u) => ({ item_id: u.itemId, payload: u.payload })),
            )
          : Promise.resolve([] as SpaceItem[]),
        Promise.all(singles.map((u) => updateSpaceItemRequest(activeSpaceId, u.itemId, u.payload))),
      ])
      const byId = new Map([...batchResults, ...singleResults].map((r) => [r.id, r]))
      localUpdatedAtById = new Map(
        [...batchResults, ...singleResults].map((item) => [item.id, item.updated_at]),
      )
      set((s) => ({
        items: s.items.map((i) => (byId.has(i.id) ? byId.get(i.id)! : i)),
      }))
    } catch (err) {
      set({ items: itemsBefore })
      throw err
    } finally {
      updates.forEach((update) => {
        endPendingItemMutation(update.itemId)
        const queued = queuedRealtimeItemChanges.get(update.itemId)
        if (queued && !hasPendingItemMutation(update.itemId)) {
          queuedRealtimeItemChanges.delete(update.itemId)
          if (shouldReplayQueuedRealtimeChange(queued, localUpdatedAtById.get(update.itemId))) {
            get().applyRealtimeItemChange(queued)
          }
        }
      })
    }
  },

  deleteItem: async (itemId) => {
    const { activeSpaceId, items } = get()
    if (!activeSpaceId) return
    // Snapshot the target + all descendants (server cascades on parent_item_id).
    // If the delete fails we restore the entire subtree.
    const removedIds = new Set<string>([itemId])
    let grew = true
    while (grew) {
      grew = false
      for (const it of items) {
        if (it.parent_item_id && removedIds.has(it.parent_item_id) && !removedIds.has(it.id)) {
          removedIds.add(it.id)
          grew = true
        }
      }
    }
    const removed = items.filter((i) => removedIds.has(i.id))
    removedIds.forEach((id) => beginPendingItemMutation(id))
    set((s) => ({ items: s.items.filter((i) => !removedIds.has(i.id)) }))
    try {
      await deleteSpaceItemRequest(activeSpaceId, itemId)
    } catch (error) {
      set((s) => ({ items: [...s.items, ...removed] }))
      throw error
    } finally {
      removedIds.forEach((id) => {
        endPendingItemMutation(id)
        queuedRealtimeItemChanges.delete(id)
      })
    }
  },

  undoAgentTaskEdits: async (messageId, direction, mode = 'strict') => {
    const { activeSpaceId } = get()
    if (!activeSpaceId) return null
    const result = await undoAgentTaskEditsRequest(activeSpaceId, {
      agent_message_id: messageId,
      direction,
      mode,
    })
    await get().loadItems(activeSpaceId)
    return result
  },

  pushToAgent: async (itemId, options) => {
    const { activeSpaceId, items } = get()
    if (!activeSpaceId) return
    const previous = items.find((i) => i.id === itemId)
    let localUpdatedAt: string | null = null
    beginPendingItemMutation(itemId)
    // Optimistically force status → 'in_progress' (mirrors what the server does
    // in pushToAgent). linked_mission_id is server-generated, so we leave it
    // null until the response arrives — the mission badge appears then.
    set((s) => ({
      items: s.items.map((i) =>
        i.id === itemId ? ({ ...i, status: 'in_progress' } as SpaceItem) : i,
      ),
    }))
    try {
      const updated = await pushItemToAgentRequest(activeSpaceId, itemId, options)
      localUpdatedAt = updated.updated_at
      // Adopt only server-derived fields; keep any other in-flight client edits.
      set((s) => ({
        items: s.items.map((i) =>
          i.id === itemId
            ? {
                ...i,
                linked_mission_id: updated.linked_mission_id,
                updated_at: updated.updated_at,
              }
            : i,
        ),
      }))
    } catch (error) {
      if (previous) {
        set((s) => ({ items: s.items.map((i) => (i.id === itemId ? previous : i)) }))
      }
      throw error
    } finally {
      endPendingItemMutation(itemId)
      const queued = queuedRealtimeItemChanges.get(itemId)
      if (queued && !hasPendingItemMutation(itemId)) {
        queuedRealtimeItemChanges.delete(itemId)
        if (shouldReplayQueuedRealtimeChange(queued, localUpdatedAt)) {
          get().applyRealtimeItemChange(queued)
        }
      }
    }
  },

  patchActiveSpaceSchema: (schema) => {
    const { activeSpaceId } = get()
    if (!activeSpaceId) return
    const merge = (prev: Space['schema']) =>
      omitSchemaAutomations({
        ...(prev as unknown as Record<string, unknown>),
        ...schema,
      }) as unknown as Space['schema']
    set((s) => ({
      spaces: s.spaces.map((sp) =>
        sp.id === activeSpaceId ? { ...sp, schema: merge(sp.schema) } : sp,
      ),
    }))
    cachedSpaces.mutate((prev) =>
      (prev ?? []).map((sp) =>
        sp.id === activeSpaceId ? { ...sp, schema: merge(sp.schema) } : sp,
      ),
    )
  },

  refresh: async () => {
    const previousActiveSpaceId = get().activeSpaceId
    // invalidate() only clears fetchedAt; peek() still returns stale spaces and loadSpaces skips reload.
    await cachedSpaces.reload()
    await get().loadSpaces()
    const activeSpaceId = get().activeSpaceId ?? previousActiveSpaceId
    if (activeSpaceId) {
      await get().loadItems(activeSpaceId)
    }
  },
}))
