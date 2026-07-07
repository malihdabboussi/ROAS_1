'use client'

import Link from 'next/link'
import {
  Activity,
  Brain,
  Building2,
  Coins,
  CreditCard,
  DollarSign,
  ListChecks,
  Mail,
  MailCheck,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Card } from '@/components/ui/card'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import type { WaitlistResponse } from '@/features/waitlist/types/waitlist.types'
import type { DashboardStats } from '../types/dashboard.types'
import { MrrGoalCard } from './MrrGoalCard'

interface DashboardMetricsCardsProps {
  stats: DashboardStats | null
  loading: boolean
  error: string | null
  waitlist: WaitlistResponse['metrics'] | null
}

export function DashboardMetricsCards({
  stats,
  loading,
  error,
  waitlist,
}: DashboardMetricsCardsProps) {
  const formatTokens = (n: number | undefined) => {
    if (n === undefined || n === null || isNaN(n)) return '0'
    if (n >= 1000000) return `${(n / 1000000).toFixed(2)}M`
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
    return String(Math.round(n))
  }

  const fmtUsd = (n: number | undefined) => {
    const v = n ?? 0
    return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const fmtInt = (n: number | undefined) => {
    return (n ?? 0).toLocaleString('en-US')
  }

  if (loading) {
    return (
      <div className="gap-spacing-6 grid grid-cols-1 lg:grid-cols-3">
        {[...Array(3)].map((_, index) => (
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

  if (error || !stats) {
    return (
      <div className="gap-spacing-6 grid grid-cols-1 lg:grid-cols-3">
        {[...Array(3)].map((_, index) => (
          <Card key={index} className="surface-card p-spacing-6">
            <div className="text-center">
              <p className="body-3 text-muted-foreground">Error loading data</p>
            </div>
          </Card>
        ))}
      </div>
    )
  }

  const netProfit30d = (stats.revenue.totalRevenue ?? 0) - (stats.costs.totalCost30d ?? 0)
  const waitlistConversionRate =
    waitlist && waitlist.total > 0
      ? ((waitlist.registered / waitlist.total) * 100).toFixed(1)
      : '0.0'

  return (
    <div className="space-y-spacing-6">
      <MrrGoalCard stats={stats} loading={loading} />

      <div className="gap-spacing-6 grid grid-cols-1 lg:grid-cols-3">
        {/* Card 1: Accounts */}
        <Card className="surface-card p-spacing-6">
          <div className="mb-spacing-4 flex items-center justify-between">
            <h3 className="title-h4 text-foreground">
              {stats.scope === 'organization'
                ? 'Organizations'
                : stats.scope === 'all'
                  ? 'Accounts'
                  : 'Users'}
            </h3>
            {stats.scope !== 'organization' ? (
              <Link
                href="/users"
                className="body-3 text-foreground hover:text-muted-foreground hover:underline"
              >
                View All →
              </Link>
            ) : (
              <span className="body-3 text-muted-foreground">&nbsp;</span>
            )}
          </div>
          <div className="space-y-spacing-4">
            {stats.scope !== 'organization' && (
              <>
                <div className="flex items-center justify-between">
                  <div className="gap-spacing-2 flex items-center">
                    <div className="w-spacing-8 h-spacing-8 bg-muted flex items-center justify-center rounded-full">
                      <Users className="icon-sm text-muted-foreground" />
                    </div>
                    <span className="body-2 text-muted-foreground">Total Users</span>
                  </div>
                  <span className="title-h3 text-foreground">{fmtInt(stats.users.totalUsers)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="gap-spacing-2 flex items-center">
                    <div className="w-spacing-8 h-spacing-8 bg-muted flex items-center justify-center rounded-full">
                      <UserPlus className="icon-sm text-muted-foreground" />
                    </div>
                    <span className="body-3 text-muted-foreground">New users (24h)</span>
                  </div>
                  <span className="title-h4 text-foreground">
                    {fmtInt(stats.users.newUsersLast24h)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="gap-spacing-2 flex items-center">
                    <div className="w-spacing-8 h-spacing-8 bg-muted flex items-center justify-center rounded-full">
                      <UserPlus className="icon-sm text-muted-foreground" />
                    </div>
                    <span className="body-3 text-muted-foreground">New users (7d)</span>
                  </div>
                  <span className="title-h4 text-foreground">
                    {fmtInt(stats.users.newUsersLast7Days)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="gap-spacing-2 flex items-center">
                    <div className="w-spacing-8 h-spacing-8 bg-muted flex items-center justify-center rounded-full">
                      <Activity className="icon-sm text-muted-foreground" />
                    </div>
                    <span className="body-3 text-muted-foreground">Active users (7d)</span>
                  </div>
                  <span className="title-h4 text-foreground">
                    {fmtInt(stats.users.activeUsersLast7Days)}
                  </span>
                </div>
              </>
            )}
            {stats.scope !== 'personal' && (
              <>
                {stats.scope === 'all' && (
                  <div className="border-border text-muted-foreground pt-spacing-3 body-4 border-t">
                    Organizations
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="gap-spacing-2 flex items-center">
                    <div className="w-spacing-8 h-spacing-8 bg-muted flex items-center justify-center rounded-full">
                      <Building2 className="icon-sm text-muted-foreground" />
                    </div>
                    <span className="body-2 text-muted-foreground">Total orgs</span>
                  </div>
                  <span className="title-h3 text-foreground">
                    {fmtInt(stats.organizations.totalOrganizations)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="gap-spacing-2 flex items-center">
                    <div className="w-spacing-8 h-spacing-8 bg-muted flex items-center justify-center rounded-full">
                      <Users className="icon-sm text-muted-foreground" />
                    </div>
                    <span className="body-3 text-muted-foreground">Org members</span>
                  </div>
                  <span className="title-h4 text-foreground">
                    {fmtInt(stats.organizations.totalOrgMembers)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="gap-spacing-2 flex items-center">
                    <div className="w-spacing-8 h-spacing-8 bg-muted flex items-center justify-center rounded-full">
                      <UserPlus className="icon-sm text-muted-foreground" />
                    </div>
                    <span className="body-3 text-muted-foreground">New orgs (24h)</span>
                  </div>
                  <span className="title-h4 text-foreground">
                    {fmtInt(stats.organizations.newOrganizationsLast24h)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="gap-spacing-2 flex items-center">
                    <div className="w-spacing-8 h-spacing-8 bg-muted flex items-center justify-center rounded-full">
                      <UserPlus className="icon-sm text-muted-foreground" />
                    </div>
                    <span className="body-3 text-muted-foreground">New orgs (7d)</span>
                  </div>
                  <span className="title-h4 text-foreground">
                    {fmtInt(stats.organizations.newOrganizationsLast7Days)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="gap-spacing-2 flex items-center">
                    <div className="w-spacing-8 h-spacing-8 bg-muted flex items-center justify-center rounded-full">
                      <UserPlus className="icon-sm text-muted-foreground" />
                    </div>
                    <span className="body-3 text-muted-foreground">New members (7d)</span>
                  </div>
                  <span className="title-h4 text-foreground">
                    {fmtInt(stats.organizations.newOrgMembersLast7Days)}
                  </span>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Card 2: Revenue & Costs (consolidated) */}
        <Card className="surface-card p-spacing-6">
          <div className="mb-spacing-4 flex items-center justify-between">
            <h3 className="title-h4 text-foreground">Revenue & Costs</h3>
            <Link
              href="/finances"
              className="body-3 text-foreground hover:text-muted-foreground hover:underline"
            >
              View All →
            </Link>
          </div>
          <div className="space-y-spacing-4">
            {/* Revenue section */}
            <div className="flex items-center justify-between">
              <div className="gap-spacing-2 flex items-center">
                <div className="w-spacing-8 h-spacing-8 bg-muted flex items-center justify-center rounded-full">
                  <Wallet className="icon-sm text-emerald" />
                </div>
                <span className="body-2 text-muted-foreground">Total Revenue</span>
              </div>
              <span className="title-h3 text-emerald">{fmtUsd(stats.revenue.totalRevenue)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="gap-spacing-2 flex items-center">
                <div className="w-spacing-8 h-spacing-8 bg-muted flex items-center justify-center rounded-full">
                  <DollarSign className="icon-sm text-emerald" />
                </div>
                <span className="body-3 text-muted-foreground">MRR (Subs)</span>
              </div>
              <span className="title-h4 text-foreground">{fmtUsd(stats.revenue.mrr)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="gap-spacing-2 flex items-center">
                <div className="w-spacing-8 h-spacing-8 bg-muted flex items-center justify-center rounded-full">
                  <Brain className="icon-sm text-emerald" />
                </div>
                <span className="body-3 text-muted-foreground">
                  Addons ({fmtInt(stats.revenue.addonCount)})
                </span>
              </div>
              <span className="title-h4 text-foreground">{fmtUsd(stats.revenue.addonMrr)}/mo</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="gap-spacing-2 flex items-center">
                <div className="w-spacing-8 h-spacing-8 bg-muted flex items-center justify-center rounded-full">
                  <CreditCard className="icon-sm text-emerald" />
                </div>
                <span className="body-3 text-muted-foreground">Credit Packs (30d)</span>
              </div>
              <span className="title-h4 text-foreground">
                {fmtUsd(stats.revenue.creditPackRevenue)}
              </span>
            </div>

            {/* Divider */}
            <div className="border-border pt-spacing-3 body-4 text-muted-foreground border-t">
              Costs (30d)
            </div>

            <div className="flex items-center justify-between">
              <div className="gap-spacing-2 flex items-center">
                <div className="w-spacing-8 h-spacing-8 bg-muted flex items-center justify-center rounded-full">
                  <DollarSign className="icon-sm text-orange" />
                </div>
                <span className="body-2 text-muted-foreground">AI Cost</span>
              </div>
              <span className="title-h3 text-foreground">{fmtUsd(stats.costs.totalCost30d)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="gap-spacing-2 flex items-center">
                <div className="w-spacing-8 h-spacing-8 bg-muted flex items-center justify-center rounded-full">
                  <TrendingUp className="icon-sm text-orange" />
                </div>
                <span className="body-3 text-muted-foreground">AI Requests</span>
              </div>
              <span className="title-h4 text-foreground">
                {fmtInt(stats.costs.totalRequests30d)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="gap-spacing-2 flex items-center">
                <div className="w-spacing-8 h-spacing-8 bg-muted flex items-center justify-center rounded-full">
                  <Coins className="icon-sm text-orange" />
                </div>
                <span className="body-3 text-muted-foreground">Tokens</span>
              </div>
              <span className="title-h4 text-foreground">
                {formatTokens(stats.costs.totalTokens30d)}
              </span>
            </div>

            {/* Net */}
            <div className="border-border pt-spacing-3 flex items-center justify-between border-t">
              <span className="body-3 text-muted-foreground font-medium">Net (Revenue − Cost)</span>
              <span
                className={`title-h4 font-semibold ${netProfit30d >= 0 ? 'text-emerald' : 'text-destructive'}`}
              >
                {fmtUsd(netProfit30d)}
              </span>
            </div>
          </div>
        </Card>

        {/* Card 3: Waitlist */}
        <Card className="surface-card p-spacing-6">
          <div className="mb-spacing-4 flex items-center justify-between">
            <h3 className="title-h4 text-foreground">Waitlist</h3>
            <Link
              href="/waitlist"
              className="body-3 text-foreground hover:text-muted-foreground hover:underline"
            >
              View All →
            </Link>
          </div>
          {waitlist ? (
            <div className="space-y-spacing-4">
              <div className="flex items-center justify-between">
                <div className="gap-spacing-2 flex items-center">
                  <div className="w-spacing-8 h-spacing-8 bg-muted flex items-center justify-center rounded-full">
                    <ListChecks className="icon-sm text-muted-foreground" />
                  </div>
                  <span className="body-2 text-muted-foreground">Total signups</span>
                </div>
                <span className="title-h3 text-foreground">{fmtInt(waitlist.total)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="gap-spacing-2 flex items-center">
                  <div className="w-spacing-8 h-spacing-8 bg-muted flex items-center justify-center rounded-full">
                    <Users className="icon-sm text-muted-foreground" />
                  </div>
                  <span className="body-3 text-muted-foreground">Pending</span>
                </div>
                <span className="title-h4 text-foreground">{fmtInt(waitlist.pending)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="gap-spacing-2 flex items-center">
                  <div className="w-spacing-8 h-spacing-8 bg-muted flex items-center justify-center rounded-full">
                    <Mail className="icon-sm text-muted-foreground" />
                  </div>
                  <span className="body-3 text-muted-foreground">Invited</span>
                </div>
                <span className="title-h4 text-foreground">{fmtInt(waitlist.invited)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="gap-spacing-2 flex items-center">
                  <div className="w-spacing-8 h-spacing-8 bg-muted flex items-center justify-center rounded-full">
                    <MailCheck className="icon-sm text-emerald" />
                  </div>
                  <span className="body-3 text-muted-foreground">Registered</span>
                </div>
                <span className="title-h4 text-emerald">{fmtInt(waitlist.registered)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="gap-spacing-2 flex items-center">
                  <div className="w-spacing-8 h-spacing-8 bg-muted flex items-center justify-center rounded-full">
                    <UserCheck className="icon-sm text-muted-foreground" />
                  </div>
                  <span className="body-3 text-muted-foreground">Conversion rate</span>
                </div>
                <span className="title-h4 text-foreground">{waitlistConversionRate}%</span>
              </div>
              <div className="border-border pt-spacing-3 flex items-center justify-between border-t">
                <span className="body-3 text-muted-foreground">Machines provisioned</span>
                <span className="title-h4 text-foreground">
                  {fmtInt(waitlist.provisionedMachines)}{' '}
                  <span className="body-3 text-muted-foreground">
                    / {fmtInt(waitlist.machineCapacity)}
                  </span>
                </span>
              </div>
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center">
              <p className="body-3 text-muted-foreground">No waitlist data</p>
            </div>
          )}
        </Card>
      </div>

      <div className="gap-spacing-6 grid grid-cols-1 lg:grid-cols-3">
        {/* Signups trend */}
        <Card className="surface-card p-spacing-6">
          <h3 className="title-h4 text-foreground mb-spacing-4">
            {stats.scope === 'organization'
              ? 'Org signups'
              : stats.scope === 'all'
                ? 'Signups'
                : 'Users growth'}
          </h3>
          <div className="space-y-spacing-4">
            {stats.scope !== 'organization' && (
              <>
                <div>
                  <p className="body-3 text-muted-foreground mb-spacing-2">Users — 7d</p>
                  {stats.users.userTrend7d.length > 0 ? (
                    <ChartContainer
                      config={{ count: { label: 'Users', color: '#10b981' } } as ChartConfig}
                      className="h-24 w-full"
                    >
                      <AreaChart data={stats.users.userTrend7d}>
                        <defs>
                          <linearGradient id="fillUsersGrowth7d" x1="0" y1="0" x2="0" y2="1">
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
                          dataKey="count"
                          type="monotone"
                          fill="url(#fillUsersGrowth7d)"
                          fillOpacity={0.4}
                          stroke="#10b981"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ChartContainer>
                  ) : (
                    <div className="flex h-24 w-full items-center justify-center">
                      <p className="body-3 text-muted-foreground">No data</p>
                    </div>
                  )}
                </div>
                <div>
                  <p className="body-3 text-muted-foreground mb-spacing-2">Users — 30d</p>
                  {stats.users.userTrend30d.length > 0 ? (
                    <ChartContainer
                      config={{ count: { label: 'Users', color: '#10b981' } } as ChartConfig}
                      className="h-24 w-full"
                    >
                      <AreaChart data={stats.users.userTrend30d}>
                        <defs>
                          <linearGradient id="fillUsersGrowth30d" x1="0" y1="0" x2="0" y2="1">
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
                          dataKey="count"
                          type="monotone"
                          fill="url(#fillUsersGrowth30d)"
                          fillOpacity={0.4}
                          stroke="#10b981"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ChartContainer>
                  ) : (
                    <div className="flex h-24 w-full items-center justify-center">
                      <p className="body-3 text-muted-foreground">No data</p>
                    </div>
                  )}
                </div>
              </>
            )}
            {stats.scope !== 'personal' && (
              <>
                <div>
                  <p className="body-3 text-muted-foreground mb-spacing-2">New orgs — 7d</p>
                  {stats.organizations.orgTrend7d.length > 0 ? (
                    <ChartContainer
                      config={{ count: { label: 'Orgs', color: '#38bdf8' } } as ChartConfig}
                      className="h-24 w-full"
                    >
                      <AreaChart data={stats.organizations.orgTrend7d}>
                        <defs>
                          <linearGradient id="fillOrgGrowth7d" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.1} />
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
                          dataKey="count"
                          type="monotone"
                          fill="url(#fillOrgGrowth7d)"
                          fillOpacity={0.4}
                          stroke="#38bdf8"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ChartContainer>
                  ) : (
                    <div className="flex h-24 w-full items-center justify-center">
                      <p className="body-3 text-muted-foreground">No data</p>
                    </div>
                  )}
                </div>
                <div>
                  <p className="body-3 text-muted-foreground mb-spacing-2">New orgs — 30d</p>
                  {stats.organizations.orgTrend30d.length > 0 ? (
                    <ChartContainer
                      config={{ count: { label: 'Orgs', color: '#38bdf8' } } as ChartConfig}
                      className="h-24 w-full"
                    >
                      <AreaChart data={stats.organizations.orgTrend30d}>
                        <defs>
                          <linearGradient id="fillOrgGrowth30d" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.1} />
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
                          dataKey="count"
                          type="monotone"
                          fill="url(#fillOrgGrowth30d)"
                          fillOpacity={0.4}
                          stroke="#38bdf8"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ChartContainer>
                  ) : (
                    <div className="flex h-24 w-full items-center justify-center">
                      <p className="body-3 text-muted-foreground">No data</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Revenue Trends */}
        <Card className="surface-card p-spacing-6">
          <h3 className="title-h4 text-foreground mb-spacing-4">Revenue Trends</h3>
          <div className="space-y-spacing-4">
            <div>
              <p className="body-3 text-muted-foreground mb-spacing-2">7 Day Trend</p>
              {(stats.revenue.revenueTrend7d ?? []).length > 0 ? (
                <ChartContainer
                  config={{ revenue: { label: 'Revenue', color: '#10b981' } } as ChartConfig}
                  className="h-24 w-full"
                >
                  <AreaChart data={stats.revenue.revenueTrend7d ?? []}>
                    <defs>
                      <linearGradient id="fillRevenue7d" x1="0" y1="0" x2="0" y2="1">
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
                      dataKey="revenue"
                      type="monotone"
                      fill="url(#fillRevenue7d)"
                      fillOpacity={0.4}
                      stroke="#10b981"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              ) : (
                <div className="flex h-24 w-full items-center justify-center">
                  <p className="body-3 text-muted-foreground">No data</p>
                </div>
              )}
            </div>
            <div>
              <p className="body-3 text-muted-foreground mb-spacing-2">30 Day Trend</p>
              {(stats.revenue.revenueTrend30d ?? []).length > 0 ? (
                <ChartContainer
                  config={{ revenue: { label: 'Revenue', color: '#10b981' } } as ChartConfig}
                  className="h-24 w-full"
                >
                  <AreaChart data={stats.revenue.revenueTrend30d ?? []}>
                    <defs>
                      <linearGradient id="fillRevenue30d" x1="0" y1="0" x2="0" y2="1">
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
                      dataKey="revenue"
                      type="monotone"
                      fill="url(#fillRevenue30d)"
                      fillOpacity={0.4}
                      stroke="#10b981"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              ) : (
                <div className="flex h-24 w-full items-center justify-center">
                  <p className="body-3 text-muted-foreground">No data</p>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Cost Trends */}
        <Card className="surface-card p-spacing-6">
          <h3 className="title-h4 text-foreground mb-spacing-4">Cost Trends</h3>
          <div className="space-y-spacing-4">
            <div>
              <p className="body-3 text-muted-foreground mb-spacing-2">7 Day Trend</p>
              {stats.costs.costTrend7d.length > 0 ? (
                <ChartContainer
                  config={
                    { totalCost: { label: 'Cost', color: 'rgb(255, 149, 0)' } } as ChartConfig
                  }
                  className="h-24 w-full"
                >
                  <AreaChart data={stats.costs.costTrend7d}>
                    <defs>
                      <linearGradient id="fillCostTrend7d" x1="0" y1="0" x2="0" y2="1">
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
                      dataKey="totalCost"
                      type="monotone"
                      fill="url(#fillCostTrend7d)"
                      fillOpacity={0.4}
                      stroke="rgb(255, 149, 0)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              ) : (
                <div className="flex h-24 w-full items-center justify-center">
                  <p className="body-3 text-muted-foreground">No data</p>
                </div>
              )}
            </div>
            <div>
              <p className="body-3 text-muted-foreground mb-spacing-2">30 Day Trend</p>
              {stats.costs.costTrend30d.length > 0 ? (
                <ChartContainer
                  config={
                    { totalCost: { label: 'Cost', color: 'rgb(255, 149, 0)' } } as ChartConfig
                  }
                  className="h-24 w-full"
                >
                  <AreaChart data={stats.costs.costTrend30d}>
                    <defs>
                      <linearGradient id="fillCostTrend30d" x1="0" y1="0" x2="0" y2="1">
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
                      dataKey="totalCost"
                      type="monotone"
                      fill="url(#fillCostTrend30d)"
                      fillOpacity={0.4}
                      stroke="rgb(255, 149, 0)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              ) : (
                <div className="flex h-24 w-full items-center justify-center">
                  <p className="body-3 text-muted-foreground">No data</p>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
