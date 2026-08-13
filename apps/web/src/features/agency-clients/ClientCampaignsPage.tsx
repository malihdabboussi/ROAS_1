'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, FolderKanban, Search } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { fetchAgencyClientCampaigns, type AgencyClientCampaign } from '@/lib/agency-clients'
import { cn } from '@/lib/utils/cn'
import { formatAgencyBudget, formatAgencyDate } from './agency-client-format'

type ViewMode = 'all' | 'client'

export function ClientCampaignsPage() {
  const [campaigns, setCampaigns] = useState<AgencyClientCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [view, setView] = useState<ViewMode>('all')

  useEffect(() => {
    void fetchAgencyClientCampaigns()
      .then((response) => setCampaigns(response.campaigns))
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : 'Could not load campaigns'),
      )
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(
    () =>
      campaigns.filter((campaign) =>
        `${campaign.name} ${campaign.clients?.friendly_name || campaign.clients?.name || ''}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      ),
    [campaigns, query],
  )
  const groups = useMemo(() => {
    if (view === 'all') return [['All campaigns', filtered] as const]
    const map = new Map<string, AgencyClientCampaign[]>()
    for (const campaign of filtered) {
      const name = campaign.clients?.friendly_name || campaign.clients?.name || 'Unknown client'
      map.set(name, [...(map.get(name) ?? []), campaign])
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [filtered, view])

  return (
    <main className="gap-spacing-6 p-spacing-8 mx-auto flex w-full max-w-7xl flex-col">
      <header>
        <p className="typo-section-label text-muted-foreground">Agency workspace</p>
        <h1 className="title-h6 text-foreground">CLIENT CAMPAIGNS</h1>
        <p className="body-3 text-muted-foreground mt-spacing-1">
          Client campaigns from The ROAS Portal, mapped to ROAS Spaces.
        </p>
      </header>
      <div className="surface-card gap-spacing-2 rounded-spacing-3 border-border p-spacing-3 flex flex-wrap items-center border">
        <label className="relative min-w-64 flex-1">
          <Search className="icon-sm text-muted-foreground left-spacing-3 absolute top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search campaigns or clients"
            className="h-spacing-9 body-3 bg-secondary text-foreground rounded-spacing-2 border-border pl-spacing-8 pr-spacing-3 focus:ring-primary w-full border outline-none focus:ring-1"
          />
        </label>
        <div className="rounded-spacing-2 border-border p-spacing-1 flex border">
          {(['all', 'client'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setView(mode)}
              className={cn(
                'button-compact rounded-spacing-1 px-spacing-3',
                view === mode ? 'nav-glass-selected-purple' : 'hover:bg-hover-subtle',
              )}
            >
              {mode === 'all' ? 'All Campaigns' : 'Campaigns by Client'}
            </button>
          ))}
        </div>
      </div>
      {loading ? <VibeyLoadingOrb /> : null}
      {error ? <p className="body-2 text-destructive">{error}</p> : null}
      {!loading && !error
        ? groups.map(([label, rows]) => (
            <section key={label} className="gap-spacing-3 flex flex-col">
              <div className="gap-spacing-2 flex items-center">
                <FolderKanban className="icon-sm text-muted-foreground" />
                <h2 className="body-2 text-foreground font-semibold">{label}</h2>
                <span className="body-4 text-muted-foreground">{rows.length}</span>
              </div>
              <div className="surface-card rounded-spacing-3 border-border overflow-hidden border">
                <div className="body-4 text-muted-foreground gap-spacing-3 border-border bg-secondary px-spacing-4 py-spacing-2 grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] border-b">
                  <span>Campaign</span>
                  <span>Date / event</span>
                  <span>Budget</span>
                  <span>Status</span>
                </div>
                {rows.map((campaign) => {
                  const content = (
                    <>
                      <div className="min-w-0">
                        <p className="body-3 text-foreground truncate font-medium">
                          {campaign.name}
                        </p>
                        <p className="body-4 text-muted-foreground truncate">
                          {campaign.clients?.friendly_name || campaign.clients?.name || 'Client'}
                        </p>
                      </div>
                      <span className="body-3 text-muted-foreground gap-spacing-1 flex items-center">
                        <CalendarDays className="icon-xs" />
                        {formatAgencyDate(campaign.event_date || campaign.start_date)}
                      </span>
                      <span className="body-3 text-muted-foreground">
                        {formatAgencyBudget(
                          campaign.budget_amount,
                          campaign.currency,
                          campaign.budget_type,
                        )}
                      </span>
                      <span className="body-3 text-muted-foreground capitalize">
                        {campaign.status || campaign.platform_status}
                      </span>
                    </>
                  )
                  const cls =
                    'hover:bg-hover-subtle grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-spacing-3 border-b border-border px-spacing-4 py-spacing-3 last:border-b-0'
                  return campaign.roas_space_id ? (
                    <Link
                      key={campaign.id}
                      href={`/spaces?space=${campaign.roas_space_id}`}
                      className={cls}
                    >
                      {content}
                    </Link>
                  ) : (
                    <div key={campaign.id} className={cls}>
                      {content}
                    </div>
                  )
                })}
              </div>
            </section>
          ))
        : null}
    </main>
  )
}
