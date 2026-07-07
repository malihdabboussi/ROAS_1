'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo } from 'react'

export const MEDIA_QUERY_KEY = 'media'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function useMediaDetailQuery() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const raw = searchParams.get(MEDIA_QUERY_KEY)
  const mediaId = useMemo(() => (raw && UUID_RE.test(raw) ? raw : null), [raw])

  const setMediaQuery = useCallback(
    (id: string | null) => {
      const p = new URLSearchParams(searchParams.toString())
      if (id && UUID_RE.test(id)) p.set(MEDIA_QUERY_KEY, id)
      else p.delete(MEDIA_QUERY_KEY)
      const qs = p.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams],
  )

  return { mediaId, setMediaQuery }
}
