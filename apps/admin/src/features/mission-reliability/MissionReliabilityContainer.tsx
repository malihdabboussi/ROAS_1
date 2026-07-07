'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { adminGet } from '@/lib/api/admin-client'
import type { MissionReliabilityData } from './types'

const MISSION_RELIABILITY_TAB_VALUES = [
  'overview',
  'pipeline',
  'queue',
  'signals',
  'logs',
] as const

type MissionReliabilityTab = (typeof MISSION_RELIABILITY_TAB_VALUES)[number]

function missionReliabilityTabFromSearchParam(raw: string | null): MissionReliabilityTab {
  if (raw && (MISSION_RELIABILITY_TAB_VALUES as readonly string[]).includes(raw)) {
    return raw as MissionReliabilityTab
  }
  return 'overview'
}

function titleCaseKey(key: string): string {
  return key
    .split('_')
    .map((w) => (w.length ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ')
}

function sortEntries(obj: Record<string, number>): [string, number][] {
  return Object.entries(obj).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}

function KeyCountTable({
  rows,
  scroll,
}: {
  rows: [string, number][]
  /** When true, force scroll. When omitted, scroll if more than 8 rows. */
  scroll?: boolean
}) {
  const useScroll = scroll ?? rows.length > 8
  const table = (
    <table className="w-full">
      <thead className="sticky top-0 z-[1] bg-muted/90">
        <tr className="border-border border-b">
          <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
            Key
          </th>
          <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-right font-medium">
            Count
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([key, count]) => (
          <tr key={key} className="border-border border-t">
            <td className="px-spacing-3 py-spacing-2 body-3 text-foreground">{key}</td>
            <td className="px-spacing-3 py-spacing-2 body-3 text-foreground text-right tabular-nums">
              {count.toLocaleString()}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  if (useScroll) {
    return (
      <div className="section-card max-h-[min(260px,42vh)] overflow-y-auto overscroll-contain rounded-spacing-3">
        {table}
      </div>
    )
  }

  return <div className="section-card rounded-spacing-3 overflow-hidden">{table}</div>
}

function RowMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-spacing-4 py-spacing-1">
      <span className="body-2 text-muted-foreground">{label}</span>
      <span className="title-h5 text-foreground shrink-0 tabular-nums">{value}</span>
    </div>
  )
}

function TransitionTable({
  rows,
  scroll,
}: {
  rows: { from: string | null; to: string | null; count: number }[]
  scroll?: boolean
}) {
  const useScroll = scroll ?? rows.length > 8
  const table = (
    <table className="w-full">
      <thead className="sticky top-0 z-[1] bg-muted/90">
        <tr className="border-border border-b">
          <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
            From
          </th>
          <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
            To
          </th>
          <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-right font-medium">
            #
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((t, i) => (
          <tr key={`${t.from}-${t.to}-${i}`} className="border-border border-t">
            <td className="px-spacing-3 py-spacing-2 body-3 text-foreground">{t.from ?? '—'}</td>
            <td className="px-spacing-3 py-spacing-2 body-3 text-foreground">{t.to ?? '—'}</td>
            <td className="px-spacing-3 py-spacing-2 body-3 text-foreground text-right tabular-nums">
              {t.count.toLocaleString()}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  const wrapClass =
    'section-card rounded-spacing-3' +
    (useScroll ? ' max-h-[min(260px,42vh)] overflow-y-auto overscroll-contain' : ' overflow-hidden')

  return <div className={wrapClass}>{table}</div>
}

function HelpDetails({ data }: { data: MissionReliabilityData }) {
  const start = new Date(data.since).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  })

  return (
    <details className="rounded-spacing-2 border-border bg-muted/15 border">
      <summary className="body-3 text-muted-foreground cursor-pointer select-none px-spacing-4 py-spacing-3 [&::-webkit-details-marker]:hidden">
        <span className="text-foreground font-medium">About this view</span>
        <span className="ml-spacing-2 text-muted-foreground">
          · window starts {start}
        </span>
      </summary>
      <ul className="body-4 text-muted-foreground space-y-spacing-2 border-border list-disc border-t px-spacing-6 py-spacing-4">
        <li>
          <span className="text-foreground">Touched</span> — updated in the last {data.windowDays} days.
        </li>
        <li>
          <span className="text-foreground">Done rate</span> — done ÷ (done + error + failed + dead_letter).
        </li>
        <li>
          <span className="text-foreground">Terminal failed</span> — status error, failed, or dead_letter.
        </li>
        <li>
          <span className="text-foreground">Feedback</span> — non-empty subtask feedback, worker-style buckets.
        </li>
        <li>
          <span className="text-foreground">Logs / daily touches</span> — direct Postgres on API (
          {data.missionsLogs.aggregatesRequireDirectDb ? 'off' : 'on'}).
        </li>
      </ul>
    </details>
  )
}

export function MissionReliabilityContainer() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeTab = useMemo(
    () => missionReliabilityTabFromSearchParam(searchParams.get('tab')),
    [searchParams],
  )

  const setActiveTab = useCallback(
    (next: string) => {
      const tab = missionReliabilityTabFromSearchParam(next)
      const params = new URLSearchParams(searchParams.toString())
      if (tab === 'overview') {
        params.delete('tab')
      } else {
        params.set('tab', tab)
      }
      const q = params.toString()
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams],
  )

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<MissionReliabilityData | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await adminGet<MissionReliabilityData>('mission-reliability')
      setData(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return (
      <div className="space-y-spacing-6">
        <div>
          <h1 className="title-h1 text-foreground">MISSION RELIABILITY</h1>
          <p className="body-2 text-muted-foreground mt-spacing-2">Loading…</p>
        </div>
        <div className="py-spacing-12 flex min-h-[240px] items-center justify-center">
          <VibeyLoadingOrb text="Loading..." state="processing" size="md" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-spacing-6">
        <div>
          <h1 className="title-h1 text-foreground">MISSION RELIABILITY</h1>
          <p className="body-3 text-destructive mt-spacing-2">{error ?? 'No data returned'}</p>
        </div>
      </div>
    )
  }

  const pct = (n: number, d: number) => (d > 0 ? `${((100 * n) / d).toFixed(1)}%` : '—')
  const feedbackRows: [string, number][] = sortEntries(data.feedbackBuckets).map(([k, v]) => [
    k === 'blocked_rows' ? 'Blocked rows (subtask status)' : titleCaseKey(k),
    v,
  ])

  return (
    <div className="space-y-spacing-5">
      <header>
        <h1 className="title-h1 text-foreground">MISSION RELIABILITY</h1>
        <p className="body-2 text-muted-foreground mt-spacing-2">{data.windowDays}-day window</p>
      </header>

      <HelpDetails data={data} />

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-spacing-5"
      >
        <TabsList variant="liquid" className="ml-auto flex-wrap">
          <TabsTrigger value="overview" className="px-spacing-4">
            Overview
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="px-spacing-4">
            Pipeline
          </TabsTrigger>
          <TabsTrigger value="queue" className="px-spacing-4">
            Queue
          </TabsTrigger>
          <TabsTrigger value="signals" className="px-spacing-4">
            Feedback
          </TabsTrigger>
          <TabsTrigger value="logs" className="px-spacing-4">
            Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="card-glass p-spacing-6">
            <div className="gap-spacing-6 grid grid-cols-2 md:grid-cols-4">
              <div>
                <p className="body-4 text-muted-foreground mb-spacing-1">Subtasks</p>
                <p className="title-h4 text-foreground tabular-nums">
                  {data.subtasksTouchedInWindow.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="body-4 text-muted-foreground mb-spacing-1">Missions</p>
                <p className="title-h4 text-foreground tabular-nums">
                  {data.missionsTouchedInWindow.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="body-4 text-muted-foreground mb-spacing-1">Outbox processing</p>
                <p className="title-h4 text-foreground tabular-nums">
                  {data.outbox.processingNow.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="body-4 text-muted-foreground mb-spacing-1">Stale ({data.staleMissions.thresholdHours}h+)</p>
                <p className="title-h4 text-orange tabular-nums">
                  {data.staleMissions.count.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="border-border my-spacing-6 border-t pt-spacing-6">
              <p className="body-4 text-muted-foreground mb-spacing-3">Outcomes (touched missions)</p>
              <div className="gap-spacing-4 grid grid-cols-2">
                <div>
                  <p className="body-4 text-muted-foreground mb-spacing-1">Done</p>
                  <p className="title-h5 text-foreground tabular-nums">
                    {data.missionCompletion.done.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="body-4 text-muted-foreground mb-spacing-1">Terminal failed</p>
                  <p className="title-h5 text-foreground tabular-nums">
                    {data.missionCompletion.terminalFailed.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="body-4 text-muted-foreground mb-spacing-1">Denominator</p>
                  <p className="title-h5 text-foreground tabular-nums">
                    {data.missionCompletion.denominator.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="body-4 text-muted-foreground mb-spacing-1">Done rate</p>
                  <p className="title-h5 text-foreground tabular-nums">
                    {data.missionCompletion.doneRate != null
                      ? `${(100 * data.missionCompletion.doneRate).toFixed(1)}%`
                      : '—'}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="pipeline">
          <Card className="card-glass p-spacing-6">
            <div className="gap-spacing-8 grid grid-cols-1 lg:grid-cols-2">
              <div>
                <h3 className="title-h5 text-foreground mb-spacing-3">Missions by status</h3>
                <KeyCountTable rows={sortEntries(data.missionsByStatus)} />
              </div>
              <div>
                <h3 className="title-h5 text-foreground mb-spacing-3">Subtasks by status</h3>
                <KeyCountTable rows={sortEntries(data.subtasksByStatus)} />
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="queue">
          <Card className="card-glass p-spacing-6">
            <h3 className="title-h5 text-foreground mb-spacing-4">Outbox</h3>
            <div className="gap-x-spacing-6 gap-y-spacing-2 grid grid-cols-1 sm:grid-cols-2">
              <RowMetric label="Pending" value={(data.outbox.byStatus.pending ?? 0).toLocaleString()} />
              <RowMetric
                label="Processing"
                value={(data.outbox.byStatus.processing ?? 0).toLocaleString()}
              />
              <RowMetric
                label="Processed (lifetime)"
                value={(data.outbox.byStatus.processed ?? 0).toLocaleString()}
              />
              <RowMetric
                label="Dead letter"
                value={(data.outbox.byStatus.dead_letter ?? 0).toLocaleString()}
              />
              <RowMetric
                label={`Stuck (locked > ${data.outbox.staleLockedAfterMinutes}m)`}
                value={data.outbox.stuckProcessingCount.toLocaleString()}
              />
              <RowMetric label="Near max attempts" value={data.outbox.nearMaxAttempts.toLocaleString()} />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="signals">
          <Card className="card-glass p-spacing-6">
            <h3 className="title-h5 text-foreground mb-spacing-3">Feedback buckets</h3>
            <KeyCountTable rows={feedbackRows} />

            <div className="mt-spacing-6 gap-spacing-4 grid grid-cols-3 border-border border-t pt-spacing-6">
              <div>
                <p className="body-4 text-muted-foreground mb-spacing-1">With text</p>
                <p className="title-h5 text-foreground tabular-nums">
                  {data.feedbackSummary.subtasksWithNonEmptyFeedback.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="body-4 text-muted-foreground mb-spacing-1">Classified</p>
                <p className="title-h5 text-foreground tabular-nums">
                  {data.feedbackSummary.classifiedCount.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="body-4 text-muted-foreground mb-spacing-1">Unclassified</p>
                <p className="title-h5 text-foreground tabular-nums">
                  {pct(
                    data.feedbackSummary.unclassifiedCount,
                    data.feedbackSummary.subtasksWithNonEmptyFeedback,
                  )}
                </p>
              </div>
            </div>

            <details className="border-border mt-spacing-6 rounded-spacing-2 border">
              <summary className="body-3 text-muted-foreground cursor-pointer select-none px-spacing-4 py-spacing-3 [&::-webkit-details-marker]:hidden">
                <span className="text-foreground font-medium">Agents by volume</span>
              </summary>
              <div className="border-border border-t p-spacing-4">
                <KeyCountTable
                  rows={data.topAgentsByFeedbackVolume.map((r) => [
                    r.agentKey ?? '(unassigned)',
                    r.count,
                  ])}
                />
              </div>
            </details>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card className="card-glass p-spacing-6">
            <h3 className="title-h5 text-foreground mb-spacing-4">Mission logs</h3>
            {data.missionsLogs.aggregatesRequireDirectDb ? (
              <p className="body-3 text-muted-foreground">
                Direct Postgres not configured on API — logs and daily touches unavailable.
              </p>
            ) : (
              <div className="space-y-spacing-4">
                <div className="rounded-spacing-2 border-border bg-muted/10 border px-spacing-4 py-spacing-3">
                  <div className="flex items-center justify-between gap-spacing-4">
                    <span className="body-2 text-muted-foreground">Events in window</span>
                    <span className="title-h5 text-foreground tabular-nums">
                      {data.missionsLogs.totalEvents.toLocaleString()}
                    </span>
                  </div>
                </div>
                <details className="rounded-spacing-2 border-border border" open>
                  <summary className="body-3 text-muted-foreground cursor-pointer select-none px-spacing-4 py-spacing-3 [&::-webkit-details-marker]:hidden">
                    <span className="text-foreground font-medium">By event type</span>
                  </summary>
                  <div className="border-border border-t p-spacing-4">
                    <KeyCountTable rows={sortEntries(data.missionsLogs.byEventType)} />
                  </div>
                </details>
                <details className="rounded-spacing-2 border-border border">
                  <summary className="body-3 text-muted-foreground cursor-pointer select-none px-spacing-4 py-spacing-3 [&::-webkit-details-marker]:hidden">
                    <span className="text-foreground font-medium">Transitions</span>
                  </summary>
                  <div className="border-border border-t p-spacing-4">
                    <TransitionTable rows={data.missionsLogs.topTransitions} />
                  </div>
                </details>
                {data.subtaskTouchesByDay.length > 0 ? (
                  <details className="rounded-spacing-2 border-border border">
                    <summary className="body-3 text-muted-foreground cursor-pointer select-none px-spacing-4 py-spacing-3 [&::-webkit-details-marker]:hidden">
                      <span className="text-foreground font-medium">Touches by day (UTC, newest first)</span>
                    </summary>
                    <div className="border-border border-t p-spacing-4">
                      <KeyCountTable rows={data.subtaskTouchesByDay.map((d) => [d.day, d.count])} />
                    </div>
                  </details>
                ) : null}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
