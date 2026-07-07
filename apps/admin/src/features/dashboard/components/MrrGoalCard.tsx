'use client'

import { Calendar, Percent, Target, TrendingUp, UserPlus, Users } from 'lucide-react'
import { Card } from '@/components/ui/card'
import type { DashboardStats } from '../types/dashboard.types'

interface MrrGoalCardProps {
  stats: DashboardStats | null
  loading: boolean
}

const MRR_GOAL = 100000

export function MrrGoalCard({ stats, loading }: MrrGoalCardProps) {
  if (loading) {
    return (
      <Card className="surface-card p-spacing-6">
        <div className="animate-pulse">
          <div className="mb-spacing-4 flex items-center justify-between">
            <div className="bg-muted h-6 w-1/4 rounded" />
            <div className="bg-muted h-4 w-16 rounded" />
          </div>
          <div className="gap-spacing-6 grid grid-cols-3">
            <div className="space-y-spacing-4 col-span-2">
              <div className="bg-muted h-16 rounded" />
              <div className="bg-muted h-4 rounded" />
            </div>
            <div className="space-y-spacing-3">
              <div className="bg-muted h-8 rounded" />
              <div className="bg-muted h-8 rounded" />
              <div className="bg-muted h-8 rounded" />
            </div>
          </div>
        </div>
      </Card>
    )
  }

  if (!stats) {
    return (
      <Card className="surface-card p-spacing-6">
        <div className="text-center">
          <p className="body-2 text-muted-foreground">Unable to load goal data</p>
        </div>
      </Card>
    )
  }

  const currentMrr = (stats.revenue.mrr || 0) + (stats.revenue.addonMrr || 0)
  const paidUsers = stats.revenue.paidUsers || 0
  const arpu = paidUsers > 0 ? currentMrr / paidUsers : 49
  const requiredPaidUsers = Math.ceil(MRR_GOAL / arpu)
  const mrrProgress = Math.min((currentMrr / MRR_GOAL) * 100, 100)

  const userTrend = stats.users.userTrend30d || []
  const orgTrend = stats.organizations.orgTrend30d || []
  const totalNewUsers30d = userTrend.reduce((sum, day) => sum + day.count, 0)
  const totalNewOrgs30d = orgTrend.reduce((sum, day) => sum + day.count, 0)
  let conversionRate = 0.05
  if (stats.scope === 'organization') {
    conversionRate =
      stats.organizations.totalOrganizations > 0
        ? paidUsers / stats.organizations.totalOrganizations
        : 0.05
  } else if (stats.scope === 'personal') {
    conversionRate = stats.users.totalUsers > 0 ? paidUsers / stats.users.totalUsers : 0.05
  } else {
    const denom = stats.users.totalUsers + stats.organizations.totalOrganizations
    conversionRate = denom > 0 ? paidUsers / denom : 0.05
  }
  const estimatedSignups30d =
    stats.scope === 'organization'
      ? totalNewOrgs30d
      : stats.scope === 'personal'
        ? totalNewUsers30d
        : totalNewUsers30d + totalNewOrgs30d
  const estimatedMonthlyPaidUserGrowth = Math.max(Math.round(estimatedSignups30d * conversionRate), 1)

  const usersNeeded = requiredPaidUsers - paidUsers
  const monthsToGoal =
    usersNeeded > 0 && estimatedMonthlyPaidUserGrowth > 0
      ? Math.ceil(usersNeeded / estimatedMonthlyPaidUserGrowth)
      : 0

  const estimatedDate = new Date()
  estimatedDate.setMonth(estimatedDate.getMonth() + monthsToGoal)
  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
  })

  return (
    <Card className="surface-card p-spacing-6">
      <div className="mb-spacing-4 flex items-center justify-between">
        <h3 className="title-h4 text-foreground">$100K MRR GOAL</h3>
        <span className="body-3 text-muted-foreground">{mrrProgress.toFixed(1)}% complete</span>
      </div>

      <div className="gap-spacing-6 grid grid-cols-3">
        <div className="col-span-2 flex flex-col justify-center">
          <div className="gap-spacing-3 mb-spacing-3 flex items-baseline">
            <span className="text-emerald text-5xl font-semibold">
              $
              {currentMrr.toLocaleString('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </span>
            <span className="title-h4 text-muted-foreground">/ $100,000</span>
          </div>

          <div className="h-spacing-3 bg-muted rounded-spacing-2 w-full overflow-hidden">
            <div
              className="bg-emerald rounded-spacing-2 h-full transition-all duration-500"
              style={{ width: `${mrrProgress}%` }}
            />
          </div>
        </div>

        <div className="space-y-spacing-3 border-border pl-spacing-4 border-l">
          <div className="flex items-center justify-between">
            <div className="gap-spacing-2 flex items-center">
              <Users className="icon-sm text-emerald" />
              <span className="body-3 text-muted-foreground">
                {stats.scope === 'organization'
                  ? 'Paying orgs'
                  : stats.scope === 'all'
                    ? 'Paying accounts'
                    : 'Paid users'}
              </span>
            </div>
            <span className="body-2 text-foreground">
              {paidUsers}/{requiredPaidUsers.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="gap-spacing-2 flex items-center">
              <TrendingUp className="icon-sm text-emerald" />
              <span className="body-3 text-muted-foreground">ARPU</span>
            </div>
            <span className="body-2 text-foreground">${arpu.toFixed(0)}/mo</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="gap-spacing-2 flex items-center">
              <UserPlus className="icon-sm text-emerald" />
              <span className="body-3 text-muted-foreground">Growth</span>
            </div>
            <span className="body-2 text-foreground">+{estimatedMonthlyPaidUserGrowth}/mo</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="gap-spacing-2 flex items-center">
              <Calendar className="icon-sm text-emerald" />
              <span className="body-3 text-muted-foreground">ETA</span>
            </div>
            {monthsToGoal > 0 ? (
              <span className="body-2 text-foreground">{dateFormatter.format(estimatedDate)}</span>
            ) : (
              <span className="body-2 text-emerald">Reached!</span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="gap-spacing-2 flex items-center">
              <Percent className="icon-sm text-emerald" />
              <span className="body-3 text-muted-foreground">Conv. Rate</span>
            </div>
            <span className="body-2 text-foreground">{(conversionRate * 100).toFixed(1)}%</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="gap-spacing-2 flex items-center">
              <Target className="icon-sm text-emerald" />
              <span className="body-3 text-muted-foreground">
                {stats.scope === 'organization' ? 'New orgs (30d)' : 'Signups (30d)'}
              </span>
            </div>
            <span className="body-2 text-foreground">
              {stats.scope === 'organization'
                ? totalNewOrgs30d
                : stats.scope === 'all'
                  ? `${totalNewUsers30d}u / ${totalNewOrgs30d}o`
                  : totalNewUsers30d}
            </span>
          </div>
        </div>
      </div>
    </Card>
  )
}
