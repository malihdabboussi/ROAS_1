/** Social post `status` → glass dot tokens (group headers, card meta). */
export function socialPostStatusGlassClass(statusRaw: string): string {
  const key = statusRaw.trim().toLowerCase()
  if (key === 'published') return 'badge-glass-green'
  if (key === 'ready') return 'badge-glass-blue'
  if (key === 'scheduled') return 'badge-glass-purple'
  if (key === 'failed') return 'badge-glass-red'
  if (key === 'draft') return 'badge-glass-muted'
  return 'badge-glass-muted'
}
