import type { MediaGroupBy } from '../types/space-schema'

/** Single source for media “Group by” field labels (toolbar popover + pill). */
export const MEDIA_GROUP_BY_OPTIONS: { id: Exclude<MediaGroupBy, 'none'>; label: string }[] = [
  { id: 'date', label: 'Date' },
  { id: 'source', label: 'Source' },
]

/** Maps persisted configs that used removed dimensions (`agent`, `campaign`) to `date`. */
export function normalizeMediaGroupBy(raw: string | undefined): MediaGroupBy {
  if (raw === 'none' || raw === 'date' || raw === 'source') return raw
  return 'date'
}
