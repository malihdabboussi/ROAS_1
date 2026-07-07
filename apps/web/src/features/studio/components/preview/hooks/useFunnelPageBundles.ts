'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  fetchFunnelPageBundle,
  type FunnelPage,
  type FunnelPageBundle,
} from '../../../services/artifact-preview.service'

export function useFunnelPageBundles(
  funnelId: string,
  pages: FunnelPage[],
  activePageBundle: FunnelPageBundle | null,
): Record<string, FunnelPageBundle> {
  const [bundles, setBundles] = useState<Record<string, FunnelPageBundle>>({})
  const cacheRef = useRef<Record<string, FunnelPageBundle>>({})
  const pageIds = useMemo(() => pages.map((page) => page.id).join(','), [pages])

  useEffect(() => {
    if (!activePageBundle?.page.id) return
    cacheRef.current[activePageBundle.page.id] = activePageBundle
    setBundles((prev) => {
      if (prev[activePageBundle.page.id] === activePageBundle) return prev
      return { ...prev, [activePageBundle.page.id]: activePageBundle }
    })
  }, [activePageBundle])

  useEffect(() => {
    let cancelled = false

    for (const page of pages) {
      if (cacheRef.current[page.id]) continue

      void fetchFunnelPageBundle(funnelId, page.id)
        .then((bundle) => {
          if (cancelled) return
          cacheRef.current[page.id] = bundle
          // #region agent log
          fetch('http://127.0.0.1:7681/ingest/94e24cc9-0e93-41a4-9d43-69640004018c', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'bd981c' },
            body: JSON.stringify({
              sessionId: 'bd981c',
              hypothesisId: 'H4',
              location: 'useFunnelPageBundles.ts:fetch',
              message: 'page bundle fetched for thumbnail',
              data: {
                funnelId,
                pageId: page.id,
                sharedFileCount: bundle.shared_files.length,
                fileCount: bundle.files.length,
              },
              timestamp: Date.now(),
            }),
          }).catch(() => {})
          // #endregion
          setBundles((prev) => {
            if (prev[page.id] === bundle) return prev
            return { ...prev, [page.id]: bundle }
          })
        })
        .catch(() => undefined)
    }

    return () => {
      cancelled = true
    }
  }, [funnelId, pageIds, pages])

  return bundles
}
