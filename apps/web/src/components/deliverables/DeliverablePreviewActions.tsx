'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Check,
  ChevronDown,
  ClipboardCopy,
  Download,
  ExternalLink,
  FileDown,
  FileText,
  Maximize2,
  Minimize2,
  Presentation,
  X,
} from 'lucide-react'
import type { DeliverableEntityExportFormat } from '@/components/deliverables/deliverable-preview-modal.types'
import { Tooltip } from '@/components/ui/tooltip'
import type { MissionDeliverable } from '@/lib/missions'

function resolveOpenTarget(
  deliverable: MissionDeliverable,
): { href: string; label: string } | null {
  const internalUrl = deliverable.metadata?.internalUrl
  if (typeof internalUrl === 'string' && internalUrl.startsWith('/')) {
    return { href: internalUrl, label: 'Open in Space' }
  }
  if (deliverable.file_url) {
    return { href: deliverable.file_url, label: 'Open original' }
  }
  return null
}

const menuRowClass =
  'gap-spacing-2 px-spacing-2 py-spacing-1 rounded-spacing-2 body-3 text-muted-foreground hover:bg-hover-subtle hover:text-foreground flex w-full items-center whitespace-nowrap text-left transition-colors disabled:opacity-50'

export function DeliverablePreviewActions({
  deliverable,
  mode,
  copied,
  exporting,
  exportAvailable,
  expanded,
  onCopy,
  onExportMd,
  onExportPdf,
  onEntityExport,
  onToggleExpanded,
  onClose,
}: {
  deliverable: MissionDeliverable
  mode: 'text' | 'entity'
  copied: boolean
  exporting: boolean
  exportAvailable: boolean
  expanded: boolean
  onCopy: () => Promise<void>
  onExportMd: () => void
  onExportPdf: () => Promise<void>
  onEntityExport: (format: DeliverableEntityExportFormat) => Promise<void>
  onToggleExpanded: () => void
  onClose: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRootRef = useRef<HTMLDivElement>(null)
  const openTarget = resolveOpenTarget(deliverable)
  const presentation = mode === 'entity' && deliverable.type === 'presentation'

  useEffect(() => {
    if (!menuOpen) return
    const handlePointerDown = (event: MouseEvent) => {
      if (event.target instanceof Node && menuRootRef.current?.contains(event.target)) return
      setMenuOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [menuOpen])

  const runAndClose = (action: () => void) => {
    action()
    setMenuOpen(false)
  }

  return (
    <div className="gap-spacing-2 flex shrink-0 items-center">
      {openTarget ? (
        <a
          href={openTarget.href}
          target="_blank"
          rel="noopener noreferrer"
          className="button-glass-neutral body-3 gap-spacing-2 px-spacing-3 py-spacing-2 inline-flex items-center whitespace-nowrap"
        >
          <ExternalLink className="icon-sm shrink-0" />
          <span>{openTarget.label}</span>
        </a>
      ) : null}

      {exportAvailable ? (
        <div ref={menuRootRef} className="relative flex shrink-0 items-stretch">
          {mode === 'text' ? (
            <button
              type="button"
              onClick={() => void onCopy()}
              className="button-glass-neutral body-3 gap-spacing-2 px-spacing-3 py-spacing-2 inline-flex items-center whitespace-nowrap rounded-r-none"
              aria-label="Copy document"
            >
              {copied ? (
                <Check className="icon-sm text-primary shrink-0" />
              ) : (
                <ClipboardCopy className="icon-sm shrink-0" />
              )}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className={`button-glass-neutral px-spacing-2 py-spacing-2 inline-flex items-center justify-center ${mode === 'text' ? 'rounded-l-none border-l-0' : ''}`}
            aria-label="More document actions"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            {mode === 'text' ? (
              <ChevronDown className="icon-sm shrink-0" />
            ) : (
              <Download className="icon-sm shrink-0" />
            )}
          </button>

          {menuOpen ? (
            <div
              role="menu"
              className="dropdown-menu-solid p-spacing-2 gap-spacing-1 z-dropdown top-spacing-10 absolute right-0 flex min-w-56 flex-col"
            >
              {mode === 'text' ? (
                <>
                  <button
                    type="button"
                    onClick={() => runAndClose(onExportMd)}
                    className={menuRowClass}
                  >
                    <FileText className="icon-sm shrink-0" />
                    <span>Download as Markdown</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => runAndClose(() => void onExportPdf())}
                    disabled={exporting}
                    className={menuRowClass}
                  >
                    <FileDown className="icon-sm shrink-0" />
                    <span>{exporting ? 'Preparing PDF…' : 'Print as PDF'}</span>
                  </button>
                </>
              ) : presentation ? (
                <>
                  <EntityExportAction
                    label="Download HTML"
                    format="html"
                    disabled={exporting}
                    onExport={onEntityExport}
                    onClose={() => setMenuOpen(false)}
                  />
                  <EntityExportAction
                    label="Download PDF"
                    format="pdf"
                    disabled={exporting}
                    onExport={onEntityExport}
                    onClose={() => setMenuOpen(false)}
                  />
                  <EntityExportAction
                    label="Download PowerPoint"
                    format="ppt"
                    disabled={exporting}
                    onExport={onEntityExport}
                    onClose={() => setMenuOpen(false)}
                  />
                </>
              ) : (
                <>
                  <EntityExportAction
                    label="Download PDF"
                    format="pdf"
                    disabled={exporting}
                    onExport={onEntityExport}
                    onClose={() => setMenuOpen(false)}
                  />
                  <EntityExportAction
                    label="Download Markdown"
                    format="md"
                    disabled={false}
                    onExport={onEntityExport}
                    onClose={() => setMenuOpen(false)}
                  />
                  <EntityExportAction
                    label="Download JSON"
                    format="json"
                    disabled={false}
                    onExport={onEntityExport}
                    onClose={() => setMenuOpen(false)}
                  />
                </>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      <Tooltip label={expanded ? 'Collapse' : 'Expand'} side="bottom">
        <button
          type="button"
          onClick={onToggleExpanded}
          className="btn-icon-bare"
          aria-label={expanded ? 'Collapse document' : 'Expand document'}
        >
          {expanded ? <Minimize2 className="icon-sm" /> : <Maximize2 className="icon-sm" />}
        </button>
      </Tooltip>
      <Tooltip label="Close" side="bottom">
        <button
          type="button"
          onClick={onClose}
          className="btn-icon-bare"
          aria-label="Close document"
        >
          <X className="icon-sm" />
        </button>
      </Tooltip>
    </div>
  )
}

function EntityExportAction({
  label,
  format,
  disabled,
  onExport,
  onClose,
}: {
  label: string
  format: DeliverableEntityExportFormat
  disabled: boolean
  onExport: (format: DeliverableEntityExportFormat) => Promise<void>
  onClose: () => void
}) {
  return (
    <button
      type="button"
      onClick={() => {
        void onExport(format)
        onClose()
      }}
      disabled={disabled}
      className={menuRowClass}
    >
      {format === 'ppt' ? (
        <Presentation className="icon-sm shrink-0" />
      ) : format === 'pdf' ? (
        <FileDown className="icon-sm shrink-0" />
      ) : (
        <FileText className="icon-sm shrink-0" />
      )}
      <span>{label}</span>
    </button>
  )
}
