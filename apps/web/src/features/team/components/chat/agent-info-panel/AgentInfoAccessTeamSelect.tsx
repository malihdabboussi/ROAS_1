'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { clampDropdownLeft } from '../../../lib/clamp-dropdown-left'

const ACCESS_TEAM_DROPDOWN_ROW_CLASS =
  'gap-spacing-2 body-3 rounded-spacing-2 text-muted-foreground hover:bg-hover-subtle hover:text-foreground px-spacing-2 py-spacing-1 flex w-full items-center justify-between text-left transition-colors disabled:opacity-50'

export function AgentInfoAccessTeamSelect({
  teams,
  value,
  disabled,
  saving,
  onChange,
}: {
  teams: { id: string; name: string }[]
  value: string | null
  disabled?: boolean
  saving?: boolean
  onChange: (teamId: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })

  const sortedTeams = useMemo(
    () => [...teams].sort((a, b) => a.name.localeCompare(b.name)),
    [teams],
  )

  const label = value ? (sortedTeams.find((t) => t.id === value)?.name ?? 'Team') : 'No team'

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    const width = Math.max(rect.width, 200)
    setPos({
      top: rect.bottom + 4,
      left: clampDropdownLeft(rect.left, width),
      width,
    })
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (
        wrapRef.current?.contains(target) ||
        target.closest('[data-access-team-dropdown-portal]')
      ) {
        return
      }
      setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside, true)
    return () => document.removeEventListener('mousedown', handleClickOutside, true)
  }, [open])

  const selectTeam = (teamId: string | null) => {
    setOpen(false)
    if (teamId === value) return
    void onChange(teamId)
  }

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        ref={btnRef}
        type="button"
        disabled={disabled || saving}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="surface-card border-border rounded-spacing-2 body-3 text-foreground px-spacing-3 py-spacing-2 hover:bg-hover-subtle gap-spacing-2 flex min-w-36 items-center justify-between border text-left transition-colors disabled:opacity-50"
      >
        <span className="min-w-0 truncate">{label}</span>
        <ChevronDown
          className={cn(
            'icon-xs text-muted-foreground shrink-0 transition-transform',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </button>
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            data-access-team-dropdown-portal
            className="z-dropdown rounded-spacing-2 fixed shadow-lg"
            style={{ top: pos.top, left: pos.left, width: pos.width }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div
              className="dropdown-menu-solid rounded-spacing-2 p-spacing-2 max-h-60 overflow-y-auto"
              style={{ scrollbarWidth: 'none' }}
              role="listbox"
            >
              <button
                type="button"
                role="option"
                aria-selected={value === null}
                onClick={() => selectTeam(null)}
                className={ACCESS_TEAM_DROPDOWN_ROW_CLASS}
              >
                <span className="truncate">No team</span>
                {value === null ? <Check className="icon-xs shrink-0" aria-hidden /> : null}
              </button>
              {sortedTeams.map((team) => {
                const selected = value === team.id
                return (
                  <button
                    key={team.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => selectTeam(team.id)}
                    className={ACCESS_TEAM_DROPDOWN_ROW_CLASS}
                  >
                    <span className="truncate">{team.name}</span>
                    {selected ? <Check className="icon-xs shrink-0" aria-hidden /> : null}
                  </button>
                )
              })}
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
