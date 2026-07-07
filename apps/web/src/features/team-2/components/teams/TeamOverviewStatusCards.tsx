'use client'

import { useId } from 'react'
import { Area, AreaChart, Cell, Pie, PieChart } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { cn } from '@/lib/utils/cn'
import type { TeamOverviewAgent, TeamOverviewSeriesPoint } from '../../services/team-overview.service'
import { CardHeader, CardShell } from './TeamOverviewShared'
import { CHART_HEIGHT_SM, CHART_LABEL, deltaLabel, formatLongDate, pct } from './team-overview-utils'

export function ActiveNowCard({
  total,
  split,
  blocked,
}: {
  total: number
  split: { missions: number; tasks: number; chats: number; delegations: number }
  blocked: number
}) {
  const segments = [
    {
      key: 'missions',
      label: 'Missions',
      value: split.missions,
      barClass: 'bar-glass-blue',
      legendDot: 'indicator-dot-glass-blue',
    },
    {
      key: 'tasks',
      label: 'Tasks',
      value: split.tasks,
      barClass: 'bar-glass-green',
      legendDot: 'indicator-dot-glass-green',
    },
    {
      key: 'chats',
      label: 'Chats',
      value: split.chats,
      barClass: 'bar-glass-purple',
      legendDot: 'indicator-dot-glass-purple',
    },
    {
      key: 'delegations',
      label: 'Delegations',
      value: split.delegations,
      barClass: 'bar-glass-gold',
      legendDot: 'indicator-dot-glass-gold',
    },
  ]
  return (
    <CardShell className="gap-spacing-3">
      <CardHeader
        label="Active right now"
        info="Live count across the whole team: open missions, running tasks, streaming chats, and in-flight delegations. Updates in real time. Blocked badge appears when any mission is blocked."
      />
      <div className="gap-spacing-3 flex items-baseline">
        <span className="title-h2 text-foreground tabular-nums leading-none">{total}</span>
        {blocked > 0 ? (
          <span className="badge-glass badge-glass-red body-4 rounded-spacing-2 px-2 py-0.5 font-medium">
            {blocked} blocked
          </span>
        ) : null}
      </div>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-[var(--color-hover-subtle)]">
        {total === 0
          ? null
          : segments.map((seg) =>
              seg.value > 0 ? (
                <span
                  key={seg.key}
                  className={cn('h-full', seg.barClass)}
                  style={{
                    width: `${pct(seg.value, total)}%`,
                  }}
                />
              ) : null,
            )}
      </div>
      <div className="gap-x-spacing-3 gap-y-spacing-1 grid grid-cols-2">
        {segments.map((seg) => (
          <div key={seg.key} className="gap-spacing-2 flex items-center justify-between">
            <span className="gap-spacing-2 flex min-w-0 items-center">
              <span className={cn('indicator-dot-glass-sm shrink-0', seg.legendDot)} />
              <span className="body-4 text-muted-foreground truncate">{seg.label}</span>
            </span>
            <span className="body-4 text-foreground tabular-nums">{seg.value}</span>
          </div>
        ))}
      </div>
    </CardShell>
  )
}

export function TeamStatusCard({ agents }: { agents: TeamOverviewAgent[] }) {
  const counts = {
    working: 0,
    online: 0,
    idle: 0,
    offline: 0,
  }
  for (const a of agents) counts[a.status] = (counts[a.status] ?? 0) + 1
  const total = agents.length
  const data = [
    {
      name: 'Working',
      value: counts.working,
      fill: 'var(--chart-bar-glass-green-0)',
      legendDot: 'indicator-dot-glass-green',
    },
    {
      name: 'Online',
      value: counts.online,
      fill: 'var(--chart-bar-glass-blue-0)',
      legendDot: 'indicator-dot-glass-blue',
    },
    {
      name: 'Idle',
      value: counts.idle,
      fill: 'var(--chart-bar-glass-orange-0)',
      legendDot: 'indicator-dot-glass-orange',
    },
    {
      name: 'Offline',
      value: counts.offline,
      fill: 'var(--chart-bar-glass-muted-0)',
      legendDot: 'indicator-dot-glass-muted',
    },
  ]
  const config: ChartConfig = {
    Working: { label: 'Working', color: CHART_LABEL.green },
    Online: { label: 'Online', color: CHART_LABEL.blue },
    Idle: { label: 'Idle', color: CHART_LABEL.orange },
    Offline: { label: 'Offline', color: 'var(--color-muted-foreground)' },
  }

  return (
    <CardShell className="gap-spacing-3">
      <CardHeader
        label="Team status"
        info="Each agent's current presence: working = actively running a task, online = available, idle = signed in but quiet, offline = not connected. Center number is the count working right now."
      />
      <div className="gap-spacing-4 flex items-center">
        <div className="relative h-[120px] w-[120px] shrink-0">
          {total > 0 ? (
            <ChartContainer config={config} className="aspect-auto h-[120px] w-[120px]">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={data.filter((d) => d.value > 0)}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={36}
                  outerRadius={56}
                  paddingAngle={data.filter((d) => d.value > 0).length > 1 ? 2 : 0}
                  strokeWidth={0}
                >
                  {data
                    .filter((d) => d.value > 0)
                    .map((d) => (
                      <Cell key={d.name} fill={d.fill} />
                    ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          ) : (
            <div className="bg-hover-subtle h-full w-full rounded-full" />
          )}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="title-h4 text-foreground tabular-nums leading-none">
              {counts.working}
            </span>
            <span className="body-4 text-muted-foreground">working</span>
          </div>
        </div>
        <div className="gap-spacing-1 flex min-w-0 flex-1 flex-col">
          {data.map((d) => (
            <div key={d.name} className="gap-spacing-2 flex items-center justify-between">
              <span className="gap-spacing-2 flex min-w-0 items-center">
                <span className={cn('indicator-dot-glass-sm shrink-0', d.legendDot)} />
                <span className="body-4 text-muted-foreground truncate">{d.name}</span>
              </span>
              <span className="body-4 text-foreground tabular-nums">{d.value}</span>
            </div>
          ))}
          <div className="border-border mt-spacing-1 pt-spacing-1 flex items-center justify-between border-t">
            <span className="body-4 text-muted-foreground">Total</span>
            <span className="body-4 text-foreground font-medium tabular-nums">{total}</span>
          </div>
        </div>
      </div>
    </CardShell>
  )
}

export function ThroughputCard({
  completed,
  failed,
  prevCompleted,
  avgDurationMinutes,
  series,
}: {
  completed: number
  failed: number
  prevCompleted: number
  avgDurationMinutes: number
  series: TeamOverviewSeriesPoint[]
}) {
  const chartUid = useId().replace(/:/g, '')
  const total = completed + failed
  const successRate = total > 0 ? Math.round((completed / total) * 100) : null
  const delta = deltaLabel(completed, prevCompleted)
  const config: ChartConfig = {
    n: { label: 'Completed', color: CHART_LABEL.green },
  }
  const chartData = series.map((p) => ({ day: p.day, n: p.n }))

  return (
    <CardShell className="gap-spacing-3">
      <CardHeader
        label="Completed in window"
        info="Missions marked done inside the selected time range. Delta is current vs the previous equal-length window (e.g. last 7 days vs the 7 days before that). Sparkline shows daily completions; avg duration is created -> completed."
        trailing={
          <span
            className={cn(
              'body-4 tabular-nums',
              delta.tone === 'up'
                ? 'text-emerald-300'
                : delta.tone === 'down'
                  ? 'text-red-300'
                  : 'text-muted-foreground',
            )}
          >
            {delta.text}
          </span>
        }
      />
      <div className="gap-spacing-3 flex items-baseline">
        <span className="title-h2 text-foreground tabular-nums leading-none">{completed}</span>
        <span className="body-4 text-muted-foreground">
          {failed > 0 ? `${failed} failed` : 'no failures'}
          {successRate != null ? ` · ${successRate}%` : ''}
        </span>
      </div>
      <ChartContainer
        config={config}
        className="aspect-auto w-full"
        style={{ height: CHART_HEIGHT_SM }}
      >
        <AreaChart data={chartData} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
          <defs>
            <linearGradient id={`fillThroughput-${chartUid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-bar-glass-green-0)" stopOpacity={0.85} />
              <stop offset="100%" stopColor="var(--chart-bar-glass-green-1)" stopOpacity={0.06} />
            </linearGradient>
          </defs>
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                hideIndicator
                labelFormatter={(v) => formatLongDate(String(v))}
                formatter={(value) => [`${value}`, 'Completed']}
              />
            }
          />
          <Area
            dataKey="n"
            type="monotone"
            stroke={CHART_LABEL.green}
            strokeWidth={2}
            fill={`url(#fillThroughput-${chartUid})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ChartContainer>
      <div className="border-border pt-spacing-2 flex items-center justify-between border-t">
        <span className="body-4 text-muted-foreground">Avg duration</span>
        <span className="body-4 text-foreground tabular-nums">
          {avgDurationMinutes > 0 ? `${avgDurationMinutes}m` : '-'}
        </span>
      </div>
    </CardShell>
  )
}
