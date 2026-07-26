'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Bot, Check, ChevronDown } from 'lucide-react'
import type { TeamRosterEntry } from '@/lib/team/team-roster-api'
import { cn } from '@/lib/utils/cn'

interface SpaceChatAgentPickerProps {
  agents: TeamRosterEntry[]
  value: string
  onChange: (agentKey: string) => void
  disabled?: boolean
}

function AgentAvatar({ entry, className }: { entry: TeamRosterEntry; className?: string }) {
  if (entry.avatar_url) {
    return (
      <img src={entry.avatar_url} alt="" className={cn('h-full w-full object-cover', className)} />
    )
  }
  return (
    <span
      className={cn(
        'flex h-full w-full items-center justify-center bg-violet-500/20 text-violet-300',
        className,
      )}
    >
      <Bot className="h-5 w-5" aria-hidden />
    </span>
  )
}

export function SpaceChatAgentPicker({
  agents,
  value,
  onChange,
  disabled = false,
}: SpaceChatAgentPickerProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  const selected = useMemo(
    () => agents.find((entry) => entry.agent_key === value) ?? null,
    [agents, value],
  )
  const orderedAgents = useMemo(
    () =>
      [...agents].sort((left, right) => {
        if (left.agent_key === 'vibey') return -1
        if (right.agent_key === 'vibey') return 1
        return left.display_name.localeCompare(right.display_name)
      }),
    [agents],
  )

  const label = selected?.display_name ?? value
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const w = 240
    const rawLeft = rect.left
    const maxLeft = window.innerWidth - w - 8
    const left = Math.max(8, Math.min(rawLeft, maxLeft))
    setPos({ top: rect.bottom + 4, left })
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (!menuRef.current?.contains(t) && !triggerRef.current?.contains(t)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return
          setOpen((o) => !o)
        }}
        className={cn(
          'hover:bg-hover-subtle rounded-spacing-2 gap-spacing-2 px-spacing-1 py-spacing-1 flex max-w-full shrink-0 items-center text-left transition-colors',
          disabled && 'cursor-not-allowed opacity-60',
        )}
        aria-label={`Talking with ${label}. Change agent.`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <div className="h-spacing-10 w-spacing-10 rounded-spacing-2 shrink-0 overflow-hidden">
          {selected ? <AgentAvatar entry={selected} /> : null}
        </div>
        <span className="body-2 text-foreground max-w-[10rem] truncate font-semibold leading-tight">
          {label}
        </span>
        <span className="h-spacing-4 w-spacing-4 flex shrink-0 items-center justify-center">
          <ChevronDown
            className={cn(
              'icon-sm text-muted-foreground transition-opacity duration-200 ease-out',
              open ? 'rotate-180 opacity-70' : 'opacity-0 group-hover:opacity-70',
            )}
            aria-hidden
          />
        </span>
      </button>

      {open &&
        pos &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            className="z-dropdown fixed w-60"
            style={{ top: pos.top, left: pos.left }}
            role="listbox"
            aria-label="Choose agent"
          >
            <div className="dropdown-menu-solid py-spacing-1 max-h-72 overflow-y-auto">
              {orderedAgents.length === 0 ? (
                <div className="body-3 text-muted-foreground px-spacing-3 py-spacing-2">
                  No agents
                </div>
              ) : (
                orderedAgents.map((entry, index) => {
                  const key = entry.agent_key!
                  const isSelected = value === key
                  return (
                    <div key={entry.participant_id}>
                      {index === 1 && orderedAgents[0]?.agent_key === 'vibey' ? (
                        <div className="border-border mx-spacing-2 mt-spacing-1 border-t">
                          <p className="typo-caption text-muted-foreground px-spacing-1 pb-spacing-1 pt-spacing-2 font-medium uppercase tracking-wide">
                            Other agents
                          </p>
                        </div>
                      ) : null}
                      <button
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => {
                          onChange(key)
                          setOpen(false)
                        }}
                        className={cn(
                          'gap-spacing-2 px-spacing-3 py-spacing-2 flex w-full items-center text-left transition-colors',
                          isSelected ? 'bg-hover-subtle' : 'hover:bg-hover-subtle',
                        )}
                      >
                        <div className="h-spacing-8 w-spacing-8 rounded-spacing-2 shrink-0 overflow-hidden">
                          <AgentAvatar entry={entry} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="body-3 text-foreground truncate font-medium">
                            {entry.display_name}
                          </div>
                          {entry.role_label ? (
                            <div className="typo-caption text-muted-foreground truncate">
                              {entry.role_label}
                            </div>
                          ) : null}
                        </div>
                        {isSelected ? <Check className="icon-sm text-foreground shrink-0" /> : null}
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
