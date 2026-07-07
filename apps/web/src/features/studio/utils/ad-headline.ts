/**
 * Strip trailing " (Copy)" from ad headline for display and persistence.
 * Prevents duplicate-label text from showing in UI or being re-persisted.
 */
export function stripCopyFromAdHeadline(value: string | null | undefined): string {
  if (value == null || typeof value !== 'string') return ''
  return value.replace(/\s*\(Copy\)\s*$/i, '').trim()
}
