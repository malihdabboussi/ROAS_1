'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { dropPoint } from '@tiptap/pm/transform'
import type { Editor } from '@tiptap/react'

const DROP_HAIRLINE =
  'linear-gradient(90deg, transparent 0%, rgb(59 130 246) 8%, rgb(59 130 246) 92%, transparent 100%)'

export function DocEditorDropIndicator({ editor }: { editor: Editor | null }) {
  const [line, setLine] = useState<{ top: number; left: number; width: number } | null>(null)

  useEffect(() => {
    if (!editor) return
    const view = editor.view
    const dom = view.dom

    function clearLine() {
      setLine(null)
    }

    function onDragOver(event: DragEvent) {
      if (!view.dragging?.slice) {
        clearLine()
        return
      }

      const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })
      if (!pos) {
        clearLine()
        return
      }

      let target = pos.pos
      const mapped = dropPoint(view.state.doc, target, view.dragging.slice)
      if (mapped != null) target = mapped

      const $pos = view.state.doc.resolve(target)
      if ($pos.parent.inlineContent) {
        clearLine()
        return
      }

      const before = $pos.nodeBefore
      const after = $pos.nodeAfter
      let top = 0
      let left = 0
      let width = 0

      if (before || after) {
        const nodePos = target - (before ? before.nodeSize : 0)
        const nodeDom = view.nodeDOM(nodePos)
        if (!(nodeDom instanceof HTMLElement)) {
          clearLine()
          return
        }
        const nodeRect = nodeDom.getBoundingClientRect()
        top = before ? nodeRect.bottom : nodeRect.top
        if (before && after) {
          const afterDom = view.nodeDOM(target)
          if (afterDom instanceof HTMLElement) {
            top = (top + afterDom.getBoundingClientRect().top) / 2
          }
        }
        left = nodeRect.left
        width = nodeRect.width
      } else {
        const coords = view.coordsAtPos(target)
        const editorRect = dom.getBoundingClientRect()
        top = coords.top
        left = editorRect.left
        width = editorRect.width
      }

      setLine({ top, left, width })
    }

    dom.addEventListener('dragover', onDragOver)
    dom.addEventListener('dragleave', clearLine)
    dom.addEventListener('drop', clearLine)
    dom.addEventListener('dragend', clearLine)

    return () => {
      dom.removeEventListener('dragover', onDragOver)
      dom.removeEventListener('dragleave', clearLine)
      dom.removeEventListener('drop', clearLine)
      dom.removeEventListener('dragend', clearLine)
    }
  }, [editor])

  if (!line || typeof document === 'undefined') return null

  return createPortal(
    <div
      data-doc-drop-indicator=""
      className="pointer-events-none fixed z-[100050] h-[2px]"
      style={{
        top: line.top,
        left: line.left,
        width: line.width,
        background: DROP_HAIRLINE,
        transform: 'translateY(-1px)',
      }}
      aria-hidden
    />,
    document.body,
  )
}
