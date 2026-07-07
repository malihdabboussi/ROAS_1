'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { autoUpdate, flip, offset, shift, size, useFloating } from '@floating-ui/react-dom'
import { Check, ChevronDown, Search } from 'lucide-react'
import { TIMEZONES } from './timezones'

function referenceContainsNode(ref: unknown, node: Node): boolean {
  return ref instanceof Element ? ref.contains(node) : false
}

const EMPTY_OPTION = { value: '', label: 'Not set', group: '' } as const

export interface TimezoneSelectProps {
  value: string
  onChange: (iana: string) => void
  disabled?: boolean
  /** When true, first row clears the value (empty string). */
  allowEmpty?: boolean
  wrapperClassName?: string
  triggerClassName?: string
  /** Minimum width for the dropdown panel (px). Defaults to trigger width. */
  minDropdownWidth?: number
  id?: string
}

interface Row {
  value: string
  label: string
  group: string
}

function formatOffset(iana: string): string {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: iana,
      timeZoneName: 'shortOffset',
    })
    const parts = dtf.formatToParts(new Date())
    const tz = parts.find((p) => p.type === 'timeZoneName')?.value ?? ''
    return tz.replace('GMT', 'UTC')
  } catch {
    return ''
  }
}

function buildRows(): Row[] {
  const curated = new Set<string>(TIMEZONES.map((t) => t.value))
  const curatedRows: Row[] = TIMEZONES.map((t) => {
    const city = t.value.split('/').pop()?.replaceAll('_', ' ') ?? ''
    return {
      value: t.value,
      label: city ? `${t.label} — ${city}` : t.label,
      group: 'Common',
    }
  })
  const all: string[] =
    typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : []
  const moreRows: Row[] = all
    .filter((iana) => !curated.has(iana))
    .map((iana) => {
      const [group, ...rest] = iana.split('/')
      const city = (rest.join('/') || iana).replaceAll('_', ' ')
      return { value: iana, label: `${city} (${iana})`, group: group || 'Other' }
    })
    .sort((a, b) =>
      a.group === b.group ? a.label.localeCompare(b.label) : a.group.localeCompare(b.group),
    )
  return [...curatedRows, ...moreRows]
}

export function TimezoneSelect({
  value,
  onChange,
  disabled = false,
  allowEmpty = false,
  wrapperClassName = 'relative w-full',
  triggerClassName,
  minDropdownWidth,
  id,
}: TimezoneSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null)

  const rows = useMemo<Row[]>(() => {
    const built = buildRows()
    return allowEmpty ? [{ ...EMPTY_OPTION }, ...built] : built
  }, [allowEmpty])

  const offsets = useMemo(() => {
    const map = new Map<string, string>()
    for (const r of rows) {
      if (r.value) map.set(r.value, formatOffset(r.value))
    }
    return map
  }, [rows])

  const filtered = useMemo<Row[]>(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => {
      if (!r.value && allowEmpty) return false
      const off = offsets.get(r.value) ?? ''
      const valNorm = r.value.toLowerCase().replaceAll('_', ' ')
      return (
        r.label.toLowerCase().includes(q) ||
        r.value.toLowerCase().includes(q) ||
        valNorm.includes(q) ||
        off.toLowerCase().includes(q)
      )
    })
  }, [allowEmpty, offsets, query, rows])

  const { refs, floatingStyles } = useFloating({
    placement: 'bottom-start',
    strategy: 'fixed',
    middleware: [
      offset(4),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      size({
        apply({ rects, elements }) {
          const w = minDropdownWidth
            ? Math.max(rects.reference.width, minDropdownWidth)
            : rects.reference.width
          Object.assign(elements.floating.style, {
            width: `${w}px`,
          })
        },
      }),
    ],
    whileElementsMounted: autoUpdate,
  })

  useEffect(() => {
    if (!open) {
      setQuery('')
      return
    }
    const closest = triggerRef.current?.closest<HTMLElement>(
      '[role="dialog"], [data-slot="dialog-content"]',
    )
    setPortalRoot(closest ?? document.body)
  }, [open])

  const displayLabel =
    rows.find((tz) => tz.value === value)?.label ?? (value ? value : 'Select timezone')

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const t = e.target as Node
      if (
        !referenceContainsNode(refs.reference.current, t) &&
        !refs.floating.current?.contains(t)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, refs])

  const setRefs = (node: HTMLButtonElement | null) => {
    triggerRef.current = node
    refs.setReference(node)
  }

  const menu =
    open && !disabled && portalRoot
      ? createPortal(
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            className="z-dropdown pointer-events-auto outline-none"
            data-dropdown
          >
            <div className="dropdown-menu-solid rounded-spacing-2 overflow-hidden">
              <div className="px-spacing-2 py-spacing-2 border-border gap-spacing-2 flex items-center border-b">
                <Search className="icon-sm text-muted-foreground flex-shrink-0" aria-hidden />
                <input
                  type="text"
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search timezone or city"
                  className="body-3 text-foreground placeholder:text-muted-foreground w-full bg-transparent outline-none"
                />
              </div>
              <div className="p-spacing-1 max-h-72 overflow-y-auto">
                {filtered.length === 0 && (
                  <div className="px-spacing-2 py-spacing-2 body-3 text-muted-foreground">
                    No matches
                  </div>
                )}
                {filtered.map((tz, i) => {
                  const prev = filtered[i - 1]
                  const showHeader = tz.value && tz.group && tz.group !== prev?.group
                  const isSelected = value === tz.value
                  const off = tz.value ? offsets.get(tz.value) : ''
                  return (
                    <div key={tz.value || '__empty'}>
                      {showHeader && (
                        <div className="px-spacing-2 pt-spacing-2 pb-spacing-1 typo-caption text-muted-foreground uppercase">
                          {tz.group}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          onChange(tz.value)
                          setOpen(false)
                        }}
                        className={`px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 gap-spacing-2 flex w-full items-center justify-between text-left transition-all ${isSelected ? 'dropdown-option-selected' : 'hover:bg-hover-subtle hover:text-foreground text-muted-foreground'}`}
                      >
                        <span className="truncate">{tz.label}</span>
                        <span className="gap-spacing-2 flex flex-shrink-0 items-center">
                          {off && (
                            <span className="text-muted-foreground typo-caption tabular-nums">
                              {off}
                            </span>
                          )}
                          {isSelected && <Check className="icon-sm text-foreground" />}
                        </span>
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>,
          portalRoot,
        )
      : null

  return (
    <div className={wrapperClassName}>
      <button
        ref={setRefs}
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={
          triggerClassName ??
          'gap-spacing-1 h-spacing-10 px-spacing-3 input-glass rounded-spacing-2 flex w-full items-center justify-between transition-colors disabled:opacity-60'
        }
      >
        <span className="body-3 text-foreground truncate">{displayLabel}</span>
        <ChevronDown
          className={`icon-sm text-muted-foreground flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      {menu}
    </div>
  )
}
