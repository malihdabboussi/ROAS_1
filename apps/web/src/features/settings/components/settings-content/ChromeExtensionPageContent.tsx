'use client'

import { useCallback, useEffect, useState } from 'react'
import { Chrome, RefreshCw, Trash2 } from 'lucide-react'
import { backendDelete, backendGet, backendPatch } from '@/lib/api/backend-client'

interface BrowserSessionSummary {
  domain: string
  cookie_count: number
  synced_at: string
  first_synced_at: string | null
  min_expires_at: string | null
  disabled_at: string | null
}

type ListResponse = {
  ok: boolean
  sessions?: BrowserSessionSummary[]
}

type Status = 'Active' | 'Disabled' | 'Expiring' | 'Expired'

function statusFor(session: BrowserSessionSummary): Status {
  if (session.disabled_at) return 'Disabled'
  if (!session.min_expires_at) return 'Active'
  const ts = new Date(session.min_expires_at).getTime()
  if (!Number.isFinite(ts)) return 'Active'
  const now = Date.now()
  if (ts <= now) return 'Expired'
  if (ts <= now + 3 * 24 * 60 * 60 * 1000) return 'Expiring'
  return 'Active'
}

function formatRelative(iso: string | null): string {
  if (!iso) return '—'
  const ts = new Date(iso).getTime()
  if (!Number.isFinite(ts)) return '—'
  const diff = ts - Date.now()
  const abs = Math.abs(diff)
  const days = Math.round(abs / 86_400_000)
  const hours = Math.round(abs / 3_600_000)
  const minutes = Math.round(abs / 60_000)
  const suffix = diff < 0 ? ' ago' : ''
  const prefix = diff < 0 ? '' : 'in '
  if (days >= 1) return `${prefix}${days}d${suffix}`
  if (hours >= 1) return `${prefix}${hours}h${suffix}`
  return `${prefix}${minutes}m${suffix}`
}

function badgeClassFor(status: Status): string {
  switch (status) {
    case 'Active':
      return 'badge-glass-green'
    case 'Disabled':
      return 'badge-glass-neutral'
    case 'Expiring':
      return 'badge-glass-orange'
    case 'Expired':
      return 'badge-glass-red'
  }
}

export default function ChromeExtensionPageContent() {
  const [sessions, setSessions] = useState<BrowserSessionSummary[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [pendingDomain, setPendingDomain] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const res = await backendGet<ListResponse>('/api/browser-sessions')
      setSessions(res.sessions ?? [])
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
      setSessions([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const forget = async (domain: string) => {
    setPendingDomain(domain)
    try {
      await backendDelete(`/api/browser-sessions/${encodeURIComponent(domain)}`)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setPendingDomain(null)
      void load()
    }
  }

  const toggleDisabled = async (domain: string, disabled: boolean) => {
    setPendingDomain(domain)
    try {
      await backendPatch(`/api/browser-sessions/${encodeURIComponent(domain)}`, { disabled })
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setPendingDomain(null)
      void load()
    }
  }

  return (
    <div className="space-y-spacing-4 p-spacing-4 sm:space-y-spacing-6 sm:p-spacing-6">
      <div className="min-w-0">
        <h1 className="typo-h2 uppercase">CHROME EXTENSION</h1>
        <p className="body-2 text-muted-foreground mt-spacing-2">
          Manage the browser sessions captured by the Vibey Mini Chrome extension. Agents use
          these sessions to browse the web as you.
        </p>
      </div>

      <div className="surface-card rounded-spacing-3 p-spacing-4 sm:p-spacing-5">
        <div className="flex flex-col gap-spacing-3 sm:flex-row sm:items-start">
          <Chrome className="icon-md shrink-0" />
          <div className="min-w-0 flex-1">
            <h2 className="body-1-medium">Install the extension</h2>
            <p className="body-3 text-muted-foreground mt-spacing-1">
              Install the Vibey Mini Chrome extension and sign in with the same Vibey account.
              Sessions for approved domains will appear below automatically after your next visit.
            </p>
          </div>
        </div>
      </div>

      <div className="surface-card rounded-spacing-3 overflow-hidden">
        <div className="px-spacing-4 py-spacing-3 flex flex-col gap-spacing-3 sm:flex-row sm:items-center sm:justify-between sm:px-spacing-5 sm:py-spacing-4">
          <h2 className="body-1-medium">Active sessions</h2>
          <button
            type="button"
            className="button-glass-neutral inline-flex max-md:w-full max-md:justify-center rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 font-medium"
            onClick={() => void load()}
            disabled={loading}
          >
            <span className="gap-spacing-2 flex items-center">
              <RefreshCw className="icon-sm" />
              Refresh
            </span>
          </button>
        </div>

        <div className="border-border border-t">
          {loading && sessions == null && (
            <div className="p-spacing-4 body-3 text-muted-foreground sm:p-spacing-5">Loading…</div>
          )}
          {err && (
            <div className="p-spacing-4 body-3 text-red-500 sm:p-spacing-5">{err}</div>
          )}
          {!loading && sessions && sessions.length === 0 && (
            <div className="p-spacing-4 body-3 text-muted-foreground sm:p-spacing-5">
              No sessions saved yet. Install the Vibey Mini extension, approve session sharing in
              the sidepanel, then visit Instagram, TikTok, LinkedIn, X, YouTube, Facebook, or
              Reddit while signed in.
            </div>
          )}
          {sessions &&
            sessions.length > 0 &&
            sessions.map((session) => {
              const status = statusFor(session)
              const badgeClass = badgeClassFor(status)
              const disabled = Boolean(session.disabled_at)
              const pending = pendingDomain === session.domain
              return (
                <div
                  key={session.domain}
                  className="px-spacing-4 py-spacing-4 border-border flex flex-col gap-spacing-3 border-t first:border-t-0 sm:px-spacing-5 sm:py-spacing-4 md:flex-row md:items-start md:justify-between md:gap-spacing-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-spacing-2 gap-y-spacing-1">
                      <span className="body-2-medium break-all">{session.domain}</span>
                      <span className={`badge-glass badge-glass-sm shrink-0 ${badgeClass}`}>
                        {status}
                      </span>
                    </div>
                    <div className="body-3 text-muted-foreground mt-spacing-1">
                      {session.cookie_count} cookies · synced {formatRelative(session.synced_at)}
                      {' · expires '}
                      {formatRelative(session.min_expires_at)}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-spacing-2 max-md:w-full max-md:justify-end">
                    <button
                      type="button"
                      className="button-glass-neutral body-3 rounded-spacing-2 px-spacing-2 py-1 font-medium leading-tight disabled:opacity-50"
                      disabled={pending}
                      onClick={() => void toggleDisabled(session.domain, !disabled)}
                    >
                      {disabled ? 'Enable' : 'Disable'}
                    </button>
                    <button
                      type="button"
                      className="button-glass-neutral inline-flex size-7 items-center justify-center rounded-spacing-2 p-0 disabled:opacity-50 [&_svg]:size-3.5"
                      disabled={pending}
                      onClick={() => void forget(session.domain)}
                      aria-label={`Forget ${session.domain}`}
                    >
                      <Trash2 className="icon-sm" />
                    </button>
                  </div>
                </div>
              )
            })}
        </div>
      </div>
    </div>
  )
}
