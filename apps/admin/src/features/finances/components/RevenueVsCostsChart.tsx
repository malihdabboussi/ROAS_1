'use client'

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Card } from '@/components/ui/card'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import type { CostTrendPoint, RevenueTrendPoint } from '../types/finances.types'

interface RevenueVsCostsChartProps {
  costTrend: CostTrendPoint[]
  revenueTrend: RevenueTrendPoint[]
  loading: boolean
}

const chartConfig = {
  revenue: { label: 'Revenue', color: '#10b981' },
  costs: { label: 'Costs', color: 'rgb(255, 149, 0)' },
} satisfies ChartConfig

export function RevenueVsCostsChart({
  costTrend,
  revenueTrend,
  loading,
}: RevenueVsCostsChartProps) {
  if (loading || costTrend.length === 0) {
    return (
      <Card className="card-glass p-spacing-6">
        <div className="animate-pulse">
          <div className="bg-muted mb-4 h-6 w-1/4 rounded" />
          <div className="bg-muted h-64 rounded" />
        </div>
      </Card>
    )
  }

  const revenueByDate = new Map(revenueTrend.map((r) => [r.date, r.revenue]))
  const chartData = costTrend.map((c) => ({
    date: c.date,
    revenue: revenueByDate.get(c.date) ?? 0,
    costs: c.totalCost,
  }))

  return (
    <Card className="card-glass p-spacing-6">
      <h3 className="title-h4 text-foreground mb-spacing-2">Revenue vs Costs</h3>
      <p className="body-4 text-muted-foreground mb-spacing-4">Last 30 days</p>
      <ChartContainer config={chartConfig} className="h-[300px] w-full">
        <AreaChart data={chartData} margin={{ left: 12, right: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(v) =>
              new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            }
          />
          <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} width={50} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
          <defs>
            <linearGradient id="fillRevFin" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="fillCostFin" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="rgb(255,149,0)" stopOpacity={0.8} />
              <stop offset="95%" stopColor="rgb(255,149,0)" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <Area
            dataKey="costs"
            type="monotone"
            fill="url(#fillCostFin)"
            fillOpacity={0.4}
            stroke="rgb(255,149,0)"
            strokeWidth={2}
          />
          <Area
            dataKey="revenue"
            type="monotone"
            fill="url(#fillRevFin)"
            fillOpacity={0.4}
            stroke="#10b981"
            strokeWidth={2}
          />
        </AreaChart>
      </ChartContainer>
    </Card>
  )
}
