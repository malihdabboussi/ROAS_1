'use client'

import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import {
  routeRecommendation,
  surfaceFromPathname,
  WORK_SURFACE_LABELS,
} from '../config/work-context.config'
import type { GlobalWorkSurface } from '../lib/global-chat-storage'
import { useGlobalChatStore } from '../store/use-global-chat-store'

export function ChatSurfaceRecommendation() {
  const pathname = usePathname() ?? ''
  const activeAgentKey = useGlobalChatStore((s) => s.activeAgentKey)
  const setActiveAgentKey = useGlobalChatStore((s) => s.setActiveAgentKey)
  const [dismissedKey, setDismissedKey] = useState<string | null>(null)

  const surface = surfaceFromPathname(pathname)
  const rec = routeRecommendation(surface, activeAgentKey)
  if (!rec) return null

  const dismissKey = `${surface}:${rec.suggestedAgentKey}`
  if (dismissedKey === dismissKey) return null

  return (
    <div className="border-border bg-secondary/40 mx-2 mb-2 flex items-start justify-between gap-2 rounded-lg border px-3 py-2">
      <div className="min-w-0">
        <p className="body-4 text-foreground font-medium">{rec.title}</p>
        <p className="typo-caption text-muted-foreground mt-0.5">{rec.body}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          className="button-glass-accent rounded-spacing-1 px-spacing-2 py-spacing-1 typo-caption font-medium"
          onClick={() => setActiveAgentKey(rec.suggestedAgentKey)}
        >
          Switch
        </button>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground typo-caption px-1"
          onClick={() => setDismissedKey(dismissKey)}
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}

export function WorkContextPicker() {
  const workContext = useGlobalChatStore((s) => s.workContext)
  const setWorkContext = useGlobalChatStore((s) => s.setWorkContext)
  const [open, setOpen] = useState(false)

  const surfaces = Object.keys(WORK_SURFACE_LABELS) as GlobalWorkSurface[]

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="text-muted-foreground hover:text-foreground body-4 border-border inline-flex items-center gap-0.5 rounded-md border px-2 py-1 font-medium"
      >
        {WORK_SURFACE_LABELS[workContext.surface]}
        <ChevronDown className="h-3 w-3 opacity-70" aria-hidden />
      </button>
      {open ? (
        <>
          <div className="z-modal-backdrop-inert" onClick={() => setOpen(false)} />
          <div className="dropdown-menu-solid absolute bottom-full left-0 z-10 mb-1 min-w-[140px] py-1">
            {surfaces.map((surface) => (
              <button
                key={surface}
                type="button"
                className={`body-4 hover:bg-hover-subtle flex w-full px-3 py-1.5 text-left ${
                  workContext.surface === surface
                    ? 'text-foreground font-semibold'
                    : 'text-foreground'
                }`}
                onClick={() => {
                  setWorkContext({ surface })
                  setOpen(false)
                }}
              >
                {WORK_SURFACE_LABELS[surface]}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}
