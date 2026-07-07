import type { Ad } from '../../types'

/** Never overwrite user-selected Video/Carousel with Image from a stale API response. */
export function mergeAdResponse(prev: Ad | null, updated: Ad): Ad {
  if (!prev) return updated
  const prevFormat = prev.ad_format || 'SINGLE_IMAGE'
  const updatedFormat = updated.ad_format || 'SINGLE_IMAGE'
  if (prevFormat !== 'SINGLE_IMAGE' && updatedFormat !== prevFormat)
    return { ...updated, ad_format: prevFormat }
  return updated
}
