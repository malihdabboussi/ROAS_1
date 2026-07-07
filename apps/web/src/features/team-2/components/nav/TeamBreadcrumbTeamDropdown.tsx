'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { getIconColor, LucideIcon } from '@/components/ui/IconPicker'
import type { AgentTeam } from '@/lib/agents'
import { cn } from '@/lib/utils/cn'

export function TeamBreadcrumbTeamDropdown({
  teams,
  selectedTeamId,
  onSelectTeam,
  moveAgentKey,
  moveAgentTeamId,
  canMoveAgent,
  onMoveAgentToTeam,
  disabled,
}: {
  teams: AgentTeam[]
  selectedTeamId: string | null
  onSelectTeam: (teamId: string | null) => void
  moveAgentKey?: string | null
  moveAgentTeamId?: string | null
  canMoveAgent?: boolean
  onMoveAgentToTeam?: (agentKey: string, teamId: string | null) => void | Promise<void>
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [moving, setMoving] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const selectedTeam = useMemo(
    () => (selectedTeamId ? teams.find((t) => t.id === selectedTeamId) : null),
    [selectedTeamId, teams],
  )

  const label = selectedTeam?.name ?? 'All teams'

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const sortedTeams = useMemo(
    () =>
      [...teams].sort((a, b) => {
        if (a.is_system && !b.is_system) return -1
        if (!a.is_system && b.is_system) return 1
        return a.name.localeCompare(b.name)
      }),
    [teams],
  )

  const handlePick = (teamId: string | null) => {
    if (moveAgentKey && canMoveAgent && onMoveAgentToTeam) {
      setMoving(true)
      void Promise.resolve(onMoveAgentToTeam(moveAgentKey, teamId)).finally(() => {
        setMoving(false)
        setOpen(false)
      })
      return
    }
    onSelectTeam(teamId)
    setOpen(false)
  }

  const showMoveHints = Boolean(moveAgentKey && canMoveAgent && onMoveAgentToTeam)

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        disabled={disabled || moving}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'gap-spacing-1 flex min-w-0 max-w-[160px] items-center rounded-md px-1 py-0.5 text-sm transition-colors hover:bg-[var(--color-hover-subtle)]',
          selectedTeamId || open
            ? 'font-medium text-[var(--foreground)]'
            : 'text-[var(--color-muted-foreground)]',
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {selectedTeam ? (
          <span
            className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded ${getIconColor(selectedTeam.color).glassClass}`}
          >
            <LucideIcon
              name={selectedTeam.icon || 'users'}
              className={`h-2.5 w-2.5 ${getIconColor(selectedTeam.color).textColor}`}
            />
          </span>
        ) : null}
        <span className="truncate">{label}</span>
        <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
      </button>

      {open ? (
        <div
          role="listbox"
          className="z-dropdown rounded-spacing-2 border-border surface-card p-spacing-1 absolute left-0 top-full mt-1 min-w-52 border shadow-lg"
        >
          {showMoveHints ? (
            <p className="body-4 text-muted-foreground px-spacing-2 py-spacing-1 border-border border-b">
              Move agent to team
            </p>
          ) : null}
          <button
            type="button"
            role="option"
            aria-selected={!selectedTeamId && !showMoveHints}
            onClick={() => handlePick(null)}
            className="gap-spacing-2 body-3 rounded-spacing-2 text-muted-foreground hover:text-foreground px-spacing-2 py-spacing-1 flex w-full items-center text-left transition-colors hover:bg-[var(--color-hover-subtle)]"
          >
            <span className="min-w-0 flex-1 truncate">All teams</span>
            {showMoveHints && !moveAgentTeamId ? (
              <Check className="h-3.5 w-3.5 shrink-0" />
            ) : !showMoveHints && !selectedTeamId ? (
              <Check className="h-3.5 w-3.5 shrink-0" />
            ) : null}
          </button>
          {sortedTeams.map((team) => {
            const palette = getIconColor(team.color)
            const isCurrentFilter = !showMoveHints && selectedTeamId === team.id
            const isAgentTeam = showMoveHints && moveAgentTeamId === team.id
            return (
              <button
                key={team.id}
                type="button"
                role="option"
                aria-selected={isCurrentFilter || isAgentTeam}
                onClick={() => handlePick(team.id)}
                className="gap-spacing-2 body-3 rounded-spacing-2 text-muted-foreground hover:text-foreground px-spacing-2 py-spacing-1 flex w-full items-center text-left transition-colors hover:bg-[var(--color-hover-subtle)]"
              >
                <span
                  className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${palette.glassClass}`}
                >
                  <LucideIcon
                    name={team.icon || 'users'}
                    className={`h-3 w-3 ${palette.textColor}`}
                  />
                </span>
                <span className="min-w-0 flex-1 truncate">{team.name}</span>
                {isCurrentFilter || isAgentTeam ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
