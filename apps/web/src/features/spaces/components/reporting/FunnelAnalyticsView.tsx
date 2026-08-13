'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Eye, TrendingUp, Users } from 'lucide-react'
import { toast } from 'sonner'
import { SimpleLineChart } from '@/components/charts/SimpleLineChart'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import {
  fetchCampaignAnalytics,
  type CampaignAnalytics,
} from '@/lib/reporting/campaign-analytics-api'
import { SPACES_REPORTING_TOAST_ERRORS } from '../../config/spaces-toast-errors.config'
import type { ReportingViewConfig, ViewDef } from '../../types/space-schema'
import type { ReportingToolbarApi } from './shared/reporting-toolbar.types'
import { resolveReportingDates } from './shared/resolve-reporting-dates'

function isKpiVisible(config: ReportingViewConfig | undefined, id: string): boolean {
  const v = config?.visible_kpis
  if (!v?.length) return true
  return v.includes(id)
}

interface FunnelAnalyticsViewProps {
  campaignId: string
  activeView: ViewDef
  onViewPatch: (patch: Partial<ViewDef>) => void
  onRegisterReportingToolbar?: (api: ReportingToolbarApi | null) => void
}

export function FunnelAnalyticsView({
  campaignId,
  activeView,
  onViewPatch: _onViewPatch,
  onRegisterReportingToolbar,
}: FunnelAnalyticsViewProps) {
  const config = activeView.reporting_config ?? {}
  const { startDate: resolvedStart, endDate: resolvedEnd } = resolveReportingDates(config)
  const dateKey = `${resolvedStart ?? 'all'}|${resolvedEnd ?? ''}`
  const funnelIds = config.funnel_ids
  const funnelScopeKey = funnelIds === undefined ? 'all' : funnelIds.join(',')
  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const hasLoadedOnce = useRef(false)

  const loadData = useCallback(async () => {
    if (!hasLoadedOnce.current) setInitialLoading(true)
    else setRefreshing(true)
    try {
      const data = await fetchCampaignAnalytics(
        campaignId,
        resolvedStart,
        resolvedEnd,
        funnelIds !== undefined ? { funnelIds } : undefined,
      )
      setAnalytics(data)
      hasLoadedOnce.current = true
    } catch {
      toast.error(SPACES_REPORTING_TOAST_ERRORS.FUNNEL_ANALYTICS_LOAD_FAILED.userMessage)
    } finally {
      setInitialLoading(false)
      setRefreshing(false)
    }
  }, [campaignId, dateKey, funnelScopeKey])

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    if (!onRegisterReportingToolbar) return
    onRegisterReportingToolbar({
      refresh: () => void loadData(),
      refreshing: initialLoading || refreshing,
    })
    return () => onRegisterReportingToolbar(null)
  }, [onRegisterReportingToolbar, loadData, initialLoading, refreshing])

  const chartType = config.chart_type ?? 'area'

  const allMetrics = useMemo(
    () => [
      {
        id: 'visitors',
        label: 'Visitors',
        value: analytics?.visitors ?? 0,
        icon: Eye,
        format: (v: number) => v.toLocaleString(),
      },
      {
        id: 'leads',
        label: 'Leads',
        value: analytics?.leads ?? 0,
        icon: Users,
        format: (v: number) => v.toLocaleString(),
      },
      {
        id: 'conversion',
        label: 'Conversion',
        value: analytics?.conversion_rate ?? 0,
        icon: TrendingUp,
        format: (v: number) => `${v}%`,
      },
      {
        id: 'page_views',
        label: 'Page Views',
        value: analytics?.total_views ?? 0,
        icon: Eye,
        format: (v: number) => v.toLocaleString(),
      },
    ],
    [analytics],
  )

  const metrics = useMemo(
    () => allMetrics.filter((m) => isKpiVisible(config, m.id)),
    [allMetrics, config],
  )

  const chartData = (analytics?.chart_data ?? []).map((d) => ({ date: d.date, value: d.visitors }))
  const leadsChartData = (analytics?.chart_data ?? []).map((d) => ({
    date: d.date,
    value: d.leads,
  }))

  return (
    <div className="scrollbar-thin flex h-0 min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-4 py-3">
      {initialLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <VibeyLoadingOrb size="sm" text="Loading funnel data..." />
        </div>
      ) : (
        <div
          className={`space-y-4 transition-opacity duration-200 ${refreshing ? 'opacity-50' : ''}`}
        >
          {metrics.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {metrics.map((m) => (
                <div key={m.id} className="card-glass rounded-xl p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <m.icon className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                    <span className="text-xs text-[var(--color-muted-foreground)]">{m.label}</span>
                  </div>
                  <p className="text-xl font-semibold text-[var(--foreground)]">
                    {m.format(m.value)}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          {isKpiVisible(config, 'chart_visitors') ? (
            <div className="card-glass rounded-xl p-4">
              <p className="mb-3 text-xs text-[var(--color-muted-foreground)]">
                Visitors Over Time
              </p>
              <SimpleLineChart data={chartData} height={180} chartType={chartType} />
            </div>
          ) : null}

          {isKpiVisible(config, 'chart_leads') ? (
            <div className="card-glass rounded-xl p-4">
              <p className="mb-3 text-xs text-[var(--color-muted-foreground)]">Leads Over Time</p>
              <SimpleLineChart data={leadsChartData} height={180} chartType={chartType} />
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
