'use client'

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import type { CampaignStripeOverview } from '@/features/studio/services/analytics.service'
import { fmt } from '../utils/financeFormatters'

interface Props {
  overview: CampaignStripeOverview
  currency: string
}

export function RevenueChartSection({ overview, currency }: Props) {
  return (
    <div className="card-glass p-5">
      <p className="body-2 text-foreground mb-4 font-semibold">Revenue Over Time</p>
      <ChartContainer
        config={
          {
            gross: { label: 'Gross Revenue', color: 'rgba(52, 211, 153, 0.7)' },
            refunds: { label: 'Refunds', color: 'rgba(248, 113, 113, 0.7)' },
            net: { label: 'Net Revenue', color: 'rgba(96, 165, 250, 0.7)' },
          } satisfies ChartConfig
        }
        className="aspect-auto h-[220px] w-full"
      >
        <AreaChart data={overview.chartData ?? []}>
          <defs>
            <linearGradient id="fillGross" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-gross)" stopOpacity={0.6} />
              <stop offset="95%" stopColor="var(--color-gross)" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="fillRefunds" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-refunds)" stopOpacity={0.6} />
              <stop offset="95%" stopColor="var(--color-refunds)" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="fillNet" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-net)" stopOpacity={0.6} />
              <stop offset="95%" stopColor="var(--color-net)" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--color-border)" />
          <XAxis
            dataKey="date"
            tickLine={false}
            tickMargin={8}
            axisLine={false}
            tickFormatter={(v: string) => {
              const d = new Date(v + 'T00:00:00')
              return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={(v: number) => fmt(v, currency)}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(v) => {
                  const d = new Date(String(v) + 'T00:00:00')
                  return d.toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })
                }}
                formatter={(value, name) => [fmt(Number(value), currency), String(name)]}
              />
            }
          />
          <Area
            dataKey="gross"
            type="monotone"
            fill="url(#fillGross)"
            stroke="var(--color-gross)"
            strokeWidth={2}
          />
          <Area
            dataKey="refunds"
            type="monotone"
            fill="url(#fillRefunds)"
            stroke="var(--color-refunds)"
            strokeWidth={2}
          />
          <Area
            dataKey="net"
            type="monotone"
            fill="url(#fillNet)"
            stroke="var(--color-net)"
            strokeWidth={2}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  )
}
