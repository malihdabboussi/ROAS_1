/** Cross-surface opener: chat/cards → the nearest available image studio. */

export const VIBEY_OPEN_MEDIA_EVENT = 'vibey-open-media'

export type VibeyOpenMediaDetail = {
  mediaAssetId: string
  title?: string
  spaceId?: string | null
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function openMediaAssetInApp(detail: VibeyOpenMediaDetail | string) {
  const payload: VibeyOpenMediaDetail =
    typeof detail === 'string' ? { mediaAssetId: detail } : detail
  const id = payload.mediaAssetId?.trim() ?? ''
  if (!UUID_RE.test(id)) return false
  if (typeof window === 'undefined') return false
  window.dispatchEvent(
    new CustomEvent<VibeyOpenMediaDetail>(VIBEY_OPEN_MEDIA_EVENT, {
      detail: { ...payload, mediaAssetId: id },
      cancelable: true,
    }),
  )
  return true
}
