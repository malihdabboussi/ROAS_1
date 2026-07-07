'use client'

import { useEffect, useState } from 'react'
import { backendGet } from '@/lib/api/backend-client'

type SpaceItemPreview = {
  id: string
  custom_data?: Record<string, unknown> | null
}

export function useVisualDocPreview(itemId: string, spaceId?: string): string | null {
  const [html, setHtml] = useState<string | null>(null)

  useEffect(() => {
    if (!itemId || !spaceId) {
      setHtml(null)
      return
    }
    let cancelled = false
    const load = async () => {
      const items = await backendGet<SpaceItemPreview[]>(`/api/spaces/${spaceId}/items`)
      if (cancelled) return
      const item = items.find((entry) => entry.id === itemId)
      const visualHtml = item?.custom_data?._doc_visual_html
      setHtml(typeof visualHtml === 'string' && visualHtml.trim() ? visualHtml : null)
    }
    load().catch(() => {
      if (!cancelled) setHtml(null)
    })
    return () => {
      cancelled = true
    }
  }, [itemId, spaceId])

  return html
}
