'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, RefreshCw, Search, X } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { TracesList } from '@/features/traces'
import type { AgentTraceSummary, TracesChannelFilter, TracesStatusFilter } from '@/features/traces'
import { adminGet } from '@/lib/api/admin-client'

const STATUS_ALLOWED = new Set(['streaming', 'completed', 'failed'])
const CHANNEL_ALLOWED = new Set(['studio', 'mission', 'brain-ops', 'slack', 'telegram'])

const STATUS_OPTIONS: { id: TracesStatusFilter; label: string }[] = [
  { id: '', label: 'All statuses' },
  { id: 'streaming', label: 'Streaming' },
  { id: 'completed', label: 'Completed' },
  { id: 'failed', label: 'Failed' },
]

const CHANNEL_OPTIONS: { id: TracesChannelFilter; label: string }[] = [
  { id: '', label: 'All channels' },
  { id: 'mission', label: 'Mission' },
  { id: 'brain-ops', label: 'Brain Ops' },
  { id: 'studio', label: 'Studio' },
  { id: 'slack', label: 'Slack' },
  { id: 'telegram', label: 'Telegram' },
]

function TracesFilterDropdown({
  ariaLabel,
  value,
  options,
  onChange,
}: {
  ariaLabel: string
  value: string
  options: { id: string; label: string }[]
  onChange: (id: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const selectedLabel = options.find((o) => o.id === value)?.label ?? options[0]?.label ?? ''

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={() => setIsOpen(!isOpen)}
        className="surface-card border-border text-foreground body-3 rounded-spacing-2 px-spacing-3 py-spacing-2 gap-spacing-2 hover:bg-hover-subtle flex items-center border transition-all"
      >
        <span>{selectedLabel}</span>
        <ChevronDown
          className={`icon-xs text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      {isOpen ? (
        <div className="z-dropdown mt-spacing-1 absolute left-0 top-full" data-dropdown>
          <div className="dropdown-menu-solid p-spacing-2 min-w-48">
            <div className="space-y-spacing-1" role="listbox">
              {options.map((option) => {
                const isSelected = value === option.id
                return (
                  <button
                    key={option.id || `opt-${option.label}`}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`gap-spacing-2 px-spacing-2 py-spacing-1 rounded-spacing-1 body-3 flex w-full items-center text-left ${
                      isSelected
                        ? 'bg-primary/10 text-foreground'
                        : 'hover:bg-hover-subtle text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={() => {
                      onChange(option.id)
                      setIsOpen(false)
                    }}
                  >
                    {isSelected ? (
                      <Check className="icon-sm text-primary shrink-0" aria-hidden />
                    ) : (
                      <span className="icon-sm shrink-0" aria-hidden />
                    )}
                    <span>{option.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default function TracesPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [traces, setTraces] = useState<AgentTraceSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fetching, setFetching] = useState(false)

  const status: TracesStatusFilter = useMemo(() => {
    const raw = searchParams.get('status')?.trim() ?? ''
    return STATUS_ALLOWED.has(raw) ? (raw as TracesStatusFilter) : ''
  }, [searchParams])

  const userIdFilter = useMemo(() => searchParams.get('user_id')?.trim() ?? '', [searchParams])

  const userNameFilter = useMemo(() => searchParams.get('user_name')?.trim() ?? '', [searchParams])

  const [userNameInput, setUserNameInput] = useState(userNameFilter)

  const channel: TracesChannelFilter = useMemo(() => {
    const raw = searchParams.get('channel')?.trim() ?? ''
    return CHANNEL_ALLOWED.has(raw) ? (raw as TracesChannelFilter) : ''
  }, [searchParams])

  const replaceTracesQuery = useCallback(
    (next: {
      status?: TracesStatusFilter
      userId?: string | null
      channel?: TracesChannelFilter
      userName?: string | null
    }) => {
      const p = new URLSearchParams()
      const nextStatus = next.status !== undefined ? next.status : status
      const nextUserId = next.userId !== undefined ? next.userId : userIdFilter || null
      const nextChannel = next.channel !== undefined ? next.channel : channel
      let nextUserName: string | null
      if (next.userName !== undefined) {
        const t = next.userName?.trim() ?? ''
        nextUserName = t.length > 0 ? t : null
      } else {
        nextUserName = userNameFilter || null
      }
      if (nextStatus) p.set('status', nextStatus)
      if (nextUserId) p.set('user_id', nextUserId)
      if (nextChannel) p.set('channel', nextChannel)
      if (nextUserName) p.set('user_name', nextUserName)
      const q = p.toString()
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false })
    },
    [pathname, router, status, userIdFilter, channel, userNameFilter],
  )

  const load = useCallback(async () => {
    setFetching(true)
    try {
      setError(null)
      const qs = new URLSearchParams()
      qs.set('limit', '100')
      if (status) qs.set('status', status)
      if (userIdFilter) qs.set('user_id', userIdFilter)
      if (channel) qs.set('channel', channel)
      if (userNameFilter) qs.set('user_name', userNameFilter)
      const query = qs.toString()
      const result = await adminGet<AgentTraceSummary[]>(`traces?${query}`)
      setTraces(Array.isArray(result) ? result : [])
    } catch (err) {
      setTraces(null)
      setError(err instanceof Error ? err.message : 'Failed to load traces')
    } finally {
      setFetching(false)
    }
  }, [status, userIdFilter, channel, userNameFilter])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setUserNameInput(userNameFilter)
  }, [userNameFilter])

  useEffect(() => {
    const t = window.setTimeout(() => {
      const trimmed = userNameInput.trim()
      if (trimmed === userNameFilter) return
      replaceTracesQuery({ userName: trimmed.length > 0 ? trimmed : null })
    }, 350)
    return () => window.clearTimeout(t)
  }, [userNameInput, userNameFilter, replaceTracesQuery])

  if (error) {
    return (
      <section className="p-spacing-6">
        <h1 className="title-h2 text-foreground mb-spacing-2">AGENT TRACES</h1>
        <p className="body-3 text-destructive">{error}</p>
      </section>
    )
  }

  if (traces === null) {
    return (
      <section className="p-spacing-6">
        <h1 className="title-h2 text-foreground mb-spacing-6">AGENT TRACES</h1>
        <div className="py-spacing-12 flex min-h-[200px] items-center justify-center">
          <VibeyLoadingOrb text="Loading…" state="processing" size="md" />
        </div>
      </section>
    )
  }

  return (
    <section className="p-spacing-6">
      <div className="mb-spacing-6">
        <h1 className="title-h2 text-foreground">AGENT TRACES</h1>
        <p className="body-2 text-muted-foreground mt-spacing-2">
          Per-turn agent logs: prompts, raw input/output, tools, tokens, and cost (from{' '}
          <code className="body-4 font-mono">vb_agent_traces</code>).
        </p>
      </div>

      {userIdFilter ? (
        <div className="border-border bg-muted/30 mb-spacing-4 gap-spacing-3 rounded-spacing-2 px-spacing-3 py-spacing-2 flex flex-wrap items-center justify-between border">
          <p className="body-3 text-foreground">
            <span className="text-muted-foreground">User filter:</span>{' '}
            <code className="body-4 font-mono" title={userIdFilter}>
              {userIdFilter.slice(0, 8)}…{userIdFilter.slice(-4)}
            </code>
          </p>
          <button
            type="button"
            onClick={() => replaceTracesQuery({ userId: null })}
            className="button-glass-neutral body-4 gap-spacing-2 rounded-spacing-2 px-spacing-2 py-spacing-1 flex items-center font-medium"
          >
            <X className="icon-xs" />
            Clear user filter
          </button>
        </div>
      ) : null}

      <div className="mb-spacing-4 gap-spacing-4 flex flex-wrap items-center justify-between">
        <div className="gap-spacing-2 flex flex-wrap items-center">
          <TracesFilterDropdown
            ariaLabel="Filter traces by status"
            value={status}
            options={STATUS_OPTIONS}
            onChange={(id) => replaceTracesQuery({ status: id as TracesStatusFilter })}
          />
          <TracesFilterDropdown
            ariaLabel="Filter traces by channel"
            value={channel}
            options={CHANNEL_OPTIONS}
            onChange={(id) => replaceTracesQuery({ channel: id as TracesChannelFilter })}
          />
          <div className="relative w-52 min-w-[13rem]">
            <Search className="icon-left-center icon-sm text-muted-foreground pointer-events-none z-10" />
            <input
              type="search"
              placeholder="Search user name…"
              value={userNameInput}
              onChange={(e) => setUserNameInput(e.target.value)}
              className="input-glass input-leading body-3 h-spacing-10 pl-spacing-8 text-foreground placeholder:text-muted-foreground w-full"
              aria-label="Search traces by user name"
            />
          </div>
        </div>
        <button
          type="button"
          disabled={fetching}
          onClick={() => void load()}
          className="button-glass-neutral gap-spacing-2 rounded-spacing-2 border-border body-3 px-spacing-3 py-spacing-2 flex items-center border font-medium disabled:opacity-60"
          aria-label="Refresh traces"
          aria-busy={fetching}
        >
          <RefreshCw className={`icon-sm ${fetching ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <TracesList traces={traces} />
    </section>
  )
}
