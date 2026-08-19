'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ExternalLink, PanelRightOpen, Search } from 'lucide-react'
import { ListSkeleton } from '@/components/ui/feedback/ListSkeleton'
import { fetchAgencyLaunches, type AgencyLaunch } from '@/lib/agency-clients'
import { cn } from '@/lib/utils/cn'
import { formatAgencyDate } from './agency-client-format'
import { AgencyWorkspaceBreadcrumb } from './AgencyWorkspaceBreadcrumb'
import { AGENCY_CLIENT_MESSAGES } from './config/messages.config'

type ViewMode = 'all' | 'day' | 'client'
type KindFilter = 'all' | 'launch' | 'event' | 'webinar' | 'onboarding' | 'assets_due'

const KIND_LABELS: Record<Exclude<KindFilter, 'all'>, string> = {
  launch: 'Launch',
  event: 'Event',
  webinar: 'Webinar',
  onboarding: 'Onboarding',
  assets_due: 'Assets due',
}

export function LaunchesPage() {
  const [launches, setLaunches] = useState<AgencyLaunch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [view, setView] = useState<ViewMode>('day')
  const [kind, setKind] = useState<KindFilter>('all')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const response = await fetchAgencyLaunches(undefined, false)
        if (cancelled) return
        setLaunches(response.launches)
        setLoading(false)

        void fetchAgencyLaunches(undefined, true)
          .then((synced) => {
            if (!cancelled) setLaunches(synced.launches)
          })
          .catch(() => undefined)
      } catch (reason) {
        if (cancelled) return
        setError(
          reason instanceof Error ? reason.message : AGENCY_CLIENT_MESSAGES.LOAD_LAUNCHES_ERROR,
        )
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
      launches.filter((item) => {
        if (kind !== 'all' && item.kind !== kind) return false
        const haystack =
          `${item.name} ${item.client_name || ''} ${item.campaign_name || ''} ${item.kind} ${item.assignee_name || ''}`.toLowerCase()
        return haystack.includes(query.trim().toLowerCase())
      }),
    [kind, launches, query],
  )
  const groups = useMemo(() => {
    if (view === 'all') return [['All launches', filtered] as const]
    const map = new Map<string, AgencyLaunch[]>()
    for (const item of filtered) {
      const label =
        view === 'client' ? item.client_name || 'Unknown client' : formatAgencyDate(item.day_key)
      map.set(label, [...(map.get(label) ?? []), item])
    }
    const entries = [...map.entries()]
    if (view === 'day') {
      return entries.sort((a, b) => {
        const left = a[1][0]?.day_key || a[0]
        const right = b[1][0]?.day_key || b[0]
        return left.localeCompare(right)
      })
    }
    return entries.sort(([a], [b]) => a.localeCompare(b))
  }, [filtered, view])

  return (
    <main className="gap-spacing-6 p-spacing-8 mx-auto flex w-full max-w-7xl flex-col">
      <h1 className="sr-only">LAUNCHES</h1>
      <AgencyWorkspaceBreadcrumb
        items={[{ href: '/clients', label: 'Clients' }, { label: 'Launches' }]}
        action={
          <Link
            href="/launches?surface=portal&portal_path=/launches"
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
            placeholder="Search launches, clients, or campaigns"
            className="h-spacing-9 body-3 bg-secondary text-foreground rounded-spacing-2 border-border pl-spacing-8 pr-spacing-3 focus:ring-primary w-full border outline-none focus:ring-1"
          />
        </label>
        <div className="rounded-spacing-2 border-border p-spacing-1 flex border">
          {(['day', 'client', 'all'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setView(mode)}
              className={cn(
                'button-compact rounded-spacing-1 px-spacing-3',
                view === mode ? 'nav-glass-selected-purple' : 'hover:bg-hover-subtle',
              )}
            >
              {mode === 'day' ? 'By Day' : mode === 'client' ? 'By Client' : 'All Launches'}
            </button>
          ))}
        </div>
        <div className="rounded-spacing-2 border-border p-spacing-1 flex flex-wrap border">
          {(['all', 'launch', 'event', 'webinar', 'onboarding', 'assets_due'] as const).map(
            (mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setKind(mode)}
                className={cn(
                  'button-compact rounded-spacing-1 px-spacing-3',
                  kind === mode ? 'nav-glass-selected-purple' : 'hover:bg-hover-subtle',
                )}
              >
                {mode === 'all' ? 'All kinds' : KIND_LABELS[mode]}
              </button>
            ),
          )}
        </div>
      </div>
      {loading ? <ListSkeleton rows={8} label={AGENCY_CLIENT_MESSAGES.LOADING_LAUNCHES} /> : null}
      {error ? <p className="body-2 text-destructive">{error}</p> : null}
      {!loading && !error
        ? groups.map(([label, rows]) => (
            <section key={label} className="gap-spacing-3 flex flex-col">
              <div className="gap-spacing-2 flex items-center">
                <CalendarDays className="icon-sm text-muted-foreground" />
                <h2 className="body-2 text-foreground font-semibold">{label}</h2>
                <span className="body-4 text-muted-foreground">{rows.length}</span>
              </div>
              <div className="surface-card rounded-spacing-3 border-border overflow-hidden border">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="body-4 text-muted-foreground border-border bg-secondary border-b text-left">
                        <th className="px-spacing-4 py-spacing-3 font-medium">Kind</th>
                        <th className="px-spacing-4 py-spacing-3 font-medium">Name</th>
                        <th className="px-spacing-4 py-spacing-3 font-medium">Client</th>
                        <th className="px-spacing-4 py-spacing-3 font-medium">Campaign</th>
                        <th className="px-spacing-4 py-spacing-3 font-medium">Assignee</th>
                        <th className="px-spacing-4 py-spacing-3 font-medium">Date</th>
                        <th className="px-spacing-4 py-spacing-3 font-medium">Time</th>
                        <th className="px-spacing-4 py-spacing-3 text-right font-medium">
                          Options
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((item) => (
                        <tr
                          key={item.id}
                          className="hover:bg-hover-subtle border-border border-b last:border-b-0"
                        >
                          <td className="px-spacing-4 py-spacing-3 align-top">
                            <span className="body-4 bg-secondary text-muted-foreground px-spacing-2 py-spacing-1 inline-flex whitespace-nowrap rounded-full capitalize">
                              {kindLabel(item.kind)}
                            </span>
                          </td>
                          <td className="px-spacing-4 py-spacing-3 align-top">
                            {item.roas_space_id ? (
                              <Link
                                href={`/spaces?space=${encodeURIComponent(item.roas_space_id)}`}
                                className="body-3 text-foreground hover:text-primary font-medium"
                              >
                                {item.name}
                              </Link>
                            ) : (
                              <span className="body-3 text-foreground font-medium">
                                {item.name}
                              </span>
                            )}
                          </td>
                          <td className="body-3 text-muted-foreground px-spacing-4 py-spacing-3 whitespace-nowrap align-top">
                            {item.client_name || 'Client'}
                          </td>
                          <td className="body-3 text-muted-foreground px-spacing-4 py-spacing-3 whitespace-nowrap align-top">
                            {item.campaign_name || '—'}
                          </td>
                          <td className="body-3 text-muted-foreground px-spacing-4 py-spacing-3 whitespace-nowrap align-top">
                            {item.assignee_name || 'Unassigned'}
                          </td>
                          <td className="body-3 text-muted-foreground px-spacing-4 py-spacing-3 whitespace-nowrap align-top">
                            {formatAgencyDate(item.day_key)}
                          </td>
                          <td className="body-3 text-muted-foreground px-spacing-4 py-spacing-3 whitespace-nowrap align-top">
                            {formatLaunchTime(item)}
                          </td>
                          <td className="px-spacing-4 py-spacing-3 align-top">
                            <div className="flex justify-end">
                              <Link
                                href={launchHref(item)}
                                aria-label={`Open ${item.name}`}
                                className="btn-icon-bare hover:bg-hover-subtle text-muted-foreground hover:text-foreground"
                              >
                                <ExternalLink className="icon-sm" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
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

function kindLabel(kind: string) {
  return KIND_LABELS[kind as Exclude<KindFilter, 'all'>] || readable(kind)
}

function readable(value: string) {
  return value.replace(/[_-]/g, ' ').toLowerCase()
}

function formatLaunchTime(item: AgencyLaunch): string {
  if (typeof item.event_time === 'string' && item.event_time.trim()) return item.event_time
  if (typeof item.starts_at === 'string' && item.starts_at) {
    const date = new Date(item.starts_at)
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    }
  }
  return '—'
}

function launchHref(item: AgencyLaunch): string {
  if (item.roas_space_id) return `/spaces?space=${encodeURIComponent(item.roas_space_id)}`
  const path =
    typeof item.portal_path === 'string' &&
    item.portal_path.startsWith('/') &&
    !item.portal_path.startsWith('//')
      ? item.portal_path
      : '/launches'
  return `/launches?surface=portal&portal_path=${encodeURIComponent(path)}`
}
