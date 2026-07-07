'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CoverDropdown } from '../cover/CoverDropdown'

export function DocBodyImageInsertMenu({
  open,
  anchorRect,
  onClose,
  onUpload,
  onLibrary,
  onGenerate,
}: {
  open: boolean
  anchorRect: DOMRect | null
  onClose: () => void
  onUpload: () => void
  onLibrary: () => void
  onGenerate: () => void
}) {
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    if (!open || !anchorRect) {
      setPos(null)
      return
    }
    const menuW = 176
    const menuH = dropdownRef.current?.offsetHeight ?? 120
    const viewH = window.innerHeight
    const viewW = window.innerWidth

    let top = anchorRect.bottom + 4
    let left = anchorRect.left

    if (top + menuH > viewH - 12) {
      top = anchorRect.top - menuH - 4
    }
    if (left + menuW > viewW - 12) {
      left = viewW - menuW - 12
    }
    if (left < 12) left = 12

    setPos({ top, left })
  }, [open, anchorRect])

  useEffect(() => {
    if (!open) return
    const onOutside = (e: MouseEvent) => {
      const t = e.target as Node
      if (!dropdownRef.current?.contains(t)) onClose()
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [open, onClose])

  if (!open || !anchorRect || typeof document === 'undefined') return null

  return createPortal(
    <div
      data-doc-image-insert-dropdown=""
      className="pointer-events-auto fixed z-[100050]"
      style={pos ? { top: pos.top, left: pos.left } : { visibility: 'hidden' }}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <CoverDropdown
        ref={dropdownRef}
        className="relative left-0 top-0 mt-0"
        onUpload={onUpload}
        onLibrary={onLibrary}
        onGenerate={onGenerate}
      />
    </div>,
    document.body,
  )
}
