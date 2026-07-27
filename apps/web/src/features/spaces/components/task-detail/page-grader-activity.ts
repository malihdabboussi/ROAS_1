/** Work URL from a Page Grader sync `field_change` payload (`custom_data.page_grader`). */
export function getPageGraderWorkUrlFromActivityPayload(
  payload: Record<string, unknown> | undefined,
): string | null {
  if (!payload || payload.field !== 'page_grader') return null
  const to = payload.to
  if (!to || typeof to !== 'object' || Array.isArray(to)) return null
  const workUrl = (to as Record<string, unknown>).work_url
  if (typeof workUrl !== 'string') return null
  const trimmed = workUrl.trim()
  if (!trimmed) return null
  try {
    const u = new URL(trimmed)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    return trimmed
  } catch {
    return null
  }
}

export function formatPageGraderFieldChangeLabel(
  payload: Record<string, unknown> | undefined,
): string {
  return getPageGraderWorkUrlFromActivityPayload(payload)
    ? 'sent this to The ROAS Portal'
    : 'updated The ROAS Portal sync'
}
