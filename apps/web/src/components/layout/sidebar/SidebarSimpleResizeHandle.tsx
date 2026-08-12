'use client'

import { useEffect, useRef, useState } from 'react'
import { ResizableDivider } from '@/components/layout/ResizableDivider'
import { useShellMenuDock } from '@/components/shell/use-shell-menu-dock'

export function SidebarSimpleResizeHandle() {
  const width = useShellMenuDock((state) => state.simpleMenuWidth)
  const setWidth = useShellMenuDock((state) => state.setSimpleMenuWidth)
  const [dragging, setDragging] = useState(false)
  const startX = useRef(0)
  const startWidth = useRef(width)

  useEffect(() => {
    if (!dragging) return
    const onMove = (event: PointerEvent) => setWidth(startWidth.current + event.clientX - startX.current)
    const onUp = () => setDragging(false)
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }
  }, [dragging, setWidth])

  return (
    <div className="absolute inset-y-0 right-0 translate-x-1/2">
      <ResizableDivider
        compact
        showGrip={false}
        isDragging={dragging}
        ariaLabel="Resize menu"
        onMouseDown={(event) => {
          startX.current = event.clientX
          startWidth.current = width
          setDragging(true)
        }}
      />
    </div>
  )
}
