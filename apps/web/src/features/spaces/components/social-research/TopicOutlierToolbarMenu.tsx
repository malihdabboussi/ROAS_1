'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useResearchTopicToolbarBridgeStore } from '../../store/use-research-topic-toolbar-bridge'
import { VIBEY_SPACE_FLOATING_CONTROL } from '@/lib/ui/floating-control-attrs'
import { TopicOutlierFilterPanel } from './TopicOutlierFilterPanel'

export function TopicOutlierToolbarMenu({
  open,
  onClose,
  anchorRef,
}: {
  open: boolean
  onClose: () => void
  anchorRef: React.RefObject<HTMLElement | null>
}) {
  const bridge = useResearchTopicToolbarBridgeStore((s) => s.bridge)
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return
    const rect = anchorRef.current.getBoundingClientRect()
    const menuW = 280
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
    let left = rect.right - menuW
    if (left < 8) left = 8
    if (left + menuW > vw - 8) left = Math.max(8, vw - menuW - 8)
    setPos({ top: rect.bottom + 6, left })
  }, [open, anchorRef])

  useEffect(() => {
    if (!open) return
    const reposition = () => {
      if (!anchorRef.current) return
      const rect = anchorRef.current.getBoundingClientRect()
      const menuW = 280
      const vw = window.innerWidth
      let left = rect.right - menuW
      if (left < 8) left = 8
      if (left + menuW > vw - 8) left = Math.max(8, vw - menuW - 8)
      setPos({ top: rect.bottom + 6, left })
    }
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [open, anchorRef])

  useEffect(() => {
    if (!open) return
    const handleOutside = (e: MouseEvent) => {
      const t = e.target as Node
      if (!menuRef.current?.contains(t) && !anchorRef.current?.contains(t)) onClose()
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleOutside, true)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleOutside, true)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open, onClose, anchorRef])

  if (!open || !pos || typeof document === 'undefined' || !bridge?.hasResults) return null

  return createPortal(
    <div
      ref={menuRef}
      {...{ [VIBEY_SPACE_FLOATING_CONTROL]: '' }}
      className="dropdown-menu-solid p-spacing-3 fixed z-[99999] w-[17.5rem] rounded-xl shadow-lg"
      style={{ top: pos.top, left: pos.left }}
    >
      <p className="body-4 text-muted-foreground pb-spacing-2 font-medium">Minimum outlier</p>
      <TopicOutlierFilterPanel value={bridge.minOutlier} onChange={bridge.setMinOutlier} />
    </div>,
    document.body,
  )
}
