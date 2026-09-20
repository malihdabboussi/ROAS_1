import type { FathomRepository } from '../repositories/fathom.repository'

/**
 * Learn the owner's alternate Fathom emails from `recorded_by`, but never absorb
 * teammate hosts (shared_team_recordings) or every Team call would be labeled
 * Personal. Returns the alias that was persisted, or null when nothing changed.
 */
export async function captureFathomOwnerAlias(
  repository: Pick<
    FathomRepository,
    'getFathomAliases' | 'getProfileIdentity' | 'updateFathomAliases'
  >,
  userId: string,
  recordedBy: { email?: unknown; name?: unknown } | null | undefined,
): Promise<string | null> {
  const normalized =
    typeof recordedBy?.email === 'string' ? recordedBy.email.trim().toLowerCase() : ''
  if (!normalized || !normalized.includes('@')) return null
  const existing = await repository.getFathomAliases(userId)
  if (existing.includes(normalized)) return null

  const profile = await repository.getProfileIdentity(userId)
  const ownerEmails = [profile?.email, ...existing]
    .filter((e): e is string => typeof e === 'string' && e.includes('@'))
    .map((e) => e.trim().toLowerCase())
  const ownerHints = new Set<string>()
  for (const email of ownerEmails) {
    const local = email.split('@')[0] ?? ''
    for (const part of local.split(/[._+-]/)) {
      if (part.length >= 4) ownerHints.add(part)
    }
  }
  for (const token of String(profile?.full_name ?? '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 4)) {
    ownerHints.add(token)
  }

  const local = normalized.split('@')[0] ?? ''
  const recordedName = String(recordedBy?.name ?? '').toLowerCase()
  const looksLikeOwner = [...ownerHints].some(
    (hint) => local.includes(hint) || recordedName.includes(hint),
  )
  if (!looksLikeOwner) return null

  const error = await repository.updateFathomAliases(userId, [...existing, normalized])
  if (error) throw new Error(`Failed to persist Fathom alias: ${error.message}`)
  return normalized
}
