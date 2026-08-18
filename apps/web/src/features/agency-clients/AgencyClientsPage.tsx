'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { BriefcaseBusiness, PanelRightOpen, Search } from 'lucide-react'
import { ListSkeleton } from '@/components/ui/feedback/ListSkeleton'
import { fetchAgencyClients, type AgencyClient } from '@/lib/agency-clients'
import { cn } from '@/lib/utils/cn'
import { AgencyClientsTable } from './AgencyClientsTable'
import { AgencyWorkspaceBreadcrumb } from './AgencyWorkspaceBreadcrumb'
import { AGENCY_CLIENT_MESSAGES } from './config/messages.config'

type GroupMode = 'pipeline' | 'manager'

function groupLabel(client: AgencyClient, mode: GroupMode) {
  if (mode === 'manager') return client.account_manager?.name || 'Unassigned'
  return client.pipeline_stage || client.status || 'Active'
}

export function AgencyClientsPage() {
  const [clients, setClients] = useState<AgencyClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [groupMode, setGroupMode] = useState<GroupMode>('manager')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const response = await fetchAgencyClients('', false)
        if (cancelled) return
        setClients(response.clients)
        setLoading(false)

        // Client cards should never wait for a potentially large Brain import. Reconcile
        // missing mappings after the canonical Page Grader list is already usable.
        void fetchAgencyClients('', true)
          .then((synced) => {
            if (!cancelled) setClients(synced.clients)
          })
          .catch(() => undefined)
      } catch (reason) {
        if (cancelled) return
        setError(reason instanceof Error ? reason.message : 'Could not load clients')
        setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const groups = useMemo(() => {
    const filtered = clients.filter((client) =>
      `${client.display_name || client.name} ${client.account_manager?.name || ''}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
    )
    const map = new Map<string, AgencyClient[]>()
    for (const client of filtered) {
      const label = groupLabel(client, groupMode)
      map.set(label, [...(map.get(label) ?? []), client])
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [clients, groupMode, query])

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
              {mode === 'pipeline' ? 'Pipeline stage' : 'Account manager'}
            </button>
          ))}
        </div>
        <Link href="/client-campaigns" className="button-compact button-glass-neutral">
          <BriefcaseBusiness className="icon-sm" /> Client Campaigns
        </Link>
      </div>

      {loading ? <ListSkeleton rows={8} label={AGENCY_CLIENT_MESSAGES.LOADING_CLIENTS} /> : null}
      {error ? (
        <p className="body-2 text-destructive surface-card rounded-spacing-3 p-spacing-4">
          {error}
        </p>
      ) : null}
      {!loading && !error ? <AgencyClientsTable groups={groups} /> : null}
    </main>
  )
}
