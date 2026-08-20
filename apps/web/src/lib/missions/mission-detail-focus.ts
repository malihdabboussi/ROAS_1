/** Window event announcing which mission detail panel the user has open. */
export const MISSION_DETAIL_FOCUS_EVENT = 'mission:detail-focus'

export interface MissionDetailFocus {
  id: string
  title: string
  status: string
}

/** Dispatch the open mission (or null when the panel closes) to chat surfaces. */
export function emitMissionDetailFocus(detail: MissionDetailFocus | null): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(MISSION_DETAIL_FOCUS_EVENT, { detail }))
}

export function readMissionDetailFocusEvent(event: Event): MissionDetailFocus | null {
  const detail = (event as CustomEvent).detail as MissionDetailFocus | null | undefined
  if (!detail?.id || !detail.title) return null
  return detail
}
