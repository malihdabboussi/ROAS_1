'use client'

import { Activity, Building2, TrendingUp, UserPlus } from 'lucide-react'
import { Card } from '@/components/ui/card'
import type { OrgRow } from '../types/orgs.types'

interface OrgMetricsCardsProps {
  orgs: OrgRow[]
  loading: boolean
  error: string | null
}

function computeOrgMetrics(orgs: OrgRow[]) {
  const now = Date.now()
  const ms7 = 7 * 24 * 60 * 60 * 1000
  const ms30 = 30 * 24 * 60 * 60 * 1000
  const t7 = now - ms7
  const t30 = now - ms30
  let newOrgsLast7Days = 0
  let newOrgsLast30Days = 0
  let activeOrgsLast7Days = 0
  for (const o of orgs) {
    const c = o.created_at ? new Date(o.created_at).getTime() : 0
    const u = o.updated_at ? new Date(o.updated_at).getTime() : 0
    if (c >= t7) newOrgsLast7Days++
    if (c >= t30) newOrgsLast30Days++
    if (u >= t7) activeOrgsLast7Days++
  }
  return {
    totalOrgs: orgs.length,
    newOrgsLast7Days,
    newOrgsLast30Days,
    activeOrgsLast7Days,
  }
}

export function OrgMetricsCards({ orgs, loading, error }: OrgMetricsCardsProps) {
  if (loading) {
    return (
      <div className="gap-spacing-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="card-glass p-spacing-4">
            <div className="animate-pulse">
              <div className="bg-muted mb-spacing-2 h-4 w-1/4 rounded" />
              <div className="bg-muted mb-spacing-1 h-8 w-1/2 rounded" />
              <div className="bg-muted h-3 w-1/2 rounded" />
            </div>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="gap-spacing-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="card-glass p-spacing-4">
            <div className="py-spacing-4 text-center">
              <p className="body-4 text-muted-foreground">Error loading orgs</p>
            </div>
          </Card>
        ))}
      </div>
    )
  }

  const metrics = computeOrgMetrics(orgs)
  const cards = [
    { label: 'Total Orgs', value: metrics.totalOrgs, icon: Building2 },
    { label: 'New Orgs (7d)', value: metrics.newOrgsLast7Days, icon: UserPlus },
    { label: 'New Orgs (30d)', value: metrics.newOrgsLast30Days, icon: TrendingUp },
    { label: 'Active Orgs (7d)', value: metrics.activeOrgsLast7Days, icon: Activity },
  ]

  return (
    <div className="gap-spacing-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, i) => {
        const Icon = card.icon
        return (
          <Card key={i} className="card-glass p-spacing-4">
            <div className="mb-spacing-2 flex items-center justify-between">
              <Icon className="icon-sm text-muted-foreground" />
            </div>
            <div className="title-h5 text-foreground mb-spacing-1">
              {typeof card.value === 'number' ? card.value.toLocaleString() : String(card.value)}
            </div>
            <div className="body-4 text-muted-foreground">{card.label}</div>
          </Card>
        )
      })}
    </div>
  )
}
