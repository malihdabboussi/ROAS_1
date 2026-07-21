'use client'

import { useEffect, useState } from 'react'
import { Loader2, ShieldCheck, User, Users } from 'lucide-react'
import { backendGet } from '@/lib/api/backend-client'
import { getIntegrationLogoPath } from '@/lib/integrations/integration-logo'
import { GoogleWorkspaceIdentitiesPanel } from './GoogleWorkspaceIdentitiesPanel'

interface OrgConnectedAccount {
  id: string
  user_id: string
  integration_id: string
  provider: string
  status: string
  scope_mode: 'personal' | 'org_shared'
  is_default: boolean
  connection_label: string | null
  connected_at: string | null
  updated_at: string | null
  person: { id: string; name: string | null; email: string | null } | null
}

interface OrgConnectedAccountsResponse {
  success: boolean
  accounts: OrgConnectedAccount[]
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === 'connected'
      ? 'bg-success/15 text-success'
      : status === 'error'
        ? 'bg-destructive/15 text-destructive'
        : 'bg-muted text-muted-foreground'
  return (
    <span
      className={`body-3 rounded-spacing-1 px-spacing-2 inline-flex items-center py-0.5 ${tone}`}
    >
      {status}
    </span>
  )
}

function ScopePill({ scope, isDefault }: { scope: 'personal' | 'org_shared'; isDefault: boolean }) {
  if (scope === 'org_shared') {
    return (
      <span className="body-3 gap-spacing-1 rounded-spacing-1 bg-primary/10 text-primary px-spacing-2 inline-flex items-center py-0.5">
        <Users className="icon-xs" />
        Shared{isDefault ? ' · default' : ''}
      </span>
    )
  }
  return (
    <span className="body-3 gap-spacing-1 rounded-spacing-1 bg-muted text-muted-foreground px-spacing-2 inline-flex items-center py-0.5">
      <User className="icon-xs" />
      Personal
    </span>
  )
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return '—'
  }
}

/**
 * Phase 5 of fathom-org-sharing. Admin-only surface showing every connected
 * integration across the org in one table. Sourced from
 * `GET /api/integrations/org/connected-accounts`. Read-only — actions on a
 * specific row still happen from the Manage tab via the standard
 * `ConnectedIntegrationCard`.
 */
export function OrgConnectedAccountsPanel() {
  const [data, setData] = useState<OrgConnectedAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    backendGet<OrgConnectedAccountsResponse>('/api/integrations/org/connected-accounts')
      .then((res) => {
        if (cancelled) return
        setData(res.accounts ?? [])
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Could not load org accounts')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="space-y-spacing-4">
        <div className="surface-card rounded-spacing-3 p-spacing-6 gap-spacing-2 flex items-center">
          <Loader2 className="icon-sm text-muted-foreground animate-spin" />
          <span className="body-3 text-muted-foreground">Loading org connected accounts…</span>
        </div>
        <GoogleWorkspaceIdentitiesPanel />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-spacing-4">
        <div className="surface-card rounded-spacing-3 p-spacing-6 border-destructive/20 bg-destructive/5">
          <p className="body-3 text-destructive">{error}</p>
        </div>
        <GoogleWorkspaceIdentitiesPanel />
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="space-y-spacing-4">
        <div className="surface-card rounded-spacing-3 p-spacing-6 gap-spacing-2 flex items-center">
          <ShieldCheck className="icon-sm text-muted-foreground" />
          <span className="body-3 text-muted-foreground">
            No org-scoped or org-shared connections yet. Members who share an integration with the
            org will appear here.
          </span>
        </div>
        <GoogleWorkspaceIdentitiesPanel />
      </div>
    )
  }

  return (
    <div className="space-y-spacing-4">
      <div className="surface-card rounded-spacing-3 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/40 typo-caption text-muted-foreground text-left">
              <th className="px-spacing-4 py-spacing-2 font-medium">Person</th>
              <th className="px-spacing-4 py-spacing-2 font-medium">Integration</th>
              <th className="px-spacing-4 py-spacing-2 font-medium">Scope</th>
              <th className="px-spacing-4 py-spacing-2 font-medium">Status</th>
              <th className="px-spacing-4 py-spacing-2 font-medium">Connected</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const logo = getIntegrationLogoPath(row.provider)
              const personLabel =
                row.person?.name?.trim() || row.person?.email?.trim() || row.user_id.slice(0, 8)
              return (
                <tr key={row.id} className="border-border border-t">
                  <td className="px-spacing-4 py-spacing-2 body-3 text-foreground">
                    <div className="flex flex-col">
                      <span className="font-medium">{personLabel}</span>
                      {row.person?.email && row.person.email !== personLabel ? (
                        <span className="typo-caption text-muted-foreground">
                          {row.person.email}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-spacing-4 py-spacing-2 body-3 text-foreground">
                    <div className="gap-spacing-2 flex items-center">
                      {logo ? (
                        <img
                          src={logo}
                          alt={row.provider}
                          className="h-5 w-5 shrink-0 object-contain"
                        />
                      ) : null}
                      <span>{row.integration_id}</span>
                      {row.connection_label ? (
                        <span className="typo-caption text-muted-foreground">
                          ({row.connection_label})
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-spacing-4 py-spacing-2">
                    <ScopePill scope={row.scope_mode} isDefault={row.is_default} />
                  </td>
                  <td className="px-spacing-4 py-spacing-2">
                    <StatusPill status={row.status} />
                  </td>
                  <td className="px-spacing-4 py-spacing-2 body-3 text-muted-foreground">
                    {formatDate(row.connected_at ?? row.updated_at)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <GoogleWorkspaceIdentitiesPanel />
    </div>
  )
}
