type AuthUserLike = {
  email?: string | null
  user_metadata?: Record<string, unknown>
}

type ProfileLike = {
  full_name?: string | null
  avatar_url?: string | null
} | null

/** Prefer `profiles` row, then auth metadata (`full_name`, `display_name`, `name`). */
export function resolveUserDisplayName(user: AuthUserLike, profile?: ProfileLike): string {
  const meta = user.user_metadata ?? {}
  const fromProfile = profile?.full_name?.trim()
  if (fromProfile) return fromProfile
  const fromMeta =
    (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
    (typeof meta.display_name === 'string' && meta.display_name.trim()) ||
    (typeof meta.name === 'string' && meta.name.trim()) ||
    ''
  if (fromMeta) return fromMeta
  return user.email?.split('@')[0] ?? 'User'
}

/** Prefer `profiles.avatar_url`, then auth metadata (`avatar_url`, `picture`). */
export function resolveUserAvatarUrl(user: AuthUserLike, profile?: ProfileLike): string | null {
  const fromProfile = profile?.avatar_url?.trim()
  if (fromProfile) return fromProfile
  const meta = user.user_metadata ?? {}
  const fromMeta =
    (typeof meta.avatar_url === 'string' && meta.avatar_url.trim()) ||
    (typeof meta.picture === 'string' && meta.picture.trim()) ||
    ''
  return fromMeta || null
}
