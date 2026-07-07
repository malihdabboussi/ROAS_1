'use client'

import { useEffect, useRef, useState } from 'react'
import { FileText, FileUp, Plus } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { dispatchPresentationSourceImport } from '../../lib/presentation-import-events'

type PresentationCreateMenuProps = {
  disabled: boolean
  onBlank: () => void
  onUploadHtml: (file: File) => void
}

export function PresentationCreateMenu({
  disabled,
  onBlank,
  onUploadHtml,
}: PresentationCreateMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLSpanElement | null>(null)
  const htmlInputRef = useRef<HTMLInputElement | null>(null)
  const sourceInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const handleHtmlSelected = (file: File | undefined) => {
    if (!file) return
    setOpen(false)
    onUploadHtml(file)
    if (htmlInputRef.current) htmlInputRef.current.value = ''
  }

  const handleSourceSelected = (file: File | undefined) => {
    if (!file) return
    setOpen(false)
    dispatchPresentationSourceImport(file)
    if (sourceInputRef.current) sourceInputRef.current.value = ''
  }

  return (
    <span ref={rootRef} className="relative inline-flex">
      <Tooltip label={disabled ? 'Artifacts require a campaign' : 'New presentation'} side="bottom">
        <span className="inline-flex">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setOpen((value) => !value)}
            className="badge-glass badge-glass-green body-3 rounded-spacing-2 inline-flex shrink-0 items-center gap-1.5 px-3 py-2 font-semibold transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-40"
            aria-label="New presentation"
            aria-expanded={open}
            aria-haspopup="menu"
          >
            <Plus className="h-3.5 w-3.5 shrink-0" />
            Presentation
          </button>
        </span>
      </Tooltip>
      {open ? (
        <div
          className="dropdown-menu-solid z-dropdown mt-spacing-1 py-spacing-1 absolute right-0 top-full min-w-full overflow-hidden rounded-xl shadow-lg"
          role="menu"
        >
          <button
            type="button"
            className="gap-spacing-2 px-spacing-3 py-spacing-1-5 body-3 text-foreground hover:bg-hover-subtle flex w-full items-center whitespace-nowrap text-left"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onBlank()
            }}
          >
            <Plus className="h-3.5 w-3.5 shrink-0" />
            Blank presentation
          </button>
          <button
            type="button"
            className="gap-spacing-2 px-spacing-3 py-spacing-1-5 body-3 text-foreground hover:bg-hover-subtle flex w-full items-center whitespace-nowrap text-left"
            role="menuitem"
            onClick={() => htmlInputRef.current?.click()}
          >
            <FileText className="h-3.5 w-3.5 shrink-0" />
            Upload HTML
          </button>
          <button
            type="button"
            className="gap-spacing-2 px-spacing-3 py-spacing-1-5 body-3 text-foreground hover:bg-hover-subtle flex w-full items-center whitespace-nowrap text-left"
            role="menuitem"
            onClick={() => sourceInputRef.current?.click()}
          >
            <FileUp className="h-3.5 w-3.5 shrink-0" />
            Upload PPTX or PDF
          </button>
        </div>
      ) : null}
      <input
        ref={htmlInputRef}
        type="file"
        accept=".html,.htm,text/html"
        className="hidden"
        onChange={(event) => handleHtmlSelected(event.target.files?.[0])}
      />
      <input
        ref={sourceInputRef}
        type="file"
        accept=".pptx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
        className="hidden"
        onChange={(event) => handleSourceSelected(event.target.files?.[0])}
      />
    </span>
  )
}
