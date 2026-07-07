'use client'

import { createPortal } from 'react-dom'
import type { Editor } from '@tiptap/react'
import { RichTextToolbar } from '@/components/ui/forms/rich-text-toolbar'

export function DocEditorFloatingToolbarPortal({
  editor,
  floatingToolbarPos,
}: {
  editor: Editor
  floatingToolbarPos: { top: number; left: number } | null
}) {
  if (!floatingToolbarPos || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="dropdown-glass pointer-events-auto"
      style={{
        position: 'fixed',
        zIndex: 100045,
        top: floatingToolbarPos.top,
        left: floatingToolbarPos.left,
        transform: 'translate(0, -100%)',
        width: 'max-content',
        maxWidth: 'calc(100vw - 2rem)',
        overflow: 'visible',
      }}
      onMouseDown={(e) => e.preventDefault()}
      role="toolbar"
      aria-label="Text formatting"
    >
      <RichTextToolbar
        editor={editor}
        docTextStyleMenu
        showTextStyles
        showFormatting
        showLists
        showAlignment
        showLink
        showImage
        includeCodeBlock
        showTextColor
        showDocSurfaces
        showQuoteCodeBlocks
        className="border-0 bg-transparent shadow-none"
        toolbarLayout="nowrap"
      />
    </div>,
    document.body,
  )
}
