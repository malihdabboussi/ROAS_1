'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, List, PanelRightOpen, Plus } from 'lucide-react'
import { ListSkeleton } from '@/components/ui/feedback/ListSkeleton'
import { fetchAgencyLaunches, type AgencyLaunch } from '@/lib/agency-clients'
import { useClientScope } from '@/lib/client-scope'
import { cn } from '@/lib/utils/cn'
import { AgencyWorkspaceBreadcrumb } from './AgencyWorkspaceBreadcrumb'
import { AGENCY_CLIENT_MESSAGES } from './config/messages.config'
import { AddLaunchDialog } from './launches/AddLaunchDialog'
import { LaunchCalendar } from './launches/LaunchCalendar'
import { addMonths, calendarDays, dateKey, startOfMonth } from './launches/launches-utils'

export function LaunchesPage() {
  const { selectedClientId } = useClientScope()
  const [launches, setLaunches] = useState<AgencyLaunch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [showAssetsDue, setShowAssetsDue] = useState(false)
  const [calendarMode, setCalendarMode] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  const loadLaunches = async (background = false) => {
    if (!background) setLoading(true)
    try {
      const response = await fetchAgencyLaunches(undefined, background)
      setLaunches(response.launches)
      setError(null)
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : AGENCY_CLIENT_MESSAGES.LOAD_LAUNCHES_ERROR,
      )
    } finally {
      if (!background) setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    setLaunches([])
    setLoading(true)
    setError(null)
    const load = async () => {
      try {
        const response = await fetchAgencyLaunches(selectedClientId ?? undefined, false)
        if (cancelled) return
        setLaunches(response.launches)
        setLoading(false)
        void fetchAgencyLaunches(selectedClientId ?? undefined, true)
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
  }, [selectedClientId])

  const visibleLaunches = useMemo(
    () => launches.filter((launch) => showAssetsDue || launch.kind !== 'assets_due'),
    [launches, showAssetsDue],
  )
  const days = useMemo(() => calendarDays(month), [month])
  const launchesByDay = useMemo(() => {
    const grouped = new Map<string, AgencyLaunch[]>()
    for (const launch of visibleLaunches) {
      grouped.set(launch.day_key, [...(grouped.get(launch.day_key) ?? []), launch])
    }
    return grouped
  }, [visibleLaunches])
  const upcoming = useMemo(() => {
    const today = dateKey(new Date())
    return visibleLaunches.filter((launch) => launch.day_key >= today).slice(0, 16)
  }, [visibleLaunches])

  return (
    <main className="gap-spacing-6 p-spacing-8 mx-auto flex w-full max-w-7xl flex-col">
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

      <header className="gap-spacing-4 flex flex-wrap items-end justify-between">
        <div>
          <h1 className="heading-1 text-foreground">LAUNCHES</h1>
          <p className="body-3 text-muted-foreground">
            Upcoming launches, events, and onboarding calls.
          </p>
        </div>
        <div className="gap-spacing-2 flex items-center">
          <div className="rounded-spacing-2 border-border p-spacing-1 flex border">
            <button
              type="button"
              aria-label="Calendar view"
              aria-pressed={calendarMode}
              onClick={() => setCalendarMode(true)}
              className={cn('btn-icon-bare', calendarMode && 'nav-glass-selected-purple')}
            >
              <CalendarDays className="icon-sm" />
            </button>
            <button
              type="button"
              aria-label="List view"
              aria-pressed={!calendarMode}
              onClick={() => setCalendarMode(false)}
              className={cn('btn-icon-bare', !calendarMode && 'nav-glass-selected-purple')}
            >
              <List className="icon-sm" />
            </button>
          </div>
          <div className="rounded-spacing-2 border-border p-spacing-1 flex border">
            <span className="nav-glass-selected-purple body-4 px-spacing-3 py-spacing-2 rounded-spacing-1">
              Launches
            </span>
            <Link
              href="/client-campaigns"
              className="body-4 hover:bg-hover-subtle px-spacing-3 py-spacing-2 rounded-spacing-1"
            >
              Campaigns
            </Link>
          </div>
        </div>
      </header>

      <div className="gap-spacing-3 flex flex-wrap items-center justify-between">
        <div className="gap-spacing-2 flex items-center">
          <button
            type="button"
            className="btn-icon-bare"
            aria-label="Previous month"
            onClick={() => setMonth(addMonths(month, -1))}
          >
            <ChevronLeft className="icon-sm" />
          </button>
          <button
            type="button"
            className="body-3 hover:bg-hover-subtle rounded-spacing-2 px-spacing-3 py-spacing-2 font-semibold"
            onClick={() => setMonth(startOfMonth(new Date()))}
          >
            {month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </button>
          <button
            type="button"
            className="btn-icon-bare"
            aria-label="Next month"
            onClick={() => setMonth(addMonths(month, 1))}
          >
            <ChevronRight className="icon-sm" />
          </button>
        </div>
        <button
          type="button"
          className="button-primary gap-spacing-2"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="icon-sm" /> Add launch
        </button>
      </div>

      <div className="gap-spacing-4 body-4 text-muted-foreground flex flex-wrap items-center">
        <Legend tone="success" label="Ad launch" />
        <Legend tone="info" label="Event / webinar" />
        <Legend tone="primary" label="Onboarding call" />
        <label className="gap-spacing-2 flex cursor-pointer items-center">
          <span className="bg-destructive h-spacing-2 w-spacing-2 rounded-full" />
          Assets due
          <input
            type="checkbox"
            checked={showAssetsDue}
            onChange={(event) => setShowAssetsDue(event.target.checked)}
            className="accent-primary h-spacing-4 w-spacing-4"
          />
        </label>
      </div>

      {loading ? <ListSkeleton rows={8} label={AGENCY_CLIENT_MESSAGES.LOADING_LAUNCHES} /> : null}
      {error ? <p className="body-2 text-destructive">{error}</p> : null}
      {!loading && !error ? (
        <LaunchCalendar
          calendarMode={calendarMode}
          days={days}
          month={month}
          launchesByDay={launchesByDay}
          upcoming={upcoming}
          visibleLaunches={visibleLaunches}
        />
      ) : null}

      {dialogOpen ? (
        <AddLaunchDialog
          onClose={() => setDialogOpen(false)}
          onCreated={async () => {
            setDialogOpen(false)
            await loadLaunches(true)
          }}
        />
      ) : null}
    </main>
  )
}
function Legend({ tone, label }: { tone: 'success' | 'info' | 'primary'; label: string }) {
  return (
    <span className="gap-spacing-2 flex items-center">
      <span
        className={cn(
          'h-spacing-2 w-spacing-2 rounded-full',
          tone === 'success' ? 'bg-success' : tone === 'info' ? 'bg-info' : 'bg-primary',
        )}
      />
      {label}
    </span>
  )
}
