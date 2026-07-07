'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import { getIconColor, LucideIcon } from '@/components/ui/IconPicker'
import { fetchSpaces } from '@/features/spaces/services/spaces.service'
import type { Space } from '@/features/spaces/types'
import { cn } from '@/lib/utils/cn'

export function TargetSpacePicker({
  campaignId,
  value,
  onPick,
}: {
  campaignId: string
  value?: string | null
  onPick: (space: Space) => void | Promise<void>
}) {
  const [spaces, setSpaces] = useState<Space[]>([])
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchSpaces({ campaign_id: campaignId, limit: 100 })
      .then((rows) => {
        if (!cancelled) setSpaces(rows)
      })
      .catch(() => {
        if (!cancelled) setSpaces([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [campaignId])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (target && rootRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [open])

  const selected = spaces.find((space) => space.id === value) ?? null
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return spaces
    return spaces.filter((space) => space.title.toLowerCase().includes(needle))
  }, [spaces, query])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((next) => !next)}
        className="border-border bg-background text-foreground h-spacing-9 rounded-spacing-2 px-spacing-3 body-3 hover:bg-hover-subtle flex w-full items-center justify-between border outline-none transition-colors"
      >
        <span className="gap-spacing-2 flex min-w-0 items-center">
          {selected ? <SpaceIcon space={selected} /> : null}
          <span className={cn('truncate', !selected && 'text-muted-foreground')}>
            {selected?.title ?? (loading ? 'Loading spaces...' : 'Choose a space')}
          </span>
        </span>
        <ChevronDown className="icon-sm text-muted-foreground shrink-0" />
      </button>

      {open ? (
        <div className="dropdown-menu-solid z-dropdown mt-spacing-1 rounded-spacing-3 border-border absolute left-0 top-full flex max-h-80 w-full min-w-64 flex-col overflow-hidden border shadow-lg">
          <div className="border-border gap-spacing-2 px-spacing-3 py-spacing-2 flex shrink-0 items-center border-b">
            <Search className="icon-sm text-muted-foreground shrink-0" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search spaces..."
              className="body-3 text-foreground placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent outline-none"
              autoFocus
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="icon-xs" />
              </button>
            ) : null}
          </div>
          <div className="p-spacing-1 min-h-0 flex-1 overflow-y-auto">
            {filtered.map((space) => {
              const active = space.id === value
              return (
                <button
                  key={space.id}
                  type="button"
                  onClick={() => {
                    void onPick(space)
                    setOpen(false)
                  }}
                  className="hover:bg-hover-subtle text-muted-foreground hover:text-foreground gap-spacing-2 rounded-spacing-2 px-spacing-2 py-spacing-1-5 body-3 flex w-full items-center transition-colors"
                >
                  <SpaceIcon space={space} />
                  <span className="min-w-0 flex-1 truncate text-left">{space.title}</span>
                  {active ? <Check className="icon-sm text-primary shrink-0" /> : null}
                </button>
              )
            })}
            {filtered.length === 0 ? (
              <p className="body-3 text-muted-foreground px-spacing-2 py-spacing-2">
                No matching spaces
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function SpaceIcon({ space }: { space: Space }) {
  const iconName = space.schema?.icon ?? 'layout-grid'
  const color = getIconColor(space.schema?.icon_color)
  return <LucideIcon name={iconName} className={cn('icon-sm shrink-0', color.textColor)} />
}
