'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Download, FileCode, FileText } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import {
  canExportSpaceDoc,
  exportSpaceDocDocx,
  exportSpaceDocHtml,
  exportSpaceDocMarkdown,
  exportSpaceDocPdf,
  exportSpaceDocVisualHtml,
  exportSpaceDocVisualPdf,
} from '../../doc-menu/export-space-doc'

export function DocEditorExportDropdown({
  title,
  getDocBody,
  visualHtml,
  campaignId,
  customData,
  className,
  buttonClassName,
  menuPlacement = 'below',
  showLabel = false,
}: {
  title: string
  getDocBody: () => string
  visualHtml?: string | null
  campaignId?: string | null
  customData?: Record<string, unknown> | null
  className?: string
  buttonClassName?: string
  /** Rail: menu opens left of trigger; header chrome opens below (portaled); legacy above opens upward. */
  menuPlacement?: 'below' | 'left' | 'above'
  /** Tree/header chrome: icon + "Export" label like Settings / Share. */
  showLabel?: boolean
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [belowMenuPos, setBelowMenuPos] = useState<{ top: number; left: number } | null>(null)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [exportingDocx, setExportingDocx] = useState(false)
  const [exportingVisualPdf, setExportingVisualPdf] = useState(false)

  const availability = useMemo(
    () =>
      canExportSpaceDoc({
        customData,
        docBody: getDocBody(),
        visualHtml,
      }),
    [customData, getDocBody, visualHtml],
  )

  const syncBelowMenuPos = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setBelowMenuPos({ top: rect.bottom + 4, left: rect.right })
  }, [])

  useLayoutEffect(() => {
    if (!open || menuPlacement !== 'below') {
      setBelowMenuPos(null)
      return
    }
    syncBelowMenuPos()
    window.addEventListener('scroll', syncBelowMenuPos, true)
    window.addEventListener('resize', syncBelowMenuPos)
    return () => {
      window.removeEventListener('scroll', syncBelowMenuPos, true)
      window.removeEventListener('resize', syncBelowMenuPos)
    }
  }, [open, menuPlacement, syncBelowMenuPos])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target
      if (!(target instanceof Node)) return
      if (rootRef.current?.contains(target)) return
      if (target instanceof Element && target.closest('[data-doc-export-menu-panel]')) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  const resolvedTitle = title.trim() || 'Untitled'

  const exportPdf = useCallback(async () => {
    if (!availability.canExportDocBody || exportingPdf) return
    setExportingPdf(true)
    try {
      await exportSpaceDocPdf({
        title: resolvedTitle,
        docBody: getDocBody(),
        campaignId: campaignId ?? null,
      })
    } finally {
      setExportingPdf(false)
      setOpen(false)
    }
  }, [availability.canExportDocBody, campaignId, exportingPdf, getDocBody, resolvedTitle])

  const exportDocx = useCallback(async () => {
    if (!availability.canExportDocBody || exportingDocx) return
    setExportingDocx(true)
    try {
      await exportSpaceDocDocx(resolvedTitle, getDocBody())
    } finally {
      setExportingDocx(false)
      setOpen(false)
    }
  }, [availability.canExportDocBody, exportingDocx, getDocBody, resolvedTitle])

  const exportVisualPdf = useCallback(async () => {
    if (!availability.hasVisualHtml || !visualHtml || exportingVisualPdf) return
    setExportingVisualPdf(true)
    try {
      await exportSpaceDocVisualPdf({
        title: resolvedTitle,
        visualHtml,
      })
    } finally {
      setExportingVisualPdf(false)
      setOpen(false)
    }
  }, [availability.hasVisualHtml, exportingVisualPdf, resolvedTitle, visualHtml])

  if (!availability.canExport) return null

  const rowCls =
    'flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] disabled:opacity-50'

  const menuPanelClassName = cn(
    'dropdown-menu-solid min-w-[9rem] overflow-hidden rounded-xl py-1 shadow-xl',
    menuPlacement === 'left'
      ? 'absolute right-full top-0 z-dropdown mr-1'
      : menuPlacement === 'above'
        ? 'absolute bottom-full right-0 z-dropdown mb-1'
        : belowMenuPos
          ? 'fixed z-dropdown -translate-x-full'
          : 'absolute right-0 top-full z-dropdown mt-1',
  )

  const menuPanelStyle =
    menuPlacement === 'below' && belowMenuPos
      ? { top: belowMenuPos.top, left: belowMenuPos.left }
      : undefined

  const menuPanel = open ? (
    <div
      data-doc-export-menu-panel
      className={menuPanelClassName}
      style={menuPanelStyle}
      role="menu"
    >
      {availability.canExportDocBody ? (
        <>
          <button
            type="button"
            onClick={() => void exportPdf()}
            disabled={exportingPdf}
            className={rowCls}
          >
            <FileText className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
            <span>{exportingPdf ? 'Exporting…' : 'PDF'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              exportSpaceDocMarkdown(resolvedTitle, getDocBody())
              setOpen(false)
            }}
            className={rowCls}
          >
            <FileCode className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
            <span>Markdown</span>
          </button>
          <button
            type="button"
            onClick={() => {
              exportSpaceDocHtml(resolvedTitle, getDocBody())
              setOpen(false)
            }}
            className={rowCls}
          >
            <FileText className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
            <span>HTML</span>
          </button>
          <button
            type="button"
            onClick={() => void exportDocx()}
            disabled={exportingDocx}
            className={rowCls}
          >
            <FileText className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
            <span>{exportingDocx ? 'Exporting…' : 'DOCX'}</span>
          </button>
        </>
      ) : null}
      {availability.hasVisualHtml && visualHtml ? (
        <>
          <button
            type="button"
            onClick={() => void exportVisualPdf()}
            disabled={exportingVisualPdf}
            className={rowCls}
          >
            <FileText className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
            <span>{exportingVisualPdf ? 'Exporting…' : 'Visual PDF'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              exportSpaceDocVisualHtml(resolvedTitle, visualHtml)
              setOpen(false)
            }}
            className={rowCls}
          >
            <FileCode className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
            <span>Visual HTML</span>
          </button>
        </>
      ) : null}
    </div>
  ) : null

  const portaledMenu =
    menuPlacement === 'below' &&
    menuPanel &&
    belowMenuPos &&
    typeof document !== 'undefined'
      ? createPortal(menuPanel, document.body)
      : menuPanel

  return (
    <div ref={rootRef} data-doc-export-menu className={cn('relative z-[280] shrink-0', className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          showLabel
            ? 'flex items-center gap-1 text-[11px] text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--foreground)]'
            : 'rounded-md p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]',
          buttonClassName,
        )}
        aria-label="Export document"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Download className={cn('shrink-0', showLabel ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
        {showLabel ? <span>Export</span> : null}
      </button>
      {menuPlacement === 'below' ? portaledMenu : menuPanel}
    </div>
  )
}
