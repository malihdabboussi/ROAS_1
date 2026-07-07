import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Filter, RefreshCw, Search, X } from 'lucide-react'
import { getAppOrigin } from '../../shared/config'
import { sendExtensionMessage } from '../../shared/chrome-utils'
import { positionFloatingMenuFromAnchorRect } from '../../chat/floating-menu-anchor'
import { Tooltip } from '../../ui/Tooltip'

type MissionStatus =
  | 'inbox'
  | 'planning'
  | 'todo'
  | 'in_progress'
  | 'review'
  | 'blocked'
  | 'pending_approval'
  | 'awaiting_human'
  | 'done'
  | 'error'
  | 'failed'
  | 'backlog'

type MissionPriority = 'urgent' | 'high' | 'medium' | 'low'

type MissionRow = {
  id?: string
  title?: string
  status?: MissionStatus | string
  priority?: MissionPriority | string | null
  updated_at?: string
  created_at?: string
  assigned_agent_key?: string | null
  current_agent_key?: string | null
  progress_notes?: string | null
  subtask_total?: number
  subtask_done?: number
  subtask_agent_keys?: string[]
}

type Bucket = 'needs_you' | 'running' | 'queued' | 'done'

const BUCKET_MAP: Record<string, Bucket> = {
  review: 'needs_you',
  pending_approval: 'needs_you',
  blocked: 'needs_you',
  awaiting_human: 'needs_you',
  in_progress: 'running',
  todo: 'queued',
  planning: 'queued',
  inbox: 'queued',
  backlog: 'queued',
  done: 'done',
  error: 'done',
  failed: 'done',
}

const BUCKET_LABELS: Record<Bucket, string> = {
  needs_you: 'Needs you',
  running: 'Running',
  queued: 'Queued',
  done: 'Done',
}

const BUCKET_ORDER: Bucket[] = ['needs_you', 'running', 'queued', 'done']

const BUCKET_DOT: Record<Bucket, string> = {
  needs_you: 'ext-mission-dot--needs',
  running: 'ext-mission-dot--running',
  queued: 'ext-mission-dot--queued',
  done: 'ext-mission-dot--done',
}

function toBucket(status: string | undefined): Bucket | null {
  if (!status) return null
  return BUCKET_MAP[status] ?? null
}

function formatRelative(iso: string | undefined): string {
  if (!iso) return ''
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return ''
  const diff = Date.now() - t
  const abs = Math.abs(diff)
  const sec = Math.round(abs / 1000)
  if (sec < 45) return diff >= 0 ? 'just now' : 'in a moment'
  const min = Math.round(sec / 60)
  if (min < 60) return diff >= 0 ? `${min}m ago` : `in ${min}m`
  const hr = Math.round(min / 60)
  if (hr < 24) return diff >= 0 ? `${hr}h ago` : `in ${hr}h`
  const day = Math.round(hr / 24)
  if (day < 7) return diff >= 0 ? `${day}d ago` : `in ${day}d`
  const wk = Math.round(day / 7)
  if (wk < 5) return diff >= 0 ? `${wk}w ago` : `in ${wk}w`
  const mo = Math.round(day / 30)
  return diff >= 0 ? `${mo}mo ago` : `in ${mo}mo`
}

function humanizeStatus(status: string | undefined): string {
  if (!status) return '—'
  return status.replace(/_/g, ' ')
}

function humanizeAgent(key: string | null | undefined): string {
  if (!key) return ''
  return key.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

type Props = { session: boolean }

export function MissionsTab({ session }: Props) {
  const [missions, setMissions] = useState<MissionRow[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [visible, setVisible] = useState<Record<Bucket, number>>({
    needs_you: Number.POSITIVE_INFINITY,
    running: 5,
    queued: 5,
    done: 5,
  })
  const [bucketFilter, setBucketFilter] = useState<Set<Bucket>>(
    () => new Set(BUCKET_ORDER),
  )
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterPos, setFilterPos] = useState({ top: 0, left: 0 })
  const filterBtnRef = useRef<HTMLButtonElement>(null)
  const filterMenuRef = useRef<HTMLDivElement>(null)
  const filterActive = bucketFilter.size !== BUCKET_ORDER.length

  const updateFilterPos = useCallback(() => {
    if (!filterBtnRef.current) return
    const rect = filterBtnRef.current.getBoundingClientRect()
    const measured = filterMenuRef.current?.offsetHeight
    const menuHeight = Math.min(Math.max(measured && measured > 0 ? measured : 0, 120), 320)
    setFilterPos(
      positionFloatingMenuFromAnchorRect(rect, {
        menuWidth: 200,
        menuHeight,
        gap: 8,
        viewportMargin: 8,
      }),
    )
  }, [])

  useLayoutEffect(() => {
    if (!filterOpen) return
    updateFilterPos()
  }, [filterOpen, updateFilterPos])

  useEffect(() => {
    if (!filterOpen) return
    const reposition = () => updateFilterPos()
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    return () => {
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
    }
  }, [filterOpen, updateFilterPos])

  useEffect(() => {
    if (!filterOpen) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (filterBtnRef.current?.contains(t)) return
      if (filterMenuRef.current?.contains(t)) return
      setFilterOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFilterOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [filterOpen])

  const toggleBucket = (b: Bucket) => {
    setBucketFilter((prev) => {
      const next = new Set(prev)
      if (next.has(b)) next.delete(b)
      else next.add(b)
      if (next.size === 0) return new Set(BUCKET_ORDER)
      return next
    })
  }

  const load = useCallback(async () => {
    if (!session) return
    setLoading(true)
    setErr(null)
    const res = await sendExtensionMessage<{ ok: boolean; missions?: MissionRow[]; error?: string }>({
      type: 'LIST_MISSIONS',
      limit: 100,
    })
    setLoading(false)
    if (!res.ok) {
      setErr((res as { error?: string }).error ?? 'Failed to load missions')
      return
    }
    const raw = res.missions ?? []
    const withBucket = raw.filter((m) => !!toBucket(m.status))
    setMissions(withBucket)
  }, [session])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return missions
    return missions.filter((m) => {
      const haystack = [
        m.title ?? '',
        m.progress_notes ?? '',
        m.status ?? '',
        m.assigned_agent_key ?? '',
        m.current_agent_key ?? '',
        ...(m.subtask_agent_keys ?? []),
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [missions, query])

  const grouped = useMemo(() => {
    const buckets: Record<Bucket, MissionRow[]> = {
      needs_you: [],
      running: [],
      queued: [],
      done: [],
    }
    for (const m of filtered) {
      const b = toBucket(m.status)
      if (b && bucketFilter.has(b)) buckets[b].push(m)
    }
    return buckets
  }, [filtered, bucketFilter])

  const [rightSlot, setRightSlot] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setRightSlot(document.getElementById('ext-chat-header-actions'))
  }, [])

  if (!session) return null

  const origin = getAppOrigin().replace(/\/$/, '')
  const openMissionControl = (missionId?: string) =>
    chrome.tabs.create({
      url: missionId
        ? `${origin}/mission-control?mission=${encodeURIComponent(missionId)}`
        : `${origin}/mission-control`,
    })

  return (
    <div className="ext-stack">
      {rightSlot &&
        createPortal(
          <>
            <Tooltip label="Refresh">
              <button
                type="button"
                className="btn-icon-inline"
                onClick={() => void load()}
                disabled={loading}
                aria-label="Refresh missions"
              >
                <RefreshCw
                  className={`icon-3-5 ${loading ? 'ext-mission-spin' : ''}`}
                  aria-hidden="true"
                />
              </button>
            </Tooltip>
            <Tooltip label="Filter">
              <button
                ref={filterBtnRef}
                type="button"
                className={`btn-icon-inline ${filterActive ? 'ext-mission-filter-btn--active' : ''}`}
                onClick={() => setFilterOpen((v) => !v)}
                aria-label="Filter missions"
                aria-haspopup="menu"
                aria-expanded={filterOpen}
              >
                <Filter className="icon-3-5" aria-hidden="true" />
                {filterActive && <span className="ext-mission-filter-dot" aria-hidden="true" />}
              </button>
            </Tooltip>
          </>,
          rightSlot,
        )}

      {filterOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={filterMenuRef}
            role="menu"
            aria-label="Filter missions"
            className="dropdown-menu-solid z-dropdown fixed py-spacing-1 px-spacing-2"
            style={{ top: filterPos.top, left: filterPos.left, minWidth: 200 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {BUCKET_ORDER.map((bucket) => {
              const checked = bucketFilter.has(bucket)
              return (
                <button
                  key={bucket}
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={checked}
                  className="rounded-spacing-2 body-3 px-spacing-2 py-spacing-1 hover-bg-studio-subtle flex w-full items-center justify-between gap-spacing-2 text-left transition-all"
                  onClick={() => toggleBucket(bucket)}
                >
                  <span className="flex items-center gap-spacing-2 min-w-0">
                    <span
                      className={`ext-mission-dot ${BUCKET_DOT[bucket]}`}
                      aria-hidden="true"
                    />
                    <span
                      className={`text-truncate ${checked ? 'text-foreground' : 'text-muted-foreground'}`}
                    >
                      {BUCKET_LABELS[bucket]}
                    </span>
                  </span>
                  {checked && <Check className="icon-3-5 shrink-0" aria-hidden="true" />}
                </button>
              )
            })}
            {filterActive && (
              <button
                type="button"
                className="rounded-spacing-2 body-4 px-spacing-2 py-spacing-1 mt-spacing-1 text-muted-foreground hover-bg-studio-subtle hover-text-foreground w-full text-left transition-all"
                onClick={() => {
                  setBucketFilter(new Set(BUCKET_ORDER))
                  setFilterOpen(false)
                }}
              >
                Reset filter
              </button>
            )}
          </div>,
          document.body,
        )}

      <div className="ext-mission-search">
        <Search className="icon-3-5 ext-mission-search-icon" aria-hidden="true" />
        <input
          type="text"
          className="ext-mission-search-input"
          placeholder="Search missions"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search missions"
        />
        {query && (
          <Tooltip label="Clear">
            <button
              type="button"
              className="btn-icon-inline ext-mission-search-clear"
              onClick={() => setQuery('')}
              aria-label="Clear search"
            >
              <X className="icon-3-5" aria-hidden="true" />
            </button>
          </Tooltip>
        )}
      </div>

      {err && <p className="body-4 text-destructive ext-brain-err">{err}</p>}

      {missions.length === 0 && !loading && (
        <div className="input-glass ext-brain-surface p-spacing-3 body-3 text-muted-foreground ext-brain-empty">
          No missions in this org scope.
        </div>
      )}

      {missions.length > 0 && filtered.length === 0 && (
        <div className="input-glass ext-brain-surface p-spacing-3 body-3 text-muted-foreground ext-brain-empty">
          No missions match “{query}”.
        </div>
      )}

      {BUCKET_ORDER.map((bucket) => {
        const rows = grouped[bucket]
        if (rows.length === 0) return null
        const limit = query.trim() ? Number.POSITIVE_INFINITY : visible[bucket]
        const shown = rows.slice(0, limit)
        const remaining = rows.length - shown.length
        return (
          <div key={bucket} className="ext-mission-group">
            <div className="ext-mission-group-header">
              <span className={`ext-mission-dot ${BUCKET_DOT[bucket]}`} aria-hidden="true" />
              <span className="ext-mission-group-label">{BUCKET_LABELS[bucket]}</span>
              <span className="ext-mission-group-count">{rows.length}</span>
              <span className="ext-mission-group-rule" aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-spacing-2">
              {shown.map((m, idx) => (
                <MissionCard
                  key={m.id ?? `m-${bucket}-${idx}`}
                  mission={m}
                  onOpen={() => openMissionControl(m.id)}
                />
              ))}
            </div>
            {remaining > 0 && (
              <button
                type="button"
                className="ext-mission-load-more"
                onClick={() =>
                  setVisible((prev) => ({
                    ...prev,
                    [bucket]: (prev[bucket] === Number.POSITIVE_INFINITY ? rows.length : prev[bucket]) + 5,
                  }))
                }
              >
                Show {Math.min(5, remaining)} more
              </button>
            )}
          </div>
        )
      })}

      <button
        type="button"
        className="ext-link ext-mission-open-link"
        onClick={() => openMissionControl()}
      >
        Open Mission Control →
      </button>
    </div>
  )
}

function MissionCard({ mission, onOpen }: { mission: MissionRow; onOpen: () => void }) {
  const total = mission.subtask_total ?? 0
  const done = mission.subtask_done ?? 0
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  const agents = new Set<string>()
  if (mission.current_agent_key) agents.add(mission.current_agent_key)
  if (mission.assigned_agent_key) agents.add(mission.assigned_agent_key)
  for (const k of mission.subtask_agent_keys ?? []) agents.add(k)
  const agentList = Array.from(agents).slice(0, 3)
  const moreAgents = Math.max(0, agents.size - agentList.length)

  const priority = mission.priority
  const showPriority = priority === 'urgent' || priority === 'high'

  const time = formatRelative(mission.updated_at || mission.created_at)
  const notes = (mission.progress_notes ?? '').trim()
  const title = (mission.title ?? 'Mission').trim() || 'Mission'

  return (
    <button type="button" className="ext-mission-card-v2 input-glass" onClick={onOpen}>
      <div className="flex items-start gap-spacing-2">
        <span className="body-2-medium ext-mission-title flex-1">{title}</span>
        {showPriority && (
          <span className="ext-mission-priority shrink-0" title={`Priority: ${priority}`}>
            {priority === 'urgent' ? 'Urgent' : 'High'}
          </span>
        )}
      </div>

      {total > 0 && (
        <div className="ext-mission-progress">
          <div className="ext-mission-progress-track">
            <div className="ext-mission-progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="typo-caption text-muted-foreground ext-mission-progress-label">
            {done}/{total}
          </span>
        </div>
      )}

      {notes && (
        <p className="body-4 text-muted-foreground ext-mission-notes">{notes}</p>
      )}

      <div className="ext-mission-meta">
        <div className="ext-mission-agents">
          {agentList.map((k) => (
            <span key={k} className="chip-glass-neutral ext-mission-agent-chip">
              {humanizeAgent(k)}
            </span>
          ))}
          {moreAgents > 0 && (
            <span className="chip-glass-neutral ext-mission-agent-chip">+{moreAgents}</span>
          )}
        </div>
        <span className="typo-caption text-muted-foreground ext-mission-time">
          {humanizeStatus(mission.status) + (time ? ` · ${time}` : '')}
        </span>
      </div>
    </button>
  )
}
