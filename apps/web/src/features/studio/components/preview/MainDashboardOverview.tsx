'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import {
  AlertTriangle,
  DollarSign,
  Eye,
  Heart,
  Info,
  Instagram,
  Layers,
  Linkedin,
  Mail,
  MailOpen,
  MailX,
  Megaphone,
  MousePointerClick,
  Target,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Mission, MissionStatus } from '@/features/mission-control/types'
import {
  CampaignOverviewDashboardGrid,
  type OverviewDashboardSection,
} from '@/features/spaces/components/reporting/CampaignOverviewDashboardGrid'
import {
  OverviewHeadingWidget,
  OverviewNoteWidget,
} from '@/features/spaces/components/reporting/overview-custom-widgets'
import type { OverviewSectionLayoutItem } from '@/features/spaces/components/reporting/overview-section-layout'
import { getOverviewGlassCssVars } from '@/features/spaces/components/reporting/shared/resolve-overview-glass-colors'
import type { ReportingViewConfig } from '@/features/spaces/types/space-schema'
import {
  type CampaignLeaderboardRow,
  type CampaignReportingWidgetsResponse,
  type CampaignStripeOverview,
  type MainDashboardAlert,
  type MainDashboardFlow,
  type MainDashboardResponse,
  type SocialAnalyticsResponse,
} from '../../services/analytics.service'
import { SimpleLineChart } from './SimpleLineChart'

interface MainDashboardOverviewProps {
  data: MainDashboardResponse | null
  stripeOverview?: CampaignStripeOverview | null
  missions?: Mission[] | null
  socialAnalytics?: SocialAnalyticsResponse | null
  reportingWidgets?: CampaignReportingWidgetsResponse | null
  campaignLeaderboard?: CampaignLeaderboardRow[] | null
  campaignId?: string
  refreshing: boolean
  reportingConfig?: ReportingViewConfig
  overviewDashboardEditMode?: boolean
  overviewDashboardSavedLayout?: readonly OverviewSectionLayoutItem[] | undefined
  onOverviewDashboardLayoutPersist?: (layout: OverviewSectionLayoutItem[]) => void
  onOverviewCustomWidgetChange?: (
    id: string,
    patch: Partial<{ title: string; subtitle: string; body: string }>,
  ) => void
  onOverviewCustomWidgetRemove?: (id: string) => void
  /** Hide a built-in dashboard section (toggles `visible_kpis` or `overview_channels` off). Section id is the dashboard cell id. */
  onOverviewSectionHide?: (sectionId: string) => void
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
      setValue(from + diff * eased)
      if (progress < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [from, to, duration, active])

  return value
}

function AnimatedValue({ value, format }: { value: number; format: (v: number) => string }) {
  const prevRef = useRef(value)
  const animated = useAnimatedNumber(prevRef.current, value, 400, prevRef.current !== value)
  useEffect(() => {
    prevRef.current = value
  }, [value])
  return <>{format(animated)}</>
}

function formatCount(n: number): string {
  return Math.round(n).toLocaleString()
}

function formatPct(n: number): string {
  return `${(Math.round(n * 100) / 100).toFixed(2)}%`
}

function formatSignedInt(n: number): string {
  const r = Math.round(n)
  if (r > 0) return `+${r.toLocaleString()}`
  return r.toLocaleString()
}

function formatMoney(n: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency.toUpperCase(),
      maximumFractionDigits: 2,
    }).format(n)
  } catch {
    return `${n.toFixed(2)} ${currency}`
  }
}

const MISSION_STATUS_ORDER: MissionStatus[] = [
  'inbox',
  'backlog',
  'planning',
  'pending_approval',
  'todo',
  'in_progress',
  'awaiting_human',
  'review',
  'blocked',
  'done',
  'archived',
  'error',
  'failed',
  'dead_letter',
]

const OVERVIEW_SEG_TONE = ['overview-seg-p', 'overview-seg-a', 'overview-seg-b'] as const

function MissionStatusDistributionBar({ missions: ms }: { missions: Mission[] }) {
  const counts = new Map<string, number>()
  for (const s of MISSION_STATUS_ORDER) counts.set(s, 0)
  for (const m of ms) {
    counts.set(m.status, (counts.get(m.status) ?? 0) + 1)
  }
  const total = ms.length || 1
  const segments = MISSION_STATUS_ORDER.filter((s) => (counts.get(s) ?? 0) > 0)
  return (
    <div>
      <div className="overview-bar-track mb-4 flex h-4 w-full overflow-hidden rounded-full">
        {segments.map((s, i) => {
          const n = counts.get(s) ?? 0
          const w = (n / total) * 100
          const tone = OVERVIEW_SEG_TONE[i % 3]!
          return (
            <div
              key={s}
              title={`${s}: ${n}`}
              className={`h-full min-w-[2px] transition-all duration-700 ${tone}`}
              style={{ width: `${w}%` }}
            />
          )
        })}
      </div>
      <div className="body-3 text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-2 sm:flex sm:flex-wrap sm:gap-x-6">
        {segments.map((s, i) => {
          const tone = OVERVIEW_SEG_TONE[i % 3]!
          return (
            <span key={s} className="flex items-center gap-2 font-medium">
              <span className={`inline-block h-3 w-3 shrink-0 rounded-full shadow-sm ${tone}`} />
              <span className="text-foreground capitalize">{s.replace(/_/g, ' ')}</span>
              <span className="text-muted-foreground/60 ml-auto sm:ml-0">{counts.get(s) ?? 0}</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}

function CustomerJourneyFunnel({ flow }: { flow: MainDashboardFlow }) {
  const steps: { label: string; value: number }[] = [
    { label: 'Impressions', value: flow.impressions },
    { label: 'Clicks', value: flow.clicks },
    { label: 'Visitors', value: flow.visitors },
    { label: 'Leads', value: flow.leads },
  ]
  const max = Math.max(...steps.map((s) => s.value), 1)
  return (
    <div className="flex flex-col gap-5 pt-2">
      {steps.map((step, i) => {
        const pct = max > 0 ? (step.value / max) * 100 : 0
        const prev = i > 0 ? steps[i - 1]!.value : 0
        const stepConv = prev > 0 ? (step.value / prev) * 100 : 0
        return (
          <div key={step.label} className="group">
            <div className="mb-2 flex items-end justify-between gap-4">
              <div className="flex flex-col">
                <span className="typo-caption text-muted-foreground font-semibold uppercase tracking-wider">
                  {step.label}
                </span>
                <span className="text-foreground text-xl font-bold tabular-nums">
                  {formatCount(step.value)}
                </span>
              </div>
              {i > 0 && (
                <span className="overview-pill-accent-1 typo-caption mb-1">
                  {stepConv.toFixed(1)}% <span className="font-normal">of prev</span>
                </span>
              )}
            </div>
            <div className="overview-bar-track h-3 w-full overflow-hidden rounded-full">
              <div
                className="overview-bar-fill-p overview-bar-glow-p h-full rounded-full transition-all duration-700 ease-out group-hover:brightness-110"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}
      <div className="overview-chip-cta mt-2 flex items-center justify-between px-4 py-3">
        <span className="body-3 text-muted-foreground font-medium uppercase tracking-tight">
          Overall Lead Conversion
        </span>
        <span className="overview-text-accent-p text-xl font-bold tabular-nums">
          {formatPct(flow.conversion_to_lead_pct)}
        </span>
      </div>
    </div>
  )
}

interface KpiCardProps {
  id?: string
  label: string
  value: number
  format: (v: number) => string
  icon: LucideIcon
  subtitle?: string
}

function KpiCard({ label, value, format, icon: Icon, subtitle }: KpiCardProps) {
  return (
    <div className="card-glass flex h-full min-w-0 flex-col gap-3 rounded-2xl p-5 transition-all hover:scale-[1.01]">
      <div className="flex items-center justify-between gap-2">
        <span className="body-3 text-muted-foreground font-medium uppercase tracking-wider">
          {label}
        </span>
        <div className="overview-icon-badge-p rounded-lg p-1.5 opacity-90">
          <Icon className="icon-sm" />
        </div>
      </div>
      <div>
        <p className="text-foreground text-3xl font-bold tabular-nums leading-tight sm:text-4xl">
          <span className="inline-block whitespace-nowrap">
            <AnimatedValue value={value} format={format} />
          </span>
        </p>
        {subtitle && (
          <p className="typo-caption text-muted-foreground mt-1 line-clamp-1 font-medium italic">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )
}

interface SourceMiniMetric {
  label: string
  value: string
}

interface SourceCardProps {
  title: string
  icon: LucideIcon
  metrics: SourceMiniMetric[]
  footer?: string
  muted?: boolean
}

function SourceCard({ title, icon: Icon, metrics, footer, muted }: SourceCardProps) {
  const mainMetric = metrics[0]
  const otherMetrics = metrics.slice(1)

  return (
    <div
      className={`card-glass group flex h-full min-w-0 flex-col rounded-2xl p-5 transition-all hover:scale-[1.01] ${
        muted ? 'opacity-70' : ''
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="icon-sm overview-text-accent-p shrink-0" />
          <p className="body-2 text-foreground font-semibold tracking-tight">{title}</p>
        </div>
        {footer && (
          <span className="overview-badge-pill typo-caption font-medium italic">{footer}</span>
        )}
      </div>

      {mainMetric && (
        <div className="mb-4">
          <p className="typo-caption text-muted-foreground font-medium uppercase tracking-wider">
            {mainMetric.label}
          </p>
          <p className="text-foreground text-2xl font-bold tabular-nums">{mainMetric.value}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        {otherMetrics.map((m) => (
          <div key={m.label} className="min-w-0">
            <p className="typo-caption text-muted-foreground font-medium uppercase">{m.label}</p>
            <p className="body-2 text-foreground font-semibold tabular-nums">
              <span className="inline-block whitespace-nowrap">{m.value}</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function ContributionBar({
  label,
  value,
  total,
  tone = 'p',
}: {
  label: string
  value: number
  total: number
  tone?: 'p' | 'a' | 'b'
}) {
  const pct = total > 0 ? (value / total) * 100 : 0
  const fill =
    tone === 'a'
      ? 'overview-bar-fill-a'
      : tone === 'b'
        ? 'overview-bar-fill-b'
        : 'overview-bar-fill-p'
  return (
    <div>
      <div className="mb-1 flex flex-col gap-0.5 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-x-2 sm:gap-y-0.5">
        <span className="typo-caption text-muted-foreground min-w-0 break-normal">{label}</span>
        <span className="typo-caption text-muted-foreground shrink-0 whitespace-nowrap tabular-nums">
          {formatCount(value)} · {pct.toFixed(1)}%
        </span>
      </div>
      <div className="overview-bar-track h-2 w-full overflow-hidden rounded-full">
        <div
          className={`h-full rounded-full transition-all duration-500 ${fill}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

const ALERT_SOURCE_LABEL: Record<MainDashboardAlert['source'], string> = {
  funnel: 'funnel',
  email: 'email',
  ads: 'ads',
  social: 'social',
  cross: 'cross channels',
}

function AlertCard({ alert }: { alert: MainDashboardAlert }) {
  const surface =
    alert.level === 'critical'
      ? 'overview-alert-surface-critical'
      : alert.level === 'warning'
        ? 'overview-alert-surface-warn'
        : 'overview-alert-surface-info'

  const Icon =
    alert.level === 'critical' ? AlertTriangle : alert.level === 'warning' ? Info : Megaphone

  return (
    <div
      className={`group flex items-start gap-4 rounded-2xl p-4 transition-all hover:brightness-[1.02] ${surface}`}
    >
      <div className="overview-text-accent-p mt-0.5 shrink-0">
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="body-3 font-bold uppercase tracking-widest opacity-70">
            {ALERT_SOURCE_LABEL[alert.source]}
          </span>
          <span className="h-1 w-1 rounded-full bg-current opacity-30" />
          <span className="typo-caption font-medium uppercase tracking-tighter opacity-50">
            {alert.level}
          </span>
        </div>
        <p className="body-3 text-foreground font-medium leading-relaxed opacity-90">
          {alert.message}
        </p>
      </div>
    </div>
  )
}

export function MainDashboardOverview({
  data,
  stripeOverview,
  missions: missionsProp,
  socialAnalytics,
  reportingWidgets,
  campaignLeaderboard,
  campaignId,
  refreshing,
  reportingConfig,
  overviewDashboardEditMode = false,
  overviewDashboardSavedLayout,
  onOverviewDashboardLayoutPersist,
  onOverviewCustomWidgetChange,
  onOverviewCustomWidgetRemove,
  onOverviewSectionHide,
}: MainDashboardOverviewProps) {
  if (!data) return null

  const editHide = (sectionId: string): (() => void) | undefined =>
    overviewDashboardEditMode && onOverviewSectionHide
      ? () => onOverviewSectionHide(sectionId)
      : undefined

  const glassStyle = getOverviewGlassCssVars(reportingConfig) as CSSProperties

  const { overview, sources, timeseries, flow, contribution, alerts, partial } = data

  const vis = reportingConfig?.visible_kpis
  const kpiOn = (id: string) => !vis?.length || vis.includes(id)
  const channels = reportingConfig?.overview_channels
  const channelOn = (ch: 'funnels' | 'emails' | 'ads' | 'social') =>
    !channels || channels.includes(ch)
  const chartType = reportingConfig?.chart_type ?? 'area'

  const bounceRatePct =
    sources.emails.sent > 0 ? (sources.emails.bounced / sources.emails.sent) * 100 : 0

  const allExecutiveKpis: KpiCardProps[] = [
    { id: 'kpi_leads', label: 'Leads', value: overview.leads, format: formatCount, icon: Target },
    {
      id: 'kpi_conversion',
      label: 'Funnel Conversion',
      value: overview.conversion_rate,
      format: formatPct,
      icon: TrendingUp,
    },
    {
      id: 'kpi_email_open',
      label: 'Email Open Rate',
      value: overview.email_open_rate,
      format: formatPct,
      icon: MailOpen,
    },
    {
      id: 'kpi_social_engagement',
      label: 'Social Engagement',
      value: overview.social_engagement_rate,
      format: formatPct,
      icon: Heart,
    },
    {
      id: 'kpi_reach',
      label: 'Total Reach',
      value: overview.total_reach,
      format: formatCount,
      icon: Eye,
    },
    {
      id: 'kpi_visitors',
      label: 'Visitors',
      value: overview.visitors,
      format: formatCount,
      icon: Users,
    },
    {
      id: 'kpi_bounce_rate',
      label: 'Email Bounce Rate',
      value: bounceRatePct,
      format: formatPct,
      icon: MailX,
    },
  ]
  const executiveKpis = allExecutiveKpis.filter((k) => kpiOn(k.id!))

  const channelScores: {
    id: string
    label: string
    value: number
    metricLabel: string
    icon: LucideIcon
  }[] = [
    {
      id: 'funnels',
      label: 'Funnels',
      value: sources.funnels.leads,
      metricLabel: 'leads',
      icon: Layers,
    },
    {
      id: 'ads',
      label: 'Ads',
      value: sources.ads.ad_leads,
      metricLabel: 'ad leads',
      icon: Megaphone,
    },
    {
      id: 'emails',
      label: 'Emails',
      value: sources.emails.clicked,
      metricLabel: 'clicks',
      icon: Mail,
    },
    {
      id: 'social',
      label: 'Social',
      value: sources.social.interactions,
      metricLabel: 'interactions',
      icon: Heart,
    },
  ]
  const bestChannel = channelScores.reduce(
    (best, cur) => (cur.value > best.value ? cur : best),
    channelScores[0]!,
  )
  const hasChannelSignal = channelScores.some((c) => c.value > 0)

  const stripe = stripeOverview
  const revenueMetrics: SourceMiniMetric[] = stripe
    ? [
        { label: 'Gross', value: formatMoney(stripe.gross, stripe.currency) },
        { label: 'Net', value: formatMoney(stripe.net, stripe.currency) },
        { label: 'Refunds', value: formatMoney(stripe.refunds, stripe.currency) },
        { label: 'Fees', value: formatMoney(stripe.fees, stripe.currency) },
        { label: 'Transactions', value: formatCount(stripe.transactionsCount) },
        { label: 'Refund rate', value: formatPct(stripe.refundRate * 100) },
      ]
    : []
  const revenueTrendData = stripe?.chartData?.map((d) => ({ date: d.date, value: d.net })) ?? []

  const missions = missionsProp ?? []
  const activeMissionStatuses = new Set(['in_progress', 'review', 'awaiting_human'])
  const activeMissionsCount = missions.filter((m) => activeMissionStatuses.has(m.status)).length
  const blockedOnlyCount = missions.filter((m) => m.status === 'blocked').length
  const blockedMissionsCount = missions.filter(
    (m) => m.status === 'blocked' || m.status === 'awaiting_human',
  ).length
  const doneCount = missions.filter((m) => m.status === 'done').length
  const missionTotal = missions.length
  const completionPct = missionTotal > 0 ? (doneCount / missionTotal) * 100 : 0

  const socialPosts = socialAnalytics?.posts ?? []
  const bestPost =
    socialPosts.length > 0
      ? [...socialPosts].sort((a, b) => b.engagement_rate - a.engagement_rate)[0]!
      : null

  const rw = reportingWidgets
  const cs = rw?.contact_stats
  const contactsTrend =
    rw?.contacts_timeseries?.map((p) => ({ date: p.date, value: p.count })) ?? []
  const deliverablesRows = rw?.deliverables_by_type ?? []
  const seq = rw?.sequence_stats
  const topEmail = rw?.top_email
  const topFunnels = rw?.top_funnels ?? []
  const contactSources = rw?.contact_sources ?? []
  const lc = rw?.lead_customer
  const dropoff = rw?.funnel_dropoff
  const adsBudgetSum = rw?.ads_budget?.ads_daily_budget_sum ?? 0
  const board = campaignLeaderboard ?? []
  const topProducts = stripe?.topProducts ?? []

  const contactSourcesTotal = contactSources.reduce((s, x) => s + x.count, 0)

  const funnelMetrics: SourceMiniMetric[] = [
    { label: 'Visitors', value: formatCount(sources.funnels.visitors) },
    { label: 'Leads', value: formatCount(sources.funnels.leads) },
    { label: 'Conversion', value: formatPct(sources.funnels.conversion_rate) },
    { label: 'Page Views', value: formatCount(sources.funnels.total_views) },
  ]

  const emailMetrics: SourceMiniMetric[] = [
    { label: 'Sent', value: formatCount(sources.emails.sent) },
    { label: 'Open Rate', value: formatPct(sources.emails.open_rate) },
    { label: 'Clicks', value: formatCount(sources.emails.clicked) },
    { label: 'Click Rate', value: formatPct(sources.emails.click_rate) },
  ]

  const adsMetrics: SourceMiniMetric[] = [
    { label: 'Total Ads', value: formatCount(sources.ads.total_ads) },
    { label: 'Ad Visitors', value: formatCount(sources.ads.ad_visitors) },
    { label: 'Ad Leads', value: formatCount(sources.ads.ad_leads) },
    { label: 'Conversion', value: formatPct(sources.ads.conversion_rate) },
  ]

  const socialMetrics: SourceMiniMetric[] = [
    { label: 'Reach', value: formatCount(sources.social.reach) },
    { label: 'Interactions', value: formatCount(sources.social.interactions) },
    { label: 'Engagement', value: formatPct(sources.social.engagement_rate) },
    { label: 'Posts', value: formatCount(sources.social.post_count) },
  ]

  const socialFooter =
    sources.social.connected_platforms.length > 0
      ? `Connected: ${sources.social.connected_platforms.join(' · ')}`
      : 'No social platforms connected'

  const trendVisitors = timeseries.map((p) => ({ date: p.date, value: p.visitors }))
  const trendLeads = timeseries.map((p) => ({ date: p.date, value: p.leads }))
  const trendOpens = timeseries.map((p) => ({ date: p.date, value: p.email_opens }))
  const trendReach = timeseries.map((p) => ({ date: p.date, value: p.social_reach }))

  const contributionTotal =
    contribution.funnel_leads +
    contribution.ad_leads +
    contribution.email_clicks +
    contribution.social_interactions

  const sections: OverviewDashboardSection[] = []

  if (partial.funnels || partial.emails || partial.ads || partial.social) {
    sections.push({
      id: 'ov_partial_banner',
      node: (
        <div className="overview-banner-partial p-3">
          <p className="typo-caption overview-text-accent-a">
            Some sources couldn&apos;t be loaded — showing available data.
          </p>
        </div>
      ),
    })
  }

  // Executive KPIs
  executiveKpis.forEach((k) => {
    sections.push({
      id: k.id!,
      onRemove: editHide(k.id!),
      node: <KpiCard {...k} />,
    })
  })

  // Channels
  if (channelOn('funnels')) {
    sections.push({
      id: 'card_funnels',
      onRemove: editHide('card_funnels'),
      node: (
        <SourceCard
          title="Funnels"
          icon={Layers}
          metrics={funnelMetrics}
          muted={partial.funnels}
          footer={partial.funnels ? 'Partial data' : undefined}
        />
      ),
    })
  }
  if (channelOn('emails')) {
    sections.push({
      id: 'card_emails',
      onRemove: editHide('card_emails'),
      node: (
        <SourceCard
          title="Emails"
          icon={Mail}
          metrics={emailMetrics}
          muted={partial.emails}
          footer={partial.emails ? 'Partial data' : undefined}
        />
      ),
    })
  }
  if (channelOn('ads')) {
    sections.push({
      id: 'card_ads',
      onRemove: editHide('card_ads'),
      node: (
        <SourceCard
          title="Ads"
          icon={Megaphone}
          metrics={adsMetrics}
          muted={partial.ads}
          footer={partial.ads ? 'Partial data' : undefined}
        />
      ),
    })
  }
  if (channelOn('social')) {
    sections.push({
      id: 'card_social',
      onRemove: editHide('card_social'),
      node: (
        <SourceCard
          title="Social"
          icon={sources.social.connected_platforms.includes('linkedin') ? Linkedin : Instagram}
          metrics={socialMetrics}
          muted={partial.social}
          footer={socialFooter}
        />
      ),
    })
  }

  // Revenue & Journey
  if (kpiOn('card_revenue_summary') && stripe && stripe.success) {
    sections.push({
      id: 'card_revenue',
      onRemove: editHide('card_revenue'),
      node: <SourceCard title="Revenue" icon={DollarSign} metrics={revenueMetrics} />,
    })
  }
  if (kpiOn('card_best_channel')) {
    sections.push({
      id: 'card_best_channel',
      onRemove: editHide('card_best_channel'),
      node: (
        <div className="card-glass group relative h-full min-w-0 overflow-hidden rounded-2xl p-5 transition-all hover:scale-[1.01]">
          <div className="absolute -right-4 -top-4 opacity-[0.03] transition-transform duration-700 group-hover:scale-110 group-hover:opacity-[0.05]">
            <Trophy size={160} />
          </div>

          <div className="relative z-10">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="overview-icon-badge-p rounded-lg p-1.5">
                  <Trophy className="icon-sm" />
                </div>
                <p className="body-2 text-foreground font-semibold tracking-tight">
                  Top Performance
                </p>
              </div>
              {hasChannelSignal && (
                <span className="overview-badge-pill typo-caption font-bold uppercase">Winner</span>
              )}
            </div>

            {hasChannelSignal ? (
              <div className="flex flex-col gap-6">
                <div>
                  <p className="typo-caption text-muted-foreground mb-1 font-medium uppercase tracking-widest">
                    Best channel
                  </p>
                  <div className="flex items-baseline gap-3">
                    <p className="text-foreground text-4xl font-black tracking-tight">
                      {bestChannel.label}
                    </p>
                    <bestChannel.icon className="icon-md overview-text-accent-p opacity-40" />
                  </div>
                  <p className="body-2 overview-text-accent-p mt-1 font-semibold">
                    {formatCount(bestChannel.value)} {bestChannel.metricLabel}{' '}
                    <span className="text-muted-foreground/60 font-normal">this period</span>
                  </p>
                </div>

                <div className="overview-line-horizontal" />

                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  {channelScores.map((c) => (
                    <div
                      key={c.id}
                      className={`min-w-0 transition-opacity ${c.id === bestChannel.id ? 'opacity-100' : 'opacity-60'}`}
                    >
                      <p className="typo-caption text-muted-foreground font-medium uppercase">
                        {c.label}
                      </p>
                      <p className="body-2 text-foreground font-bold tabular-nums">
                        {formatCount(c.value)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="overview-border-dashed-muted flex h-32 items-center justify-center rounded-xl">
                <p className="body-3 text-muted-foreground italic">No channel activity data</p>
              </div>
            )}
          </div>
        </div>
      ),
    })
  }
  if (kpiOn('card_revenue_trend') && stripe && stripe.success && revenueTrendData.length > 0) {
    sections.push({
      id: 'card_revenue_trend',
      onRemove: editHide('card_revenue_trend'),
      node: (
        <div className="card-glass h-full rounded-2xl p-5 transition-all hover:scale-[1.01]">
          <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <p className="body-2 text-foreground font-semibold tracking-tight">Revenue trend</p>
            <span className="overview-badge-pill typo-caption font-bold uppercase tracking-wider">
              {stripe.currency}
            </span>
          </div>
          <div className="pt-2">
            <SimpleLineChart
              data={revenueTrendData}
              height={140}
              chartType={chartType}
              color="var(--overview-glass-primary, var(--color-primary))"
            />
          </div>
        </div>
      ),
    })
  }
  if (kpiOn('card_customer_journey')) {
    sections.push({
      id: 'card_customer_journey',
      onRemove: editHide('card_customer_journey'),
      node: (
        <div className="card-glass h-full rounded-2xl p-6 transition-all hover:scale-[1.01]">
          <div className="mb-4 flex items-center gap-2">
            <div className="overview-icon-badge-p rounded-lg p-1.5 opacity-80">
              <TrendingUp className="icon-sm" />
            </div>
            <p className="body-2 text-foreground font-semibold tracking-tight">Customer journey</p>
          </div>
          <CustomerJourneyFunnel flow={flow} />
        </div>
      ),
    })
  }

  // Missions & Social
  if (kpiOn('card_mission_status') && missions.length > 0) {
    sections.push({
      id: 'card_mission_status',
      onRemove: editHide('card_mission_status'),
      node: (
        <div className="card-glass h-full rounded-2xl p-6 transition-all hover:scale-[1.01]">
          <div className="mb-6 flex items-center gap-2">
            <div className="overview-icon-badge-p rounded-lg p-1.5 opacity-80">
              <Target className="icon-sm" />
            </div>
            <p className="body-2 text-foreground font-semibold tracking-tight">
              Mission Status Overview
            </p>
          </div>
          <MissionStatusDistributionBar missions={missions} />
        </div>
      ),
    })
  }
  if (kpiOn('kpi_missions_active')) {
    sections.push({
      id: 'kpi_missions_active',
      onRemove: editHide('kpi_missions_active'),
      node: (
        <KpiCard
          label="Active missions"
          value={activeMissionsCount}
          format={formatCount}
          icon={Target}
          subtitle={blockedOnlyCount > 0 ? `${blockedOnlyCount} blocked` : undefined}
        />
      ),
    })
  }
  if (kpiOn('kpi_mission_completion')) {
    sections.push({
      id: 'kpi_mission_completion',
      onRemove: editHide('kpi_mission_completion'),
      node: (
        <KpiCard
          label="Mission completion"
          value={completionPct}
          format={formatPct}
          icon={TrendingUp}
          subtitle={
            missionTotal > 0 ? `${doneCount} of ${missionTotal} missions done` : 'No missions'
          }
        />
      ),
    })
  }
  if (kpiOn('kpi_missions_blocked')) {
    sections.push({
      id: 'kpi_missions_blocked',
      onRemove: editHide('kpi_missions_blocked'),
      node: (
        <div
          className={`card-glass group flex h-full min-w-0 flex-col gap-3 rounded-2xl p-5 transition-all hover:scale-[1.01] ${
            blockedMissionsCount > 0 ? 'overview-card-outline-accent-b' : ''
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="body-3 text-muted-foreground font-medium uppercase tracking-wider">
              Blocked / Awaiting
            </span>
            <div
              className={`rounded-lg p-1.5 opacity-80 ${blockedMissionsCount > 0 ? 'overview-icon-badge-b' : 'overview-icon-badge-a'}`}
            >
              <AlertTriangle className="icon-sm" />
            </div>
          </div>
          <div>
            <p
              className={`text-3xl font-bold tabular-nums leading-tight sm:text-4xl ${blockedMissionsCount > 0 ? 'text-destructive' : 'text-foreground'}`}
            >
              <span className="inline-block whitespace-nowrap">
                <AnimatedValue value={blockedMissionsCount} format={formatCount} />
              </span>
            </p>
          </div>
        </div>
      ),
    })
  }
  if (kpiOn('kpi_follower_growth')) {
    sections.push({
      id: 'kpi_follower_growth',
      onRemove: editHide('kpi_follower_growth'),
      node: (
        <KpiCard
          label="Follower growth"
          value={socialAnalytics?.account?.follower_growth ?? 0}
          format={formatSignedInt}
          icon={Users}
          subtitle={
            socialAnalytics?.connected
              ? `${socialAnalytics.platform} · ${formatCount(socialAnalytics.account.follower_count)} total`
              : 'Social not connected'
          }
        />
      ),
    })
  }
  if (kpiOn('card_best_post') && bestPost) {
    sections.push({
      id: 'card_best_post',
      onRemove: editHide('card_best_post'),
      node: (
        <div className="card-glass group relative h-full overflow-hidden rounded-2xl p-6 transition-all hover:scale-[1.01]">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="overview-icon-badge-p rounded-lg p-1.5 opacity-80">
                <TrendingUp className="icon-sm" />
              </div>
              <p className="body-2 text-foreground font-semibold tracking-tight">
                Best performing post
              </p>
            </div>
            <span className="overview-badge-pill typo-caption font-bold uppercase tracking-wider">
              {socialAnalytics?.platform ?? 'social'}
            </span>
          </div>
          <p className="body-2 text-foreground mb-4 line-clamp-3 font-medium leading-relaxed">
            {bestPost.headline || bestPost.caption || '—'}
          </p>
          <div className="overview-border-top grid grid-cols-2 gap-6 pt-4">
            <div className="flex flex-col">
              <span className="typo-caption text-muted-foreground font-medium uppercase tracking-widest">
                Engagement
              </span>
              <span className="overview-text-accent-p text-2xl font-black">
                {formatPct(bestPost.engagement_rate)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="typo-caption text-muted-foreground font-medium uppercase tracking-widest">
                Reach
              </span>
              <span className="text-foreground text-2xl font-black">
                {formatCount(bestPost.reach)}
              </span>
            </div>
          </div>
        </div>
      ),
    })
  }

  // Insights
  if (kpiOn('kpi_new_contacts') && cs) {
    sections.push({
      id: 'kpi_new_contacts',
      onRemove: editHide('kpi_new_contacts'),
      node: (
        <KpiCard
          label="New contacts"
          value={cs.current_count}
          format={formatCount}
          icon={Users}
          subtitle={
            cs.previous_count !== undefined
              ? `Prev window: ${formatCount(cs.previous_count)} · Δ ${formatSignedInt(cs.current_count - cs.previous_count)}`
              : undefined
          }
        />
      ),
    })
  }
  if (kpiOn('kpi_lead_customer') && lc) {
    sections.push({
      id: 'kpi_lead_customer',
      onRemove: editHide('kpi_lead_customer'),
      node: (
        <KpiCard
          label="Conversion Mix"
          value={lc.conversion_pct}
          format={formatPct}
          icon={TrendingUp}
          subtitle={`${formatCount(lc.customers)} customers / ${formatCount(lc.leads)} leads`}
        />
      ),
    })
  }
  if (kpiOn('card_sequence_performance') && seq) {
    sections.push({
      id: 'card_sequence_performance',
      onRemove: editHide('card_sequence_performance'),
      node: (
        <SourceCard
          title="Sequence performance"
          icon={Mail}
          metrics={[
            { label: 'Active sequences', value: formatCount(seq.active_sequences) },
            { label: 'Total Sent', value: formatCount(seq.total_sent) },
            { label: 'Open rate', value: formatPct(seq.open_rate) },
            { label: 'Click rate', value: formatPct(seq.click_rate) },
          ]}
        />
      ),
    })
  }
  if (kpiOn('card_best_email') && topEmail && topEmail.sent > 0) {
    sections.push({
      id: 'card_best_email',
      onRemove: editHide('card_best_email'),
      node: (
        <div className="card-glass group flex h-full flex-col rounded-2xl p-5 transition-all hover:scale-[1.01]">
          <div className="mb-4 flex items-center gap-2">
            <div className="overview-icon-badge-p rounded-lg p-1.5 opacity-80">
              <MailOpen className="icon-sm" />
            </div>
            <p className="body-2 text-foreground font-semibold tracking-tight">
              Best performing email
            </p>
          </div>
          <p className="body-2 text-foreground mb-4 line-clamp-2 font-medium leading-relaxed">
            {topEmail.subject ?? '—'}
          </p>
          <div className="overview-border-top mt-auto grid grid-cols-3 gap-2 pt-4">
            <div className="flex flex-col">
              <span className="typo-caption text-muted-foreground font-medium uppercase tracking-tighter">
                Sent
              </span>
              <span className="text-foreground body-2 font-bold">{formatCount(topEmail.sent)}</span>
            </div>
            <div className="flex flex-col">
              <span className="typo-caption text-muted-foreground font-medium uppercase tracking-tighter">
                Open
              </span>
              <span className="overview-text-accent-p body-2 font-bold">
                {formatPct(topEmail.open_rate)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="typo-caption text-muted-foreground font-medium uppercase tracking-tighter">
                Click
              </span>
              <span className="text-foreground body-2 font-bold">
                {formatPct(topEmail.click_rate)}
              </span>
            </div>
          </div>
        </div>
      ),
    })
  }
  if (kpiOn('card_top_products') && stripe && stripe.success && topProducts.length > 0) {
    sections.push({
      id: 'card_top_products',
      onRemove: editHide('card_top_products'),
      node: (
        <div className="card-glass group h-full rounded-2xl p-5 transition-all hover:scale-[1.01]">
          <div className="mb-6 flex items-center gap-2">
            <div className="overview-icon-badge-b rounded-lg p-1.5 opacity-80">
              <DollarSign className="icon-sm" />
            </div>
            <p className="body-2 text-foreground font-semibold tracking-tight">Top products</p>
          </div>
          <div className="space-y-3">
            {topProducts.map((p) => (
              <div
                key={p.name}
                className="group/item bg-surface-subtle flex items-center justify-between gap-4 rounded-xl p-3 transition-colors hover:bg-white/[0.05]"
              >
                <span className="text-foreground body-3 min-w-0 truncate font-semibold tracking-tight">
                  {p.name}
                </span>
                <span className="overview-text-accent-p body-3 shrink-0 font-bold tabular-nums">
                  {formatMoney(p.revenue, stripe.currency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ),
    })
  }
  if (kpiOn('card_contacts_growth') && contactsTrend.length > 0) {
    sections.push({
      id: 'card_contacts_growth',
      onRemove: editHide('card_contacts_growth'),
      node: (
        <div className="card-glass h-full rounded-2xl p-6 transition-all hover:scale-[1.01]">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="overview-icon-badge-p rounded-lg p-1.5 opacity-80">
                <Users className="icon-sm" />
              </div>
              <p className="body-2 text-foreground font-semibold tracking-tight">
                Contact Growth Trend
              </p>
            </div>
            <span className="overview-badge-pill typo-caption font-bold uppercase tracking-wider">
              Live
            </span>
          </div>
          <SimpleLineChart
            data={contactsTrend}
            height={140}
            chartType={chartType}
            color="var(--overview-glass-primary, var(--color-primary))"
          />
        </div>
      ),
    })
  }
  if (kpiOn('card_deliverables_by_type') && deliverablesRows.length > 0) {
    sections.push({
      id: 'card_deliverables_by_type',
      onRemove: editHide('card_deliverables_by_type'),
      node: (
        <div className="card-glass h-full rounded-2xl p-6 transition-all hover:scale-[1.01]">
          <div className="mb-6 flex items-center gap-2">
            <div className="overview-icon-badge-a rounded-lg p-1.5 opacity-80">
              <Layers className="icon-sm" />
            </div>
            <p className="body-2 text-foreground font-semibold tracking-tight">
              Deliverables by type
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {(() => {
              const max = Math.max(...deliverablesRows.map((d) => d.count), 1)
              return deliverablesRows.map((d) => (
                <div key={d.type} className="group/item">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="body-3 text-foreground font-semibold capitalize">
                      {d.type}
                    </span>
                    <span className="overview-text-accent-p body-3 font-bold tabular-nums">
                      {formatCount(d.count)}
                    </span>
                  </div>
                  <div className="overview-bar-track h-2 w-full overflow-hidden rounded-full">
                    <div
                      className="overview-bar-fill-p h-full rounded-full transition-all duration-700 ease-out group-hover/item:brightness-110"
                      style={{ width: `${(d.count / max) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            })()}
          </div>
        </div>
      ),
    })
  }
  if (kpiOn('card_top_funnels') && topFunnels.length > 0) {
    sections.push({
      id: 'card_top_funnels',
      onRemove: editHide('card_top_funnels'),
      node: (
        <div className="card-glass h-full rounded-2xl p-6 transition-all hover:scale-[1.01]">
          <div className="mb-6 flex items-center gap-2">
            <div className="overview-icon-badge-p rounded-lg p-1.5 opacity-80">
              <TrendingUp className="icon-sm" />
            </div>
            <p className="body-2 text-foreground font-semibold tracking-tight">
              Top performing funnels
            </p>
          </div>
          <div className="space-y-3">
            {topFunnels.map((f) => (
              <div
                key={f.funnel_id}
                className="group/item bg-surface-subtle flex items-center justify-between gap-4 rounded-xl p-4 transition-colors hover:bg-white/[0.05]"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="text-foreground body-2 truncate font-bold tracking-tight">
                    {f.name}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="typo-caption text-muted-foreground font-medium uppercase">
                      <span className="text-foreground/60 mr-1">V:</span>
                      {formatCount(f.visitors)}
                    </span>
                    <span className="overview-dot-separator h-1 w-1 rounded-full" />
                    <span className="typo-caption text-muted-foreground font-medium uppercase">
                      <span className="text-foreground/60 mr-1">L:</span>
                      {formatCount(f.leads)}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end">
                  <span className="typo-caption text-muted-foreground font-bold uppercase tracking-widest opacity-50">
                    Conversion
                  </span>
                  <span className="overview-text-accent-p body-2 font-black tabular-nums">
                    {formatPct(f.conversion_rate)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    })
  }
  if (kpiOn('card_contact_sources') && contactSources.length > 0) {
    sections.push({
      id: 'card_contact_sources',
      onRemove: editHide('card_contact_sources'),
      node: (
        <div className="card-glass h-full rounded-2xl p-6 transition-all hover:scale-[1.01]">
          <div className="mb-6 flex items-center gap-2">
            <div className="overview-icon-badge-p rounded-lg p-1.5 opacity-80">
              <Users className="icon-sm" />
            </div>
            <p className="body-2 text-foreground font-semibold tracking-tight">
              Contact source breakdown
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {contactSources.map((row, i) => (
              <ContributionBar
                key={row.source}
                label={row.source}
                value={row.count}
                total={contactSourcesTotal || 1}
                tone={(['p', 'a', 'b'] as const)[i % 3]!}
              />
            ))}
          </div>
        </div>
      ),
    })
  }
  if (kpiOn('card_funnel_dropoff') && dropoff?.steps?.length) {
    sections.push({
      id: 'card_funnel_dropoff',
      onRemove: editHide('card_funnel_dropoff'),
      node: (
        <div className="card-glass h-full rounded-2xl p-6 transition-all hover:scale-[1.01]">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="overview-icon-badge-a rounded-lg p-1.5 opacity-80">
                <TrendingUp className="icon-sm" />
              </div>
              <p className="body-2 text-foreground font-semibold tracking-tight">
                Funnel performance & drop-off
              </p>
            </div>
          </div>
          {dropoff.funnel_name ? (
            <p className="typo-caption text-muted-foreground mb-6 font-medium italic">
              Active funnel: {dropoff.funnel_name}
            </p>
          ) : null}
          <div className="space-y-6">
            {dropoff.steps.map((step) => (
              <div key={step.page_name} className="group/item">
                <div className="mb-2 flex items-center justify-between">
                  <span className="body-3 text-foreground max-w-[200px] truncate font-bold">
                    {step.page_name}
                  </span>
                  <div className="flex items-center gap-4">
                    <span className="body-3 text-foreground font-medium tabular-nums">
                      {formatCount(step.views)}{' '}
                      <span className="text-muted-foreground/60 text-xs font-normal">views</span>
                    </span>
                    <span
                      className={`typo-caption font-bold ${step.drop_off_pct > 30 ? 'overview-pill-accent-2' : 'overview-pill-accent-1'}`}
                    >
                      {step.drop_off_pct.toFixed(1)}% drop
                    </span>
                  </div>
                </div>
                <div className="overview-bar-track h-2.5 w-full overflow-hidden rounded-full">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${step.drop_off_pct > 30 ? 'overview-funnel-bar-warn' : 'overview-bar-fill-p'}`}
                    style={{
                      width: `${Math.max(5, 100 - step.drop_off_pct)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    })
  }
  if (kpiOn('card_roi_by_channel') && stripe && stripe.success) {
    sections.push({
      id: 'card_roi_by_channel',
      onRemove: editHide('card_roi_by_channel'),
      node: (
        <div className="card-glass h-full rounded-2xl p-6 transition-all hover:scale-[1.01]">
          <div className="mb-2 flex items-center gap-2">
            <div className="overview-icon-badge-b rounded-lg p-1.5 opacity-80">
              <DollarSign className="icon-sm" />
            </div>
            <p className="body-2 text-foreground font-semibold tracking-tight">ROI snapshot</p>
          </div>
          <p className="typo-caption text-muted-foreground mb-6 font-medium">
            Net revenue vs. estimated ad budget
          </p>
          <div className="space-y-6">
            <ContributionBar
              label="Net revenue (Stripe)"
              value={Math.max(stripe.net, 0)}
              total={Math.max(stripe.net, 0) + Math.max(adsBudgetSum, 0) || 1}
              tone="p"
            />
            <ContributionBar
              label="Est. ad budget (daily sum)"
              value={Math.max(adsBudgetSum, 0)}
              total={Math.max(stripe.net, 0) + Math.max(adsBudgetSum, 0) || 1}
              tone="b"
            />
          </div>
          <div className="bg-surface-subtle mt-8 grid grid-cols-2 gap-4 rounded-xl p-4 sm:grid-cols-4">
            {[
              { label: 'Funnel', val: contribution.funnel_leads },
              { label: 'Ads', val: contribution.ad_leads },
              { label: 'Email', val: contribution.email_clicks },
              { label: 'Social', val: contribution.social_interactions },
            ].map((item) => (
              <div key={item.label} className="flex flex-col">
                <span className="typo-caption text-muted-foreground font-bold uppercase tracking-tighter">
                  {item.label}
                </span>
                <span className="text-foreground body-2 font-black tabular-nums">
                  {formatCount(item.val)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ),
    })
  }
  if (kpiOn('card_campaign_leaderboard') && board.length > 0) {
    sections.push({
      id: 'card_campaign_leaderboard',
      onRemove: editHide('card_campaign_leaderboard'),
      node: (
        <div className="card-glass group h-full rounded-2xl p-6 transition-all hover:scale-[1.01]">
          <div className="mb-6 flex items-center gap-2">
            <div className="overview-icon-badge-p rounded-lg p-1.5 opacity-80">
              <Trophy className="icon-sm" />
            </div>
            <p className="body-2 text-foreground font-semibold tracking-tight">
              Campaign Leaderboard
            </p>
          </div>
          <div className="space-y-2">
            {board.map((row, idx) => (
              <div
                key={row.campaign_id}
                className={`flex items-center justify-between gap-4 rounded-xl p-3 transition-all ${
                  campaignId === row.campaign_id
                    ? 'overview-row-current shadow-sm'
                    : 'bg-surface-subtle hover:bg-white/[0.05]'
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`body-3 flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-bold shadow-sm ${
                      idx === 0
                        ? 'overview-rank-1'
                        : idx === 1
                          ? 'overview-rank-2'
                          : idx === 2
                            ? 'overview-rank-3'
                            : 'overview-rank-n'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span className="text-foreground body-3 truncate font-bold tracking-tight">
                    {row.name}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-6">
                  <div className="flex flex-col items-end">
                    <span className="typo-caption text-muted-foreground font-black uppercase tracking-tighter opacity-50">
                      Score
                    </span>
                    <span className="text-foreground body-2 font-black tabular-nums">
                      {formatCount(row.score)}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="typo-caption text-muted-foreground font-black uppercase tracking-tighter opacity-50">
                      Leads
                    </span>
                    <span className="overview-text-accent-p body-2 font-black tabular-nums">
                      {formatCount(row.leads)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    })
  }

  // Trends & Contribution
  if (kpiOn('card_unified_trend')) {
    sections.push({
      id: 'card_unified_trend',
      onRemove: editHide('card_unified_trend'),
      node: (
        <div className="card-glass h-full rounded-xl p-4">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <p className="body-3 text-foreground font-medium">Unified Trend</p>
            <span className="typo-caption text-muted-foreground">
              {timeseries.length} day{timeseries.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Visitors', value: sources.funnels.visitors, data: trendVisitors },
              { label: 'Leads', value: sources.funnels.leads, data: trendLeads },
              { label: 'Email Opens', value: sources.emails.opened, data: trendOpens },
              { label: 'Social Reach', value: sources.social.reach, data: trendReach },
            ].map((series) => (
              <div key={series.label}>
                <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                  <span className="typo-caption text-muted-foreground">{series.label}</span>
                  <span className="typo-caption text-muted-foreground tabular-nums">
                    {formatCount(series.value)}
                  </span>
                </div>
                <SimpleLineChart
                  data={series.data}
                  height={80}
                  chartType={chartType}
                  color="var(--overview-glass-primary, var(--color-primary))"
                />
              </div>
            ))}
          </div>
        </div>
      ),
    })
  }
  if (kpiOn('card_contribution')) {
    sections.push({
      id: 'card_contribution',
      onRemove: editHide('card_contribution'),
      node: (
        <div className="card-glass group h-full rounded-2xl p-5 transition-all hover:scale-[1.01]">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="overview-icon-badge-a rounded-lg p-1.5 opacity-80">
                <MousePointerClick className="icon-sm" />
              </div>
              <p className="body-2 text-foreground font-semibold tracking-tight">
                Channel Contribution
              </p>
            </div>
          </div>
          <div className="space-y-5">
            <ContributionBar
              label="Funnel leads"
              value={contribution.funnel_leads}
              total={contributionTotal}
              tone="p"
            />
            <ContributionBar
              label="Ad leads"
              value={contribution.ad_leads}
              total={contributionTotal}
              tone="a"
            />
            <ContributionBar
              label="Email clicks"
              value={contribution.email_clicks}
              total={contributionTotal}
              tone="b"
            />
            <ContributionBar
              label="Social interactions"
              value={contribution.social_interactions}
              total={contributionTotal}
              tone="a"
            />
          </div>
        </div>
      ),
    })
  }

  if (kpiOn('card_alerts')) {
    sections.push({
      id: 'card_alerts',
      onRemove: editHide('card_alerts'),
      node: (
        <div className="h-full">
          <div className="mb-2 flex items-center justify-between">
            <p className="body-3 text-muted-foreground">Alerts</p>
            <span className="typo-caption text-muted-foreground">
              {alerts.length} signal{alerts.length === 1 ? '' : 's'}
            </span>
          </div>
          {alerts.length === 0 ? (
            <div className="card-glass rounded-xl p-3">
              <p className="body-3 text-muted-foreground">
                No alerts — all channels within expected thresholds.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {alerts.map((alert, idx) => (
                <AlertCard key={`${alert.source}-${idx}`} alert={alert} />
              ))}
            </div>
          )}
        </div>
      ),
    })
  }

  for (const cw of reportingConfig?.overview_custom_widgets ?? []) {
    const onRemove = overviewDashboardEditMode
      ? () => onOverviewCustomWidgetRemove?.(cw.id)
      : undefined
    if (cw.kind === 'heading') {
      sections.push({
        id: cw.id,
        onRemove,
        node: (
          <OverviewHeadingWidget
            title={cw.title}
            subtitle={cw.subtitle}
            editMode={overviewDashboardEditMode}
            onChange={(patch) => onOverviewCustomWidgetChange?.(cw.id, patch)}
          />
        ),
      })
    } else {
      sections.push({
        id: cw.id,
        onRemove,
        node: (
          <OverviewNoteWidget
            body={cw.body}
            editMode={overviewDashboardEditMode}
            onChange={(patch) => onOverviewCustomWidgetChange?.(cw.id, patch)}
          />
        ),
      })
    }
  }

  return (
    <CampaignOverviewDashboardGrid
      sections={sections}
      savedLayout={overviewDashboardSavedLayout}
      editMode={overviewDashboardEditMode}
      onLayoutPersist={onOverviewDashboardLayoutPersist ?? (() => {})}
      glassStyle={glassStyle}
      refreshing={refreshing}
    />
  )
}
