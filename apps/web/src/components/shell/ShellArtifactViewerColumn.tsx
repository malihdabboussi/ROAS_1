'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ResizableDivider } from '@/components/layout/ResizableDivider'
import { cn } from '@/lib/utils/cn'
import { useShellStore } from './use-shell-store'

export function ShellArtifactViewerColumn({
  besideConversation,
  visible = true,
  children,
}: {
  besideConversation: boolean
  visible?: boolean
  children: ReactNode
}) {
  const width = useShellStore((state) => state.artifactViewer.width)
  const setArtifactViewerWidth = useShellStore((state) => state.setArtifactViewerWidth)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartX = useRef(0)
  const dragStartWidth = useRef(width)

  useEffect(() => {
    if (!isDragging) return
    const onMove = (event: PointerEvent) => {
      setArtifactViewerWidth(dragStartWidth.current + dragStartX.current - event.clientX)
    }
    const onUp = () => setIsDragging(false)
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }
  }, [isDragging, setArtifactViewerWidth])

  return (
    <div
      className={cn(
        'min-w-0',
        besideConversation ? 'flex shrink-0' : 'flex flex-1',
        !visible && 'hidden',
      )}
      style={visible && besideConversation ? { width: `${width}px` } : undefined}
      data-testid="shell-artifact-viewer-column"
    >
      {visible && besideConversation ? (
        <ResizableDivider
          onMouseDown={(event) => {
            event.preventDefault()
            dragStartX.current = event.clientX
            dragStartWidth.current = width
            setIsDragging(true)
          }}
          isDragging={isDragging}
          compact
          showGrip={false}
          ariaLabel="Resize artifact viewer"
        />
      ) : null}
      <div className="flex min-h-0 min-w-0 flex-1">{children}</div>
    </div>
  )
}
