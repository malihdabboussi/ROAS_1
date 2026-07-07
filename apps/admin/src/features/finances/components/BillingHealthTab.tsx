'use client'

import { useCallback, useEffect, useState } from 'react'
import { CheckCircle, RefreshCcw, ShieldAlert } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { adminGet, adminPost } from '@/lib/api/admin-client'

interface BillingHealthData {
  unresolvedCount: number
  recentFailures: Array<{
    id: string
    feature: string
    action: string
    user_id: string | null
    model_name: string | null
    reason: string
    error_message: string | null
    created_at: string
  }>
  costSourceBreakdown: Array<{
    cost_source: string
    total_cost: number
    event_count: number
  }>
  modelsMissingPricing: Array<{
    model_name: string
    event_count: number
  }>
  reconciliation: Array<{
    check_date: string
    openrouter_reported_cost: number | null
    db_computed_cost: number | null
    delta_percent: number | null
    status: string
  }>
}

function fmt(n: number) {
  return `$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function statusBadge(status: string) {
  if (status === 'ok') return <span className="text-emerald body-4">OK</span>
  if (status === 'warning') return <span className="text-orange body-4">WARNING</span>
  return <span className="text-destructive body-4">CRITICAL</span>
}

export function BillingHealthTab() {
  const [data, setData] = useState<BillingHealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [resolving, setResolving] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await adminGet<BillingHealthData>('billing-health?days=7')
      setData(result)
    } catch {
      /* silent */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleResolve = async (id: string) => {
    setResolving(id)
    try {
      await adminPost(`billing-health/${id}/resolve`, {})
      await load()
    } finally {
      setResolving(null)
    }
  }

  if (loading && !data) {
    return <p className="body-3 text-muted-foreground">Loading billing health...</p>
  }

  const totalCostTracked = (data?.costSourceBreakdown ?? []).reduce((s, r) => s + r.total_cost, 0)

  return (
    <div className="space-y-spacing-6">
      {/* Status banner */}
      <Card
        className={`p-spacing-4 gap-spacing-3 flex items-center ${
          (data?.unresolvedCount ?? 0) > 0
            ? 'border-destructive/40 bg-destructive/5'
            : 'border-emerald/40 bg-emerald/5'
        }`}
      >
        {(data?.unresolvedCount ?? 0) > 0 ? (
          <ShieldAlert className="icon-md text-destructive shrink-0" />
        ) : (
          <CheckCircle className="icon-md text-emerald shrink-0" />
        )}
        <div className="flex-1">
          <p className="title-h5 text-foreground">
            {(data?.unresolvedCount ?? 0) > 0
              ? `${data?.unresolvedCount} unresolved billing failure${(data?.unresolvedCount ?? 0) !== 1 ? 's' : ''}`
              : 'All billing paths healthy'}
          </p>
          <p className="body-4 text-muted-foreground">
            {fmt(totalCostTracked)} tracked across{' '}
            {(data?.costSourceBreakdown ?? [])
              .reduce((s, r) => s + r.event_count, 0)
              .toLocaleString()}{' '}
            events (last 7 days)
          </p>
        </div>
        <button
          onClick={load}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCcw className="icon-sm" />
        </button>
      </Card>

      <div className="gap-spacing-6 grid grid-cols-1 lg:grid-cols-2">
        {/* Cost source breakdown */}
        <Card className="card-glass p-spacing-6">
          <h3 className="title-h4 text-foreground mb-spacing-4">Cost Source Breakdown (7d)</h3>
          {data && data.costSourceBreakdown.length > 0 ? (
            <div className="space-y-spacing-2">
              {data.costSourceBreakdown
                .sort((a, b) => b.total_cost - a.total_cost)
                .map((row) => (
                  <div key={row.cost_source} className="flex items-center justify-between">
                    <div className="gap-spacing-2 flex items-center">
                      <span className="body-3 text-foreground font-mono text-sm">
                        {row.cost_source || 'null'}
                      </span>
                      <span className="body-4 text-muted-foreground">
                        ({row.event_count.toLocaleString()})
                      </span>
                    </div>
                    <span className="title-h5 text-foreground">{fmt(row.total_cost)}</span>
                  </div>
                ))}
            </div>
          ) : (
            <p className="body-3 text-muted-foreground">No data</p>
          )}
        </Card>

        {/* Models missing pricing */}
        <Card className="card-glass p-spacing-6">
          <h3 className="title-h4 text-foreground mb-spacing-4">Models Missing Pricing</h3>
          <p className="body-4 text-muted-foreground mb-spacing-3">
            These models fall back to Opus defaults when billing
          </p>
          {data && data.modelsMissingPricing.length > 0 ? (
            <div className="space-y-spacing-2">
              {data.modelsMissingPricing.map((row) => (
                <div key={row.model_name} className="flex items-center justify-between">
                  <span className="body-3 text-foreground font-mono text-sm">{row.model_name}</span>
                  <span className="body-4 text-muted-foreground">{row.event_count} events</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="body-3 text-emerald">All models have pricing rows</p>
          )}
        </Card>
      </div>

      {/* Reconciliation */}
      {data && data.reconciliation.length > 0 && (
        <Card className="card-glass p-spacing-6">
          <h3 className="title-h4 text-foreground mb-spacing-4">OpenRouter Reconciliation</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-border bg-muted/30 border-b">
                  <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                    Date
                  </th>
                  <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                    OpenRouter
                  </th>
                  <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                    Our DB
                  </th>
                  <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                    Delta
                  </th>
                  <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.reconciliation.map((row) => (
                  <tr key={row.check_date} className="border-border border-t">
                    <td className="px-spacing-3 py-spacing-2 body-3 text-foreground">
                      {row.check_date}
                    </td>
                    <td className="px-spacing-3 py-spacing-2 body-3 text-foreground">
                      {row.openrouter_reported_cost != null
                        ? fmt(row.openrouter_reported_cost)
                        : '—'}
                    </td>
                    <td className="px-spacing-3 py-spacing-2 body-3 text-foreground">
                      {row.db_computed_cost != null ? fmt(row.db_computed_cost) : '—'}
                    </td>
                    <td className="px-spacing-3 py-spacing-2 body-3 text-foreground">
                      {row.delta_percent != null ? `${row.delta_percent.toFixed(1)}%` : '—'}
                    </td>
                    <td className="px-spacing-3 py-spacing-2">{statusBadge(row.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Unresolved failures */}
      <Card className="card-glass p-spacing-6">
        <h3 className="title-h4 text-foreground mb-spacing-4">
          Billing Failures
          {(data?.unresolvedCount ?? 0) > 0 && (
            <span className="bg-destructive text-destructive-foreground ml-spacing-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium">
              {data?.unresolvedCount}
            </span>
          )}
        </h3>
        {data && data.recentFailures.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-border bg-muted/30 border-b">
                  <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                    Time
                  </th>
                  <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                    Feature
                  </th>
                  <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                    Action
                  </th>
                  <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                    Model
                  </th>
                  <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                    Reason
                  </th>
                  <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                    Error
                  </th>
                  <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {data.recentFailures.map((row) => (
                  <tr key={row.id} className="border-border border-t">
                    <td className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground whitespace-nowrap">
                      {new Date(row.created_at).toLocaleString()}
                    </td>
                    <td className="px-spacing-3 py-spacing-2 body-3 text-foreground">
                      {row.feature}
                    </td>
                    <td className="px-spacing-3 py-spacing-2 body-3 text-foreground">
                      {row.action}
                    </td>
                    <td className="px-spacing-3 py-spacing-2 body-3 text-foreground font-mono text-sm">
                      {row.model_name || '—'}
                    </td>
                    <td className="px-spacing-3 py-spacing-2">
                      <span className="bg-destructive/10 text-destructive rounded px-1.5 py-0.5 text-xs">
                        {row.reason}
                      </span>
                    </td>
                    <td className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground max-w-[200px] truncate">
                      {row.error_message || '—'}
                    </td>
                    <td className="px-spacing-3 py-spacing-2">
                      <button
                        onClick={() => handleResolve(row.id)}
                        disabled={resolving === row.id}
                        className="body-4 text-emerald hover:underline disabled:opacity-50"
                      >
                        {resolving === row.id ? '...' : 'Resolve'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="gap-spacing-2 text-emerald flex items-center">
            <CheckCircle className="icon-sm" />
            <span className="body-3">No billing failures in the last 7 days</span>
          </div>
        )}
      </Card>
    </div>
  )
}
