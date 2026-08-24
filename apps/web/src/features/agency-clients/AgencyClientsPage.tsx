'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { PanelRightOpen, Search } from 'lucide-react'
import { ListSkeleton } from '@/components/ui/feedback/ListSkeleton'
import {
  fetchAgencyClients,
  groupClientsByManager,
  groupClientsByPipeline,
  updateAgencyWorkspaceEntity,
  visiblePipelineClients,
  type AgencyClient,
} from '@/lib/agency-clients'
import { cn } from '@/lib/utils/cn'
import { AgencyClientsTable } from './AgencyClientsTable'
import { AgencyWorkspaceBreadcrumb } from './AgencyWorkspaceBreadcrumb'
import { AGENCY_CLIENT_MESSAGES } from './config/messages.config'

type GroupMode = 'pipeline' | 'manager'

export function AgencyClientsPage() {
  const [clients, setClients] = useState<AgencyClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [groupMode, setGroupMode] = useState<GroupMode>('pipeline')
  const [showInactive, setShowInactive] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const response = await fetchAgencyClients('', false)
        if (cancelled) return
        setClients(response?.clients ?? [])
        setLoading(false)

        // Client cards should never wait for a potentially large Brain import. Reconcile
        // missing mappings after the canonical Page Grader list is already usable.
        void fetchAgencyClients('', true)
          .then((synced) => {
            if (!cancelled && synced?.clients) setClients(synced.clients)
          })
          .catch(() => undefined)
      } catch (reason) {
        if (cancelled) return
        setError(
          reason instanceof Error ? reason.message : AGENCY_CLIENT_MESSAGES.LOAD_CLIENTS_ERROR,
        )
        setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const groups = useMemo(() => {
    const visible = visiblePipelineClients(clients, { query, includeHidden: showInactive })
    return groupMode === 'manager'
      ? groupClientsByManager(visible)
      : groupClientsByPipeline(visible)
  }, [clients, groupMode, query, showInactive])

  const updateClientStatus = async (client: AgencyClient, status: string) => {
    await updateAgencyWorkspaceEntity(client.id, { kind: 'client', patch: { status } })
    setClients((rows) =>
      rows.map((row) => (row.id === client.id ? { ...row, status, pipeline_stage: status } : row)),
    )
  }

  return (
    <main className="gap-spacing-6 p-spacing-8 mx-auto flex w-full max-w-7xl flex-col">
      <h1 className="sr-only">CLIENTS</h1>
      <AgencyWorkspaceBreadcrumb
        items={[{ label: 'Clients' }]}
        action={
          <Link href="/clients?surface=portal" className="button-compact button-glass-purple">
            <PanelRightOpen className="icon-sm" /> Portal
          </Link>
        }
      />

      <div className="surface-card gap-spacing-2 rounded-spacing-3 border-border p-spacing-3 flex flex-wrap items-center border">
        <label className="relative min-w-64 flex-1">
          <Search className="icon-sm text-muted-foreground left-spacing-3 absolute top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search clients"
            className="h-spacing-9 body-3 bg-secondary text-foreground rounded-spacing-2 border-border pl-spacing-8 pr-spacing-3 focus:ring-primary w-full border outline-none focus:ring-1"
          />
        </label>
        <div className="rounded-spacing-2 border-border p-spacing-1 flex border">
          {(['pipeline', 'manager'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setGroupMode(mode)}
              className={cn(
                'button-compact rounded-spacing-1 px-spacing-3 capitalize',
                groupMode === mode ? 'nav-glass-selected-purple' : 'hover:bg-hover-subtle',
              )}
            >
              {mode === 'pipeline'
                ? AGENCY_CLIENT_MESSAGES.PIPELINE_STAGE
                : AGENCY_CLIENT_MESSAGES.ACCOUNT_MANAGER}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-pressed={showInactive}
          onClick={() => setShowInactive((current) => !current)}
          className={cn(
            'button-compact rounded-spacing-2 border-border px-spacing-3 border',
            showInactive ? 'nav-glass-selected-purple' : 'hover:bg-hover-subtle',
          )}
        >
          {AGENCY_CLIENT_MESSAGES.SHOW_INACTIVE}
        </button>
      </div>

      {loading ? <ListSkeleton rows={8} label={AGENCY_CLIENT_MESSAGES.LOADING_CLIENTS} /> : null}
      {error ? (
        <p className="body-2 text-destructive surface-card rounded-spacing-3 p-spacing-4">
          {error}
        </p>
      ) : null}
      {!loading && !error && groups.length === 0 ? (
        <p className="body-2 text-muted-foreground surface-card rounded-spacing-3 p-spacing-4">
          {AGENCY_CLIENT_MESSAGES.NO_VISIBLE_CLIENTS}
        </p>
      ) : null}
      {!loading && !error && groups.length > 0 ? (
        <AgencyClientsTable
          groups={groups}
          showManagerColumn={groupMode !== 'manager'}
          onStatusChange={updateClientStatus}
        />
      ) : null}
    </main>
  )
}
