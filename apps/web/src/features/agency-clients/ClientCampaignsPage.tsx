'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, FolderKanban, PanelRightOpen, Search } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { fetchAgencyClientCampaigns, type AgencyClientCampaign } from '@/lib/agency-clients'
import { cn } from '@/lib/utils/cn'
import { formatAgencyDate } from './agency-client-format'
import { AgencyWorkspaceBreadcrumb } from './AgencyWorkspaceBreadcrumb'

type ViewMode = 'all' | 'client'

export function ClientCampaignsPage() {
  const [campaigns, setCampaigns] = useState<AgencyClientCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [view, setView] = useState<ViewMode>('all')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const response = await fetchAgencyClientCampaigns(undefined, false)
        if (cancelled) return
        setCampaigns(response.campaigns)
        setLoading(false)

        // Show the Page Grader campaign inventory first, then refresh Space links as
        // the two-way ROAS mapping pass finishes.
        void fetchAgencyClientCampaigns(undefined, true)
          .then((synced) => {
            if (!cancelled) setCampaigns(synced.campaigns)
          })
          .catch(() => undefined)
      } catch (reason) {
        if (cancelled) return
        setError(reason instanceof Error ? reason.message : 'Could not load campaigns')
        setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
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
      <h1 className="sr-only">CLIENT CAMPAIGNS</h1>
      <AgencyWorkspaceBreadcrumb
        items={[{ href: '/clients', label: 'Clients' }, { label: 'Client Campaigns' }]}
        action={
          <Link
            href="/client-campaigns?surface=portal&portal_path=/campaigns"
            className="button-compact button-glass-purple"
          >
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
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="body-4 text-muted-foreground border-border bg-secondary border-b text-left">
                        <th className="px-spacing-4 py-spacing-3 font-medium">Stage</th>
                        <th className="px-spacing-4 py-spacing-3 font-medium">Campaign Name</th>
                        <th className="px-spacing-4 py-spacing-3 font-medium">Type</th>
                        <th className="px-spacing-4 py-spacing-3 font-medium">Created By</th>
                        <th className="px-spacing-4 py-spacing-3 font-medium">Account Manager</th>
                        <th className="px-spacing-4 py-spacing-3 font-medium">Client</th>
                        <th className="px-spacing-4 py-spacing-3 font-medium">Launch Day</th>
                        <th className="px-spacing-4 py-spacing-3 text-right font-medium">
                          Options
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((campaign) => {
                        const clientName =
                          campaign.clients?.friendly_name || campaign.clients?.name || 'Client'
                        return (
                          <tr
                            key={campaign.id}
                            className="hover:bg-hover-subtle border-border border-b last:border-b-0"
                          >
                            <td className="px-spacing-4 py-spacing-3 align-top">
                              <span className="body-4 bg-secondary text-muted-foreground px-spacing-2 py-spacing-1 inline-flex whitespace-nowrap rounded-full capitalize">
                                {readable(campaign.status || campaign.platform_status)}
                              </span>
                            </td>
                            <td className="px-spacing-4 py-spacing-3 align-top">
                              {campaign.roas_space_id ? (
                                <Link
                                  href={`/spaces?space=${encodeURIComponent(campaign.roas_space_id)}`}
                                  className="body-3 text-foreground hover:text-primary font-medium"
                                >
                                  {campaign.name}
                                </Link>
                              ) : (
                                <span className="body-3 text-foreground font-medium">
                                  {campaign.name}
                                </span>
                              )}
                            </td>
                            <td className="body-3 text-muted-foreground px-spacing-4 py-spacing-3 whitespace-nowrap align-top capitalize">
                              {readable(String(campaign.campaign_type || 'Not set'))}
                            </td>
                            <td className="body-3 text-muted-foreground px-spacing-4 py-spacing-3 whitespace-nowrap align-top">
                              {String(campaign.created_by_name || 'Portal')}
                            </td>
                            <td className="body-3 text-muted-foreground px-spacing-4 py-spacing-3 whitespace-nowrap align-top">
                              {campaign.clients?.assignee_name ||
                                campaign.clients?.assignee_email ||
                                'Unassigned'}
                            </td>
                            <td className="body-3 text-muted-foreground px-spacing-4 py-spacing-3 whitespace-nowrap align-top">
                              {clientName}
                            </td>
                            <td className="body-3 text-muted-foreground px-spacing-4 py-spacing-3 whitespace-nowrap align-top">
                              {formatAgencyDate(campaign.start_date)}
                            </td>
                            <td className="px-spacing-4 py-spacing-3 align-top">
                              <div className="flex justify-end">
                                <Link
                                  href={
                                    campaign.roas_space_id
                                      ? `/spaces?space=${encodeURIComponent(campaign.roas_space_id)}`
                                      : `/client-campaigns?surface=portal&portal_path=${encodeURIComponent(`/campaigns/${campaign.id}`)}`
                                  }
                                  aria-label={`Open ${campaign.name}`}
                                  className="btn-icon-bare hover:bg-hover-subtle text-muted-foreground hover:text-foreground"
                                >
                                  <ExternalLink className="icon-sm" />
                                </Link>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          ))
        : null}
    </main>
  )
}

function readable(value: string) {
  return value.replace(/[_-]/g, ' ').toLowerCase()
}
