'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, FileText, ImageIcon, Maximize2, Minimize2, X } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import type { ShellArtifactViewerTarget } from '@/lib/artifacts'
import { cn } from '@/lib/utils/cn'
import { ShellArtifactViewerBrowse } from './ShellArtifactViewerBrowse'
import { useShellStore } from './use-shell-store'

type BrowseView = 'artifact' | 'library' | 'files'

function isMediaTarget(target: ShellArtifactViewerTarget): boolean {
  return target.type === 'image' || target.type === 'video' || target.type === 'audio'
}

export function ShellArtifactViewerPanel({
  target,
  actions,
  bodyClassName,
  showOpenTargets = true,
  children,
}: {
  target: ShellArtifactViewerTarget
  actions?: ReactNode
  bodyClassName?: string
  showOpenTargets?: boolean
  children: ReactNode
}) {
  const close = useShellStore((s) => s.closeArtifactViewer)
  const [expanded, setExpanded] = useState(false)
  const [browse, setBrowse] = useState<BrowseView>('artifact')
  const [openMenu, setOpenMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const contextLabel = target.contextLabel || 'Artifacts'

  useEffect(() => {
    setBrowse('artifact')
  }, [target.id])

  useEffect(() => {
    if (!openMenu) return
    const onDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpenMenu(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [openMenu])

  const openTargets = showOpenTargets
    ? [
        target.internalUrl
          ? { id: 'source', label: 'Open in Space', href: target.internalUrl }
          : null,
        target.fileUrl ? { id: 'file', label: 'Open file', href: target.fileUrl } : null,
      ].filter((entry): entry is { id: string; label: string; href: string } => Boolean(entry))
    : []
  const Icon = isMediaTarget(target) ? ImageIcon : FileText

  return (
    <aside
      className={cn(
        'border-border bg-card flex h-full min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-hidden border-l',
        expanded && 'z-modal-content absolute inset-0 w-full border-l-0',
      )}
      aria-label="Artifact viewer"
      data-shell-artifact-viewer
    >
      <header className="border-border gap-spacing-2 px-spacing-3 py-spacing-2 flex min-h-12 shrink-0 items-center border-b">
        <Icon className="icon-sm text-primary shrink-0" />
        <nav
          className="body-4 min-w-0 flex-1 truncate whitespace-nowrap"
          aria-label="Artifact path"
        >
          <button
            type="button"
            onClick={() => setBrowse('library')}
            aria-current={browse === 'library' ? 'page' : undefined}
            className={cn(
              'hover:text-foreground',
              browse === 'library' ? 'text-foreground font-semibold' : 'text-muted-foreground',
            )}
          >
            {contextLabel}
          </button>
          <span className="text-muted-foreground"> / </span>
          <button
            type="button"
            onClick={() => setBrowse('files')}
            aria-current={browse === 'files' ? 'page' : undefined}
            className={cn(
              'hover:text-foreground',
              browse === 'files' ? 'text-foreground font-semibold' : 'text-muted-foreground',
            )}
          >
            files
          </button>
          <span className="text-muted-foreground"> / </span>
          {browse === 'artifact' ? (
            <span className="text-foreground font-semibold">{target.title}</span>
          ) : (
            <button
              type="button"
              onClick={() => setBrowse('artifact')}
              className="text-muted-foreground hover:text-foreground"
            >
              {target.title}
            </button>
          )}
        </nav>
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
        <div
          className="gap-spacing-1 flex shrink-0 items-center"
          data-testid="artifact-viewer-controls"
        >
          {expanded ? (
            <Tooltip label="Collapse" side="bottom">
              <button
                type="button"
                onClick={() => setExpanded(false)}
                aria-label="Collapse artifact viewer"
                className="btn-icon-bare shrink-0"
              >
                <Minimize2 className="icon-sm" />
              </button>
            </Tooltip>
          ) : (
            <Tooltip label="Expand" side="bottom">
              <button
                type="button"
                onClick={() => setExpanded(true)}
                aria-label="Expand artifact viewer"
                className="btn-icon-bare shrink-0"
              >
                <Maximize2 className="icon-sm" />
              </button>
            </Tooltip>
          )}
          <button
            type="button"
            onClick={close}
            aria-label="Close artifact viewer"
            className="btn-icon-glass text-muted-foreground hover:text-foreground h-7 w-7 shrink-0"
          >
            <X className="icon-sm" />
          </button>
        </div>
      </header>
      <div
        className={cn(
          'bg-background min-h-0 flex-1',
          browse === 'artifact' ? (bodyClassName ?? 'overflow-y-auto') : 'overflow-hidden',
        )}
      >
        {browse === 'artifact' ? (
          children
        ) : (
          <ShellArtifactViewerBrowse view={browse} target={target} />
        )}
      </div>
    </aside>
  )
}
