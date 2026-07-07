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
