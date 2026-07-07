import type { CSSProperties } from 'react'

/** Match slash-menu behavior: prefer above the anchor, flip below when needed, clamp to viewport. */

const DEFAULT_GAP = 8
const DEFAULT_MARGIN = 8

export type FloatingMenuHorizontalAlign = 'start' | 'end'
export type FloatingPortalPosition = { top: number; left: number }

export function positionFloatingMenuFromAnchorRect(
  anchor: Pick<DOMRect, 'top' | 'left' | 'bottom' | 'right'>,
  options: {
    menuWidth: number
    menuHeight: number
    gap?: number
    viewportMargin?: number
    horizontalAlign?: FloatingMenuHorizontalAlign
  },
): { top: number; left: number; placement: 'above' | 'below' } {
  const gap = options.gap ?? DEFAULT_GAP
  const margin = options.viewportMargin ?? DEFAULT_MARGIN
  const horizontalAlign = options.horizontalAlign ?? 'start'
  const { menuWidth, menuHeight } = options

  const spaceAbove = anchor.top - margin
  const spaceBelow = window.innerHeight - anchor.bottom - margin
  const preferAbove = spaceAbove >= menuHeight + gap || spaceAbove >= spaceBelow
  const placement = preferAbove ? 'above' : 'below'

  let top = preferAbove ? anchor.top - menuHeight - gap : anchor.bottom + gap
  top = Math.min(Math.max(margin, top), window.innerHeight - menuHeight - margin)

  let left = horizontalAlign === 'end' ? anchor.right - menuWidth : anchor.left
  left = Math.min(Math.max(margin, left), window.innerWidth - menuWidth - margin)

  return { top, left, placement }
}

export function fixedFloatingPortalStyle(
  position: FloatingPortalPosition,
  options?: {
    transform?: CSSProperties['transform']
    width?: CSSProperties['width']
  },
): CSSProperties {
  return {
    position: 'fixed',
    top: position.top,
    left: position.left,
    ...(options?.transform ? { transform: options.transform } : {}),
    ...(options?.width !== undefined ? { width: options.width } : {}),
  }
}
