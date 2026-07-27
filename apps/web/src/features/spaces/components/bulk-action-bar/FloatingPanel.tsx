'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export function FloatingPanel({
  anchorRef,
  onClose,
  children,
  width = 240,
}: {
  anchorRef: React.RefObject<HTMLButtonElement | null>
  onClose: () => void
  children: React.ReactNode
  width?: number
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    if (!anchorRef.current) return
    const rect = anchorRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.top
    const placeAbove = spaceBelow < 320 && rect.top > 320
    const rawLeft = rect.left + rect.width / 2 - width / 2
    const maxLeft = window.innerWidth - width - 8
    setPos({
      top: placeAbove ? rect.top - 4 : rect.bottom + 4,
      left: Math.max(8, Math.min(rawLeft, maxLeft)),
    })
  }, [anchorRef, width])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (!panelRef.current?.contains(t) && !anchorRef.current?.contains(t)) onClose()
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose, anchorRef])

  if (!pos) return null
  return createPortal(
    <div
      ref={panelRef}
      className="dropdown-menu-solid fixed flex max-h-80 flex-col overflow-hidden"
      style={{
        top: pos.top,
        left: pos.left,
        width,
        zIndex: 100000,
        transform: pos.top < 100 ? undefined : 'translateY(-100%)',
      }}
    >
      {children}
    </div>,
    document.body,
  )
}
