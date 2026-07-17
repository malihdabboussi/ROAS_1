'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { ShellOpenInTarget } from './shell-open-in.types'

export type { ShellOpenInTarget } from './shell-open-in.types'

type ShellOpenInMenuProps = {
  targets?: ShellOpenInTarget[]
  driveConnected?: boolean | null
  onConnectDrive?: () => void
}

/**
 * Context-dependent export/open menu.
 * Renders only when the current surface has open targets (Drive doc, Google Docs, media, Canva).
 */
export function ShellOpenInMenu({
  targets = [],
}: Pick<ShellOpenInMenuProps, 'targets'>) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const hasTargets = targets.length > 0

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  // No targets → hide entirely (Open in is context-only for docs / media / exports).
  if (!hasTargets) return null

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        title="Open in"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'body-3 text-foreground hover:bg-hover-subtle flex h-8 items-center gap-1 whitespace-nowrap rounded-lg px-3',
          open && 'bg-hover-subtle',
        )}
      >
        <span>Open in</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0" />
      </button>

      {open ? (
        <div className="border-border bg-card absolute right-0 top-full z-50 mt-1 min-w-[200px] rounded-xl border p-1 shadow-2">
          {targets.map((t) => (
            <a
              key={t.id}
              href={t.href}
              target="_blank"
              rel="noopener noreferrer"
              className="body-3 text-foreground hover:bg-hover-subtle flex w-full items-center rounded-lg px-3 py-2"
              onClick={() => setOpen(false)}
            >
              {t.label}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  )
}
