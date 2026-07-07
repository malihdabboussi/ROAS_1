'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Facebook, Instagram, Layers, Linkedin, Youtube } from 'lucide-react'
import Switch from '@/components/ui/forms/switch'
import { Tooltip } from '@/components/ui/tooltip'
import type { SocialAnalyticsPlatform } from '@/lib/reporting/social-analytics-types'
import type { ReportingViewConfig } from '../../../types/space-schema'
import {
  normalizeReportingSocialPlatforms,
  patchReportingSocialPlatforms,
} from './reporting-social-platforms'

const MAX_STACKED_ICONS = 4

const ROWS: {
  key: SocialAnalyticsPlatform
  label: string
  Icon: typeof Instagram
}[] = [
  { key: 'instagram', label: 'Instagram', Icon: Instagram },
  { key: 'linkedin', label: 'LinkedIn', Icon: Linkedin },
  { key: 'facebook', label: 'Facebook', Icon: Facebook },
  { key: 'youtube', label: 'YouTube', Icon: Youtube },
]

export function SocialPlatformsToolbarMenu({
  config,
  onPatch,
}: {
  config: ReportingViewConfig
  onPatch: (patch: Partial<ReportingViewConfig>) => void
}) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const wrapRef = useRef<HTMLSpanElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  const selected = normalizeReportingSocialPlatforms(config)
  const selectedRows = ROWS.filter((r) => selected.includes(r.key)).slice(0, MAX_STACKED_ICONS)
  const highlight = selected.length > 1 || (selected.length === 1 && selected[0] !== 'instagram')

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    setPos({ top: rect.bottom + 4, left: rect.left })
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('[data-social-platforms-toolbar-dropdown]')) return
      if (wrapRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown, true)
    return () => document.removeEventListener('mousedown', onDown, true)
  }, [open])

  const toggle = (key: SocialAnalyticsPlatform, on: boolean) => {
    const cur = new Set(selected)
    if (on) cur.add(key)
    else cur.delete(key)
    if (cur.size === 0) cur.add('instagram')
    const next = ROWS.map((r) => r.key).filter((k) => cur.has(k)) as SocialAnalyticsPlatform[]
    onPatch(patchReportingSocialPlatforms(next))
  }

  return (
    <>
      <Tooltip label="Platforms shown in this view" side="bottom">
        <span ref={wrapRef} className="inline-flex shrink-0 items-center">
          <button
            ref={btnRef}
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label={`Platforms: ${selectedRows.map((r) => r.label).join(', ')}`}
            className={`inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-medium transition-colors ${
              highlight
                ? 'badge-glass-purple'
                : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]'
            }`}
          >
            <Layers className="h-3 w-3 shrink-0" />
            <span className="truncate">Platform</span>
            <span className="inline-flex shrink-0 flex-row items-center -space-x-1.5">
              {selectedRows.map(({ key, Icon }) => (
                <span
                  key={key}
                  className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-secondary)] ring-1 ring-[var(--background)]"
                >
                  <Icon className="h-3 w-3 shrink-0" aria-hidden />
                </span>
              ))}
            </span>
            <ChevronDown
              className={`h-3 w-3 shrink-0 text-[var(--color-muted-foreground)] transition-transform ${open ? 'rotate-180' : ''}`}
            />
          </button>
        </span>
      </Tooltip>
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed z-[100002]"
            style={{ top: pos.top, left: pos.left }}
            data-social-platforms-toolbar-dropdown
          >
            <div className="dropdown-menu-solid min-w-[200px] rounded-xl py-1 shadow-lg">
              {ROWS.map(({ key, label, Icon }) => (
                <div key={key} className="flex h-9 items-center justify-between gap-3 px-3 py-1">
                  <span className="flex min-w-0 items-center gap-2">
                    <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                    <span className="body-3 truncate text-[var(--foreground)]">{label}</span>
                  </span>
                  <Switch
                    checked={selected.includes(key)}
                    onCheckedChange={(v) => toggle(key, v)}
                  />
                </div>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
