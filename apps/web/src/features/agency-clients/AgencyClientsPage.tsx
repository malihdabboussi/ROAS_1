'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { BriefcaseBusiness, Search, Users } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { fetchAgencyClients, type AgencyClient } from '@/lib/agency-clients'
import { cn } from '@/lib/utils/cn'

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
  const [groupMode, setGroupMode] = useState<GroupMode>('pipeline')

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
      <header className="gap-spacing-4 flex flex-wrap items-end justify-between">
        <div>
          <p className="typo-section-label text-muted-foreground">Agency workspace</p>
          <h1 className="title-h6 text-foreground">CLIENTS</h1>
          <p className="body-3 text-muted-foreground mt-spacing-1">
            The ROAS Portal clients, campaign work, requests, and Brain context in one view.
          </p>
        </div>
        <Link href="/client-campaigns" className="button-compact button-glass-neutral">
          <BriefcaseBusiness className="icon-sm" /> Client Campaigns
        </Link>
      </header>

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
      </div>

      {loading ? <VibeyLoadingOrb /> : null}
      {error ? (
        <p className="body-2 text-destructive surface-card rounded-spacing-3 p-spacing-4">
          {error}
        </p>
      ) : null}
      {!loading && !error ? (
        <div className="gap-spacing-6 flex flex-col">
          {groups.map(([label, rows]) => (
            <section key={label}>
              <div className="mb-spacing-3 gap-spacing-2 flex items-center">
                <Users className="icon-sm text-muted-foreground" />
                <h2 className="body-2 text-foreground font-semibold capitalize">{label}</h2>
                <span className="body-4 text-muted-foreground">{rows.length}</span>
              </div>
              <div className="gap-spacing-3 grid md:grid-cols-2 xl:grid-cols-3">
                {rows.map((client) => (
                  <Link
                    key={client.id}
                    href={`/clients/${client.id}`}
                    className="surface-card hover:bg-hover-subtle rounded-spacing-3 border-border p-spacing-4 border transition-colors"
                  >
                    <div className="gap-spacing-3 flex items-start">
                      <div className="bg-secondary h-spacing-10 w-spacing-10 rounded-spacing-2 flex shrink-0 items-center justify-center overflow-hidden">
                        {client.logo_url ? (
                          <Image
                            src={client.logo_url}
                            alt=""
                            width={40}
                            height={40}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="body-2 text-foreground font-semibold">
                            {(client.display_name || client.name).slice(0, 1).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="body-2 text-foreground truncate font-semibold">
                          {client.display_name || client.name}
                        </h3>
                        <p className="body-4 text-muted-foreground truncate">
                          {client.account_manager?.name || 'Unassigned'}
                        </p>
                      </div>
                      <span className="body-4 bg-secondary text-muted-foreground rounded-spacing-4 px-spacing-2 py-spacing-1 capitalize">
                        {client.pipeline_stage || client.status}
                      </span>
                    </div>
                    {client.overview ? (
                      <p className="body-3 text-muted-foreground mt-spacing-3 line-clamp-2">
                        {client.overview}
                      </p>
                    ) : null}
                    <div className="body-4 text-muted-foreground mt-spacing-4 gap-spacing-4 border-border pt-spacing-3 flex border-t">
                      <span>{client.counts?.campaigns ?? 0} campaigns</span>
                      <span>{client.counts?.open_tasks ?? 0} tasks</span>
                      <span>{client.counts?.open_requests ?? 0} requests</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </main>
  )
}
