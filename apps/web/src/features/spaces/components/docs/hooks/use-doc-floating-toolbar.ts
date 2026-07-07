'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Editor } from '@tiptap/react'

export function useDocFloatingToolbar(
  editor: Editor | null,
  inline: boolean,
  initialItemId: string,
) {
  const [floatingToolbarPos, setFloatingToolbarPos] = useState<{
    top: number
    left: number
  } | null>(null)

  const syncFloatingToolbar = useCallback(() => {
    if (!editor || !inline) {
      setFloatingToolbarPos(null)
      return
    }
    if (editor.state.selection.empty) {
      setFloatingToolbarPos(null)
      return
    }
    if (typeof window === 'undefined') return
    const domSel = window.getSelection()
    if (!domSel || domSel.rangeCount === 0 || domSel.isCollapsed) {
      setFloatingToolbarPos(null)
      return
    }
    const range = domSel.getRangeAt(0)
    const ca = range.commonAncestorContainer
    const el = ca.nodeType === Node.ELEMENT_NODE ? (ca as Element) : ca.parentElement
    if (!el || !editor.view.dom.contains(el)) {
      setFloatingToolbarPos(null)
      return
    }
    const rect = range.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) {
      setFloatingToolbarPos(null)
      return
    }
    const toolbarW = 520
    const vw = window.innerWidth
    const pad = 16
    let x = rect.left
    if (x + toolbarW > vw - pad) x = Math.max(pad, vw - pad - toolbarW)
    setFloatingToolbarPos({
      top: rect.top - 8,
      left: x,
    })
  }, [editor, inline])

  useEffect(() => {
    setFloatingToolbarPos(null)
  }, [initialItemId])

  useEffect(() => {
    if (!editor || !inline) {
      setFloatingToolbarPos(null)
      return
    }
    const run = () => {
      requestAnimationFrame(syncFloatingToolbar)
    }
    editor.on('selectionUpdate', run)
    editor.on('transaction', run)
    window.addEventListener('resize', run)
    document.addEventListener('scroll', run, true)
    run()
    return () => {
      editor.off('selectionUpdate', run)
      editor.off('transaction', run)
      window.removeEventListener('resize', run)
      document.removeEventListener('scroll', run, true)
    }
  }, [editor, inline, syncFloatingToolbar])

  return { floatingToolbarPos, syncFloatingToolbar }
}
