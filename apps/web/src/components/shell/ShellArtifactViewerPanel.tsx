'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, FileText, ImageIcon, Maximize2, Minimize2, X } from 'lucide-react'
import { ResizableDivider } from '@/components/layout/ResizableDivider'
import { Tooltip } from '@/components/ui/tooltip'
import type { ShellArtifactViewerTarget } from '@/lib/artifacts'
import { cn } from '@/lib/utils/cn'
import { useShellStore } from './use-shell-store'

function isMediaTarget(target: ShellArtifactViewerTarget): boolean {
  return target.type === 'image' || target.type === 'video' || target.type === 'audio'
}

export function ShellArtifactViewerPanel({
  target,
  actions,
  bodyClassName,
  children,
}: {
  target: ShellArtifactViewerTarget
  actions?: ReactNode
  bodyClassName?: string
  children: ReactNode
}) {
  const width = useShellStore((s) => s.artifactViewer.width)
  const setWidth = useShellStore((s) => s.setArtifactViewerWidth)
  const close = useShellStore((s) => s.closeArtifactViewer)
  const [dragging, setDragging] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [openMenu, setOpenMenu] = useState(false)
  const dragStartX = useRef(0)
  const dragStartWidth = useRef(width)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const handleResizeStart = useCallback(
    (event: React.MouseEvent) => {
      dragStartX.current = event.clientX
      dragStartWidth.current = width
      setDragging(true)
    },
    [width],
  )

  useEffect(() => {
    if (!dragging) return
    const onMove = (event: PointerEvent) => {
      setWidth(dragStartWidth.current + dragStartX.current - event.clientX)
    }
    const onUp = () => setDragging(false)
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }
  }, [dragging, setWidth])

  useEffect(() => {
    if (!openMenu) return
    const onDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpenMenu(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [openMenu])

  const openTargets = [
    target.internalUrl ? { id: 'source', label: 'Open in Space', href: target.internalUrl } : null,
    target.fileUrl ? { id: 'file', label: 'Open file', href: target.fileUrl } : null,
  ].filter((entry): entry is { id: string; label: string; href: string } => Boolean(entry))
  const Icon = isMediaTarget(target) ? ImageIcon : FileText

  return (
    <>
      {!expanded ? (
        <ResizableDivider
          onMouseDown={handleResizeStart}
          isDragging={dragging}
          compact
          showGrip={false}
        />
      ) : null}
      <aside
        className={cn(
          'border-border bg-card flex h-full min-h-0 max-w-full shrink-0 flex-col overflow-hidden border-l',
          expanded && 'z-modal-content fixed inset-0 w-full border-l-0',
          !expanded && !dragging && 'transition-[width] duration-200 ease-out',
        )}
        style={expanded ? undefined : { width }}
        aria-label="Artifact viewer"
        data-shell-artifact-viewer
      >
        <header className="border-border gap-spacing-2 px-spacing-3 py-spacing-2 flex min-h-12 shrink-0 items-center border-b">
          <Icon className="icon-sm text-primary shrink-0" />
          <div className="body-4 min-w-0 flex-1 truncate">
            {target.contextUrl ? (
              <Link
                href={target.contextUrl}
                onClick={close}
                className="text-muted-foreground hover:text-foreground"
              >
                {target.contextLabel || 'Artifacts'}
              </Link>
            ) : (
              <span className="text-muted-foreground">{target.contextLabel || 'Artifacts'}</span>
            )}
            <span className="text-muted-foreground"> / files / </span>
            <span className="text-foreground font-semibold">{target.title}</span>
          </div>
          {actions}
          {openTargets.length === 1 ? (
            <a
              href={openTargets[0]!.href}
              target="_blank"
              rel="noopener noreferrer"
              className="body-4 text-foreground hover:bg-hover-subtle border-border rounded-spacing-2 px-spacing-2 flex h-7 shrink-0 items-center border"
            >
              {openTargets[0]!.label}
            </a>
          ) : openTargets.length > 1 ? (
            <div ref={menuRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setOpenMenu((open) => !open)}
                className="body-4 text-foreground hover:bg-hover-subtle border-border gap-spacing-1 rounded-spacing-2 px-spacing-2 flex h-7 items-center border"
              >
                Open
                <ChevronDown className="h-3 w-3" />
              </button>
              {openMenu ? (
                <div className="dropdown-menu-solid p-spacing-2 gap-spacing-1 z-dropdown absolute right-0 top-8 flex min-w-44 flex-col">
                  {openTargets.map((entry) => (
                    <a
                      key={entry.id}
                      href={entry.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setOpenMenu(false)}
                      className="hub-dock-flyout-row"
                    >
                      {entry.label}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          <Tooltip label={expanded ? 'Collapse' : 'Expand'} side="bottom">
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              aria-label={expanded ? 'Collapse artifact viewer' : 'Expand artifact viewer'}
              className="btn-icon-bare"
            >
              {expanded ? <Minimize2 className="icon-sm" /> : <Maximize2 className="icon-sm" />}
            </button>
          </Tooltip>
          <button
            type="button"
            onClick={close}
            aria-label="Close artifact viewer"
            className="btn-icon-glass text-muted-foreground hover:text-foreground h-7 w-7"
          >
            <X className="icon-sm" />
          </button>
        </header>
        <div className={cn('bg-background min-h-0 flex-1 overflow-y-auto', bodyClassName)}>
          {children}
        </div>
      </aside>
    </>
  )
}
