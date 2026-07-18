'use client'

import { Check, Copy, Download, Loader2, Palette } from 'lucide-react'

interface PresentationDownloadMenuProps {
  fileUrl: string | null
  exporting: 'pdf' | 'ppt' | null
  copied: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onCopyDownloadLink: (url: string) => Promise<void>
  onDownloadHtml: () => void
  onExport: (format: 'pdf' | 'ppt') => void
  openingCanva: boolean
  onOpenCanva: () => void
}

export function PresentationDownloadMenu({
  fileUrl,
  exporting,
  copied,
  open,
  onOpenChange,
  onCopyDownloadLink,
  onDownloadHtml,
  onExport,
  openingCanva,
  onOpenCanva,
}: PresentationDownloadMenuProps) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        disabled={exporting !== null || openingCanva}
        className="h-spacing-7 text-muted-foreground hover:bg-hover-subtle hover:text-foreground rounded-spacing-2 inline-flex aspect-square shrink-0 items-center justify-center transition-colors disabled:opacity-50"
        title="Download"
        aria-label="Download"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {exporting !== null || openingCanva ? (
          <Loader2 className="icon-sm shrink-0 animate-spin" />
        ) : (
          <Download className="icon-sm shrink-0" />
        )}
      </button>
      {open ? (
        <>
          <div
            className="z-dropdown fixed inset-0"
            onClick={() => onOpenChange(false)}
            aria-hidden
          />
          <div className="dropdown-menu-solid z-dropdown mt-spacing-1 py-spacing-1 absolute right-0 top-full min-w-40">
            {fileUrl ? (
              <button
                type="button"
                onClick={async () => {
                  onOpenChange(false)
                  await onCopyDownloadLink(fileUrl)
                }}
                className="body-3 text-foreground hover:bg-hover-subtle gap-spacing-2 px-spacing-3 py-spacing-2 flex w-full items-center text-left transition-colors"
              >
                {copied ? (
                  <Check className="icon-sm text-success shrink-0" />
                ) : (
                  <Copy className="icon-sm shrink-0" />
                )}
                <span>{copied ? 'Copied!' : 'Copy download link'}</span>
              </button>
            ) : null}
            <button
              type="button"
              onClick={onDownloadHtml}
              className="body-3 text-foreground hover:bg-hover-subtle gap-spacing-2 px-spacing-3 py-spacing-2 flex w-full items-center text-left transition-colors"
            >
              <Download className="icon-sm shrink-0" />
              <span>Download HTML</span>
            </button>
            <button
              type="button"
              onClick={onOpenCanva}
              disabled={openingCanva || exporting !== null}
              className="body-3 text-foreground hover:bg-hover-subtle gap-spacing-2 px-spacing-3 py-spacing-2 flex w-full items-center text-left transition-colors disabled:opacity-50"
            >
              <Palette className="icon-sm shrink-0" />
              <span>{openingCanva ? 'Opening Canva…' : 'Open in Canva'}</span>
            </button>
            <button
              type="button"
              onClick={() => onExport('pdf')}
              disabled={exporting !== null}
              className="body-3 text-foreground hover:bg-hover-subtle gap-spacing-2 px-spacing-3 py-spacing-2 flex w-full items-center text-left transition-colors disabled:opacity-50"
            >
              <Download className="icon-sm shrink-0" />
              <span>{exporting === 'pdf' ? 'Exporting PDF...' : 'Export as PDF'}</span>
            </button>
            <button
              type="button"
              onClick={() => onExport('ppt')}
              disabled={exporting !== null}
              className="body-3 text-foreground hover:bg-hover-subtle gap-spacing-2 px-spacing-3 py-spacing-2 flex w-full items-center text-left transition-colors disabled:opacity-50"
            >
              <Download className="icon-sm shrink-0" />
              <span>{exporting === 'ppt' ? 'Exporting PPT...' : 'Export as PPT'}</span>
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}
