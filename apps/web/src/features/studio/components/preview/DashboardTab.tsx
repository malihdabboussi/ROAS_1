'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ChevronDown,
  Eye,
  Mail,
  MailOpen,
  MousePointerClick,
  RefreshCw,
  TrendingUp,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/navigation/tabs'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { STUDIO_INLINE_ERRORS } from '@/features/studio/config/studio-inline-errors.config'
import {
  fetchCampaignAnalytics,
  fetchCampaignEmailAnalytics,
  fetchCampaignMainDashboard,
  fetchCampaignStripeOverview,
  type CampaignAnalytics,
  type CampaignEmailAnalytics,
  type CampaignStripeOverview,
  type MainDashboardResponse,
} from '../../services/analytics.service'
import { AdsPerformanceView } from './AdsPerformanceView'
import { MainDashboardOverview } from './MainDashboardOverview'
import { SimpleLineChart } from './SimpleLineChart'
import { SocialPerformanceView } from './SocialPerformanceView'

type TimeRange = '7d' | '30d' | '90d' | 'all'

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  all: 'All time',
}

function getStartDate(range: TimeRange): string | undefined {
  if (range === 'all') return undefined
  const now = new Date()
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
  now.setDate(now.getDate() - days)
  return now.toISOString().split('T')[0]
}

function useAnimatedNumber(from: number, to: number, duration: number, active: boolean): number {
  const [value, setValue] = useState(from)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (!active) {
      setValue(to)
      return
    }
    const startTime = performance.now()
    const diff = to - from
    function tick(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(from + diff * eased))
      if (progress < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [from, to, duration, active])

  return value
}

function AnimatedMetricValue({ value, format }: { value: number; format: (v: number) => string }) {
  const prevRef = useRef(value)
  const animated = useAnimatedNumber(prevRef.current, value, 400, prevRef.current !== value)

  useEffect(() => {
    prevRef.current = value
  }, [value])

  return <>{format(animated)}</>
}

interface DashboardTabProps {
  campaignId: string
  campaignName?: string | null
}

type DashboardDataTab = 'overview' | 'funnel' | 'email' | 'ads' | 'social'

export function DashboardTab({ campaignId, campaignName }: DashboardTabProps) {
  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null)
  const [emailAnalytics, setEmailAnalytics] = useState<CampaignEmailAnalytics | null>(null)
  const [mainDashboard, setMainDashboard] = useState<MainDashboardResponse | null>(null)
  const [stripeOverview, setStripeOverview] = useState<CampaignStripeOverview | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')
  const [timeRangeOpen, setTimeRangeOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<DashboardDataTab>('overview')
  const [socialRefreshKey, setSocialRefreshKey] = useState(0)
  const hasLoadedOnce = useRef(false)
  const timeRangeBtnRef = useRef<HTMLButtonElement>(null)
  const [timeRangePos, setTimeRangePos] = useState({ top: 0, left: 0 })

  useLayoutEffect(() => {
    if (!timeRangeOpen || !timeRangeBtnRef.current) return
    const rect = timeRangeBtnRef.current.getBoundingClientRect()
    setTimeRangePos({ top: rect.bottom + 4, left: rect.left })
  }, [timeRangeOpen])

  const loadAnalytics = useCallback(
    async (opts: { refresh?: boolean } = {}) => {
      if (!hasLoadedOnce.current) setInitialLoading(true)
      else setRefreshing(true)
      try {
        const startDate = getStartDate(timeRange)
        const fromUnix = startDate
          ? Math.floor(new Date(`${startDate}T00:00:00`).getTime() / 1000)
          : undefined
        const toUnix = Math.floor(Date.now() / 1000)
        const [campaignData, emailData, mainData, stripe] = await Promise.all([
          fetchCampaignAnalytics(campaignId, startDate),
          fetchCampaignEmailAnalytics(campaignId, startDate),
          fetchCampaignMainDashboard(campaignId, {
            since: startDate,
            refresh: opts.refresh,
          }),
          fetchCampaignStripeOverview(campaignId, fromUnix, toUnix),
        ])
        setAnalytics(campaignData)
        setEmailAnalytics(emailData)
        setMainDashboard(mainData)
        setStripeOverview(stripe)
        hasLoadedOnce.current = true
      } catch (err) {
        console.error('[Dashboard] Failed to load analytics:', err)
        toast.error(STUDIO_INLINE_ERRORS.LOAD_ANALYTICS)
      } finally {
        setInitialLoading(false)
        setRefreshing(false)
      }
    },
    [campaignId, timeRange],
  )

  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  useEffect(() => {
    if (!timeRangeOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-dropdown]') && !target.closest('button')) {
        setTimeRangeOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [timeRangeOpen])

  const metrics = [
    {
      label: 'Visitors',
      value: analytics?.visitors ?? 0,
      icon: Eye,
      format: (v: number) => v.toLocaleString(),
    },
    {
      label: 'Leads',
      value: analytics?.leads ?? 0,
      icon: Users,
      format: (v: number) => v.toLocaleString(),
    },
    {
      label: 'Conversion',
      value: analytics?.conversion_rate ?? 0,
      icon: TrendingUp,
      format: (v: number) => `${v}%`,
    },
    {
      label: 'Page Views',
      value: analytics?.total_views ?? 0,
      icon: Eye,
      format: (v: number) => v.toLocaleString(),
    },
  ]

  const chartData = (analytics?.chart_data ?? []).map((d) => ({
    date: d.date,
    value: d.visitors,
  }))

  const emailChartData = (emailAnalytics?.chart_data ?? []).map((d) => ({
    date: d.date,
    value: d.opens,
  }))

  const handleTopRefresh = useCallback(() => {
    void loadAnalytics({ refresh: true })
    if (activeTab === 'social') {
      setSocialRefreshKey((prev) => prev + 1)
    }
  }, [activeTab, loadAnalytics])

  return (
    <div className="card-glass h-full min-h-[600px] w-full overflow-auto rounded-2xl p-4">
      {initialLoading ? (
        <div className="flex h-full items-center justify-center">
          <VibeyLoadingOrb size="sm" text="Loading analytics..." />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="border-border flex items-start justify-between gap-3 border-b pb-4">
            <div className="min-w-0">
              <p className="body-2 text-foreground break-words font-medium leading-snug">
                {campaignName ?? 'Campaign'} Analytics
              </p>
              <div className="relative mt-1">
                <button
                  ref={timeRangeBtnRef}
                  type="button"
                  onClick={() => setTimeRangeOpen(!timeRangeOpen)}
                  className="body-3 text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  {TIME_RANGE_LABELS[timeRange]}
                  <ChevronDown className="icon-xs" />
                </button>
                {timeRangeOpen &&
                  typeof document !== 'undefined' &&
                  createPortal(
                    <div
                      className="fixed z-50"
                      style={{ top: timeRangePos.top, left: timeRangePos.left }}
                      data-dropdown
                    >
                      <div className="surface-card border-border rounded-spacing-2 p-spacing-2 min-w-[160px] border shadow-lg">
                        {(Object.keys(TIME_RANGE_LABELS) as TimeRange[]).map((key) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              setTimeRange(key)
                              setTimeRangeOpen(false)
                            }}
                            className={`px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 block w-full text-left transition-colors ${
                              timeRange === key
                                ? 'bg-primary/10 text-muted-foreground'
                                : 'hover:bg-hover-subtle text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {TIME_RANGE_LABELS[key]}
                          </button>
                        ))}
                      </div>
                    </div>,
                    document.body,
                  )}
              </div>
            </div>
            <button
              type="button"
              onClick={handleTopRefresh}
              disabled={refreshing}
              className="chip-glass-neutral flex h-8 shrink-0 items-center gap-1 rounded-lg px-3"
            >
              <RefreshCw
                className={`icon-xs text-muted-foreground${refreshing ? 'animate-spin' : ''}`}
              />
              <span className="typo-caption text-muted-foreground">Refresh</span>
            </button>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DashboardDataTab)}>
            <div className="-mx-1 overflow-x-auto px-1">
              <TabsList variant="liquid">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="funnel">Funnel</TabsTrigger>
                <TabsTrigger value="email">Email</TabsTrigger>
                <TabsTrigger value="ads">Ads</TabsTrigger>
                <TabsTrigger value="social">Social</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview">
              <MainDashboardOverview
                data={mainDashboard}
                stripeOverview={stripeOverview}
                refreshing={refreshing}
              />
            </TabsContent>

            <TabsContent value="funnel">
              {/* Metrics Grid */}
              <div
                className={`grid grid-cols-2 gap-3 transition-opacity duration-200${refreshing ? 'opacity-50' : ''}`}
              >
                {metrics.map((metric) => (
                  <div key={metric.label} className="card-glass rounded-xl p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <metric.icon className="icon-sm text-muted-foreground" />
                      <span className="typo-caption text-muted-foreground">{metric.label}</span>
                    </div>
                    <p className="text-foreground text-xl font-semibold">
                      <AnimatedMetricValue value={metric.value} format={metric.format} />
                    </p>
                  </div>
                ))}
              </div>

              {/* Chart */}
              <div
                className={`card-glass mt-3 rounded-xl p-4 transition-opacity duration-200${refreshing ? 'opacity-50' : ''}`}
              >
                <p className="typo-caption text-muted-foreground mb-3">Visitors Over Time</p>
                <SimpleLineChart data={chartData} height={140} />
              </div>
            </TabsContent>

            <TabsContent value="email">
              <div
                className={`grid grid-cols-2 gap-3 transition-opacity duration-200${refreshing ? 'opacity-50' : ''}`}
              >
                {[
                  {
                    label: 'Sent',
                    value: emailAnalytics?.sent ?? 0,
                    icon: Mail,
                    format: (v: number) => v.toLocaleString(),
                  },
                  {
                    label: 'Opens',
                    value: emailAnalytics?.opened ?? 0,
                    icon: MailOpen,
                    format: (v: number) => v.toLocaleString(),
                  },
                  {
                    label: 'Clicks',
                    value: emailAnalytics?.clicked ?? 0,
                    icon: MousePointerClick,
                    format: (v: number) => v.toLocaleString(),
                  },
                  {
                    label: 'Open Rate',
                    value: emailAnalytics?.open_rate ?? 0,
                    icon: TrendingUp,
                    format: (v: number) => `${v}%`,
                  },
                ].map((metric) => (
                  <div key={metric.label} className="card-glass rounded-xl p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <metric.icon className="icon-sm text-muted-foreground" />
                      <span className="typo-caption text-muted-foreground">{metric.label}</span>
                    </div>
                    <p className="text-foreground text-xl font-semibold">
                      <AnimatedMetricValue value={metric.value} format={metric.format} />
                    </p>
                  </div>
                ))}
              </div>

              <div
                className={`card-glass mt-3 rounded-xl p-4 transition-opacity duration-200${refreshing ? 'opacity-50' : ''}`}
              >
                <p className="typo-caption text-muted-foreground mb-3">Email Opens Over Time</p>
                <SimpleLineChart data={emailChartData} height={140} />
              </div>
            </TabsContent>

            <TabsContent value="ads">
              <AdsPerformanceView campaignId={campaignId} campaignName={campaignName} />
            </TabsContent>

            <TabsContent value="social">
              <SocialPerformanceView
                campaignId={campaignId}
                campaignName={campaignName}
                externalRefreshKey={socialRefreshKey}
              />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
}
