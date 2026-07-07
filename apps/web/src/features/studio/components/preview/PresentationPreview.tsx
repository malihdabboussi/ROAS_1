'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { AlertCircle, Download, Loader2, MoreVertical } from 'lucide-react'
import { STUDIO_INLINE_ERRORS } from '@/features/studio/config/studio-inline-errors.config'
import type { PresentationResolvedRenderTheme } from '../../lib/presentation-render-theme.util'
import { resolvePresentationRenderTheme } from '../../lib/presentation-render-theme.util'
import {
  fetchPresentationBundleCached,
  fetchPresentationCached,
} from '../../services/artifact-preview.service'
import { usePresentationFullModeStore } from '../../store/use-presentation-full-mode-store'
import type {
  Presentation,
  PresentationBundle,
  PresentationEditMode,
  PresentationElementTrace,
  PresentationMarkupStrokePoint,
} from '../../types'
import { PresentationHtmlPreview } from './PresentationHtmlPreview'
import { SandpackPreview } from './SandpackPreview'
import { StudioPresentationMenuDropdown } from './StudioPresentationMenuDropdown'
import type { ViewportSize } from './SandpackPreview'

interface PresentationPreviewProps {
  presentationId: string
  themeCss?: string
  hideSandpackToolbar?: boolean
  viewport?: ViewportSize
  onViewportChange?: (v: ViewportSize) => void
  hideToolbar?: boolean
  /** When parent artifact row updates (rename/publish), refetch presentation for preview body. */
  artifactMetaKey?: string
  leadingChrome?: ReactNode
  toolbarTrailing?: ReactNode
  onOpenFullView?: () => void
  onResourceDeleted?: () => void
  editMode?: PresentationEditMode
  activeSlideIndex?: number | null
  onElementSelect?: (trace: PresentationElementTrace) => void
  onSlideChange?: (index: number | null) => void
  onDrawingEvent?: (
    phase: 'start' | 'move' | 'end',
    point: PresentationMarkupStrokePoint | null,
  ) => void
}

export function PresentationPreview({
  presentationId,
  themeCss,
  hideSandpackToolbar,
  viewport,
  onViewportChange,
  hideToolbar = false,
  artifactMetaKey,
  leadingChrome,
  toolbarTrailing,
  onOpenFullView,
  onResourceDeleted,
  editMode = 'preview',
  activeSlideIndex = null,
  onElementSelect,
  onSlideChange,
  onDrawingEvent,
}: PresentationPreviewProps) {
  const [presentation, setPresentation] = useState<Presentation | null>(null)
  const [bundle, setBundle] = useState<PresentationBundle | null>(null)
  const [renderTheme, setRenderTheme] = useState<PresentationResolvedRenderTheme | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const artifactReloadKey = hideToolbar ? null : artifactMetaKey
  const bundleReloadNonce = usePresentationFullModeStore((s) =>
    hideToolbar ? s.bundleReloadNonce : 0,
  )

  const loadPresentation = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Cached — shared with the controller, card hero and full-mode shell, so
      // preview ⇄ full-view transitions reuse one download per artifact.
      // Mutations and realtime refreshes invalidate these keys.
      const pres = await fetchPresentationCached(presentationId)
      setPresentation(pres)
      const nextBundle = await fetchPresentationBundleCached(presentationId)
      const nextRenderTheme =
        nextBundle.source_mode === 'html_bundle' && nextBundle.has_entry
          ? await resolvePresentationRenderTheme(nextBundle)
          : null
      setRenderTheme(nextRenderTheme)
      setBundle(nextBundle.files.length > 0 ? nextBundle : null)
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : STUDIO_INLINE_ERRORS.LOAD_PRESENTATION
      setError(errMsg)
    } finally {
      setLoading(false)
    }
  }, [presentationId])

  useEffect(() => {
    void loadPresentation()
  }, [loadPresentation, presentationId, artifactReloadKey, bundleReloadNonce])

  useEffect(() => {
    setMenuOpen(false)
  }, [presentationId])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-muted-foreground)]" />
      </div>
    )
  }

  if (error || !presentation) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <AlertCircle className="text-[var(--color-muted-foreground)]/40 h-8 w-8" />
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {error ?? 'Presentation not found'}
        </p>
      </div>
    )
  }

  const toolbar =
    !hideToolbar && presentation ? (
      <>
        <div
          className={`border-border flex items-center justify-between gap-2 border-b ${
            leadingChrome ? 'px-3 py-2' : 'px-spacing-4 py-3'
          }`}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {leadingChrome}
            <span className="body-3 min-w-0 truncate font-medium text-[var(--color-foreground)]">
              {presentation.name ?? 'Untitled Presentation'}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {presentation.file_url ? (
              <a
                href={presentation.file_url}
                target="_blank"
                rel="noopener noreferrer"
                data-tooltip="Download"
                data-side="bottom"
                className="tooltip btn-icon-bare"
              >
                <Download className="icon-sm" />
              </a>
            ) : null}
            {presentation.file_url ? (
              <span aria-hidden className="border-l-glass mx-1 h-4 w-0 shrink-0 self-center" />
            ) : null}
            {toolbarTrailing}
            <button
              ref={menuButtonRef}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setMenuOpen((o) => !o)
              }}
              data-tooltip="Presentation options"
              data-side="bottom"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="tooltip btn-icon-bare"
            >
              <MoreVertical className="icon-sm" />
            </button>
          </div>
        </div>
        {menuOpen ? (
          <StudioPresentationMenuDropdown
            presentation={{
              id: presentation.id,
              name: presentation.name ?? null,
              campaign_id: presentation.campaign_id ?? null,
            }}
            anchorRef={menuButtonRef}
            onClose={() => setMenuOpen(false)}
            onChanged={() => {
              void loadPresentation()
            }}
            onOpenFullView={
              onOpenFullView
                ? () => {
                    setMenuOpen(false)
                    onOpenFullView()
                  }
                : undefined
            }
            onDeleted={onResourceDeleted}
          />
        ) : null}
      </>
    ) : null

  const body =
    bundle?.source_mode === 'html_bundle' && bundle.has_entry ? (
      <PresentationHtmlPreview
        bundle={bundle}
        title={presentation.name ?? 'Presentation'}
        viewport={viewport}
        bridgeEnabled={hideToolbar}
        editMode={editMode}
        activeSlideIndex={activeSlideIndex}
        onElementSelect={onElementSelect}
        onSlideChange={onSlideChange}
        onDrawingEvent={onDrawingEvent}
        initialThemeCss={renderTheme?.css ?? null}
        initialThemeFontsUrl={renderTheme?.fontsUrl ?? null}
      />
    ) : presentation.generated_html ? (
      <SandpackPreview
        code={presentation.generated_html}
        css={themeCss ?? ''}
        fileName={presentation.name ?? 'Presentation'}
        variant="presentation"
        hideDownload={hideSandpackToolbar}
        viewport={viewport}
        onViewportChange={onViewportChange}
      />
    ) : presentation.file_url ? (
      <iframe
        src={presentation.file_url}
        className="min-h-0 flex-1 border-none"
        title={presentation.name ?? 'Presentation'}
      />
    ) : (
      (() => {
        const slides = presentation.slides ?? []
        const tsxSlide = slides.find(
          (s): s is Record<string, unknown> & { type: 'tsx'; content?: string; body?: string } =>
            (s as Record<string, unknown>)?.type === 'tsx',
        )
        const tsxCode =
          tsxSlide &&
          (typeof tsxSlide.content === 'string'
            ? tsxSlide.content
            : typeof tsxSlide.body === 'string'
              ? tsxSlide.body
              : '')
        if (tsxCode) {
          return (
            <SandpackPreview
              code={tsxCode}
              css={themeCss ?? ''}
              fileName={presentation.name ?? 'Presentation'}
              variant="presentation"
              hideDownload={hideSandpackToolbar}
              viewport={viewport}
              onViewportChange={onViewportChange}
            />
          )
        }
        return (
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <AlertCircle className="text-[var(--color-muted-foreground)]/40 h-8 w-8" />
            <p className="text-sm text-[var(--color-muted-foreground)]">
              No presentation content available
            </p>
          </div>
        )
      })()
    )

  if (presentation.file_url) {
    return (
      <div
        className={`flex h-full min-h-0 flex-1 flex-col overflow-hidden${
          hideToolbar ? '' : 'rounded-2xl'
        }`}
      >
        {toolbar}
        {hideToolbar ? (
          <div className="p-spacing-2 flex min-h-0 flex-1 flex-col overflow-hidden">{body}</div>
        ) : (
          body
        )}
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      {toolbar}
      <div
        className={
          hideToolbar
            ? 'p-spacing-2 flex min-h-0 flex-1 flex-col overflow-hidden'
            : 'flex min-h-0 flex-1 flex-col overflow-hidden'
        }
      >
        <div
          className={
            hideToolbar
              ? 'flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl'
              : 'flex min-h-0 flex-1 flex-col overflow-hidden'
          }
        >
          {body}
        </div>
      </div>
    </div>
  )
}
