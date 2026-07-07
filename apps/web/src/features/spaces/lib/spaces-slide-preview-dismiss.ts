/** Left column (list + toolbar) in Spaces row: clicks here dismiss artifact/media slide preview. */
export const SPACES_PREVIEW_DISMISS_ZONE_SELECTOR = '[data-spaces-preview-dismiss-zone]'

export function isPointerInSpacesSlidePreviewDismissZone(target: Element | null): boolean {
  return Boolean(target?.closest(SPACES_PREVIEW_DISMISS_ZONE_SELECTOR))
}
