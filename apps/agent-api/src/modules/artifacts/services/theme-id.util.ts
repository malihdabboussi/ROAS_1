export function normalizeThemeId(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  if (!normalized) return null
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidPattern.test(normalized) ? normalized : null
}

export function canAccessThemeForUser(row: Record<string, unknown>, userId: string): boolean {
  const isSystem = row.is_system === true
  const ownerId = typeof row.user_id === 'string' ? row.user_id : null
  if (isSystem) return true
  if (!ownerId) return true
  return ownerId === userId
}
