'use client'

import {
  useLayoutEffect,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react'
import { createPortal } from 'react-dom'
import {
  Check,
  ClipboardCopy,
  Download,
  FileDown,
  FileText,
  Loader2,
  Presentation as PresentationIcon,
} from 'lucide-react'
import type { DeliverableEntityExportFormat } from '@/components/deliverables/deliverable-preview-modal.types'

/** Portaled export menu in the modal footer so cards do not clip the dropdown. */
export function DeliverablePreviewExportFooter({
  anchorRef,
  exportOpen,
  setExportOpen,
  mode,
  copied,
  exporting,
  handleCopy,
  handleExportMd,
  handleExportPdf,
  handleEntityExport,
  isMobileLayout,
  entityType,
}: {
  anchorRef: RefObject<HTMLButtonElement | null>
  exportOpen: boolean
  setExportOpen: Dispatch<SetStateAction<boolean>>
  mode: 'text' | 'entity'
  copied: boolean
  exporting: boolean
  handleCopy: () => Promise<void>
  handleExportMd: () => void
  handleExportPdf: () => Promise<void>
  handleEntityExport: (format: DeliverableEntityExportFormat) => Promise<void>
  isMobileLayout: boolean
  entityType?: string
}) {
  const [pos, setPos] = useState({ top: 0, left: 0, right: 0 })
  const isPresentationEntity = mode === 'entity' && entityType === 'presentation'

  useLayoutEffect(() => {
    if (!exportOpen || !anchorRef.current) return
    const rect = anchorRef.current.getBoundingClientRect()
    setPos({
      top: rect.bottom + 6,
      left: rect.left,
      right: Math.max(8, window.innerWidth - rect.right),
    })
  }, [exportOpen, anchorRef])

  const menuPortal =
    exportOpen &&
    typeof document !== 'undefined' &&
    createPortal(
      <div
        className="dropdown-menu-solid p-spacing-2 z-dropdown fixed w-max min-w-[12rem]"
        style={
          isMobileLayout ? { top: pos.top, right: pos.right } : { top: pos.top, left: pos.left }
        }
        data-dropdown="export-deliverable"
      >
        {mode === 'text' ? (
          <div className="space-y-spacing-1">
            <button
              type="button"
              onClick={() => {
                void handleCopy()
                setExportOpen(false)
              }}
              className="gap-spacing-2 px-spacing-2 py-spacing-2 rounded-spacing-1 hover:bg-hover-subtle body-3 text-muted-foreground hover:text-foreground flex w-full items-center whitespace-nowrap text-left"
            >
              {copied ? (
                <Check className="icon-sm text-primary shrink-0" />
              ) : (
                <ClipboardCopy className="icon-sm shrink-0" />
              )}
              <span>{copied ? 'Copied!' : 'Copy text'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                handleExportMd()
                setExportOpen(false)
              }}
              className="gap-spacing-2 px-spacing-2 py-spacing-2 rounded-spacing-1 hover:bg-hover-subtle body-3 text-muted-foreground hover:text-foreground flex w-full items-center whitespace-nowrap text-left"
            >
              <FileText className="icon-sm shrink-0" />
              <span>Export as Markdown</span>
            </button>
            <button
              type="button"
              onClick={() => {
                void handleExportPdf()
                setExportOpen(false)
              }}
              disabled={exporting}
              className="gap-spacing-2 px-spacing-2 py-spacing-2 rounded-spacing-1 hover:bg-hover-subtle body-3 text-muted-foreground hover:text-foreground flex w-full items-center whitespace-nowrap text-left disabled:opacity-50"
            >
              <FileDown className={`icon-sm shrink-0 ${exporting ? 'animate-pulse' : ''}`} />
              <span>Export as PDF</span>
            </button>
          </div>
        ) : isPresentationEntity ? (
          <div className="space-y-spacing-1">
            <button
              type="button"
              onClick={() => {
                void handleEntityExport('html')
                setExportOpen(false)
              }}
              disabled={exporting}
              className="gap-spacing-2 px-spacing-2 py-spacing-2 rounded-spacing-1 hover:bg-hover-subtle body-3 text-muted-foreground hover:text-foreground flex w-full items-center whitespace-nowrap text-left disabled:opacity-50"
            >
              <Download className="icon-sm shrink-0" />
              <span>Download HTML</span>
            </button>
            <button
              type="button"
              onClick={() => {
                void handleEntityExport('pdf')
                setExportOpen(false)
              }}
              disabled={exporting}
              className="gap-spacing-2 px-spacing-2 py-spacing-2 rounded-spacing-1 hover:bg-hover-subtle body-3 text-muted-foreground hover:text-foreground flex w-full items-center whitespace-nowrap text-left disabled:opacity-50"
            >
              <FileDown className={`icon-sm shrink-0 ${exporting ? 'animate-pulse' : ''}`} />
              <span>{exporting ? 'Exporting PDF...' : 'Export as PDF'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                void handleEntityExport('ppt')
                setExportOpen(false)
              }}
              disabled={exporting}
              className="gap-spacing-2 px-spacing-2 py-spacing-2 rounded-spacing-1 hover:bg-hover-subtle body-3 text-muted-foreground hover:text-foreground flex w-full items-center whitespace-nowrap text-left disabled:opacity-50"
            >
              <PresentationIcon
                className={`icon-sm shrink-0 ${exporting ? 'animate-pulse' : ''}`}
              />
              <span>{exporting ? 'Exporting PPT...' : 'Export as PPT'}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-spacing-1">
            <button
              type="button"
              onClick={() => {
                void handleEntityExport('pdf')
                setExportOpen(false)
              }}
              disabled={exporting}
              className="gap-spacing-2 px-spacing-2 py-spacing-2 rounded-spacing-1 hover:bg-hover-subtle body-3 text-muted-foreground hover:text-foreground flex w-full items-center whitespace-nowrap text-left disabled:opacity-50"
            >
              <FileDown className={`icon-sm shrink-0 ${exporting ? 'animate-pulse' : ''}`} />
              <span>{exporting ? 'Exporting...' : 'Export as PDF'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                void handleEntityExport('md')
                setExportOpen(false)
              }}
              className="gap-spacing-2 px-spacing-2 py-spacing-2 rounded-spacing-1 hover:bg-hover-subtle body-3 text-muted-foreground hover:text-foreground flex w-full items-center whitespace-nowrap text-left"
            >
              <FileText className="icon-sm shrink-0" />
              <span>Export as Markdown</span>
            </button>
            <button
              type="button"
              onClick={() => {
                void handleEntityExport('json')
                setExportOpen(false)
              }}
              className="gap-spacing-2 px-spacing-2 py-spacing-2 rounded-spacing-1 hover:bg-hover-subtle body-3 text-muted-foreground hover:text-foreground flex w-full items-center whitespace-nowrap text-left"
            >
              <Download className="icon-sm shrink-0" />
              <span>Export as JSON</span>
            </button>
          </div>
        )}
      </div>,
      document.body,
    )

  return (
    <div
      className="pb-spacing-3 pr-spacing-5 pt-spacing-5 group/deliverable-export pointer-events-none absolute inset-x-0 bottom-0 z-30 flex h-14 items-end justify-end bg-gradient-to-t from-[var(--color-card)] to-transparent"
      data-deliverable-export-footer
    >
      <button
        ref={anchorRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setExportOpen((o) => !o)
        }}
        className="btn-icon-bare bg-background/95 border-border hover:bg-hover-subtle pointer-events-auto rounded-lg border opacity-100 shadow-sm transition-colors"
        aria-label="Export options"
        aria-expanded={exportOpen}
        aria-haspopup="menu"
      >
        {exporting && mode === 'entity' ? (
          <Loader2 className="icon-sm animate-spin" />
        ) : (
          <FileDown className="icon-sm" />
        )}
      </button>
      {menuPortal}
    </div>
  )
}
