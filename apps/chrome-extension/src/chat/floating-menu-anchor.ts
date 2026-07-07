/** Match apps/web `positionFloatingMenuFromAnchorRect` (ChatInput model menu). */

const DEFAULT_GAP = 8
const DEFAULT_MARGIN = 8

export function positionFloatingMenuFromAnchorRect(
  anchor: Pick<DOMRect, 'top' | 'left' | 'bottom' | 'right'>,
  options: {
    menuWidth: number
    menuHeight: number
    gap?: number
    viewportMargin?: number
  },
): { top: number; left: number } {
  const gap = options.gap ?? DEFAULT_GAP
  const m = options.viewportMargin ?? DEFAULT_MARGIN
  const { menuWidth, menuHeight } = options

  const spaceAbove = anchor.top - m
  const spaceBelow = window.innerHeight - anchor.bottom - m
  const preferAbove = spaceAbove >= menuHeight + gap || spaceAbove >= spaceBelow

  let top = preferAbove ? anchor.top - menuHeight - gap : anchor.bottom + gap
  top = Math.min(Math.max(m, top), window.innerHeight - menuHeight - m)

  const left = Math.min(Math.max(m, anchor.left), window.innerWidth - menuWidth - m)

  return { top, left }
}
