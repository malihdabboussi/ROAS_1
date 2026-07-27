'use client'

import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { cn } from '@/lib/utils/cn'
import { ADMIN_AI_USAGE_MESSAGES } from '../config/messages.config'
import { buildSpendChartData } from '../lib/ai-usage-chart-data'
import type { AdminAiUsageReport, AiUsageComparison } from '../types/admin-ai-usage.types'

const integer = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })
const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})
const CHART_COLORS = [
  'var(--chart-glass-label-purple)',
  'var(--chart-glass-label-blue)',
  'var(--chart-glass-label-green)',
  'var(--chart-glass-label-orange)',
  'var(--chart-glass-label-gold)',
  'var(--color-muted-foreground)',
]
const LEGEND_DOT_CLASSES = [
  'text-primary',
  'text-foreground',
  'text-success',
  'text-warning',
  'text-muted-foreground',
  'text-muted-foreground',
]

function comparisonLabel(value: AiUsageComparison): string {
  if (value.changePercent === null) return 'No prior activity'
  const prefix = value.changePercent > 0 ? '+' : ''
  return `${prefix}${value.changePercent.toFixed(1)}% vs previous period`
}

function MetricCard({
  label,
  value,
  comparison,
  data,
}: {
  label: string
  value: string
  comparison: AiUsageComparison
  data: Array<{ date: string; value: number }>
}) {
  const config = { value: { label, color: 'var(--color-primary)' } } satisfies ChartConfig
  return (
    <article className="surface-card rounded-spacing-3 border-border p-spacing-4 gap-spacing-3 flex min-h-0 flex-col border">
      <p className="body-4 text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
      <div className="gap-spacing-2 flex flex-wrap items-baseline justify-between">
        <p className="title-h6 text-foreground tabular-nums">{value}</p>
        <p
          className={cn(
            'body-4 tabular-nums',
            comparison.changePercent === null || comparison.changePercent === 0
              ? 'text-muted-foreground'
              : comparison.changePercent > 0
                ? 'text-warning'
                : 'text-success',
          )}
        >
          {comparisonLabel(comparison)}
        </p>
      </div>
      <ChartContainer config={config} className="h-spacing-16 aspect-auto w-full">
        <LineChart data={data}>
          <Line
            dataKey="value"
            type="monotone"
            stroke="var(--color-primary)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ChartContainer>
    </article>
  )
}

export function AiUsageCharts({ report }: { report: AdminAiUsageReport }) {
  const spendChart = buildSpendChartData(report.range, report.dailyModelSpend)
  const chartConfig = Object.fromEntries(
    spendChart.series.map((series, index) => [
      series.key,
      { label: series.model, color: CHART_COLORS[index] },
    ]),
  ) satisfies ChartConfig
  const sparkline = (field: 'providerCostUsd' | 'providerAttempts' | 'tokens' | 'failed') =>
    report.daily.map((row) => ({ date: row.date, value: row[field] }))

  return (
    <>
      <section className="gap-spacing-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Provider spend"
          value={usd.format(report.comparison.providerCostUsd.current)}
          comparison={report.comparison.providerCostUsd}
          data={sparkline('providerCostUsd')}
        />
        <MetricCard
          label="Provider requests"
          value={integer.format(report.comparison.providerAttempts.current)}
          comparison={report.comparison.providerAttempts}
          data={sparkline('providerAttempts')}
        />
        <MetricCard
          label="Tokens processed"
          value={compact.format(report.comparison.tokens.current)}
          comparison={report.comparison.tokens}
          data={sparkline('tokens')}
        />
        <MetricCard
          label="Failure rate"
          value={`${report.comparison.failureRate.current.toFixed(1)}%`}
          comparison={report.comparison.failureRate}
          data={sparkline('failed')}
        />
      </section>

      <section className="surface-card rounded-spacing-3 border-border p-spacing-4 border">
        <h2 className="body-1 text-foreground font-semibold">Spend by model</h2>
        <p className="body-4 text-muted-foreground mt-spacing-1">
          Verified provider-ledger spend for the selected range, grouped by resolved model.
        </p>
        {spendChart.series.length === 0 ? (
          <div className="body-3 text-muted-foreground py-spacing-16 text-center">
            {ADMIN_AI_USAGE_MESSAGES.noVerifiedSpend}
          </div>
        ) : (
          <>
            <div className="gap-spacing-3 mt-spacing-4 flex flex-wrap">
              {spendChart.series.map((series, index) => (
                <div key={series.key} className="gap-spacing-2 body-4 flex min-w-0 items-center">
                  <span
                    aria-hidden="true"
                    className={cn('body-3 shrink-0', LEGEND_DOT_CLASSES[index])}
                  >
                    ●
                  </span>
                  <span className="text-muted-foreground max-w-48 truncate">{series.model}</span>
                  <span className="text-foreground tabular-nums">{usd.format(series.total)}</span>
                </div>
              ))}
            </div>
            <div className="mt-spacing-4 overflow-x-auto">
              <ChartContainer config={chartConfig} className="min-w-160 aspect-auto h-80 w-full">
                <BarChart data={spendChart.rows} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid
                    vertical={false}
                    stroke="var(--color-border)"
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                    tickFormatter={(value: string) =>
                      new Date(`${value}T00:00:00.000Z`).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        timeZone: 'UTC',
                      })
                    }
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    width={48}
                    tickFormatter={(value: number) => `$${value.toFixed(0)}`}
                  />
                  <ChartTooltip
                    cursor={{ fill: 'var(--color-hover-subtle)' }}
                    content={
                      <ChartTooltipContent
                        labelFormatter={(value) =>
                          new Date(`${String(value)}T00:00:00.000Z`).toLocaleDateString('en-US', {
                            dateStyle: 'medium',
                            timeZone: 'UTC',
                          })
                        }
                        formatter={(value, name) => [
                          <div
                            key={String(name)}
                            className="gap-spacing-4 flex w-full justify-between"
                          >
                            <span className="text-muted-foreground">
                              {chartConfig[String(name)]?.label}
                            </span>
                            <span className="text-foreground font-mono tabular-nums">
                              {usd.format(Number(value))}
                            </span>
                          </div>,
                        ]}
                      />
                    }
                  />
                  {spendChart.series.map((series, index) => (
                    <Bar
                      key={series.key}
                      dataKey={series.key}
                      name={series.key}
                      stackId="spend"
                      fill={CHART_COLORS[index]}
                      isAnimationActive={false}
                    />
                  ))}
                </BarChart>
              </ChartContainer>
            </div>
          </>
        )}
      </section>
    </>
  )
}
