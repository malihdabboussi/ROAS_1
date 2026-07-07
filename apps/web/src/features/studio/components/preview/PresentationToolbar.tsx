'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { MoreVertical } from 'lucide-react'
import { toast } from 'sonner'
import { STUDIO_INLINE_ERRORS } from '@/features/studio/config/studio-inline-errors.config'
import type {
  PresentationPreviewOverflowMenuProps,
  PresentationViewportSize,
} from '@/lib/artifacts'
import { fetchPresentation, fetchPresentationBundle } from '../../services/artifact-preview.service'
import { usePresentationFullModeStore } from '../../store/use-presentation-full-mode-store'
import {
  buildStandalonePresentationHtml,
  downloadHTML,
  downloadPresentationPDFFromIframe,
  downloadPresentationPDFFromSlides,
  downloadPresentationPPTFromIframe,
  downloadPresentationPPTFromSlides,
} from '../../utils/artifact-export'
import { PresentationDownloadMenu } from './PresentationDownloadMenu'
import { PresentationEditModeToolbar } from './PresentationEditModeToolbar'
import { PresentationShareMenu } from './PresentationShareMenu'
import { StudioPresentationMenuDropdown } from './StudioPresentationMenuDropdown'
import { PresentationViewportMenu } from './PresentationViewportMenu'

// ============================================================================
// Types
// ============================================================================

export type ViewportSize = PresentationViewportSize
type ToolbarMenu = 'viewport' | 'download' | 'share'

interface PresentationToolbarProps {
  presentationId: string
  name: string
  status: 'draft' | 'generated' | 'published'
  fileUrl: string | null
  generatedHtml: string | null
  publishedUrl: string | null
  onStatusChange: (
    newStatus: 'draft' | 'generated' | 'published',
    newPublishedUrl: string | null,
  ) => void
  viewport: ViewportSize
  onViewportChange: (v: ViewportSize) => void
  leadingChrome?: ReactNode
  /** Close + deep-work extras only (e.g. Spaces slide-over); not fullscreen — mirrors `FunnelToolbar` `trailingChrome`. */
  trailingChrome?: ReactNode
  /** After divider, before kebab — e.g. Spaces “open full view” (`FunnelToolbar` `publishAdjacentChrome`). */
  publishAdjacentChrome?: ReactNode
  campaignId?: string | null
  onPresentationMenuChanged?: () => void
  onOpenFullView?: () => void
  onResourceDeleted?: () => void
  /** Spaces deep-work: edit modes in toolbar; viewport/export in overflow menu. */
  presentationFullMode?: boolean
}

// ============================================================================
// PresentationToolbar
// ============================================================================

export function PresentationToolbar({
  presentationId,
  name,
  status,
  fileUrl,
  generatedHtml,
  publishedUrl,
  onStatusChange,
  viewport,
  onViewportChange,
  leadingChrome,
  trailingChrome,
  publishAdjacentChrome,
  campaignId = null,
  onPresentationMenuChanged,
  onOpenFullView,
  onResourceDeleted,
  presentationFullMode = false,
}: PresentationToolbarProps) {
  const [copied, setCopied] = useState(false)
  const [exporting, setExporting] = useState<'pdf' | 'ppt' | null>(null)
  const [activeToolbarMenu, setActiveToolbarMenu] = useState<ToolbarMenu | null>(null)
  const [presentationMenuOpen, setPresentationMenuOpen] = useState(false)
  const presentationMenuBtnRef = useRef<HTMLButtonElement>(null)

  const setToolbarMenu = useCallback((menu: ToolbarMenu, open: boolean) => {
    setActiveToolbarMenu(open ? menu : null)
    if (open) setPresentationMenuOpen(false)
  }, [])

  useEffect(() => {
    setPresentationMenuOpen(false)
    setActiveToolbarMenu(null)
  }, [presentationId])

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [])

  const handleExport = useCallback(
    async (format: 'pdf' | 'ppt') => {
      setActiveToolbarMenu(null)
      setExporting(format)
      try {
        const isTsxMode = !!document.querySelector('[data-presentation-export-iframe]')

        if (isTsxMode) {
          if (format === 'pdf') {
            await downloadPresentationPDFFromIframe(name || 'presentation')
          } else {
            await downloadPresentationPPTFromIframe(name || 'presentation')
          }
        } else {
          const presentation = await fetchPresentation(presentationId)
          const slides = Array.isArray(presentation.slides)
            ? (presentation.slides as Record<string, unknown>[])
            : []

          if (slides.length === 0) {
            throw new Error('No slides to export')
          }

          if (format === 'pdf') {
            await downloadPresentationPDFFromSlides(
              slides,
              name || presentation.name || 'presentation',
            )
          } else {
            await downloadPresentationPPTFromSlides(
              slides,
              name || presentation.name || 'presentation',
            )
          }
        }
      } catch (err) {
        console.error(`Failed to export presentation as ${format}:`, err)
        toast.error(STUDIO_INLINE_ERRORS.DOWNLOAD_FAILED)
      } finally {
        setExporting(null)
      }
    },
    [presentationId, name],
  )

  const handleDownloadHtml = useCallback(async () => {
    setActiveToolbarMenu(null)
    try {
      const bundle = await fetchPresentationBundle(presentationId)
      if (bundle.source_mode === 'html_bundle' && bundle.has_entry) {
        const html = await buildStandalonePresentationHtml(bundle)
        downloadHTML(html, name)
        return
      }
      if (generatedHtml) {
        downloadHTML(generatedHtml, name)
      }
    } catch (err) {
      console.error('Failed to download presentation HTML:', err)
      toast.error(STUDIO_INLINE_ERRORS.DOWNLOAD_FAILED)
    }
  }, [generatedHtml, name, presentationId])

  const showFullModeChrome = presentationFullMode
  const useCompactToolbarLayout = presentationFullMode
  const fullModeEditMode = usePresentationFullModeStore((s) => s.mode)
  const fullModeThumbnailsOpen = usePresentationFullModeStore((s) => s.thumbnailsOpen)
  const setFullModeEditMode = usePresentationFullModeStore((s) => s.setMode)
  const toggleFullModeThumbnails = usePresentationFullModeStore((s) => s.toggleThumbnails)

  const previewOverflow: PresentationPreviewOverflowMenuProps | undefined = showFullModeChrome
    ? {
        viewport,
        onViewportChange,
        fileUrl,
        exporting,
        copied,
        onExportPdf: () => void handleExport('pdf'),
        onExportPpt: () => void handleExport('ppt'),
        onDownloadHtml: () => void handleDownloadHtml(),
        onCopyDownloadLink: fileUrl
          ? async () => {
              await copyToClipboard(fileUrl)
            }
          : undefined,
      }
    : undefined

  return (
    <>
      <div
        className={
          useCompactToolbarLayout
            ? `group/presentation-toolbar border-border flex min-w-0 shrink-0 items-center gap-2 px-3 py-2${
                presentationFullMode ? '' : 'border-b'
              }`
            : 'group/presentation-toolbar border-border grid min-w-0 shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-2 gap-y-2 border-b px-3 py-2'
        }
      >
        <div
          className={
            useCompactToolbarLayout
              ? 'flex min-w-0 flex-1 items-center gap-2 overflow-hidden'
              : 'flex min-w-0 max-w-full items-center gap-2 justify-self-start overflow-hidden'
          }
        >
          {leadingChrome}
          <span className="body-3 text-foreground min-w-0 truncate font-medium">{name}</span>
        </div>

        {!useCompactToolbarLayout ? <div aria-hidden className="justify-self-center" /> : null}

        <div
          className={
            useCompactToolbarLayout
              ? 'flex min-w-0 shrink-0 flex-nowrap items-center justify-end gap-1'
              : 'flex min-w-0 flex-nowrap items-center justify-end gap-1 justify-self-end'
          }
        >
          {showFullModeChrome ? (
            <>
              <PresentationEditModeToolbar
                mode={fullModeEditMode}
                thumbnailsOpen={fullModeThumbnailsOpen}
                onModeChange={setFullModeEditMode}
                onToggleThumbnails={toggleFullModeThumbnails}
              />
              <div className="border-l-glass mx-1 h-4 w-0 shrink-0 self-center" aria-hidden />
            </>
          ) : (
            <div className="hidden items-center gap-1 md:flex">
              <PresentationViewportMenu
                viewport={viewport}
                onViewportChange={onViewportChange}
                open={activeToolbarMenu === 'viewport'}
                onOpenChange={(open) => setToolbarMenu('viewport', open)}
              />
              <PresentationDownloadMenu
                fileUrl={fileUrl}
                exporting={exporting}
                copied={copied}
                open={activeToolbarMenu === 'download'}
                onOpenChange={(open) => setToolbarMenu('download', open)}
                onCopyDownloadLink={copyToClipboard}
                onDownloadHtml={() => void handleDownloadHtml()}
                onExport={(format) => void handleExport(format)}
              />
            </div>
          )}

          <button
            ref={presentationMenuBtnRef}
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setPresentationMenuOpen((o) => !o)
              setActiveToolbarMenu(null)
            }}
            data-tooltip="Presentation options"
            data-side="bottom"
            aria-label="Presentation options"
            aria-haspopup="menu"
            aria-expanded={presentationMenuOpen}
            className="tooltip h-spacing-7 text-muted-foreground hover:bg-hover-subtle hover:text-foreground border-border inline-flex aspect-square shrink-0 items-center justify-center rounded-spacing-2 border transition-colors"
          >
            <MoreVertical className="icon-sm shrink-0" />
          </button>
          {presentationMenuOpen ? (
            <StudioPresentationMenuDropdown
              presentation={{
                id: presentationId,
                name: name ?? null,
                campaign_id: campaignId,
              }}
              anchorRef={presentationMenuBtnRef}
              onClose={() => setPresentationMenuOpen(false)}
              onChanged={onPresentationMenuChanged}
              onOpenFullView={onOpenFullView}
              onDeleted={onResourceDeleted}
              previewOverflow={previewOverflow}
            />
          ) : null}

          {trailingChrome}

          {publishAdjacentChrome ? (
            <div className="border-l-glass mx-1 h-4 w-0 shrink-0 self-center" aria-hidden />
          ) : null}
          {publishAdjacentChrome}

          <PresentationShareMenu
            presentationId={presentationId}
            status={status}
            publishedUrl={publishedUrl}
            open={activeToolbarMenu === 'share'}
            copied={copied}
            onOpenChange={(open) => setToolbarMenu('share', open)}
            onStatusChange={onStatusChange}
            onCopy={copyToClipboard}
          />
        </div>
      </div>
    </>
  )
}
