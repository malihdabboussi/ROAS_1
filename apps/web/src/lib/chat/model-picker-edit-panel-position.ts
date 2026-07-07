const VIEWPORT_MARGIN = 8

function isVisibleMenuRect(rect: DOMRect | null | undefined): rect is DOMRect {
  if (!rect) return false
  return rect.right > rect.left
}

export function resolveModelPickerMenuAnchorRect(
  dropdownRect: DOMRect | null | undefined,
  subscriptionSubmenuRect: DOMRect | null | undefined,
): DOMRect | null {
  const menus = [dropdownRect, subscriptionSubmenuRect].filter(isVisibleMenuRect)
  if (menus.length === 0) return null
  return menus.reduce((rightmost, rect) => (rect.right > rightmost.right ? rect : rightmost))
}

export function positionModelEditPanelFromMenuAnchor(
  anchorRect: DOMRect,
  panelWidth: number,
  maxHeight: number,
  viewportMargin = VIEWPORT_MARGIN,
): { top: number; left: number } {
  const gap = 8
  const left =
    anchorRect.right + gap + panelWidth + viewportMargin <= window.innerWidth
      ? anchorRect.right + gap
      : Math.max(viewportMargin, anchorRect.left - panelWidth - gap)
  const top = Math.min(
    Math.max(viewportMargin, anchorRect.top),
    Math.max(viewportMargin, window.innerHeight - maxHeight - viewportMargin),
  )
  return { top, left }
}
