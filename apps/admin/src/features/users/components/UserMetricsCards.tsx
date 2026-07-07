'use client'

import { Activity, TrendingUp, UserPlus, Users } from 'lucide-react'
import { Card } from '@/components/ui/card'
import type { UserMetrics } from '../types/users.types'

interface UserMetricsCardsProps {
  metrics: UserMetrics | null
  loading: boolean
  error: string | null
}

export function UserMetricsCards({ metrics, loading, error }: UserMetricsCardsProps) {
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

  if (error || !metrics) {
    return (
      <div className="gap-spacing-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="card-glass p-spacing-4">
            <div className="py-spacing-4 text-center">
              <p className="body-4 text-muted-foreground">Error loading data</p>
            </div>
          </Card>
        ))}
      </div>
    )
  }

  const cards = [
    { label: 'Total Users', value: metrics.totalUsers, icon: Users },
    { label: 'New Users (7d)', value: metrics.newUsersLast7Days, icon: UserPlus },
    { label: 'New Users (30d)', value: metrics.newUsersLast30Days, icon: TrendingUp },
    { label: 'Active Users (7d)', value: metrics.activeUsersLast7Days, icon: Activity },
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
