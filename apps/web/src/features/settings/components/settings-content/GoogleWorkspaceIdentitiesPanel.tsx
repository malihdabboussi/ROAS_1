'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { backendGet, backendPost } from '@/lib/api/backend-client'

type StatusResponse = {
  success: boolean
  connected: boolean
  clientEmail?: string | null
  workspaceAdminEmail?: string | null
  lastDirectorySyncAt?: string | null
}

/**
 * Integrations Org tab: connect/sync only. Identity review lives in People → Calendars.
 */
export function GoogleWorkspaceIdentitiesPanel() {
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const nextStatus = await backendGet<StatusResponse>(
        '/api/integrations/google-workspace/status',
      )
      setStatus(nextStatus)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load Workspace status')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const runAction = async (key: string, action: () => Promise<unknown>) => {
    setBusy(key)
    setError(null)
    setLastResult(null)
    try {
      await action()
      await load()
      setLastResult(key === 'sync' ? 'Directory synced.' : 'Slack / portal matched.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return (
      <div className="surface-card rounded-spacing-3 p-spacing-4 flex items-center justify-center">
        <Loader2 className="icon-sm text-muted-foreground animate-spin" />
      </div>
    )
  }

  if (!status?.connected) {
    return (
      <div className="surface-card rounded-spacing-3 p-spacing-4 space-y-spacing-2">
        <h3 className="title-h6">GOOGLE WORKSPACE</h3>
        <p className="body-3 text-muted-foreground">
          Connect Google Workspace from the Library (service account + domain-wide delegation).
          After connect, Sync Directory here — then review Team Agenda matches in People →
          Calendars.
        </p>
        {error ? <p className="body-3 text-destructive">{error}</p> : null}
      </div>
    )
  }

  return (
    <div className="surface-card rounded-spacing-3 p-spacing-4 space-y-spacing-3">
      <div className="gap-spacing-3 flex flex-wrap items-start justify-between">
        <div className="space-y-spacing-1">
          <h3 className="title-h6">GOOGLE WORKSPACE</h3>
          <p className="body-3 text-muted-foreground">
            {status.clientEmail ? `Service account: ${status.clientEmail}` : 'Connected'}
            {status.workspaceAdminEmail ? ` · Admin: ${status.workspaceAdminEmail}` : ''}. Sync
            Directory here; approve people for Team Agenda in People.
          </p>
        </div>
        <div className="gap-spacing-2 flex flex-wrap">
          <button
            type="button"
            className="button-glass body-3 px-spacing-3 py-spacing-1"
            disabled={Boolean(busy)}
            onClick={() =>
              runAction('seed', () =>
                backendPost('/api/integrations/google-workspace/identities/seed-from-org', {}),
              )
            }
          >
            {busy === 'seed' ? 'Matching…' : 'Match Slack / portal'}
          </button>
          <button
            type="button"
            className="button-glass body-3 gap-spacing-1 px-spacing-3 py-spacing-1 inline-flex items-center"
            disabled={Boolean(busy)}
            onClick={() =>
              runAction('sync', () =>
                backendPost('/api/integrations/google-workspace/sync-directory', {}),
              )
            }
          >
            <RefreshCw className="icon-xs" />
            {busy === 'sync' ? 'Syncing…' : 'Sync Directory'}
          </button>
        </div>
      </div>
      {error ? <p className="body-3 text-destructive">{error}</p> : null}
      {lastResult ? <p className="body-3 text-muted-foreground">{lastResult}</p> : null}
      <a
        href="/team?section=people&peopleView=calendars"
        className="body-3 text-primary inline-flex font-medium underline-offset-2 hover:underline"
      >
        Review Team calendars in People →
      </a>
    </div>
  )
}
