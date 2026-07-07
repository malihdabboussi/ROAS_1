import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Power, RefreshCw, Search, Trash2, X } from 'lucide-react'
import { sendExtensionMessage } from '../../shared/chrome-utils'
import type { OrgMembership } from '../../shared/types'
import { Tooltip } from '../../ui/Tooltip'

interface BrowserSessionSummary {
  domain: string
  cookie_count: number
  synced_at: string
  first_synced_at: string | null
  min_expires_at: string | null
  disabled_at: string | null
}

type Status = 'active' | 'expiring' | 'expired' | 'disabled'

const STATUS_ORDER: Status[] = ['active', 'expiring', 'expired', 'disabled']

const STATUS_LABEL: Record<Status, string> = {
  active: 'Active',
  expiring: 'Expiring',
  expired: 'Expired',
  disabled: 'Disabled',
}

const STATUS_DOT: Record<Status, string> = {
  active: 'ext-mission-dot--running',
  expiring: 'ext-mission-dot--needs',
  expired: 'ext-mission-dot--expired',
  disabled: 'ext-mission-dot--done',
}

type Props = {
  orgs: OrgMembership[]
  activeOrgId: string | null
  onSwitchAccount: (orgId: string | null) => void
}

function statusFor(session: BrowserSessionSummary): Status {
  if (session.disabled_at) return 'disabled'
  if (!session.min_expires_at) return 'active'
  const ts = new Date(session.min_expires_at).getTime()
  if (!Number.isFinite(ts)) return 'active'
  const now = Date.now()
  if (ts <= now) return 'expired'
  if (ts <= now + 3 * 24 * 60 * 60 * 1000) return 'expiring'
  return 'active'
}

function formatRelative(iso: string | null): string {
  if (!iso) return '—'
  const ts = new Date(iso).getTime()
  if (!Number.isFinite(ts)) return '—'
  const diff = ts - Date.now()
  const abs = Math.abs(diff)
  const min = Math.round(abs / 60_000)
  if (min < 60) return diff < 0 ? `${min}m ago` : `in ${min}m`
  const hours = Math.round(abs / 3_600_000)
  if (hours < 24) return diff < 0 ? `${hours}h ago` : `in ${hours}h`
  const days = Math.round(abs / 86_400_000)
  if (days < 7) return diff < 0 ? `${days}d ago` : `in ${days}d`
  const weeks = Math.round(days / 7)
  if (weeks < 5) return diff < 0 ? `${weeks}w ago` : `in ${weeks}w`
  const months = Math.round(days / 30)
  return diff < 0 ? `${months}mo ago` : `in ${months}mo`
}

export function SessionsTab({ orgs, activeOrgId, onSwitchAccount }: Props) {
  const [sessions, setSessions] = useState<BrowserSessionSummary[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [pendingDomain, setPendingDomain] = useState<string | null>(null)
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const accountMenuRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [visible, setVisible] = useState<Record<Status, number>>({
    active: Number.POSITIVE_INFINITY,
    expiring: 5,
    expired: 5,
    disabled: 5,
  })

  const accountOptions = [
    { value: '', label: 'Personal' },
    ...orgs.map((m) => ({ value: m.org_id, label: m.organizations.name })),
  ]
  const activeAccountLabel =
    accountOptions.find((o) => o.value === (activeOrgId ?? ''))?.label ?? 'Personal'

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    const res = await sendExtensionMessage<{
      ok: boolean
      sessions?: BrowserSessionSummary[]
      error?: string
    }>({ type: 'LIST_BROWSER_SESSIONS' })
    setLoading(false)
    if (!res.ok) {
      setErr(res.error ?? 'Failed to load sessions')
      setSessions([])
      return
    }
    setSessions(res.sessions ?? [])
  }, [])

  useEffect(() => {
    void load()
    const t = setInterval(() => void load(), 30_000)
    return () => clearInterval(t)
  }, [load])

  useEffect(() => {
    setHeaderSlot(document.getElementById('ext-chat-header-actions'))
  }, [])

  useEffect(() => {
    void load()
  }, [load, activeOrgId])

  useEffect(() => {
    if (!accountMenuOpen) return
    const onDown = (e: MouseEvent) => {
      if (!accountMenuRef.current?.contains(e.target as Node)) setAccountMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAccountMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [accountMenuOpen])

  useEffect(() => {
    const listener = (msg: unknown) => {
      if (
        typeof msg === 'object' &&
        msg !== null &&
        'type' in msg &&
        (msg as { type: unknown }).type === 'BROWSER_SESSIONS_UPDATED'
      ) {
        void load()
      }
    }
    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [load])

  const toggleDisabled = async (domain: string, disabled: boolean) => {
    setPendingDomain(domain)
    await sendExtensionMessage({ type: 'SET_DOMAIN_DISABLED', domain, disabled })
    setPendingDomain(null)
    void load()
  }

  const forget = async (domain: string) => {
    setPendingDomain(domain)
    await sendExtensionMessage({ type: 'FORGET_DOMAIN', domain })
    setPendingDomain(null)
    void load()
  }

  const refreshSync = async (domain: string) => {
    setPendingDomain(domain)
    await sendExtensionMessage({ type: 'FORCE_SYNC_DOMAIN', domain })
    setPendingDomain(null)
    void load()
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sessions ?? []
    return (sessions ?? []).filter((s) => s.domain.toLowerCase().includes(q))
  }, [sessions, query])

  const grouped = useMemo(() => {
    const buckets: Record<Status, BrowserSessionSummary[]> = {
      active: [],
      expiring: [],
      expired: [],
      disabled: [],
    }
    for (const s of filtered) buckets[statusFor(s)].push(s)
    return buckets
  }, [filtered])

  const accountSwitcherPortal =
    headerSlot &&
    createPortal(
      <div className="ext-menu-wrap" ref={accountMenuRef}>
        <Tooltip label={`Account: ${activeAccountLabel}`}>
          <button
            type="button"
            className="btn-icon-inline"
            aria-label={`Account: ${activeAccountLabel}. Switch account`}
            aria-expanded={accountMenuOpen}
            aria-haspopup="menu"
            onClick={() => setAccountMenuOpen((v) => !v)}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </button>
        </Tooltip>
        {accountMenuOpen && (
          <div className="z-dropdown mt-spacing-1 absolute right-0 top-full">
            <div
              className="dropdown-menu-solid ext-menu-panel p-spacing-2 gap-spacing-1 flex flex-col"
              role="menu"
              aria-label="Account"
            >
              {accountOptions.map((opt) => {
                const isSel = opt.value === (activeOrgId ?? '')
                return (
                  <button
                    key={opt.value || 'personal'}
                    type="button"
                    role="menuitem"
                    className={`dropdown-menu-item ${isSel ? 'dropdown-sort-option-selected' : ''}`}
                    onClick={() => {
                      onSwitchAccount(opt.value || null)
                      setAccountMenuOpen(false)
                    }}
                  >
                    <span className="ext-dropdown-option-text">{opt.label}</span>
                    {isSel && (
                      <div className="dropdown-sort-check ml-spacing-2 shrink-0">
                        <svg
                          viewBox="0 0 20 20"
                          className="ext-dropdown-check-svg relative z-30"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414l2.293 2.293 6.543-6.543a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>,
      headerSlot,
    )

  const searchBar = (
    <div className="ext-mission-search">
      <Search className="icon-3-5 ext-mission-search-icon" aria-hidden="true" />
      <input
        type="text"
        className="ext-mission-search-input"
        placeholder="Search sessions"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search sessions"
      />
      {query && (
        <button
          type="button"
          className="btn-icon-inline ext-mission-search-clear"
          onClick={() => setQuery('')}
          aria-label="Clear search"
          title="Clear"
        >
          <X className="icon-3-5" aria-hidden="true" />
        </button>
      )}
    </div>
  )

  if (loading && sessions == null) {
    return (
      <>
        {accountSwitcherPortal}
        <div className="ext-stack">
          {searchBar}
          <div className="input-glass ext-brain-surface p-spacing-3 body-3 text-muted-foreground ext-brain-empty">
            Loading sessions…
          </div>
        </div>
      </>
    )
  }

  if (err) {
    return (
      <>
        {accountSwitcherPortal}
        <div className="ext-stack">
          {searchBar}
          <div className="input-glass ext-brain-surface p-spacing-3 body-3 text-destructive ext-brain-empty">
            {err}
          </div>
        </div>
      </>
    )
  }

  if (!sessions || sessions.length === 0) {
    return (
      <>
        {accountSwitcherPortal}
        <div className="ext-stack">
          {searchBar}
          <div className="input-glass ext-brain-surface p-spacing-3 body-3 text-muted-foreground ext-brain-empty">
            Visit Instagram, TikTok, X, LinkedIn, YouTube, Facebook, or Reddit while signed in to
            save your session here.
          </div>
        </div>
      </>
    )
  }

  const hasResults = filtered.length > 0

  return (
    <>
      {accountSwitcherPortal}
      <div className="ext-stack">
        {searchBar}

        {!hasResults && (
          <div className="input-glass ext-brain-surface p-spacing-3 body-3 text-muted-foreground ext-brain-empty">
            {query ? `No sessions match “${query}”.` : 'No sessions.'}
          </div>
        )}

        {STATUS_ORDER.map((status) => {
          const rows = grouped[status]
          if (rows.length === 0) return null
          const limit = query.trim() ? Number.POSITIVE_INFINITY : visible[status]
          const shown = rows.slice(0, limit)
          const remaining = rows.length - shown.length
          return (
            <div key={status} className="ext-mission-group">
              <div className="ext-mission-group-header">
                <span className={`ext-mission-dot ${STATUS_DOT[status]}`} aria-hidden="true" />
                <span className="ext-mission-group-label">{STATUS_LABEL[status]}</span>
                <span className="ext-mission-group-count">{rows.length}</span>
                <span className="ext-mission-group-rule" aria-hidden="true" />
              </div>
              <div className="flex flex-col gap-spacing-2">
                {shown.map((session) => (
                  <SessionCard
                    key={session.domain}
                    session={session}
                    status={status}
                    pending={pendingDomain === session.domain}
                    onRefresh={() => void refreshSync(session.domain)}
                    onToggle={() =>
                      void toggleDisabled(session.domain, !session.disabled_at)
                    }
                    onForget={() => void forget(session.domain)}
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
                      [status]:
                        (prev[status] === Number.POSITIVE_INFINITY ? rows.length : prev[status]) +
                        5,
                    }))
                  }
                >
                  Show {Math.min(5, remaining)} more
                </button>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

function SessionCard({
  session,
  status,
  pending,
  onRefresh,
  onToggle,
  onForget,
}: {
  session: BrowserSessionSummary
  status: Status
  pending: boolean
  onRefresh: () => void
  onToggle: () => void
  onForget: () => void
}) {
  const disabled = Boolean(session.disabled_at)
  const favicon = `https://www.google.com/s2/favicons?domain=${session.domain}&sz=64`
  const meta = [
    `${session.cookie_count} cookie${session.cookie_count === 1 ? '' : 's'}`,
    `synced ${formatRelative(session.synced_at)}`,
    session.min_expires_at ? `expires ${formatRelative(session.min_expires_at)}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="ext-session-card input-glass">
      <div className="flex items-center gap-spacing-2 min-w-0">
        <img
          src={favicon}
          width={16}
          height={16}
          alt=""
          aria-hidden="true"
          className="ext-brain-favicon shrink-0"
        />
        <span className="body-2-medium text-foreground text-truncate flex-1">
          {session.domain}
        </span>
        <span className={`ext-mission-dot ${STATUS_DOT[status]}`} aria-hidden="true" />
      </div>
      <p className="body-4 text-muted-foreground ext-session-meta">{meta}</p>
      <div className="flex items-center justify-end gap-spacing-1">
        <Tooltip label="Refresh">
          <button
            type="button"
            className="btn-icon-inline"
            disabled={pending || disabled}
            onClick={onRefresh}
            aria-label="Refresh session"
          >
            <RefreshCw
              className={`icon-3-5 ${pending ? 'ext-mission-spin' : ''}`}
              aria-hidden="true"
            />
          </button>
        </Tooltip>
        <Tooltip label={disabled ? 'Enable' : 'Disable'}>
          <button
            type="button"
            className={`btn-icon-inline ${disabled ? 'ext-session-action--active' : ''}`}
            disabled={pending}
            onClick={onToggle}
            aria-label={disabled ? 'Enable session' : 'Disable session'}
          >
            <Power className="icon-3-5" aria-hidden="true" />
          </button>
        </Tooltip>
        <Tooltip label="Forget">
          <button
            type="button"
            className="btn-icon-inline ext-session-action--destructive"
            disabled={pending}
            onClick={onForget}
            aria-label="Forget session"
          >
            <Trash2 className="icon-3-5" aria-hidden="true" />
          </button>
        </Tooltip>
      </div>
    </div>
  )
}
