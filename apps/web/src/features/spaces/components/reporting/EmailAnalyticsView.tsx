'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Mail, MailOpen, MousePointerClick, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import { SimpleLineChart } from '@/components/charts/SimpleLineChart'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import {
  fetchCampaignEmailAnalytics,
  type CampaignEmailAnalytics,
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

interface EmailAnalyticsViewProps {
  campaignId: string
  activeView: ViewDef
  onViewPatch: (patch: Partial<ViewDef>) => void
  onRegisterReportingToolbar?: (api: ReportingToolbarApi | null) => void
}

export function EmailAnalyticsView({
  campaignId,
  activeView,
  onViewPatch: _onViewPatch,
  onRegisterReportingToolbar,
}: EmailAnalyticsViewProps) {
  const config = activeView.reporting_config ?? {}
  const { startDate: resolvedStart, endDate: resolvedEnd } = resolveReportingDates(config)
  const dateKey = `${resolvedStart ?? 'all'}|${resolvedEnd ?? ''}`
  const sequenceIds = config.sequence_ids
  const sequenceScopeKey = sequenceIds === undefined ? 'all' : sequenceIds.join(',')
  const [emailAnalytics, setEmailAnalytics] = useState<CampaignEmailAnalytics | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const hasLoadedOnce = useRef(false)

  const loadData = useCallback(async () => {
    if (!hasLoadedOnce.current) setInitialLoading(true)
    else setRefreshing(true)
    try {
      const data = await fetchCampaignEmailAnalytics(
        campaignId,
        resolvedStart,
        resolvedEnd,
        sequenceIds !== undefined ? { sequenceIds } : undefined,
      )
      setEmailAnalytics(data)
      hasLoadedOnce.current = true
    } catch {
      toast.error(SPACES_REPORTING_TOAST_ERRORS.EMAIL_ANALYTICS_LOAD_FAILED.userMessage)
    } finally {
      setInitialLoading(false)
      setRefreshing(false)
    }
  }, [campaignId, dateKey, sequenceScopeKey])

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

  const primaryMetrics = useMemo(
    () => [
      {
        id: 'sent',
        label: 'Sent',
        value: emailAnalytics?.sent ?? 0,
        icon: Mail,
        format: (v: number) => v.toLocaleString(),
      },
      {
        id: 'opens',
        label: 'Opens',
        value: emailAnalytics?.opened ?? 0,
        icon: MailOpen,
        format: (v: number) => v.toLocaleString(),
      },
      {
        id: 'clicks',
        label: 'Clicks',
        value: emailAnalytics?.clicked ?? 0,
        icon: MousePointerClick,
        format: (v: number) => v.toLocaleString(),
      },
      {
        id: 'open_rate',
        label: 'Open Rate',
        value: emailAnalytics?.open_rate ?? 0,
        icon: TrendingUp,
        format: (v: number) => `${v}%`,
      },
    ],
    [emailAnalytics],
  )

  const secondaryMetrics = useMemo(
    () => [
      {
        id: 'delivered',
        label: 'Delivered',
        value: emailAnalytics?.delivered ?? 0,
        format: (v: number) => v.toLocaleString(),
      },
      {
        id: 'bounced',
        label: 'Bounced',
        value: emailAnalytics?.bounced ?? 0,
        format: (v: number) => v.toLocaleString(),
      },
      {
        id: 'click_rate',
        label: 'Click Rate',
        value: emailAnalytics?.click_rate ?? 0,
        format: (v: number) => `${v}%`,
      },
    ],
    [emailAnalytics],
  )

  const primaryShown = useMemo(
    () => primaryMetrics.filter((m) => isKpiVisible(config, m.id)),
    [primaryMetrics, config],
  )
  const secondaryShown = useMemo(
    () => secondaryMetrics.filter((m) => isKpiVisible(config, m.id)),
    [secondaryMetrics, config],
  )

  const opensChartData = (emailAnalytics?.chart_data ?? []).map((d) => ({
    date: d.date,
    value: d.opens,
  }))
  const clicksChartData = (emailAnalytics?.chart_data ?? []).map((d) => ({
    date: d.date,
    value: d.clicks,
  }))

  return (
    <div className="scrollbar-thin flex h-0 min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-4 py-3">
      {initialLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <VibeyLoadingOrb size="sm" text="Loading email data..." />
        </div>
      ) : (
        <div
          className={`space-y-4 transition-opacity duration-200 ${refreshing ? 'opacity-50' : ''}`}
        >
          {primaryShown.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {primaryShown.map((m) => (
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

          {isKpiVisible(config, 'chart_opens') || isKpiVisible(config, 'chart_clicks') ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {isKpiVisible(config, 'chart_opens') ? (
                <div className="card-glass rounded-xl p-4">
                  <p className="mb-3 text-xs text-[var(--color-muted-foreground)]">
                    Opens Over Time
                  </p>
                  <SimpleLineChart data={opensChartData} height={180} chartType={chartType} />
                </div>
              ) : null}
              {isKpiVisible(config, 'chart_clicks') ? (
                <div className="card-glass rounded-xl p-4">
                  <p className="mb-3 text-xs text-[var(--color-muted-foreground)]">
                    Clicks Over Time
                  </p>
                  <SimpleLineChart data={clicksChartData} height={180} chartType={chartType} />
                </div>
              ) : null}
            </div>
          ) : null}

          {secondaryShown.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {secondaryShown.map((m) => (
                <div key={m.id} className="card-glass rounded-xl p-4">
                  <p className="text-xs text-[var(--color-muted-foreground)]">{m.label}</p>
                  <p className="text-lg font-semibold text-[var(--foreground)]">
                    {m.format(m.value)}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
