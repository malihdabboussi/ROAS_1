import { useEffect, useMemo, useRef, useState } from 'react'
import { Bot, Check, ChevronDown, ChevronRight } from 'lucide-react'
import type { ChannelMember, ChannelMessage } from '@/lib/channels'
import type { DeliverableType } from '../lib/channel-deliverables'
import {
  summaryForMenu,
  TIME_OPTIONS,
  TYPE_OPTIONS,
  type FilterState,
  type SubMenu,
} from '../lib/channel-deliverable-filters'

export function DeliverablesFilterDropdown({
  messages,
  members,
  filterState,
  threadFilterId,
  onFilterChange,
  onClearAll,
  onClearThreadFilter,
  rosterAvatars,
  campaignOptions,
  campaignLabelMap,
}: {
  messages: ChannelMessage[]
  members: ChannelMember[]
  filterState: FilterState
  threadFilterId?: string | null
  onFilterChange: (next: FilterState) => void
  onClearAll: () => void
  onClearThreadFilter?: () => void
  rosterAvatars?: Map<string, string>
  campaignOptions: { id: string; name: string }[]
  campaignLabelMap: Map<string, string>
}) {
  const [open, setOpen] = useState(false)
  const [activeMenu, setActiveMenu] = useState<SubMenu>(null)
  const ref = useRef<HTMLDivElement>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) {
        setOpen(false)
        setActiveMenu(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const allSenders = useMemo(() => {
    const seen = new Map<
      string,
      { id: string; label: string; avatarUrl: string | null; kind: 'user' | 'agent' }
    >()
    for (const m of members) {
      if (m.member_type === 'agent' && m.agent_key) {
        seen.set(m.agent_key, {
          id: m.agent_key,
          label: m.agent_key,
          avatarUrl: rosterAvatars?.get(m.agent_key) ?? null,
          kind: 'agent',
        })
      } else if (m.member_type === 'user' && m.user_id) {
        seen.set(m.user_id, {
          id: m.user_id,
          label: m.profile?.full_name ?? m.user_id,
          avatarUrl: m.profile?.avatar_url ?? rosterAvatars?.get(m.user_id) ?? null,
          kind: 'user',
        })
      }
    }
    return [...seen.values()]
  }, [members, rosterAvatars])

  const senderLabelMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const s of allSenders) m.set(s.id, s.label)
    return m
  }, [allSenders])

  const brainstormThreads = useMemo(() => {
    const threads: { id: string; label: string }[] = []
    const seen = new Set<string>()
    for (const msg of messages) {
      if (msg.reply_to_id) continue
      const meta = msg.metadata as Record<string, unknown> | null
      if (!meta?.brainstorm) continue
      if (seen.has(msg.id)) continue
      seen.add(msg.id)
      const date = new Date(msg.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
      threads.push({ id: msg.id, label: msg.thread_name || `Brainstorm · ${date}` })
    }
    return threads
  }, [messages])

  const activeCount =
    (filterState.types.size > 0 ? 1 : 0) +
    (filterState.time !== 'any' ? 1 : 0) +
    (filterState.senders.size > 0 ? 1 : 0) +
    (filterState.threadId || threadFilterId ? 1 : 0) +
    (filterState.campaigns.size > 0 ? 1 : 0)

  const toggleType = (t: DeliverableType) => {
    const next = new Set(filterState.types)
    if (next.has(t)) next.delete(t)
    else next.add(t)
    onFilterChange({ ...filterState, types: next })
  }

  const toggleSender = (id: string) => {
    const next = new Set(filterState.senders)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onFilterChange({ ...filterState, senders: next })
  }

  const toggleCampaign = (id: string) => {
    const next = new Set(filterState.campaigns)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onFilterChange({ ...filterState, campaigns: next })
  }

  const handleRowEnter = (menu: SubMenu) => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    setActiveMenu(menu)
  }
  const handleRowLeave = () => {
    closeTimerRef.current = setTimeout(() => setActiveMenu(null), 120)
  }
  const handleSubEnter = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }
  const handleSubLeave = () => {
    closeTimerRef.current = setTimeout(() => setActiveMenu(null), 120)
  }

  const menus: { key: SubMenu; label: string }[] = [
    { key: 'type', label: 'Type' }, { key: 'time', label: 'Time' },
    { key: 'source', label: 'Source' }, { key: 'campaign', label: 'Campaign' },
    { key: 'from', label: 'From' },
  ]

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o)
          setActiveMenu(null)
        }}
        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
          activeCount > 0
            ? 'bg-primary/10 text-primary'
            : 'button-glass-neutral text-muted-foreground hover:text-foreground'
        }`}
      >
        Filters
        {activeCount > 0 && (
          <span className="bg-primary text-primary-foreground inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none">
            {activeCount}
          </span>
        )}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 flex items-start">
          {activeMenu && (
            <div
              className="border-border bg-card mr-1 w-52 overflow-hidden rounded-xl border shadow-lg"
              onMouseEnter={handleSubEnter}
              onMouseLeave={handleSubLeave}
            >
              <div className="max-h-[320px] overflow-y-auto p-1.5">
                {activeMenu === 'type' &&
                  TYPE_OPTIONS.map((o) => {
                    const checked = filterState.types.has(o.value)
                    return (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => toggleType(o.value)}
                        className="hover:bg-hover-subtle flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors"
                      >
                        <span
                          className={`border-border flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${checked ? 'bg-primary border-primary' : ''}`}
                        >
                          {checked && <Check className="text-primary-foreground h-2.5 w-2.5" />}
                        </span>
                        <span
                          className={`flex-1 ${checked ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
                        >
                          {o.label}
                        </span>
                      </button>
                    )
                  })}

                {activeMenu === 'time' &&
                  TIME_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => onFilterChange({ ...filterState, time: o.value })}
                      className="hover:bg-hover-subtle flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors"
                    >
                      <span
                        className={`flex-1 ${filterState.time === o.value ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
                      >
                        {o.label}
                      </span>
                      {filterState.time === o.value && (
                        <Check className="text-primary h-3.5 w-3.5 shrink-0" />
                      )}
                    </button>
                  ))}

                {activeMenu === 'source' && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        onFilterChange({ ...filterState, threadId: null })
                        onClearThreadFilter?.()
                      }}
                      className="hover:bg-hover-subtle flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors"
                    >
                      <span
                        className={`flex-1 ${!filterState.threadId && !threadFilterId ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
                      >
                        All sources
                      </span>
                      {!filterState.threadId && !threadFilterId && (
                        <Check className="text-primary h-3.5 w-3.5 shrink-0" />
                      )}
                    </button>
                    {brainstormThreads.map((t) => {
                      const isActive = filterState.threadId === t.id || threadFilterId === t.id
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            onFilterChange({ ...filterState, threadId: t.id })
                            if (threadFilterId) onClearThreadFilter?.()
                          }}
                          className="hover:bg-hover-subtle flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors"
                        >
                          <span
                            className={`flex-1 truncate ${isActive ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
                          >
                            {t.label}
                          </span>
                          {isActive && <Check className="text-primary h-3.5 w-3.5 shrink-0" />}
                        </button>
                      )
                    })}
                    {brainstormThreads.length === 0 && (
                      <p className="text-muted-foreground px-2.5 py-2 text-xs">
                        No brainstorms yet
                      </p>
                    )}
                  </>
                )}

                {activeMenu === 'campaign' &&
                  (campaignOptions.length === 0 ? (
                    <p className="text-muted-foreground px-2.5 py-2 text-xs">No campaigns</p>
                  ) : (
                    campaignOptions.map((c) => {
                      const checked = filterState.campaigns.has(c.id)
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleCampaign(c.id)}
                          className="hover:bg-hover-subtle flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors"
                        >
                          <span
                            className={`border-border flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${checked ? 'bg-primary border-primary' : ''}`}
                          >
                            {checked && <Check className="text-primary-foreground h-2.5 w-2.5" />}
                          </span>
                          <span
                            className={`min-w-0 flex-1 truncate ${checked ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
                          >
                            {campaignLabelMap.get(c.id) ?? c.name}
                          </span>
                        </button>
                      )
                    })
                  ))}

                {activeMenu === 'from' &&
                  allSenders.map((s) => {
                    const checked = filterState.senders.has(s.id)
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleSender(s.id)}
                        className="hover:bg-hover-subtle flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors"
                      >
                        <span
                          className={`border-border flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${checked ? 'bg-primary border-primary' : ''}`}
                        >
                          {checked && <Check className="text-primary-foreground h-2.5 w-2.5" />}
                        </span>
                        {s.avatarUrl ? (
                          <img
                            src={s.avatarUrl}
                            alt={s.label}
                            className="h-4 w-4 shrink-0 rounded-full object-cover"
                          />
                        ) : s.kind === 'agent' ? (
                          <span className="bg-muted text-muted-foreground inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full">
                            <Bot className="h-2.5 w-2.5" />
                          </span>
                        ) : (
                          <span className="bg-muted text-muted-foreground inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[8px] font-semibold uppercase">
                            {s.label.charAt(0)}
                          </span>
                        )}
                        <span
                          className={`min-w-0 flex-1 truncate ${checked ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
                        >
                          {s.label}
                        </span>
                      </button>
                    )
                  })}
              </div>
            </div>
          )}

          <div className="border-border bg-card w-48 overflow-hidden rounded-xl border shadow-lg">
            <div className="p-1.5">
              {menus.map((m) => {
                const summary = summaryForMenu(
                  m.key,
                  filterState,
                  threadFilterId,
                  senderLabelMap,
                  campaignLabelMap,
                )
                return (
                  <div
                    key={m.key}
                    onMouseEnter={() => handleRowEnter(m.key)}
                    onMouseLeave={handleRowLeave}
                    className={`hover:bg-hover-subtle flex cursor-default items-center gap-2 rounded-lg px-2.5 py-2 transition-colors ${activeMenu === m.key ? 'bg-hover-subtle' : ''}`}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-foreground block text-xs font-medium">{m.label}</span>
                      {summary && (
                        <span className="text-primary block truncate text-[10px]">{summary}</span>
                      )}
                    </div>
                    <ChevronRight className="text-muted-foreground h-3 w-3 shrink-0" />
                  </div>
                )
              })}
            </div>

            {activeCount > 0 && (
              <div className="border-border border-t px-3 py-2">
                <button
                  type="button"
                  onClick={() => {
                    onClearAll()
                    setOpen(false)
                    setActiveMenu(null)
                  }}
                  className="text-muted-foreground hover:text-foreground w-full text-center text-xs font-medium transition-colors"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
