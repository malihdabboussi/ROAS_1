'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { FunnelFullModeShell } from '@/features/studio/components/preview/FunnelFullModeShell'
import { FunnelHtmlPreview } from '@/features/studio/components/preview/FunnelHtmlPreview'
import { SandpackPreview } from '@/features/studio/components/preview/SandpackPreview'
import {
  fetchFunnelPageBundle,
  fetchFunnelWithPages,
  type Funnel,
  type FunnelPage,
  type FunnelPageBundle,
} from '@/lib/artifacts'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'

type PreviewPage = {
  id: string
  name: string
  sourceMode: string
  code: string | null
  css: string | null
  order: number
  raw: FunnelPage
}

function toPreviewPages(funnel: Funnel): PreviewPage[] {
  const funnelPages = Array.isArray(funnel.pages) ? funnel.pages : []
  return funnelPages
    .map((page, index) => ({
      id: page.id,
      name: page.name ?? 'Page',
      sourceMode: page.source_mode ?? 'tsx',
      code: page.generated_html,
      css: page.generated_css,
      order: page.sort_order ?? index,
      raw: page,
    }))
    .sort((a, b) => a.order - b.order)
}

export function FunnelFullPreview({ funnelId }: { funnelId: string }) {
  const [funnel, setFunnel] = useState<Funnel | null>(null)
  const [pages, setPages] = useState<PreviewPage[]>([])
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null)
  const [bundle, setBundle] = useState<FunnelPageBundle | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchFunnelWithPages(funnelId)
      .then((nextFunnel) => {
        if (cancelled) return
        const sorted = toPreviewPages(nextFunnel)
        setFunnel(nextFunnel)
        setPages(sorted)
        setSelectedPageId((current) =>
          current && sorted.some((page) => page.id === current) ? current : (sorted[0]?.id ?? null),
        )
      })
      .catch(() => {
        if (!cancelled) {
          setFunnel(null)
          setPages([])
          setSelectedPageId(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [funnelId])

  const selectedPage = pages.find((page) => page.id === selectedPageId) ?? null
  const htmlBundleMode = pages.some((page) => page.sourceMode === 'html_bundle')
  const shellPages = useMemo(() => pages.map((page) => page.raw), [pages])

  useEffect(() => {
    let cancelled = false
    setBundle(null)
    if (!selectedPage || selectedPage.sourceMode !== 'html_bundle') return
    setLoading(true)
    fetchFunnelPageBundle(funnelId, selectedPage.id)
      .then((nextBundle) => {
        if (!cancelled) setBundle(nextBundle)
      })
      .catch(() => {
        if (!cancelled) setBundle(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [funnelId, selectedPage?.id, selectedPage?.sourceMode])

  if (loading && !selectedPage) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center">
        <Loader2 className="icon-md text-muted-foreground animate-spin" />
      </div>
    )
  }

  if (!selectedPage || !funnel) {
    return (
      <div className="body-2 text-muted-foreground py-spacing-6 text-center">
        No page content available
      </div>
    )
  }

  if (htmlBundleMode) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <FunnelFullModeShell
          funnelId={funnel.id}
          name={funnel.name}
          themeId={funnel.theme_id ?? null}
          funnelMetadata={funnel.metadata ?? null}
          bundle={bundle}
          pages={shellPages}
          activePageId={selectedPage.id}
          onPageChange={setSelectedPageId}
          renderPreview={({ mode, onElementSelect, onDrawingEvent }) => {
            if (!bundle) {
              return (
                <div className="flex h-full items-center justify-center">
                  <VibeyLoadingOrb size="sm" text="Loading preview..." />
                </div>
              )
            }
            return (
              <FunnelHtmlPreview
                bundle={bundle}
                title={selectedPage.name}
                editMode={mode}
                onElementSelect={onElementSelect}
                onDrawingEvent={onDrawingEvent}
                onNavigateRequest={(target) => {
                  const byPath = pages.find((page) => page.raw.path === target)
                  const byIndex = /^\d+$/.test(target)
                    ? pages[Number.parseInt(target, 10)]
                    : undefined
                  const next = byPath ?? byIndex
                  if (next) setSelectedPageId(next.id)
                }}
              />
            )
          }}
        />
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {pages.length > 1 ? (
        <div className="gap-spacing-2 border-border px-spacing-3 py-spacing-2 flex shrink-0 flex-wrap border-b">
          {pages.map((page) => (
            <button
              key={page.id}
              type="button"
              onClick={() => setSelectedPageId(page.id)}
              aria-pressed={page.id === selectedPage.id}
              className={
                page.id === selectedPage.id
                  ? 'button-glass-accent body-3 px-spacing-3 py-spacing-1'
                  : 'button-glass-neutral body-3 px-spacing-3 py-spacing-1'
              }
            >
              {page.name}
            </button>
          ))}
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col">
        {selectedPage.code ? (
          <SandpackPreview
            code={selectedPage.code}
            css={selectedPage.css ?? undefined}
            fileName={selectedPage.name}
            hideDownload
          />
        ) : (
          <div className="body-2 text-muted-foreground py-spacing-6 text-center">
            No page content available
          </div>
        )}
      </div>
    </div>
  )
}
