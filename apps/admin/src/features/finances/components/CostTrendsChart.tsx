'use client'

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Card } from '@/components/ui/card'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import type { CostTrendPoint } from '../types/finances.types'

interface CostTrendsChartProps {
  data: CostTrendPoint[]
  loading: boolean
}

const chartConfig = {
  totalCost: { label: 'Cost', color: 'rgb(255, 149, 0)' },
  totalRequests: { label: 'Requests', color: 'rgb(90, 200, 250)' },
} satisfies ChartConfig

export function CostTrendsChart({ data, loading }: CostTrendsChartProps) {
  if (loading || data.length === 0) {
    return (
      <Card className="card-glass p-spacing-6">
        <div className="animate-pulse">
          <div className="bg-muted mb-4 h-6 w-1/4 rounded" />
          <div className="bg-muted h-64 rounded" />
        </div>
      </Card>
    )
  }

  return (
    <Card className="card-glass p-spacing-6">
      <h3 className="title-h4 text-foreground mb-spacing-2">Cost Trends</h3>
      <p className="body-4 text-muted-foreground mb-spacing-4">Costs and requests over time</p>
      <ChartContainer config={chartConfig} className="h-[280px] w-full">
        <AreaChart data={data} margin={{ left: 12, right: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={32}
            tickFormatter={(v) =>
              new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            }
          />
          <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} width={50} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
          <defs>
            <linearGradient id="fillCostsTrend" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="rgb(255,149,0)" stopOpacity={0.8} />
              <stop offset="95%" stopColor="rgb(255,149,0)" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <Area
            dataKey="totalCost"
            type="monotone"
            fill="url(#fillCostsTrend)"
            fillOpacity={0.4}
            stroke="rgb(255,149,0)"
            strokeWidth={2}
          />
        </AreaChart>
      </ChartContainer>
    </Card>
  )
}
