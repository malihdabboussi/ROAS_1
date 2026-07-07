'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Editor } from '@tiptap/react'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface TableRect {
  el: HTMLTableElement
  rect: DOMRect
}

function placeCursorInTable(editor: Editor, tableEl: HTMLTableElement): boolean {
  const cells = tableEl.querySelectorAll('th, td')
  const lastCell = cells[cells.length - 1] as HTMLElement | undefined
  if (!lastCell) return false
  try {
    const pos = editor.view.posAtDOM(lastCell, 0)
    if (pos < 0) return false
    editor
      .chain()
      .focus()
      .setTextSelection(pos + 1)
      .run()
    return true
  } catch {
    return false
  }
}

export function DocTableControls({ editor }: { editor: Editor | null }) {
  const [tables, setTables] = useState<TableRect[]>([])
  const [hoveredTable, setHoveredTable] = useState<HTMLTableElement | null>(null)

  useEffect(() => {
    if (!editor) return
    const dom = editor.view.dom as HTMLElement
    if (!dom) return

    function onTableMouseOver(e: MouseEvent) {
      const table = (e.target as Element).closest('table')
      if (table && dom.contains(table)) {
        setHoveredTable(table as HTMLTableElement)
      }
    }

    function onTableMouseOut(e: MouseEvent) {
      const from = e.target as Element
      const related = e.relatedTarget as Element | null
      const table = from.closest('table')
      if (!table || !dom.contains(table)) return
      if (related && (table.contains(related) || related.closest('[data-doc-table-controls]'))) {
        return
      }
      setHoveredTable((prev) => (prev === table ? null : prev))
    }

    dom.addEventListener('mouseover', onTableMouseOver)
    dom.addEventListener('mouseout', onTableMouseOut)

    function measure() {
      const nodes = Array.from(dom.querySelectorAll('table')) as HTMLTableElement[]
      const next: TableRect[] = nodes
        .map((el) => ({ el, rect: el.getBoundingClientRect() }))
        .filter(({ rect }) => rect.width > 0 && rect.height > 0)
      setTables(next)
    }

    let raf = 0
    function schedule() {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(measure)
    }

    measure()
    editor.on('transaction', schedule)
    editor.on('selectionUpdate', schedule)
    window.addEventListener('resize', schedule)
    document.addEventListener('scroll', schedule, true)

    const observer = new MutationObserver(schedule)
    observer.observe(dom, { childList: true, subtree: true, attributes: true })

    return () => {
      cancelAnimationFrame(raf)
      editor.off('transaction', schedule)
      editor.off('selectionUpdate', schedule)
      window.removeEventListener('resize', schedule)
      document.removeEventListener('scroll', schedule, true)
      dom.removeEventListener('mouseover', onTableMouseOver)
      dom.removeEventListener('mouseout', onTableMouseOut)
      observer.disconnect()
    }
  }, [editor])

  if (!editor || !editor.isEditable || typeof document === 'undefined' || tables.length === 0) {
    return null
  }

  const addColumn = (tableEl: HTMLTableElement) => {
    if (!placeCursorInTable(editor, tableEl)) return
    editor.chain().focus().addColumnAfter().run()
  }

  const addRow = (tableEl: HTMLTableElement) => {
    if (!placeCursorInTable(editor, tableEl)) return
    editor.chain().focus().addRowAfter().run()
  }

  const btnClass =
    'flex items-center justify-center rounded-md border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] shadow-sm transition-[opacity,background-color] duration-200 ease-out hover:bg-[var(--secondary)]'
  const btnVisibility = (el: HTMLTableElement) =>
    hoveredTable === el ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
  const buttonZIndex = 100045

  function leaveControls(tableEl: HTMLTableElement, related: EventTarget | null) {
    const relatedEl = related as Element | null
    if (relatedEl && (tableEl.contains(relatedEl) || relatedEl.closest('table') === tableEl)) {
      return
    }
    setHoveredTable((prev) => (prev === tableEl ? null : prev))
  }

  return createPortal(
    <div data-doc-table-controls="">
      {tables.map(({ el, rect }, idx) => (
        <div
          key={idx}
          onMouseEnter={() => setHoveredTable(el)}
          onMouseLeave={(e) => leaveControls(el, e.relatedTarget)}
        >
          <button
            type="button"
            aria-label="Add column"
            title="Add column"
            onPointerDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              addColumn(el)
            }}
            className={cn(btnClass, btnVisibility(el))}
            style={{
              position: 'fixed',
              top: rect.top + rect.height / 2 - 10,
              left: rect.right + 4,
              width: 20,
              height: 20,
              zIndex: buttonZIndex,
            }}
          >
            <Plus className="h-3 w-3" />
          </button>
          <button
            type="button"
            aria-label="Add row"
            title="Add row"
            onPointerDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              addRow(el)
            }}
            className={cn(btnClass, btnVisibility(el))}
            style={{
              position: 'fixed',
              top: rect.bottom + 4,
              left: rect.left + rect.width / 2 - 10,
              width: 20,
              height: 20,
              zIndex: buttonZIndex,
            }}
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>,
    document.body,
  )
}
