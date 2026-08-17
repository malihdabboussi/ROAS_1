'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import { useShellStore } from './use-shell-store'

/** Chat column must be at least this wide before the summary sits as a third column. */
export const SUMMARY_PANEL_DOCK_MIN_WIDTH = 1024

export type SummaryPanelDockState = {
  docked: boolean
  /** False until the chat pane has been measured; start closed until then. */
  ready: boolean
}

/**
 * ChatGPT-style: dock the work summary as an in-flow column only when the chat
 * pane already has room for the thread plus the summary. Narrower panes keep
 * the summary as a header overlay and do not auto-open it.
 */
export function useSummaryPanelDocked(
  containerRef: RefObject<HTMLElement | null>,
): SummaryPanelDockState {
  const [docked, setDocked] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const node = containerRef.current
    if (!node) return

    const update = () => {
      setDocked(node.clientWidth >= SUMMARY_PANEL_DOCK_MIN_WIDTH)
      setReady(true)
    }
    update()

    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [containerRef])

  return { docked, ready }
}

/** Auto-open when docked; close when the pane is too narrow for a column. */
export function useSummaryPanelLayout(
  containerRef: RefObject<HTMLElement | null>,
  selectedConversationId: string | null,
): boolean {
  const setRightPanelOpen = useShellStore((s) => s.setRightPanelOpen)
  const setSummaryPanelDocked = useShellStore((s) => s.setSummaryPanelDocked)
  const autoOpenedConversationRef = useRef<string | null>(null)
  const { docked, ready } = useSummaryPanelDocked(containerRef)

  useEffect(() => {
    setSummaryPanelDocked(docked)
  }, [docked, setSummaryPanelDocked])

  useEffect(() => {
    if (!ready || docked) return
    autoOpenedConversationRef.current = null
    if (useShellStore.getState().rightPanel.open) setRightPanelOpen(false)
  }, [docked, ready, setRightPanelOpen])

  useEffect(() => {
    if (!ready || !docked || !selectedConversationId) return
    if (autoOpenedConversationRef.current === selectedConversationId) return
    autoOpenedConversationRef.current = selectedConversationId
    setRightPanelOpen(true)
  }, [docked, ready, selectedConversationId, setRightPanelOpen])

  return docked
}
