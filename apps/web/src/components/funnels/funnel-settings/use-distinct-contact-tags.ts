'use client'

import { useEffect, useState } from 'react'
import { backendGet } from '@/lib/api/backend-client'

export function useDistinctContactTags(): { tags: string[]; loading: boolean } {
  const [tags, setTags] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const res = await backendGet<{ tags: string[] }>('/api/segments/filter-options').catch(
        () => ({ tags: [] as string[] }),
      )
      if (!cancelled) {
        setTags(Array.isArray(res.tags) ? res.tags : [])
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return { tags, loading }
}
