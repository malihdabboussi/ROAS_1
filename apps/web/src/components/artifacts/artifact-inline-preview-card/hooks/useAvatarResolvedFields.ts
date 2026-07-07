'use client'

import { useAvatarPersonaPreview } from './useAvatarPersonaPreview'

export function useAvatarResolvedFields({
  artifactId,
  name,
  subtitle,
  career,
  age,
  backgroundProfile,
}: {
  artifactId: string
  name: string
  subtitle?: string
  career?: string
  age?: string
  backgroundProfile?: string
}) {
  const needsFetch = !career || !age || !backgroundProfile
  const fetched = useAvatarPersonaPreview(artifactId, needsFetch)

  let resolvedCareer = career ?? fetched?.career
  let resolvedAge = age ?? fetched?.age
  const resolvedBg = backgroundProfile ?? fetched?.backgroundProfile
  if (!resolvedCareer && !resolvedAge && subtitle) {
    const parts = subtitle.split(' · ')
    for (const p of parts) {
      if (!resolvedAge && /^Age\s/i.test(p)) resolvedAge = p.replace(/^Age\s+/i, '')
      else if (!resolvedCareer) resolvedCareer = p
    }
  }
  const displayName = name.includes(' — ') ? (name.split(' — ')[0] ?? name).trim() : name

  return { resolvedCareer, resolvedAge, resolvedBg, displayName }
}
