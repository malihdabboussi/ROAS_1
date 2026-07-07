'use client'

import { useId } from 'react'
import { BadgeDollarSign, Coins } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { cn } from '@/lib/utils/cn'
import {
  deltaPercent,
  formatLongDate,
  fmtNumber,
  fmtUsd,
} from './team-analytics-formatting'

const CHART_LABEL_BLUE = 'var(--chart-glass-label-blue)'

export function SpendLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <span className="gap-spacing-2 flex items-center">
      <span className="body-4 text-destructive">Couldn&apos;t load spend data.</span>
      <button
        type="button"
        onClick={onRetry}
        className="body-4 text-foreground cursor-pointer font-medium underline"
      >
        Retry
      </button>
    </span>
  )
}

export function TeamSpendKpiCard({
  loading,
  error,
  onRetry,
  totals,
  previousTotals,
}: {
  loading: boolean
  error: boolean
  onRetry: () => void
  totals: { credits: number; costUsd: number; eventCount: number } | null
  previousTotals: { credits: number; costUsd: number; eventCount: number } | null
}) {
  const cost = totals?.costUsd ?? 0
  const credits = totals?.credits ?? 0
  const events = totals?.eventCount ?? 0
  const prevCost = previousTotals?.costUsd ?? 0
  const delta = deltaPercent(cost, prevCost)
  const failed = error && !loading

  return (
    <div className="surface-card border-subtle rounded-spacing-3 p-spacing-4 gap-spacing-3 flex min-h-0 flex-col border">
      <div className="flex items-center justify-between">
        <span className="body-4 text-muted-foreground gap-spacing-2 flex items-center font-medium uppercase tracking-wide">
          <BadgeDollarSign className="icon-md text-muted-foreground shrink-0" />
          Total spend
        </span>
        {failed ? null : (
          <span
            className={cn(
              'body-4 tabular-nums',
              delta.tone === 'up'
                ? 'text-destructive'
                : delta.tone === 'down'
                  ? 'text-success'
                  : 'text-muted-foreground',
            )}
          >
            {delta.text} vs prior
          </span>
        )}
      </div>

      {failed ? (
        <div className="my-auto flex items-center justify-center">
          <SpendLoadError onRetry={onRetry} />
        </div>
      ) : (
        <>
          <div className="gap-spacing-2 flex items-baseline">
            <span className="title-h2 text-foreground tabular-nums leading-none">
              {loading ? '…' : fmtUsd(cost)}
            </span>
          </div>

          <div className="border-border pt-spacing-2 mt-auto grid grid-cols-2 gap-x-3 border-t">
            <div className="gap-spacing-1 flex items-center justify-between">
              <span className="gap-spacing-2 flex items-center">
                <Coins className="icon-xs text-muted-foreground shrink-0" />
                <span className="body-4 text-muted-foreground">Credits</span>
              </span>
              <span className="body-4 text-foreground tabular-nums">
                {loading ? '…' : fmtNumber(credits)}
              </span>
            </div>
            <div className="gap-spacing-1 flex items-center justify-between">
              <span className="body-4 text-muted-foreground">Events</span>
              <span className="body-4 text-foreground tabular-nums">
                {loading ? '…' : fmtNumber(events)}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export function DailySpendChartCard({
  loading,
  error,
  onRetry,
  daily,
  totalCostUsd,
}: {
  loading: boolean
  error: boolean
  onRetry: () => void
  daily: Array<{ day: string; costUsd: number }>
  totalCostUsd: number
}) {
  const gid = useId().replace(/:/g, '')
  const config: ChartConfig = {
    costUsd: { label: 'Cost', color: CHART_LABEL_BLUE },
  }
  const data = daily.map((p) => ({ day: p.day, costUsd: p.costUsd }))
  const peak = data.reduce((max, d) => (d.costUsd > max ? d.costUsd : max), 0)
  const avg = data.length > 0 ? totalCostUsd / data.length : 0
  const failed = error && !loading

  if (failed) {
    return (
      <div className="surface-card border-subtle rounded-spacing-3 p-spacing-4 gap-spacing-3 flex min-h-0 flex-col border lg:col-span-2">
        <div className="flex items-center justify-between">
          <span className="body-4 text-muted-foreground font-medium uppercase tracking-wide">
            Daily spend
          </span>
        </div>
        <div className="flex w-full items-center justify-center" style={{ height: 160 }}>
          <SpendLoadError onRetry={onRetry} />
        </div>
      </div>
    )
  }

  return (
    <div className="surface-card border-subtle rounded-spacing-3 p-spacing-4 gap-spacing-3 flex min-h-0 flex-col border lg:col-span-2">
      <div className="flex items-center justify-between">
        <span className="body-4 text-muted-foreground font-medium uppercase tracking-wide">
          Daily spend
        </span>
        <div className="gap-spacing-3 flex items-center">
          <span className="body-4 text-muted-foreground">
            Avg <span className="text-foreground tabular-nums">{loading ? '…' : fmtUsd(avg)}</span>
          </span>
          <span className="body-4 text-muted-foreground">
            Peak{' '}
            <span className="text-foreground tabular-nums">{loading ? '…' : fmtUsd(peak)}</span>
          </span>
        </div>
      </div>

      <ChartContainer config={config} className="aspect-auto w-full" style={{ height: 160 }}>
        <AreaChart data={data} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
          <defs>
            <linearGradient id={`fillSpend-${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-bar-glass-blue-0)" stopOpacity={0.85} />
              <stop offset="100%" stopColor="var(--chart-bar-glass-blue-1)" stopOpacity={0.06} />
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
          <YAxis
            axisLine={false}
            tickLine={false}
            width={36}
            tickFormatter={(v: number) => `$${v.toFixed(0)}`}
          />
          <ChartTooltip
            cursor={{ stroke: 'var(--color-border)' }}
            content={
              <ChartTooltipContent
                hideIndicator
                labelFormatter={(v) => formatLongDate(String(v))}
                formatter={(value) => [fmtUsd(Number(value ?? 0)), '']}
              />
            }
          />
          <Area
            dataKey="costUsd"
            type="monotone"
            stroke={CHART_LABEL_BLUE}
            strokeWidth={2}
            fill={`url(#fillSpend-${gid})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  )
}
