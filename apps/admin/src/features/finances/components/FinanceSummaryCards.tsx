'use client'

import { DollarSign, LineChart, Target, TrendingUp, UserCog, Users } from 'lucide-react'
import { Card } from '@/components/ui/card'
import type { FinancesSummary, Profitability } from '../types/finances.types'

interface FinanceSummaryCardsProps {
  summary: FinancesSummary | null
  profitability: Profitability | null
  loading: boolean
  error: string | null
}

function fmt(n: number) {
  return `$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function FinanceSummaryCards({
  summary,
  profitability,
  loading,
  error,
}: FinanceSummaryCardsProps) {
  if (loading) {
    return (
      <div className="gap-spacing-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
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

  if (error || !summary || !profitability) {
    return (
      <div className="gap-spacing-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
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
    {
      title: 'Total Revenue',
      value: fmt(summary.totalRevenue),
      subtitle: `Subs ${fmt(summary.mrr)} · Addons ${fmt(summary.addonMrr)} · Credits ${fmt(summary.creditPackRevenue)}`,
      icon: TrendingUp,
      color: 'text-emerald',
    },
    {
      title: 'Total Costs',
      value: fmt(summary.totalCost30d),
      subtitle: `Daily Avg ${fmt(summary.avgDailyCost)}`,
      icon: DollarSign,
      color: 'text-orange',
    },
    {
      title: 'Net Profit',
      value: `${profitability.netProfit < 0 ? '-' : ''}${fmt(profitability.netProfit)}`,
      subtitle: `Margin ${profitability.profitMargin.toFixed(1)}%`,
      icon: LineChart,
      color: profitability.netProfit >= 0 ? 'text-emerald' : 'text-destructive',
    },
    {
      title: 'Active Paid Users',
      value: String(summary.activePaidUsers),
      subtitle: `Addons: ${summary.addonCount}`,
      icon: Users,
      color: 'text-foreground',
    },
    {
      title: 'Cost per Customer',
      value: fmt(profitability.costPerCustomer),
      subtitle: 'Monthly avg per paid user',
      icon: UserCog,
      color: 'text-foreground',
    },
    {
      title: 'ROI',
      value: `${profitability.roi.toFixed(2)}x`,
      subtitle: 'Return on investment',
      icon: Target,
      color: profitability.roi >= 1 ? 'text-emerald' : 'text-orange',
    },
  ]

  return (
    <div className="gap-spacing-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {cards.map((card, i) => {
        const Icon = card.icon
        return (
          <Card key={i} className="card-glass p-spacing-4">
            <div className="mb-spacing-3 flex items-center justify-between">
              <Icon className="icon-sm text-foreground" />
            </div>
            <div className="mb-spacing-3 flex items-center justify-between">
              <span className="body-2 text-muted-foreground">{card.title}</span>
              <div className={`title-h4 ${card.color}`}>{card.value}</div>
            </div>
            {card.subtitle && <span className="body-4 text-muted-foreground">{card.subtitle}</span>}
          </Card>
        )
      })}
    </div>
  )
}
