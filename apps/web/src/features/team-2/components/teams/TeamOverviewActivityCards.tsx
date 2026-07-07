'use client'

import { useId } from 'react'
import { Bar, BarChart, CartesianGrid, Rectangle, XAxis, YAxis } from 'recharts'
import type { BarShapeProps } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { cn } from '@/lib/utils/cn'
import type { TeamOverviewPayload, TeamOverviewSeriesPoint } from '../../services/team-overview.service'
import { CardHeader, CardShell, Legend } from './TeamOverviewShared'
import { CHART_HEIGHT_MD, CHART_LABEL, formatLongDate, pct } from './team-overview-utils'

const DAILY_STACK_BAR_TOP_RADIUS = 6

type DailyStackKey = 'missions' | 'chats' | 'channel' | 'automations'

function dailyActivityStackShape(dataKey: DailyStackKey) {
  return function DailyStackBarShape(props: BarShapeProps) {
    const payload = props.payload as
      | { missions?: number; chats?: number; channel?: number; automations?: number }
      | undefined
    const height = Number(props.height ?? 0)
    if (!payload || height <= 0) return null
    const missions = payload.missions ?? 0
    const chats = payload.chats ?? 0
    const channel = payload.channel ?? 0
    const automations = payload.automations ?? 0
    const segValue =
      dataKey === 'missions'
        ? missions
        : dataKey === 'chats'
          ? chats
          : dataKey === 'channel'
            ? channel
            : automations
    if (segValue <= 0) return null

    const isTopSegment =
      (automations > 0 && dataKey === 'automations') ||
      (automations === 0 && channel > 0 && dataKey === 'channel') ||
      (automations === 0 && channel === 0 && chats > 0 && dataKey === 'chats') ||
      (automations === 0 && channel === 0 && chats === 0 && missions > 0 && dataKey === 'missions')

    const radius: [number, number, number, number] = isTopSegment
      ? [DAILY_STACK_BAR_TOP_RADIUS, DAILY_STACK_BAR_TOP_RADIUS, 0, 0]
      : [0, 0, 0, 0]

    return <Rectangle {...props} radius={radius} />
  }
}

const DAILY_STACK_SHAPE_MISSIONS = dailyActivityStackShape('missions')
const DAILY_STACK_SHAPE_CHATS = dailyActivityStackShape('chats')
const DAILY_STACK_SHAPE_CHANNEL = dailyActivityStackShape('channel')
const DAILY_STACK_SHAPE_AUTOMATIONS = dailyActivityStackShape('automations')

export function MissionHealthCard({ kpis }: { kpis: TeamOverviewPayload['kpis']['missions'] }) {
  const parts = [
    {
      key: 'active',
      label: 'Active',
      value: kpis.active,
      barClass: 'bar-glass-blue',
      legendDot: 'indicator-dot-glass-blue',
    },
    {
      key: 'blocked',
      label: 'Blocked',
      value: kpis.blocked,
      barClass: 'bar-glass-red',
      legendDot: 'indicator-dot-glass-red',
    },
    {
      key: 'todo',
      label: 'Todo',
      value: kpis.todo,
      barClass: 'bar-glass-orange',
      legendDot: 'indicator-dot-glass-orange',
    },
    {
      key: 'completed',
      label: 'Done',
      value: kpis.completed,
      barClass: 'bar-glass-green',
      legendDot: 'indicator-dot-glass-green',
    },
    {
      key: 'failed',
      label: 'Failed',
      value: kpis.failed,
      barClass: 'bar-glass-muted',
      legendDot: 'indicator-dot-glass-muted',
    },
  ]
  const total = parts.reduce((sum, p) => sum + p.value, 0)
  return (
    <CardShell className="gap-spacing-3">
      <CardHeader
        label="Mission health (all time)"
        info="Cumulative status mix of every mission ever assigned to this team - not bound by the time range. Helps spot if too much work is stuck in blocked or failed buckets."
      />
      <div className="gap-spacing-3 flex items-baseline">
        <span className="title-h3 text-foreground tabular-nums leading-none">{total}</span>
        <span className="body-4 text-muted-foreground">total missions</span>
      </div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-[var(--color-hover-subtle)]">
        {total === 0
          ? null
          : parts.map((p) =>
              p.value > 0 ? (
                <span
                  key={p.key}
                  className={cn('h-full', p.barClass)}
                  style={{
                    width: `${pct(p.value, total)}%`,
                  }}
                />
              ) : null,
            )}
      </div>
      <div className="gap-x-spacing-3 gap-y-spacing-1 grid grid-cols-2 sm:grid-cols-3">
        {parts.map((p) => (
          <div key={p.key} className="gap-spacing-2 flex items-center justify-between">
            <span className="gap-spacing-2 flex min-w-0 items-center">
              <span className={cn('indicator-dot-glass-sm shrink-0', p.legendDot)} />
              <span className="body-4 text-muted-foreground truncate">{p.label}</span>
            </span>
            <span className="body-4 text-foreground tabular-nums">{p.value}</span>
          </div>
        ))}
      </div>
    </CardShell>
  )
}

export function DailyActivityCard({
  missions,
  chats,
  channel,
  automations,
}: {
  missions: TeamOverviewSeriesPoint[]
  chats: TeamOverviewSeriesPoint[]
  channel: TeamOverviewSeriesPoint[]
  automations: TeamOverviewSeriesPoint[]
}) {
  const gid = useId().replace(/:/g, '')
  const days = missions.map((p) => p.day)
  const chatsByDay = new Map(chats.map((p) => [p.day, p.n]))
  const channelByDay = new Map(channel.map((p) => [p.day, p.n]))
  const autoByDay = new Map(automations.map((p) => [p.day, p.n]))
  const data = days.map((day, i) => ({
    day,
    missions: missions[i]?.n ?? 0,
    chats: chatsByDay.get(day) ?? 0,
    channel: channelByDay.get(day) ?? 0,
    automations: autoByDay.get(day) ?? 0,
  }))
  const config: ChartConfig = {
    missions: { label: 'Missions completed', color: CHART_LABEL.green },
    chats: { label: 'Agent chats', color: CHART_LABEL.blue },
    channel: { label: 'Channel posts', color: CHART_LABEL.purple },
    automations: { label: 'Flow runs', color: CHART_LABEL.gold },
  }

  return (
    <CardShell className="gap-spacing-3">
      <CardHeader
        label="Daily activity"
        info="Per-day output for the selected window: completed missions, finished agent chat replies, channel messages posted by team agents, and flow runs touching the team. Stacked so you can see the day's total at a glance."
      />
      <ChartContainer
        config={config}
        className="aspect-auto w-full"
        style={{ height: CHART_HEIGHT_MD }}
      >
        <BarChart data={data} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
          <defs>
            <linearGradient id={`${gid}-daily-g`} x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="var(--chart-bar-glass-green-0)" />
              <stop offset="100%" stopColor="var(--chart-bar-glass-green-1)" />
            </linearGradient>
            <linearGradient id={`${gid}-daily-b`} x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="var(--chart-bar-glass-blue-0)" />
              <stop offset="100%" stopColor="var(--chart-bar-glass-blue-1)" />
            </linearGradient>
            <linearGradient id={`${gid}-daily-p`} x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="var(--chart-bar-glass-purple-0)" />
              <stop offset="100%" stopColor="var(--chart-bar-glass-purple-1)" />
            </linearGradient>
            <linearGradient id={`${gid}-daily-au`} x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="var(--chart-bar-glass-gold-0)" />
              <stop offset="100%" stopColor="var(--chart-bar-glass-gold-1)" />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: string) =>
              new Date(`${v}T00:00:00`).toLocaleDateString('en-US', { day: 'numeric' })
            }
            interval="preserveStartEnd"
          />
          <YAxis axisLine={false} tickLine={false} width={28} allowDecimals={false} />
          <ChartTooltip
            cursor={{ fill: 'var(--color-hover-subtle)' }}
            content={<ChartTooltipContent labelFormatter={(v) => formatLongDate(String(v))} />}
          />
          <Bar
            dataKey="missions"
            stackId="a"
            fill={`url(#${gid}-daily-g)`}
            shape={DAILY_STACK_SHAPE_MISSIONS}
          />
          <Bar
            dataKey="chats"
            stackId="a"
            fill={`url(#${gid}-daily-b)`}
            shape={DAILY_STACK_SHAPE_CHATS}
          />
          <Bar
            dataKey="channel"
            stackId="a"
            fill={`url(#${gid}-daily-p)`}
            shape={DAILY_STACK_SHAPE_CHANNEL}
          />
          <Bar
            dataKey="automations"
            stackId="a"
            fill={`url(#${gid}-daily-au)`}
            shape={DAILY_STACK_SHAPE_AUTOMATIONS}
          />
        </BarChart>
      </ChartContainer>
      <div className="gap-spacing-3 flex flex-wrap items-center justify-end">
        <Legend indicatorClass="indicator-dot-glass-green" label="Missions" />
        <Legend indicatorClass="indicator-dot-glass-blue" label="Chats" />
        <Legend indicatorClass="indicator-dot-glass-purple" label="Channel" />
        <Legend indicatorClass="indicator-dot-glass-gold" label="Flows" />
      </div>
    </CardShell>
  )
}
