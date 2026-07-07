'use client'

import Link from 'next/link'
import {
  AlertTriangle,
  Clock,
  Cpu,
  DollarSign,
  Moon,
  Power,
  ScrollText,
  ShieldAlert,
  Zap,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import type { MachineStats } from '@/features/dashboard/types/dashboard.types'
import type { AgentTraceSummary } from '@/features/traces/types/agent-trace.types'

interface DevMetricsCardsProps {
  machineStats: MachineStats | null
  errors: Array<{
    id: string
    created_at: string
    severity: string | null
    resolved: boolean | null
    app: string | null
    category: string | null
  }> | null
  traces: AgentTraceSummary[] | null
  loading: boolean
}

function computeErrorMetrics(errors: DevMetricsCardsProps['errors']): {
  total: number
  open: number
  critical: number
  last24h: number
  byApp: Array<{ app: string; count: number }>
} {
  if (!errors) return { total: 0, open: 0, critical: 0, last24h: 0, byApp: [] }
  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000
  let open = 0
  let critical = 0
  let last24h = 0
  const appMap = new Map<string, number>()
  for (const e of errors) {
    if (!e.resolved) open++
    if (e.severity === 'critical' && !e.resolved) critical++
    if (now - new Date(e.created_at).getTime() < dayMs) last24h++
    const app = e.app ?? 'unknown'
    appMap.set(app, (appMap.get(app) ?? 0) + 1)
  }
  const byApp = [...appMap.entries()]
    .map(([app, count]) => ({ app, count }))
    .sort((a, b) => b.count - a.count)
  return { total: errors.length, open, critical, last24h, byApp }
}

function computeTraceMetrics(traces: AgentTraceSummary[] | null): {
  total: number
  completed: number
  failed: number
  streaming: number
  avgDurationMs: number
  totalCost: number
} {
  if (!traces || traces.length === 0)
    return { total: 0, completed: 0, failed: 0, streaming: 0, avgDurationMs: 0, totalCost: 0 }
  let completed = 0
  let failed = 0
  let streaming = 0
  let durationSum = 0
  let durationCount = 0
  let totalCost = 0
  for (const t of traces) {
    if (t.status === 'completed') completed++
    else if (t.status === 'failed') failed++
    else if (t.status === 'streaming') streaming++
    if (t.duration_ms != null && t.duration_ms > 0) {
      durationSum += t.duration_ms
      durationCount++
    }
    totalCost += t.cost_usd ?? 0
  }
  return {
    total: traces.length,
    completed,
    failed,
    streaming,
    avgDurationMs: durationCount > 0 ? Math.round(durationSum / durationCount) : 0,
    totalCost,
  }
}

function fmtMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function fmtUsd(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtInt(n: number): string {
  return n.toLocaleString('en-US')
}

function LoadingSkeleton() {
  return (
    <div className="gap-spacing-6 grid grid-cols-1 lg:grid-cols-3">
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="surface-card p-spacing-6">
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

function MetricRow({
  icon: Icon,
  iconColor,
  label,
  value,
  valueColor,
}: {
  icon: typeof Power
  iconColor?: string
  label: string
  value: string | number
  valueColor?: string
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="gap-spacing-2 flex items-center">
        <div className="w-spacing-8 h-spacing-8 bg-muted flex items-center justify-center rounded-full">
          <Icon className={`icon-sm ${iconColor ?? 'text-muted-foreground'}`} />
        </div>
        <span className="body-3 text-muted-foreground">{label}</span>
      </div>
      <span className={`title-h4 ${valueColor ?? 'text-foreground'}`}>{value}</span>
    </div>
  )
}

export function DevMetricsCards({ machineStats, errors, traces, loading }: DevMetricsCardsProps) {
  if (loading) return <LoadingSkeleton />

  const errMetrics = computeErrorMetrics(errors)
  const traceMetrics = computeTraceMetrics(traces)
  const failRate =
    traceMetrics.total > 0 ? ((traceMetrics.failed / traceMetrics.total) * 100).toFixed(1) : '0.0'
  const machineStartedDrift = machineStats?.drift
    ? machineStats.drift.startedProfileDrift +
      machineStats.drift.startedPoolDrift +
      machineStats.drift.startedOrphanDrift
    : 0

  return (
    <div className="gap-spacing-6 grid grid-cols-1 lg:grid-cols-3">
      {/* Machines */}
      <Card className="surface-card p-spacing-6">
        <div className="mb-spacing-4 flex items-center justify-between">
          <h3 className="title-h4 text-foreground">MACHINES</h3>
        </div>
        {machineStats ? (
          <div className="space-y-spacing-4">
            <MetricRow icon={Cpu} label="Total" value={fmtInt(machineStats.live.total)} />
            <MetricRow
              icon={Power}
              iconColor="text-emerald"
              label="Running"
              value={fmtInt(machineStats.live.running)}
              valueColor="text-emerald"
            />
            {machineStats.fly ? (
              <MetricRow
                icon={Power}
                iconColor="text-orange"
                label="Fly Started"
                value={fmtInt(machineStats.fly.started)}
                valueColor="text-orange"
              />
            ) : null}
            {machineStats.drift ? (
              <MetricRow
                icon={Zap}
                iconColor="text-orange"
                label="Started Drift"
                value={fmtInt(machineStartedDrift)}
              />
            ) : null}
            <MetricRow icon={Moon} label="Suspended" value={fmtInt(machineStats.live.suspended)} />
            <MetricRow
              icon={Zap}
              iconColor="text-orange"
              label="Always-On"
              value={fmtInt(machineStats.live.alwaysOn)}
            />
            <MetricRow
              icon={DollarSign}
              iconColor="text-orange"
              label="Est. Monthly"
              value={fmtUsd(machineStats.costs.estimatedMonthlyCost)}
            />
            <MetricRow
              icon={DollarSign}
              label="Est. Daily"
              value={fmtUsd(machineStats.costs.estimatedDailyCost)}
            />
            <MetricRow
              icon={Cpu}
              label="Avg Running (24h)"
              value={machineStats.costs.avgRunningMachines24h}
            />
            <MetricRow
              icon={Clock}
              label="Avg Active hrs/machine (7d)"
              value={`${machineStats.costs.avgActiveHoursPerMachine7d}h`}
            />
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center">
            <p className="body-3 text-muted-foreground">No machine data</p>
          </div>
        )}
      </Card>

      {/* Errors */}
      <Card className="surface-card p-spacing-6">
        <div className="mb-spacing-4 flex items-center justify-between">
          <h3 className="title-h4 text-foreground">ERRORS</h3>
          <Link
            href="/errors"
            className="body-3 text-foreground hover:text-muted-foreground hover:underline"
          >
            View All →
          </Link>
        </div>
        {errors ? (
          <div className="space-y-spacing-4">
            <MetricRow
              icon={AlertTriangle}
              label="Total (loaded)"
              value={fmtInt(errMetrics.total)}
            />
            <MetricRow
              icon={AlertTriangle}
              iconColor="text-orange"
              label="Open"
              value={fmtInt(errMetrics.open)}
              valueColor={errMetrics.open > 0 ? 'text-orange' : undefined}
            />
            <MetricRow
              icon={ShieldAlert}
              iconColor="text-destructive"
              label="Critical (open)"
              value={fmtInt(errMetrics.critical)}
              valueColor={errMetrics.critical > 0 ? 'text-destructive' : undefined}
            />
            <MetricRow icon={Clock} label="Last 24h" value={fmtInt(errMetrics.last24h)} />
            {errMetrics.byApp.length > 0 && (
              <>
                <div className="border-border pt-spacing-3 body-4 text-muted-foreground border-t">
                  By App
                </div>
                {errMetrics.byApp.slice(0, 5).map((a) => (
                  <div key={a.app} className="flex items-center justify-between">
                    <span className="body-3 text-muted-foreground pl-spacing-10">{a.app}</span>
                    <span className="title-h4 text-foreground">{fmtInt(a.count)}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center">
            <p className="body-3 text-muted-foreground">No error data</p>
          </div>
        )}
      </Card>

      {/* Traces */}
      <Card className="surface-card p-spacing-6">
        <div className="mb-spacing-4 flex items-center justify-between">
          <h3 className="title-h4 text-foreground">AGENT TRACES</h3>
          <Link
            href="/traces"
            className="body-3 text-foreground hover:text-muted-foreground hover:underline"
          >
            View All →
          </Link>
        </div>
        {traces ? (
          <div className="space-y-spacing-4">
            <MetricRow
              icon={ScrollText}
              label="Recent (last 100)"
              value={fmtInt(traceMetrics.total)}
            />
            <MetricRow
              icon={Power}
              iconColor="text-emerald"
              label="Completed"
              value={fmtInt(traceMetrics.completed)}
              valueColor="text-emerald"
            />
            <MetricRow
              icon={AlertTriangle}
              iconColor="text-destructive"
              label="Failed"
              value={fmtInt(traceMetrics.failed)}
              valueColor={traceMetrics.failed > 0 ? 'text-destructive' : undefined}
            />
            <MetricRow
              icon={Zap}
              iconColor="text-orange"
              label="Streaming"
              value={fmtInt(traceMetrics.streaming)}
            />
            <MetricRow
              icon={AlertTriangle}
              label="Fail Rate"
              value={`${failRate}%`}
              valueColor={Number(failRate) > 10 ? 'text-destructive' : undefined}
            />
            <div className="border-border pt-spacing-3 body-4 text-muted-foreground border-t">
              Performance
            </div>
            <MetricRow
              icon={Clock}
              label="Avg Duration"
              value={fmtMs(traceMetrics.avgDurationMs)}
            />
            <MetricRow
              icon={DollarSign}
              iconColor="text-orange"
              label="Cost (last 100)"
              value={fmtUsd(traceMetrics.totalCost)}
            />
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center">
            <p className="body-3 text-muted-foreground">No trace data</p>
          </div>
        )}
      </Card>
    </div>
  )
}
