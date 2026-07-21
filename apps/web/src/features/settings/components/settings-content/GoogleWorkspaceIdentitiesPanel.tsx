'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { backendGet, backendPost } from '@/lib/api/backend-client'

type CalendarIdentity = {
  id: string
  calendar_email: string
  display_name: string | null
  match_status: 'unmatched' | 'suggested' | 'confirmed' | 'rejected'
  match_method: string | null
  source: string
  channel_member_id: string | null
  vibey_user_id: string | null
  person_brain_id: string | null
  suggested_channel_member_id: string | null
  suggested_vibey_user_id: string | null
  suggested_person_brain_id: string | null
  personal_connection_label: string | null
}

type StatusResponse = {
  success: boolean
  connected: boolean
  clientEmail?: string | null
  workspaceAdminEmail?: string | null
  lastDirectorySyncAt?: string | null
}

/**
 * Admin controls for the org person ↔ calendar email graph.
 * Shown on the Org integrations tab when Google Workspace is connected (or after seed).
 */
export function GoogleWorkspaceIdentitiesPanel() {
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [identities, setIdentities] = useState<CalendarIdentity[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const nextStatus = await backendGet<StatusResponse>(
        '/api/integrations/google-workspace/status',
      )
      setStatus(nextStatus)
      if (nextStatus.connected) {
        const list = await backendGet<{ success: boolean; identities: CalendarIdentity[] }>(
          '/api/integrations/google-workspace/identities',
        )
        setIdentities(list.identities ?? [])
      } else {
        setIdentities([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load Workspace calendar identities')
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
    try {
      await action()
      await load()
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
        <h3 className="title-h6">GOOGLE WORKSPACE CALENDARS</h3>
        <p className="body-3 text-muted-foreground">
          Connect Google Workspace from the Library (service account + domain-wide delegation) to
          sync Directory emails and map them to Slack People, portal users, and Person Brains.
        </p>
        {error ? <p className="body-3 text-destructive">{error}</p> : null}
      </div>
    )
  }

  return (
    <div className="surface-card rounded-spacing-3 p-spacing-4 space-y-spacing-4">
      <div className="gap-spacing-3 flex flex-wrap items-start justify-between">
        <div className="space-y-spacing-1">
          <h3 className="title-h6">GOOGLE WORKSPACE CALENDARS</h3>
          <p className="body-3 text-muted-foreground">
            {status.clientEmail ? `Service account: ${status.clientEmail}` : 'Connected'}
            {status.workspaceAdminEmail ? ` · Admin: ${status.workspaceAdminEmail}` : ''}
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
            {busy === 'seed' ? 'Seeding…' : 'Seed from Slack / portal'}
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

      {identities.length === 0 ? (
        <p className="body-3 text-muted-foreground">
          No calendar identities yet. Sync Directory or seed from Slack / portal emails.
        </p>
      ) : (
        <div className="space-y-spacing-2">
          {identities.map((identity) => (
            <div
              key={identity.id}
              className="border-border rounded-spacing-2 p-spacing-3 gap-spacing-3 flex flex-wrap items-center justify-between border"
            >
              <div className="space-y-spacing-1 min-w-0">
                <p className="body-2 text-foreground truncate">
                  {identity.display_name || identity.calendar_email}
                </p>
                <p className="body-4 text-muted-foreground truncate">
                  {identity.calendar_email} · {identity.match_status} · {identity.source}
                </p>
              </div>
              <div className="gap-spacing-2 flex flex-wrap">
                {identity.match_status === 'suggested' ? (
                  <>
                    <button
                      type="button"
                      className="button-glass body-3 px-spacing-3 py-spacing-1"
                      disabled={Boolean(busy)}
                      onClick={() =>
                        runAction(`confirm-${identity.id}`, () =>
                          backendPost(
                            `/api/integrations/google-workspace/identities/${identity.id}/confirm`,
                            {},
                          ),
                        )
                      }
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      className="button-glass body-3 px-spacing-3 py-spacing-1"
                      disabled={Boolean(busy)}
                      onClick={() =>
                        runAction(`reject-${identity.id}`, () =>
                          backendPost(
                            `/api/integrations/google-workspace/identities/${identity.id}/reject`,
                            {},
                          ),
                        )
                      }
                    >
                      Reject
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
