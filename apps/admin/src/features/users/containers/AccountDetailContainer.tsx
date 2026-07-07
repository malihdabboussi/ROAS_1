'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Coins,
  CreditCard,
  DollarSign,
  Gauge,
  UserRound,
  Users,
} from 'lucide-react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { Card } from '@/components/ui/card'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import {
  fetchAdminOrgDashboard,
  fetchAdminOrgDashboardRange,
  fetchAdminUserDashboard,
  fetchAdminUserDashboardRange,
  mergeAccountDashboardRange,
  type AdminAccountRangeDays,
} from '../services/account-detail.service'
import type {
  AdminAccountDashboard,
  AdminAccountFlag,
  AdminDailyUsagePoint,
  AdminFeatureBreakdownRow,
  AdminModelBreakdownRow,
  AdminOrgDashboard,
  AdminRecentUsageEvent,
} from '../types/account-detail.types'

interface AccountDetailContainerProps {
  kind: 'user' | 'org'
  id: string
}

const RANGE_OPTIONS: AdminAccountRangeDays[] = [7, 14, 30, 90]

const DAILY_CHART_COLORS = {
  credits: 'var(--chart-glass-label-green)',
  providerCost: 'var(--chart-glass-label-orange)',
  creditValue: 'var(--chart-glass-label-gold)',
}

const dailyUsageChartConfig = {
  credits: { label: 'Credits', color: DAILY_CHART_COLORS.credits },
  computedCost: { label: 'Provider cost', color: DAILY_CHART_COLORS.providerCost },
  billedCostUsd: { label: 'Credit value', color: DAILY_CHART_COLORS.creditValue },
} satisfies ChartConfig

export function AccountDetailContainer({ kind, id }: AccountDetailContainerProps) {
  const [days, setDays] = useState<AdminAccountRangeDays>(30)
  const [dashboard, setDashboard] = useState<AdminAccountDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const rangeCacheRef = useRef<Map<AdminAccountRangeDays, AdminAccountDashboard>>(new Map())
  const rangeRequestRef = useRef(0)

  useEffect(() => {
    let cancelled = false
    rangeCacheRef.current.clear()

    async function loadDashboard() {
      setLoading(true)
      setError(null)
      setDashboard(null)
      try {
        const data =
          kind === 'org'
            ? await fetchAdminOrgDashboard(id, days)
            : await fetchAdminUserDashboard(id, days)
        if (!cancelled) {
          rangeCacheRef.current.set(days, data)
          setDashboard(data)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load account')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadDashboard()
    return () => {
      cancelled = true
    }
  }, [id, kind])

  const handleDaysChange = useCallback(
    async (nextDays: AdminAccountRangeDays) => {
      if (nextDays === days) return

      const cached = rangeCacheRef.current.get(nextDays)
      if (cached) {
        setDays(nextDays)
        setError(null)
        setDashboard(cached)
        return
      }

      if (!dashboard) return

      const requestId = ++rangeRequestRef.current
      setLoading(true)
      setError(null)

      try {
        const slice =
          kind === 'org'
            ? await fetchAdminOrgDashboardRange(id, nextDays)
            : await fetchAdminUserDashboardRange(id, nextDays)
        if (requestId !== rangeRequestRef.current) return

        const merged = mergeAccountDashboardRange(dashboard, slice)
        rangeCacheRef.current.set(nextDays, merged)
        setDashboard(merged)
        setDays(nextDays)
      } catch (err) {
        if (requestId !== rangeRequestRef.current) return
        setError(err instanceof Error ? err.message : 'Failed to load range')
      } finally {
        if (requestId === rangeRequestRef.current) setLoading(false)
      }
    },
    [dashboard, days, id, kind],
  )

  const title = useMemo(() => {
    if (!dashboard) return kind === 'org' ? 'ORGANIZATION DASHBOARD' : 'USER DASHBOARD'
    if (dashboard.kind === 'org') return dashboard.account.name ?? dashboard.account.slug ?? 'ORGANIZATION'
    return dashboard.account.name ?? dashboard.account.email ?? 'USER'
  }, [dashboard, kind])

  if (loading) {
    return (
      <div className="w-full">
        <div className="flex min-h-[520px] items-center justify-center">
          <VibeyLoadingOrb text="Loading account" size="lg" />
        </div>
      </div>
    )
  }

  if (error && !dashboard) {
    return (
      <div className="w-full space-y-spacing-6">
        <Link
          href="/users"
          className="surface-card border-border text-foreground body-3 rounded-spacing-2 px-spacing-3 py-spacing-2 gap-spacing-2 hover:bg-hover-subtle inline-flex items-center border transition-all"
        >
          <ArrowLeft className="icon-sm" />
          Back
        </Link>
        <Card className="surface-card p-spacing-6">
          <p className="body-2 text-destructive">{error}</p>
        </Card>
      </div>
    )
  }

  if (!dashboard) return null

  return (
    <div className="w-full space-y-spacing-6">
      <section className="flex flex-col gap-spacing-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-spacing-3">
          <Link
            href="/users"
            className="surface-card border-border text-foreground body-3 rounded-spacing-2 px-spacing-3 py-spacing-2 gap-spacing-2 hover:bg-hover-subtle inline-flex items-center border transition-all"
          >
            <ArrowLeft className="icon-sm" />
            Users
          </Link>
          <div>
            <h1 className="title-h1 text-foreground">{title.toUpperCase()}</h1>
            <AccountSubtitle dashboard={dashboard} />
          </div>
        </div>
        <div className="flex flex-col items-end gap-spacing-2">
          <div className="flex flex-wrap items-center gap-spacing-2">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => void handleDaysChange(option)}
                className={`body-3 rounded-spacing-2 px-spacing-3 py-spacing-2 font-medium transition-colors ${
                  days === option ? 'button-glass-primary' : 'button-glass-neutral'
                }`}
              >
                {option}d
              </button>
            ))}
          </div>
          {error ? <p className="body-3 text-destructive">{error}</p> : null}
        </div>
      </section>

      <Flags flags={dashboard.flags} />

      <section className="gap-spacing-6 grid md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          icon={Coins}
          label="Credits used"
          value={formatNumber(dashboard.summary.totalCredits)}
          detail={`${formatNumber(dashboard.summary.avgDailyCredits)} daily avg`}
        />
        <MetricCard
          icon={Gauge}
          label="Credits left"
          value={formatNumber(dashboard.account.balance.totalAvailable)}
          detail={`${formatNumber(dashboard.summary.projectedMonthlyCredits)} projected monthly`}
        />
        <MetricCard
          icon={BarChart3}
          label="Tokens"
          value={formatNumber(dashboard.summary.totalTokens)}
          detail={`${formatNumber(dashboard.summary.eventCount)} usage events`}
        />
        <MetricCard
          icon={DollarSign}
          label="Provider cost"
          value={formatCurrency(dashboard.summary.totalComputedCost)}
          detail={`${formatCurrency(dashboard.summary.avgDailyComputedCost)} daily avg`}
        />
        <MetricCard
          icon={CreditCard}
          label="Credit value"
          value={formatCurrency(dashboard.summary.billedCostUsd)}
          detail={`${formatCurrency(dashboard.summary.avgDailyBilledCostUsd)} daily avg`}
        />
      </section>

      <section className="gap-spacing-6 grid lg:grid-cols-3">
        <Card className="surface-card p-spacing-6 lg:col-span-2">
          <div className="mb-spacing-4 flex items-center justify-between gap-spacing-3">
            <div>
              <h3 className="title-h4 text-foreground">Daily usage</h3>
              <p className="body-3 text-muted-foreground mt-spacing-1">
                Credits, provider cost, and credit value
              </p>
            </div>
            <CalendarDays className="icon-sm text-primary" />
          </div>
          <DailyUsageChart data={dashboard.dailyUsage} />
        </Card>

        <Card className="surface-card p-spacing-6">
          <div className="mb-spacing-4">
            <h3 className="title-h4 text-foreground">Account snapshot</h3>
            <p className="body-3 text-muted-foreground mt-spacing-1">Plan, ledger, and lifetime totals</p>
          </div>
          <Snapshot dashboard={dashboard} />
        </Card>
      </section>

      <section className="gap-spacing-6 grid xl:grid-cols-2">
        <FeatureBreakdown rows={dashboard.featureBreakdown} />
        <ModelBreakdown rows={dashboard.modelBreakdown} />
      </section>

      {dashboard.kind === 'org' && <OrgMembers dashboard={dashboard} />}

      <RecentEvents rows={dashboard.recentEvents} />
    </div>
  )
}

function AccountSubtitle({ dashboard }: { dashboard: AdminAccountDashboard }) {
  if (dashboard.kind === 'org') {
    return (
      <p className="body-2 text-muted-foreground mt-spacing-2">
        {dashboard.account.slug ?? dashboard.account.id} · {dashboard.account.account_type ?? 'org'} ·{' '}
        {dashboard.account.status ?? 'unknown'} · owner {dashboard.account.owner?.email ?? 'unknown'}
      </p>
    )
  }

  return (
    <p className="body-2 text-muted-foreground mt-spacing-2">
      {dashboard.account.email ?? dashboard.account.id} · {dashboard.account.role} ·{' '}
      {dashboard.account.plan?.name ?? dashboard.account.plan?.slug ?? 'No plan'}
    </p>
  )
}

function Flags({ flags }: { flags: AdminAccountFlag[] }) {
  return (
    <section className="gap-spacing-4 grid md:grid-cols-2 xl:grid-cols-3">
      {flags.map((flag) => (
        <Card key={`${flag.label}:${flag.detail}`} className="surface-card p-spacing-4">
          <div className="gap-spacing-3 flex items-start">
            <span
              className={`badge-glass-sm ${
                flag.severity === 'danger'
                  ? 'badge-glass-red'
                  : flag.severity === 'warning'
                    ? 'badge-glass-orange'
                    : 'badge-glass-green'
              }`}
            >
              {flag.severity}
            </span>
            <div>
              <p className="body-2 font-medium text-foreground">{flag.label}</p>
              <p className="body-3 text-muted-foreground">{flag.detail}</p>
            </div>
          </div>
        </Card>
      ))}
    </section>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Coins
  label: string
  value: string
  detail: string
}) {
  return (
    <Card className="surface-card p-spacing-6">
      <div className="mb-spacing-4 flex items-center justify-between">
        <div className="gap-spacing-2 flex items-center">
          <div className="w-spacing-8 h-spacing-8 bg-muted flex items-center justify-center rounded-full">
            <Icon className="icon-sm text-primary" />
          </div>
          <span className="body-2 text-muted-foreground">{label}</span>
        </div>
        <span className="title-h3 text-foreground">{value}</span>
      </div>
      <p className="body-3 text-muted-foreground">{detail}</p>
    </Card>
  )
}

function DailyUsageChart({ data }: { data: AdminDailyUsagePoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-[300px] w-full items-center justify-center">
        <p className="body-3 text-muted-foreground">No usage data in this range</p>
      </div>
    )
  }

  return (
    <ChartContainer config={dailyUsageChartConfig} className="h-[300px] w-full">
      <AreaChart data={data} margin={{ left: 12, right: 12 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={32}
          tickFormatter={(value) => formatShortDate(String(value))}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => formatCompactNumber(Number(value))}
          width={50}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <defs>
          <linearGradient id="fillAccountCredits" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={DAILY_CHART_COLORS.credits} stopOpacity={0.8} />
            <stop offset="95%" stopColor={DAILY_CHART_COLORS.credits} stopOpacity={0.1} />
          </linearGradient>
          <linearGradient id="fillAccountProviderCost" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={DAILY_CHART_COLORS.providerCost} stopOpacity={0.8} />
            <stop offset="95%" stopColor={DAILY_CHART_COLORS.providerCost} stopOpacity={0.1} />
          </linearGradient>
          <linearGradient id="fillAccountCreditValue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={DAILY_CHART_COLORS.creditValue} stopOpacity={0.8} />
            <stop offset="95%" stopColor={DAILY_CHART_COLORS.creditValue} stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <Area
          dataKey="computedCost"
          type="monotone"
          fill="url(#fillAccountProviderCost)"
          fillOpacity={0.4}
          stroke={DAILY_CHART_COLORS.providerCost}
          strokeWidth={2}
        />
        <Area
          dataKey="billedCostUsd"
          type="monotone"
          fill="url(#fillAccountCreditValue)"
          fillOpacity={0.4}
          stroke={DAILY_CHART_COLORS.creditValue}
          strokeWidth={2}
        />
        <Area
          dataKey="credits"
          type="monotone"
          fill="url(#fillAccountCredits)"
          fillOpacity={0.4}
          stroke={DAILY_CHART_COLORS.credits}
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  )
}

function Snapshot({ dashboard }: { dashboard: AdminAccountDashboard }) {
  const plan = dashboard.account.plan
  const ledgerRows = dashboard.creditLedger.monthlyUsage.slice(0, 4)

  return (
    <div className="space-y-spacing-4">
      <SnapshotRow label="Plan" value={plan?.name ?? plan?.slug ?? 'No plan'} />
      <SnapshotRow label="Status" value={plan?.status ?? 'unknown'} />
      <SnapshotRow label="Lifetime credits" value={formatNumber(dashboard.account.lifetime.totalCredits)} />
      <SnapshotRow
        label="Lifetime provider cost"
        value={formatCurrency(dashboard.account.lifetime.totalComputedCost)}
      />
      <SnapshotRow
        label="Lifetime credit value"
        value={formatCurrency(dashboard.account.lifetime.billedCostUsd)}
      />
      <SnapshotRow label="Purchased credits" value={formatNumber(dashboard.account.balance.purchasedCredits)} />
      <SnapshotRow label="Base used" value={formatNumber(dashboard.account.balance.baseCreditsUsed)} />
      <div className="border-border pt-spacing-4 border-t">
        <p className="body-3 text-muted-foreground">Recent ledger</p>
        <div className="mt-spacing-2 space-y-spacing-2">
          {ledgerRows.length === 0 ? (
            <p className="body-3 text-muted-foreground">No monthly ledger rows</p>
          ) : (
            ledgerRows.map((row) => (
              <SnapshotRow
                key={String(row.id ?? row.month)}
                label={String(row.month ?? 'month')}
                value={formatNumber(Number(row.total_credits_used ?? 0))}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="gap-spacing-3 flex items-center justify-between">
      <span className="body-3 text-muted-foreground">{label}</span>
      <span className="body-2 text-foreground">{value}</span>
    </div>
  )
}

function FeatureBreakdown({ rows }: { rows: AdminFeatureBreakdownRow[] }) {
  return (
    <Card className="surface-card p-spacing-6">
      <SectionHeader
        icon={CreditCard}
        title="Feature spend"
        subtitle="Credits, credit value, and provider cost"
      />
      <SortableDataTable
        empty="No feature usage in this range"
        getRowKey={(row) => `${row.feature}:${row.action}`}
        rows={rows}
        columns={[
          {
            key: 'feature',
            label: 'Feature',
            primary: true,
            sortValue: (row) => `${row.feature} · ${row.action}`,
            render: (row) => `${row.feature} · ${row.action}`,
          },
          {
            key: 'credits',
            label: 'Credits',
            sortValue: (row) => row.credits,
            render: (row) => formatNumber(row.credits),
          },
          {
            key: 'creditValue',
            label: 'Credit value',
            sortValue: (row) => row.billedCostUsd,
            render: (row) => formatCurrency(row.billedCostUsd),
          },
          {
            key: 'providerCost',
            label: 'Provider cost',
            sortValue: (row) => row.computedCost,
            render: (row) => formatCurrency(row.computedCost),
          },
          {
            key: 'events',
            label: 'Events',
            sortValue: (row) => row.eventCount,
            render: (row) => formatNumber(row.eventCount),
          },
        ]}
      />
    </Card>
  )
}

function ModelBreakdown({ rows }: { rows: AdminModelBreakdownRow[] }) {
  return (
    <Card className="surface-card p-spacing-6">
      <SectionHeader icon={Gauge} title="Model spend" subtitle="Provider, model, and cost split" />
      <SortableDataTable
        empty="No model usage in this range"
        getRowKey={(row) => `${row.provider}:${row.modelName}`}
        rows={rows}
        columns={[
          {
            key: 'model',
            label: 'Model',
            primary: true,
            sortValue: (row) => `${row.provider} · ${row.modelName}`,
            render: (row) => `${row.provider} · ${row.modelName}`,
          },
          {
            key: 'tokens',
            label: 'Tokens',
            sortValue: (row) => row.tokens,
            render: (row) => formatNumber(row.tokens),
          },
          {
            key: 'creditValue',
            label: 'Credit value',
            sortValue: (row) => row.billedCostUsd,
            render: (row) => formatCurrency(row.billedCostUsd),
          },
          {
            key: 'providerCost',
            label: 'Provider cost',
            sortValue: (row) => row.computedCost,
            render: (row) => formatCurrency(row.computedCost),
          },
          {
            key: 'events',
            label: 'Events',
            sortValue: (row) => row.eventCount,
            render: (row) => formatNumber(row.eventCount),
          },
        ]}
      />
    </Card>
  )
}

function OrgMembers({ dashboard }: { dashboard: AdminOrgDashboard }) {
  return (
    <Card className="surface-card p-spacing-6">
      <SectionHeader icon={Users} title="Member usage" subtitle="Organization members by current range spend" />
      <SortableDataTable
        empty="No members found"
        getRowKey={(member) => member.id}
        rows={dashboard.members}
        columns={[
          {
            key: 'member',
            label: 'Member',
            primary: true,
            sortValue: (member) =>
              member.identity?.email ?? member.identity?.name ?? member.user_id,
            render: (member) =>
              member.identity?.email ?? member.identity?.name ?? member.user_id,
          },
          {
            key: 'role',
            label: 'Role',
            sortValue: (member) => member.role,
            render: (member) => member.role,
          },
          {
            key: 'credits',
            label: 'Credits',
            sortValue: (member) => member.usage.totalCredits,
            render: (member) => formatNumber(member.usage.totalCredits),
          },
          {
            key: 'creditValue',
            label: 'Credit value',
            sortValue: (member) => member.usage.billedCostUsd,
            render: (member) => formatCurrency(member.usage.billedCostUsd),
          },
          {
            key: 'providerCost',
            label: 'Provider cost',
            sortValue: (member) => member.usage.totalComputedCost,
            render: (member) => formatCurrency(member.usage.totalComputedCost),
          },
          {
            key: 'status',
            label: 'Status',
            sortValue: (member) => member.status,
            render: (member) => member.status,
          },
        ]}
      />
    </Card>
  )
}

function RecentEvents({ rows }: { rows: AdminRecentUsageEvent[] }) {
  return (
    <Card className="surface-card p-spacing-6">
      <SectionHeader icon={UserRound} title="Recent usage events" subtitle="Latest billable AI events in this range" />
      <SortableDataTable
        empty="No recent events in this range"
        getRowKey={(row) => row.id}
        rows={rows}
        columns={[
          {
            key: 'time',
            label: 'Time',
            primary: true,
            sortValue: (row) => new Date(row.created_at).getTime(),
            render: (row) => formatDate(row.created_at),
          },
          {
            key: 'feature',
            label: 'Feature',
            sortValue: (row) => `${row.feature ?? 'unknown'} · ${row.action ?? 'unknown'}`,
            render: (row) => `${row.feature ?? 'unknown'} · ${row.action ?? 'unknown'}`,
          },
          {
            key: 'model',
            label: 'Model',
            sortValue: (row) => row.model_name ?? row.provider ?? 'unknown',
            render: (row) => row.model_name ?? row.provider ?? 'unknown',
          },
          {
            key: 'tokens',
            label: 'Tokens',
            sortValue: (row) => row.tokens,
            render: (row) => formatNumber(row.tokens),
          },
          {
            key: 'credits',
            label: 'Credits',
            sortValue: (row) => row.credits,
            render: (row) => formatNumber(row.credits),
          },
          {
            key: 'creditValue',
            label: 'Credit value',
            sortValue: (row) => row.billedCostUsd,
            render: (row) => formatCurrency(row.billedCostUsd),
          },
          {
            key: 'providerCost',
            label: 'Provider cost',
            sortValue: (row) => row.computedCost,
            render: (row) => formatCurrency(row.computedCost),
          },
        ]}
      />
    </Card>
  )
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof UserRound
  title: string
  subtitle: string
}) {
  return (
    <div className="mb-spacing-4 flex items-start justify-between gap-spacing-3">
      <div>
        <h3 className="title-h4 text-foreground">{title}</h3>
        <p className="body-3 text-muted-foreground mt-spacing-1">{subtitle}</p>
      </div>
      <Icon className="icon-sm text-primary" />
    </div>
  )
}

type SortDir = 'asc' | 'desc'

type SortableColumnDef<T> = {
  key: string
  label: string
  primary?: boolean
  sortValue: (row: T) => string | number
  render: (row: T) => string
}

function SortableDataTable<T>({
  columns,
  rows,
  empty,
  getRowKey,
}: {
  columns: SortableColumnDef<T>[]
  rows: T[]
  empty: string
  getRowKey: (row: T) => string
}) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const getDir = (key: string): SortDir | null => (sortKey === key ? sortDir : null)

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(key)
    setSortDir('asc')
  }

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows
    const column = columns.find((col) => col.key === sortKey)
    if (!column) return rows

    return [...rows].sort((a, b) => {
      const aVal = column.sortValue(a)
      const bVal = column.sortValue(b)
      let cmp = 0
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        cmp = aVal - bVal
      } else {
        cmp = String(aVal).localeCompare(String(bVal))
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [columns, rows, sortDir, sortKey])

  if (rows.length === 0) {
    return <p className="body-3 text-muted-foreground">{empty}</p>
  }

  return (
    <div className="surface-card rounded-spacing-2 overflow-x-auto border border-[var(--border)]">
      <table className="body-2 text-foreground w-full min-w-full text-left">
        <thead>
          <tr className="text-muted-foreground border-b border-[var(--border)]">
            {columns.map((column) => (
              <th key={column.key} className="px-spacing-4 py-spacing-3">
                <button
                  type="button"
                  onClick={() => toggleSort(column.key)}
                  className="body-3 text-muted-foreground gap-spacing-1 hover:text-foreground inline-flex items-center font-medium"
                >
                  {column.label}
                  <span className="inline-flex flex-col leading-none">
                    <ChevronUp
                      className={`icon-xs ${getDir(column.key) === 'asc' ? 'text-foreground' : 'text-muted-foreground'}`}
                    />
                    <ChevronDown
                      className={`icon-xs -mt-[2px] ${
                        getDir(column.key) === 'desc' ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    />
                  </span>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => (
            <tr key={getRowKey(row)} className="border-b border-[var(--border)] last:border-0">
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`px-spacing-4 py-spacing-3 ${column.primary ? 'text-foreground' : 'text-muted-foreground'}`}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value >= 10 ? 0 : 2,
  }).format(value)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(value))
}
