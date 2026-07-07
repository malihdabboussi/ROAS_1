'use client'

import { Cpu, DollarSign, Moon, Power, Zap } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Card } from '@/components/ui/card'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import type { MachineStats } from '../types/dashboard.types'

interface MachineMetricsCardProps {
  stats: MachineStats | null
  loading: boolean
}

export function MachineMetricsCard({ stats, loading }: MachineMetricsCardProps) {
  if (loading) {
    return (
      <div className="gap-spacing-6 grid grid-cols-1 lg:grid-cols-2">
        {[...Array(2)].map((_, index) => (
          <Card key={index} className="surface-card p-spacing-6">
            <div className="animate-pulse">
              <div className="bg-muted mb-4 h-6 w-1/2 rounded" />
              <div className="bg-muted mb-2 h-10 w-3/4 rounded" />
              <div className="bg-muted h-4 w-full rounded" />
            </div>
          </Card>
        ))}
      </div>
    )
  }

  if (!stats) return null

  const startedDrift =
    (stats.drift?.startedProfileDrift ?? 0) +
    (stats.drift?.startedPoolDrift ?? 0) +
    (stats.drift?.startedOrphanDrift ?? 0)

  return (
    <div className="gap-spacing-6 grid grid-cols-1 lg:grid-cols-2">
      <Card className="surface-card p-spacing-6">
        <div className="mb-spacing-4 flex items-center justify-between">
          <h3 className="title-h4 text-foreground">MACHINES</h3>
        </div>
        <div className="space-y-spacing-4">
          <div className="flex items-center justify-between">
            <div className="gap-spacing-2 flex items-center">
              <div className="w-spacing-8 h-spacing-8 bg-muted flex items-center justify-center rounded-full">
                <Cpu className="icon-sm text-muted-foreground" />
              </div>
              <span className="body-2 text-muted-foreground">Total</span>
            </div>
            <span className="title-h3 text-foreground">{stats.live.total}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="gap-spacing-2 flex items-center">
              <div className="w-spacing-8 h-spacing-8 bg-muted flex items-center justify-center rounded-full">
                <Power className="icon-sm text-emerald" />
              </div>
              <span className="body-3 text-muted-foreground">Running</span>
            </div>
            <span className="title-h4 text-emerald">{stats.live.running}</span>
          </div>
          {stats.fly ? (
            <div className="flex items-center justify-between">
              <div className="gap-spacing-2 flex items-center">
                <div className="w-spacing-8 h-spacing-8 bg-muted flex items-center justify-center rounded-full">
                  <Power className="icon-sm text-orange" />
                </div>
                <span className="body-3 text-muted-foreground">Fly Started</span>
              </div>
              <span className="title-h4 text-orange">{stats.fly.started}</span>
            </div>
          ) : null}
          {stats.drift ? (
            <div className="flex items-center justify-between">
              <div className="gap-spacing-2 flex items-center">
                <div className="w-spacing-8 h-spacing-8 bg-muted flex items-center justify-center rounded-full">
                  <Zap className="icon-sm text-orange" />
                </div>
                <span className="body-3 text-muted-foreground">Started Drift</span>
              </div>
              <span className="title-h4 text-foreground">{startedDrift}</span>
            </div>
          ) : null}
          <div className="flex items-center justify-between">
            <div className="gap-spacing-2 flex items-center">
              <div className="w-spacing-8 h-spacing-8 bg-muted flex items-center justify-center rounded-full">
                <Moon className="icon-sm text-muted-foreground" />
              </div>
              <span className="body-3 text-muted-foreground">Suspended</span>
            </div>
            <span className="title-h4 text-foreground">{stats.live.suspended}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="gap-spacing-2 flex items-center">
              <div className="w-spacing-8 h-spacing-8 bg-muted flex items-center justify-center rounded-full">
                <Zap className="icon-sm text-orange" />
              </div>
              <span className="body-3 text-muted-foreground">Always-On</span>
            </div>
            <span className="title-h4 text-foreground">{stats.live.alwaysOn}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="gap-spacing-2 flex items-center">
              <div className="w-spacing-8 h-spacing-8 bg-muted flex items-center justify-center rounded-full">
                <DollarSign className="icon-sm text-orange" />
              </div>
              <span className="body-3 text-muted-foreground">Est. Monthly</span>
            </div>
            <span className="title-h4 text-foreground">
              ${stats.costs.estimatedMonthlyCost.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="gap-spacing-2 flex items-center">
              <div className="w-spacing-8 h-spacing-8 bg-muted flex items-center justify-center rounded-full">
                <Cpu className="icon-sm text-muted-foreground" />
              </div>
              <span className="body-3 text-muted-foreground">Avg Running (24h)</span>
            </div>
            <span className="title-h4 text-foreground">{stats.costs.avgRunningMachines24h}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="gap-spacing-2 flex items-center">
              <div className="w-spacing-8 h-spacing-8 bg-muted flex items-center justify-center rounded-full">
                <Cpu className="icon-sm text-muted-foreground" />
              </div>
              <span className="body-3 text-muted-foreground">Avg Active hrs/machine (7d)</span>
            </div>
            <span className="title-h4 text-foreground">
              {stats.costs.avgActiveHoursPerMachine7d}h
            </span>
          </div>
        </div>
      </Card>

      <Card className="surface-card p-spacing-6">
        <h3 className="title-h4 text-foreground mb-spacing-4">MACHINE TRENDS</h3>
        <div className="space-y-spacing-4">
          <div>
            <p className="body-3 text-muted-foreground mb-spacing-2">Running Machines (7d)</p>
            {stats.trends.running7d.length > 0 ? (
              <ChartContainer
                config={{ avg: { label: 'Avg Running', color: '#10b981' } } as ChartConfig}
                className="h-24 w-full"
              >
                <AreaChart data={stats.trends.running7d}>
                  <defs>
                    <linearGradient id="fillMachineRunning7d" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    vertical={false}
                  />
                  <XAxis dataKey="date" hide />
                  <YAxis hide />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    dataKey="avg"
                    type="monotone"
                    fill="url(#fillMachineRunning7d)"
                    fillOpacity={0.4}
                    stroke="#10b981"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="flex h-24 w-full items-center justify-center">
                <p className="body-3 text-muted-foreground">No data yet</p>
              </div>
            )}
          </div>
          <div>
            <p className="body-3 text-muted-foreground mb-spacing-2">Est. Daily Cost (7d)</p>
            {stats.trends.cost7d.length > 0 ? (
              <ChartContainer
                config={
                  { cost: { label: 'Daily Cost', color: 'rgb(255, 149, 0)' } } as ChartConfig
                }
                className="h-24 w-full"
              >
                <AreaChart data={stats.trends.cost7d}>
                  <defs>
                    <linearGradient id="fillMachineCost7d" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="rgb(255, 149, 0)" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="rgb(255, 149, 0)" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    vertical={false}
                  />
                  <XAxis dataKey="date" hide />
                  <YAxis hide />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    dataKey="cost"
                    type="monotone"
                    fill="url(#fillMachineCost7d)"
                    fillOpacity={0.4}
                    stroke="rgb(255, 149, 0)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="flex h-24 w-full items-center justify-center">
                <p className="body-3 text-muted-foreground">No data yet</p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
