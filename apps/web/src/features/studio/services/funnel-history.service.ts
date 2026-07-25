import { backendGet, backendPost } from '@/lib/api/backend-client'

export interface FunnelHistoryState {
  can_undo: boolean
  can_redo: boolean
  undo_change_set_id?: string | null
  redo_change_set_id?: string | null
}

export interface FunnelHistoryMutationResult extends FunnelHistoryState {
  success: boolean
  changed: boolean
  change_set_id?: string | null
}

export interface FunnelHistoryEntry {
  id: string
  source: 'studio' | 'agent'
  action: string
  label: string | null
  status: 'applied' | 'undone'
  metadata?: Record<string, unknown>
  is_bookmarked?: boolean
  created_at: string
  updated_at: string
}

export interface FunnelHistoryTimeline {
  entries: FunnelHistoryEntry[]
  current_change_set_id: string | null
}

function encodePageScope(funnelPageId?: string | null): string {
  if (!funnelPageId) return ''
  return `?funnel_page_id=${encodeURIComponent(funnelPageId)}`
}

function bodyForPage(funnelPageId?: string | null): { funnel_page_id?: string | null } {
  return funnelPageId ? { funnel_page_id: funnelPageId } : { funnel_page_id: null }
}

export function fetchFunnelHistoryState(funnelId: string, funnelPageId?: string | null) {
  return backendGet<FunnelHistoryState>(
    `/api/funnels/${funnelId}/history/state${encodePageScope(funnelPageId)}`,
  )
}

export async function fetchFunnelHistory(funnelId: string, funnelPageId?: string | null) {
  const timeline = await backendGet<FunnelHistoryTimeline>(
    `/api/funnels/${funnelId}/history${encodePageScope(funnelPageId)}`,
  )
  return {
    ...timeline,
    entries: timeline.entries.map((entry) => ({
      ...entry,
      is_bookmarked: entry.metadata?.is_bookmarked === true,
    })),
  }
}

export function undoFunnelChange(funnelId: string, funnelPageId?: string | null) {
  return backendPost<FunnelHistoryMutationResult>(
    `/api/funnels/${funnelId}/history/undo`,
    bodyForPage(funnelPageId),
  )
}

export function redoFunnelChange(funnelId: string, funnelPageId?: string | null) {
  return backendPost<FunnelHistoryMutationResult>(
    `/api/funnels/${funnelId}/history/redo`,
    bodyForPage(funnelPageId),
  )
}

export function restoreFunnelVersion(
  funnelId: string,
  changeSetId: string,
  funnelPageId?: string | null,
) {
  return backendPost<FunnelHistoryMutationResult>(`/api/funnels/${funnelId}/history/restore`, {
    change_set_id: changeSetId,
    ...bodyForPage(funnelPageId),
  })
}

export function setFunnelHistoryBookmark(
  funnelId: string,
  changeSetId: string,
  bookmarked: boolean,
) {
  return backendPost<{ success: boolean; change_set_id: string; bookmarked: boolean }>(
    `/api/funnels/${funnelId}/history/${changeSetId}/bookmark`,
    { bookmarked },
  )
}
