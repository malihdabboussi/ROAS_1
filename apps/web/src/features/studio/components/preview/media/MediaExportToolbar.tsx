'use client'

import { useState, type ReactNode, type RefObject } from 'react'
import { Download } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import {
  exportCampaignMarkdownDomToPdf,
  triggerRemotePdfDownload,
} from '@/features/studio/lib/campaign-markdown-pdf-export'
import { downloadMarkdown } from '@/features/studio/utils/artifact-export'

export function MediaExportToolbar({
  campaignId,
  title,
  markdownSource,
  markdownExportRef,
  remotePdfUrl,
  remotePdfFilename,
  visualExportRef,
  originalFileUrl,
  originalFilename,
  children,
}: {
  campaignId: string
  title: string
  markdownSource: string | null
  markdownExportRef: RefObject<HTMLElement | null> | null
  remotePdfUrl?: string | null
  remotePdfFilename?: string | null
  visualExportRef?: RefObject<HTMLElement | null> | null
  originalFileUrl?: string | null
  originalFilename?: string | null
  children?: ReactNode
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)

  const hasMarkdownActions = Boolean(markdownSource && markdownExportRef)
  const hasVisualPdfOnly = Boolean(visualExportRef && !hasMarkdownActions)
  const hasRemotePdf = Boolean(remotePdfUrl)
  const hasGeneratedPdf = hasMarkdownActions || hasVisualPdfOnly
  const includeOriginalInMenu = Boolean(
    originalFileUrl?.trim() &&
    (hasMarkdownActions || hasVisualPdfOnly || (!hasRemotePdf && !hasGeneratedPdf)),
  )

  const showPdfRow = hasRemotePdf || hasGeneratedPdf
  const showDownloadMenu = showPdfRow || Boolean(hasMarkdownActions) || includeOriginalInMenu

  const runMarkdownPdf = async () => {
    if (!markdownExportRef?.current || exportingPdf) return
    setExportingPdf(true)
    try {
      await exportCampaignMarkdownDomToPdf({
        contentElement: markdownExportRef.current,
        campaignId,
        filenameBase: title,
        preferPrintPipeline: true,
      })
    } finally {
      setExportingPdf(false)
    }
  }

  const runVisualPdf = async () => {
    if (!visualExportRef?.current || exportingPdf) return
    setExportingPdf(true)
    try {
      await exportCampaignMarkdownDomToPdf({
        contentElement: visualExportRef.current,
        campaignId,
        filenameBase: title,
        preferPrintPipeline: false,
      })
    } finally {
      setExportingPdf(false)
    }
  }

  const handleMenuPdf = async () => {
    setMenuOpen(false)
    if (hasRemotePdf && remotePdfUrl) {
      triggerRemotePdfDownload(remotePdfUrl, remotePdfFilename ?? null, title)
      return
    }
    if (hasMarkdownActions) {
      await runMarkdownPdf()
      return
    }
    if (hasVisualPdfOnly) {
      await runVisualPdf()
    }
  }

  const handleMenuMarkdown = () => {
    setMenuOpen(false)
    if (markdownSource) downloadMarkdown(markdownSource, title, 'media')
  }

  const handleMenuOriginal = () => {
    setMenuOpen(false)
    const u = originalFileUrl?.trim()
    if (!u) return
    const a = document.createElement('a')
    a.href = u
    if (originalFilename) a.download = originalFilename
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    a.click()
  }

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
      {showDownloadMenu ? (
        <div className="relative">
          <Tooltip label="Download" side="bottom">
            <button type="button" onClick={() => setMenuOpen((o) => !o)} className="btn-icon-glass">
              <Download className="h-4 w-4" />
            </button>
          </Tooltip>
          {menuOpen ? (
            <>
              <div className="fixed inset-0 z-[60]" onClick={() => setMenuOpen(false)} />
              <div className="dropdown-glass absolute right-0 top-full z-[70] mt-1 min-w-[160px] py-1">
                {showPdfRow ? (
                  <button
                    type="button"
                    onClick={() => void handleMenuPdf()}
                    disabled={exportingPdf && (hasMarkdownActions || hasVisualPdfOnly)}
                    className="body-3 text-foreground hover:bg-hover-subtle gap-spacing-2 px-spacing-3 py-spacing-2 flex w-full items-center text-left transition-colors disabled:opacity-50"
                  >
                    {exportingPdf && (hasMarkdownActions || hasVisualPdfOnly)
                      ? 'Exporting…'
                      : 'PDF'}
                  </button>
                ) : null}
                {hasMarkdownActions ? (
                  <button
                    type="button"
                    onClick={handleMenuMarkdown}
                    className="body-3 text-foreground hover:bg-hover-subtle gap-spacing-2 px-spacing-3 py-spacing-2 flex w-full items-center text-left transition-colors"
                  >
                    Markdown
                  </button>
                ) : null}
                {includeOriginalInMenu ? (
                  <button
                    type="button"
                    onClick={handleMenuOriginal}
                    className="body-3 text-foreground hover:bg-hover-subtle gap-spacing-2 px-spacing-3 py-spacing-2 flex w-full items-center text-left transition-colors"
                  >
                    Download
                  </button>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  )
}
