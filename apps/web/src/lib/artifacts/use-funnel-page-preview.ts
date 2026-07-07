'use client'

import { useEffect, useState } from 'react'
import type { FunnelPage } from './artifact-types'
import { fetchFunnelWithPagesCached } from './funnel-preview-api'

export interface FunnelPagePreview {
  code: string
  css?: string
}

type FunnelPreviewPageRow = Pick<FunnelPage, 'id' | 'generated_html' | 'generated_css'> & {
  order_index?: unknown
}

export function useFunnelPagePreview(
  artifactId: string,
  funnelPageId?: string,
): FunnelPagePreview | null {
  const [page, setPage] = useState<FunnelPagePreview | null>(null)

  useEffect(() => {
    let cancelled = false
    const loadPage = async () => {
      // Cached per funnel: N cards / preview / full view share one download,
      // and closing/reopening the grid does not refetch within the TTL.
      const funnel = await fetchFunnelWithPagesCached(artifactId)
      const pages = Array.isArray(funnel.pages) ? (funnel.pages as FunnelPreviewPageRow[]) : []
      const pageData = funnelPageId
        ? (pages.find((p) => p.id === funnelPageId) ?? null)
        : (pages.slice().sort((a, b) => {
            const aOrder = Number(a.order_index ?? 0)
            const bOrder = Number(b.order_index ?? 0)
            return aOrder - bOrder
          })[0] ?? null)
      if (pageData?.generated_html) {
        if (cancelled) return
        setPage({
          code: pageData.generated_html,
          css: pageData.generated_css ?? undefined,
        })
      }
    }
    loadPage().catch(() => {
      if (!cancelled) setPage(null)
    })
    return () => {
      cancelled = true
    }
  }, [artifactId, funnelPageId])

  return page
}
