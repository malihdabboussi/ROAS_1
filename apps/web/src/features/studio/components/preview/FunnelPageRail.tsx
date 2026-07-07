'use client'

import { Fragment, useMemo } from 'react'
import { ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import {
  buildFunnelPageFlowEdges,
  formatFunnelPageTypeLabel,
  mapOutgoingFunnelPageFlowEdges,
} from '../../lib/funnel-page-flow.util'
import { buildFunnelPageThumbnailSrcDoc } from '../../lib/funnel-page-thumbnail.util'
import type { FunnelPage, FunnelPageBundle } from '../../services/artifact-preview.service'
import { FunnelPageMiniPreview } from './FunnelPageMiniPreview'
import { useFunnelPageBundles } from './hooks/useFunnelPageBundles'

interface FunnelPageRailProps {
  funnelId: string
  pages: FunnelPage[]
  activePageId: string | null
  activePageBundle: FunnelPageBundle | null
  onSelectPage: (pageId: string) => void
}

function PageThumbnailPreview({
  bundle,
  pageIndex,
  title,
}: {
  bundle: FunnelPageBundle | null
  pageIndex: number
  title: string
}) {
  const srcDoc = useMemo(() => {
    if (!bundle) return null
    return buildFunnelPageThumbnailSrcDoc(bundle)
  }, [bundle])

  if (!srcDoc) {
    return (
      <div className="bg-card flex h-full w-full items-center justify-center">
        <span className="body-4 text-muted-foreground">{pageIndex + 1}</span>
      </div>
    )
  }

  return <FunnelPageMiniPreview srcDoc={srcDoc} title={title} />
}

function FunnelPageFlowArrow() {
  return (
    <div className="px-spacing-1 flex items-center justify-center py-0.5">
      <ArrowDown className="icon-xs text-muted-foreground shrink-0" aria-hidden />
    </div>
  )
}

function PageThumbnail({
  page,
  pageIndex,
  bundle,
  selected,
  onSelectPage,
}: {
  page: FunnelPage
  pageIndex: number
  bundle: FunnelPageBundle | null
  selected: boolean
  onSelectPage: (pageId: string) => void
}) {
  const typeLabel = formatFunnelPageTypeLabel(page)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onSelectPage(page.id)}
        aria-label={`Page ${pageIndex + 1}: ${page.name}`}
        aria-pressed={selected}
        className={cn(
          'rounded-spacing-2 relative w-full overflow-hidden border text-left transition-colors',
          selected ? 'border-border bg-hover-subtle/40' : 'border-border hover:bg-hover-subtle',
        )}
      >
        {selected ? (
          <span
            className="resize-divider-line-blue-compact pointer-events-none absolute bottom-1 left-0 top-1 z-10 w-px"
            aria-hidden
          />
        ) : null}
        <div className="relative aspect-video w-full overflow-hidden">
          <PageThumbnailPreview bundle={bundle} pageIndex={pageIndex} title={page.name} />
          <span className="body-4 text-foreground bg-background/85 rounded-spacing-1 px-spacing-1 absolute bottom-1 right-1 tabular-nums">
            {pageIndex + 1}
          </span>
        </div>
        <div className="px-spacing-2 py-spacing-1 border-border border-t">
          <span className="body-4 text-foreground block truncate font-medium">{typeLabel}</span>
        </div>
      </button>
    </div>
  )
}

export function FunnelPageRail({
  funnelId,
  pages,
  activePageId,
  activePageBundle,
  onSelectPage,
}: FunnelPageRailProps) {
  const bundlesByPageId = useFunnelPageBundles(funnelId, pages, activePageBundle)

  const sortedPages = useMemo(
    () => [...pages].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [pages],
  )

  const outgoingFlowByPageId = useMemo(() => {
    const edges = buildFunnelPageFlowEdges(sortedPages, bundlesByPageId)
    return mapOutgoingFunnelPageFlowEdges(edges)
  }, [bundlesByPageId, sortedPages])

  return (
    <aside className="border-border bg-background/95 h-full w-full min-w-0 shrink-0 overflow-y-auto border-r">
      <div className="gap-spacing-2 p-spacing-2 flex flex-col">
        {sortedPages.length === 0 ? (
          <p className="typo-caption text-muted-foreground px-spacing-1">No pages found</p>
        ) : (
          sortedPages.map((page, pageIndex) => {
            const flowEdge = outgoingFlowByPageId.get(page.id)
            return (
              <Fragment key={page.id}>
                <PageThumbnail
                  page={page}
                  pageIndex={pageIndex}
                  bundle={bundlesByPageId[page.id] ?? null}
                  selected={page.id === activePageId}
                  onSelectPage={onSelectPage}
                />
                {flowEdge ? <FunnelPageFlowArrow /> : null}
              </Fragment>
            )
          })
        )}
      </div>
    </aside>
  )
}
