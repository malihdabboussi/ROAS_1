'use client'

import { useEffect, useState } from 'react'
import { fetchSocialPost, type SocialPost } from '@/lib/artifacts'

export function useSocialPostFetch(artifactId: string): SocialPost | null {
  const [post, setPost] = useState<SocialPost | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchSocialPost(artifactId).then((data) => {
      if (cancelled || !data) return
      setPost(data)
    })
    return () => {
      cancelled = true
    }
  }, [artifactId])

  return post
}
