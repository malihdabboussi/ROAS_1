/** Hit-testing for HQ menu dock placement — pure geometry, no React. */

export type ShellMenuDock = 'left' | 'work' | 'work-top' | 'work-bottom' | 'work-right'

export type ShellMenuDockWorkRect = {
  left: number
  top: number
  right: number
  bottom: number
  width: number
  height: number
}

/** Narrow edge bands so the pointer must clearly enter a seam. */
const WORK_BAND_PX = 64
const WORK_BAND_MIN_PX = 40
const WORK_BAND_RATIO = 0.12
const WORK_BAND_SLACK_PX = 16
/** Frame-left (chat column) only when the pointer is this close to the left edge. */
const FRAME_LEFT_BAND_PX = 88
/** Require this much clearer win before switching away from the sticky candidate. */
const CANDIDATE_HYSTERESIS_PX = 28

function bandFor(size: number): number {
  return Math.min(WORK_BAND_PX, Math.max(WORK_BAND_MIN_PX, size * WORK_BAND_RATIO))
}

function edgeDistance(
  clientX: number,
  clientY: number,
  workRect: ShellMenuDockWorkRect,
  edge: 'work' | 'work-top' | 'work-bottom' | 'work-right',
): number | null {
  const xBand = bandFor(workRect.width)
  const yBand = bandFor(workRect.height)

  if (edge === 'work') {
    if (clientY < workRect.top || clientY > workRect.bottom) return null
    if (clientX < workRect.left - WORK_BAND_SLACK_PX || clientX > workRect.left + xBand) return null
    return Math.abs(clientX - workRect.left)
  }
  if (edge === 'work-right') {
    if (clientY < workRect.top || clientY > workRect.bottom) return null
    if (clientX > workRect.right + WORK_BAND_SLACK_PX || clientX < workRect.right - xBand)
      return null
    return Math.abs(clientX - workRect.right)
  }
  if (edge === 'work-top') {
    // Centered top seam only — avoid corner fights with left/right rails.
    const midLeft = workRect.left + workRect.width * 0.25
    const midRight = workRect.right - workRect.width * 0.25
    if (clientX < midLeft || clientX > midRight) return null
    if (clientY < workRect.top - WORK_BAND_SLACK_PX || clientY > workRect.top + yBand) return null
    return Math.abs(clientY - workRect.top)
  }
  // work-bottom — centered bottom seam
  const midLeft = workRect.left + workRect.width * 0.25
  const midRight = workRect.right - workRect.width * 0.25
  if (clientX < midLeft || clientX > midRight) return null
  if (clientY > workRect.bottom + WORK_BAND_SLACK_PX || clientY < workRect.bottom - yBand)
    return null
  return Math.abs(clientY - workRect.bottom)
}

/**
 * Returns the dock under the pointer, or `null` when the pointer is in a dead
 * zone (center of the work card / open space). Callers should keep the sticky
 * candidate in that case so the menu does not thrash between seams.
 */
export function shellMenuDockHitAtPoint(
  clientX: number,
  clientY: number,
  viewportWidth: number,
  viewportHeight: number,
  workRect: ShellMenuDockWorkRect | null = null,
  chatOpen = true,
): ShellMenuDock | null {
  const distances: Array<[ShellMenuDock, number]> = []

  if (chatOpen && clientX <= FRAME_LEFT_BAND_PX) {
    distances.push(['left', clientX])
  }

  if (!workRect) {
    if (clientX >= viewportWidth - FRAME_LEFT_BAND_PX) {
      distances.push(['work-right', viewportWidth - clientX])
    }
    if (clientY <= FRAME_LEFT_BAND_PX) distances.push(['work-top', clientY])
    if (clientY >= viewportHeight - FRAME_LEFT_BAND_PX) {
      distances.push(['work-bottom', viewportHeight - clientY])
    }
  } else {
    for (const edge of ['work', 'work-top', 'work-bottom', 'work-right'] as const) {
      const dist = edgeDistance(clientX, clientY, workRect, edge)
      if (dist !== null) distances.push([edge, dist])
    }
    if (!chatOpen) {
      const xBand = bandFor(workRect.width)
      if (clientX <= workRect.left + xBand) {
        distances.push(['work', Math.abs(clientX - workRect.left)])
      }
    }
  }

  if (distances.length === 0) return null

  // Corner disambiguation: prefer the edge the pointer is closer to.
  distances.sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
  return distances[0]?.[0] ?? null
}

/** Sticky hit-test: dead zones and weak wins keep `current`. */
export function shellMenuDockForPoint(
  clientX: number,
  clientY: number,
  viewportWidth: number,
  viewportHeight: number,
  workRect: ShellMenuDockWorkRect | null = null,
  chatOpen = true,
  current: ShellMenuDock | null = null,
): ShellMenuDock {
  const hit = shellMenuDockHitAtPoint(
    clientX,
    clientY,
    viewportWidth,
    viewportHeight,
    workRect,
    chatOpen,
  )
  if (hit === null) {
    return current ?? (workRect && !chatOpen ? 'work' : chatOpen ? 'left' : 'work')
  }
  if (current === null || hit === current) return hit

  // Hysteresis: only switch when the new seam wins clearly over the sticky one.
  const nextDist = distanceToDock(clientX, clientY, hit, viewportWidth, viewportHeight, workRect)
  const curDist = distanceToDock(clientX, clientY, current, viewportWidth, viewportHeight, workRect)
  if (curDist !== null && nextDist !== null && nextDist + CANDIDATE_HYSTERESIS_PX >= curDist) {
    return current
  }
  // Sticky still inside its band → keep until we leave it unless next is much closer.
  if (curDist !== null && curDist <= CANDIDATE_HYSTERESIS_PX && nextDist !== null) {
    if (nextDist + CANDIDATE_HYSTERESIS_PX >= curDist) return current
  }
  return hit
}

function distanceToDock(
  clientX: number,
  clientY: number,
  dock: ShellMenuDock,
  viewportWidth: number,
  viewportHeight: number,
  workRect: ShellMenuDockWorkRect | null,
): number | null {
  if (dock === 'left') {
    if (clientX > FRAME_LEFT_BAND_PX) return null
    return clientX
  }
  if (!workRect) {
    if (dock === 'work-right') {
      const d = viewportWidth - clientX
      return d <= FRAME_LEFT_BAND_PX ? d : null
    }
    if (dock === 'work-top') return clientY <= FRAME_LEFT_BAND_PX ? clientY : null
    if (dock === 'work-bottom') {
      const d = viewportHeight - clientY
      return d <= FRAME_LEFT_BAND_PX ? d : null
    }
    return null
  }
  if (dock === 'work' || dock === 'work-top' || dock === 'work-bottom' || dock === 'work-right') {
    return edgeDistance(clientX, clientY, workRect, dock)
  }
  return null
}
