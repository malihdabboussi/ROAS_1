'use client'

import { useEffect, useState } from 'react'
import { fetchAvatar } from '@/lib/artifacts'
import { pickAge, pickBg, pickCareer } from '../artifact-inline-preview.utils'

export function useAvatarPersonaPreview(
  artifactId: string,
  needsFetch: boolean,
): {
  career?: string
  age?: string
  backgroundProfile?: string
} | null {
  const [fetched, setFetched] = useState<{
    career?: string
    age?: string
    backgroundProfile?: string
  } | null>(null)

  useEffect(() => {
    if (!needsFetch) return
    let cancelled = false
    fetchAvatar(artifactId).then((data) => {
      if (cancelled || !data?.persona_data) return
      const pd = data.persona_data as Record<string, unknown>
      const demo =
        pd.demographics && typeof pd.demographics === 'object'
          ? (pd.demographics as Record<string, unknown>)
          : {}
      setFetched({
        career: pickCareer(demo) ?? pickCareer(pd),
        age: pickAge(demo) ?? pickAge(pd),
        backgroundProfile: pickBg(pd),
      })
    })
    return () => {
      cancelled = true
    }
  }, [needsFetch, artifactId])

  return fetched
}
