'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ChevronDown,
  Eye,
  Facebook,
  Heart,
  Instagram,
  Linkedin,
  MousePointerClick,
  TrendingUp,
  Users,
  Youtube,
} from 'lucide-react'
import { toast } from 'sonner'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { FacebookReportingPagePicker } from '@/features/spaces/components/reporting/shared/FacebookReportingPagePicker'
import { LinkedInReportingCompanyPagePicker } from '@/features/spaces/components/reporting/shared/LinkedInReportingCompanyPagePicker'
import type { ReportingToolbarApi } from '@/features/spaces/components/reporting/shared/reporting-toolbar.types'
import { YoutubeReportingChannelPicker } from '@/features/spaces/components/reporting/shared/YoutubeReportingChannelPicker'
import type { ReportingTimeRange } from '@/features/spaces/types/space-schema'
import { STUDIO_INLINE_ERRORS } from '@/features/studio/config/studio-inline-errors.config'
import {
  fetchCampaignSocialAnalytics,
  fetchCampaignSocialConnectionOptions,
  type SocialAnalyticsPlatform,
  type SocialAnalyticsResponse,
  type SocialConnectionOption,
} from '../../services/analytics.service'
import { SimpleLineChart } from './SimpleLineChart'
import { SocialDisconnectedArtifactMockup } from './SocialDisconnectedArtifactMockup'

export type SocialDisconnectedPresentation = 'default' | 'artifact-mockup' | 'amber-banner'

type TimeRange = '7d' | '30d' | '90d' | 'all'

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  all: 'All time',
}

const PLATFORM_OPTIONS: {
  key: SocialAnalyticsPlatform
  label: string
  Icon: typeof Instagram
}[] = [
  { key: 'instagram', label: 'Instagram', Icon: Instagram },
  { key: 'linkedin', label: 'LinkedIn', Icon: Linkedin },
  { key: 'facebook', label: 'Facebook', Icon: Facebook },
  { key: 'youtube', label: 'YouTube', Icon: Youtube },
]

export function getSocialAnalyticsRangeDates(range: TimeRange): { since?: string; until?: string } {
  if (range === 'all') return {}
  const now = new Date()
  const until = now.toISOString().split('T')[0]
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
  const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  return { since, until }
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

interface SocialPerformanceViewProps {
  campaignId: string
  campaignName?: string | null
  externalRefreshKey?: number
  /** When true, root has no card-glass (e.g. embedded in Spaces reporting). */
  embedded?: boolean
  /** Controlled time range (Spaces toolbar); hides header range picker. */
  externalTimeRange?: ReportingTimeRange
  onExternalTimeRangeChange?: (value: ReportingTimeRange) => void
  onRegisterReportingToolbar?: (api: ReportingToolbarApi | null) => void
  /** Controlled platform (e.g. Spaces reporting + customize panel). */
  externalPlatform?: SocialAnalyticsPlatform
  onExternalPlatformChange?: (value: SocialAnalyticsPlatform) => void
  /** Pin analytics to a connection row; `null` = default resolution for current platform. */
  externalConnectionId?: string | null
  onExternalConnectionIdChange?: (connectionId: string | null) => void
  /** Spaces stacked sections: hide duplicated campaign header. */
  hidePerformanceHeader?: boolean
  /** Spaces reporting: single-platform disconnected mockup vs multi-platform amber strip vs studio default. */
  disconnectedPresentation?: SocialDisconnectedPresentation
  /** Parent-owned analytics payload (Spaces social reporting batch load). */
  externalData?: SocialAnalyticsResponse | null
  /** Hide per-section loading orb; parent shows one loader for all platforms. */
  suppressLoadingOverlay?: boolean
  /** Parent refresh in progress (opacity on metrics). */
  externalRefreshing?: boolean
  /** Reuse parent-fetched connection options (avoids duplicate requests). */
  externalConnOpts?: {
    instagram: SocialConnectionOption[]
    linkedin: SocialConnectionOption[]
    facebook: SocialConnectionOption[]
    youtube: SocialConnectionOption[]
  } | null
  /** After inline LinkedIn company page save (Spaces reporting). */
  onLinkedInCompanyPageSaved?: () => void
  /** After inline Facebook page or YouTube channel save (Spaces reporting). */
  onReportingTargetSaved?: () => void
}

export function SocialPerformanceView({
  campaignId,
  campaignName,
  externalRefreshKey,
  embedded = false,
  externalTimeRange,
  onExternalTimeRangeChange,
  onRegisterReportingToolbar,
  externalPlatform,
  onExternalPlatformChange,
  externalConnectionId,
  onExternalConnectionIdChange,
  hidePerformanceHeader = false,
  disconnectedPresentation = 'default',
  externalData,
  suppressLoadingOverlay = false,
  externalRefreshing = false,
  externalConnOpts,
  onLinkedInCompanyPageSaved,
  onReportingTargetSaved,
}: SocialPerformanceViewProps) {
  const handleReportingTargetSaved = onReportingTargetSaved ?? onLinkedInCompanyPageSaved
  const parentOwnsData = externalData !== undefined
  const connectionControlled = embedded && onExternalConnectionIdChange != null
  const hidePlatformControl =
    embedded && externalPlatform !== undefined && onExternalPlatformChange == null
  const [internalPlatform, setInternalPlatform] = useState<SocialAnalyticsPlatform>('instagram')
  /** Embedded reporting passes externalPlatform without a switcher — must not fall back to internal instagram. */
  const platform: SocialAnalyticsPlatform = externalPlatform ?? internalPlatform
  const setPlatform = (p: SocialAnalyticsPlatform) => {
    if (externalPlatform !== undefined && !onExternalPlatformChange) return
    if (onExternalPlatformChange) onExternalPlatformChange(p)
    else setInternalPlatform(p)
  }
  const [internalTimeRange, setInternalTimeRange] = useState<TimeRange>('30d')
  const timeRangeExternal = onExternalTimeRangeChange != null
  const timeRange: TimeRange = timeRangeExternal
    ? ((externalTimeRange ?? '30d') as TimeRange)
    : internalTimeRange
  const setTimeRangeValue = (v: TimeRange) => {
    if (timeRangeExternal) onExternalTimeRangeChange?.(v as ReportingTimeRange)
    else setInternalTimeRange(v)
  }
  const [timeRangeOpen, setTimeRangeOpen] = useState(false)
  const timeRangeBtnRef = useRef<HTMLButtonElement>(null)
  const [timeRangePos, setTimeRangePos] = useState({ top: 0, left: 0 })

  const [platformOpen, setPlatformOpen] = useState(false)
  const platformBtnRef = useRef<HTMLButtonElement>(null)
  const [platformPos, setPlatformPos] = useState({ top: 0, left: 0 })

  const [accountOpen, setAccountOpen] = useState(false)
  const accountBtnRef = useRef<HTMLButtonElement>(null)
  const [accountPos, setAccountPos] = useState({ top: 0, left: 0 })
  const [connOptsInternal, setConnOptsInternal] = useState<{
    instagram: SocialConnectionOption[]
    linkedin: SocialConnectionOption[]
    facebook: SocialConnectionOption[]
    youtube: SocialConnectionOption[]
  } | null>(null)
  const connOpts = externalConnOpts !== undefined ? externalConnOpts : connOptsInternal

  const [internalData, setInternalData] = useState<SocialAnalyticsResponse | null>(null)
  const [internalInitialLoading, setInternalInitialLoading] = useState(true)
  const [internalRefreshing, setInternalRefreshing] = useState(false)
  const data = parentOwnsData ? externalData : internalData
  const initialLoading = parentOwnsData ? false : internalInitialLoading
  const refreshing = parentOwnsData ? externalRefreshing : internalRefreshing
  const hasLoadedOnce = useRef<string>('')
  const externalRefreshRef = useRef<number | undefined>(externalRefreshKey)

  useLayoutEffect(() => {
    if (!timeRangeOpen || !timeRangeBtnRef.current) return
    const rect = timeRangeBtnRef.current.getBoundingClientRect()
    setTimeRangePos({ top: rect.bottom + 4, left: rect.left })
  }, [timeRangeOpen])

  useLayoutEffect(() => {
    if (!accountOpen || !accountBtnRef.current) return
    const rect = accountBtnRef.current.getBoundingClientRect()
    setAccountPos({ top: rect.bottom + 4, left: rect.left })
  }, [accountOpen])

  useLayoutEffect(() => {
    if (!platformOpen || !platformBtnRef.current) return
    const rect = platformBtnRef.current.getBoundingClientRect()
    setPlatformPos({ top: rect.bottom + 4, left: rect.left })
  }, [platformOpen])

  useEffect(() => {
    if (!timeRangeOpen && !accountOpen && !platformOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('[data-social-dropdown]')) return
      if (target.closest('[data-social-account-dropdown]')) return
      if (target.closest('[data-social-platform-dropdown]')) return
      if (timeRangeBtnRef.current?.contains(target)) return
      if (accountBtnRef.current?.contains(target)) return
      if (platformBtnRef.current?.contains(target)) return
      setTimeRangeOpen(false)
      setAccountOpen(false)
      setPlatformOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [timeRangeOpen, accountOpen, platformOpen])

  useEffect(() => {
    if (externalConnOpts !== undefined || !connectionControlled || !campaignId) return
    let cancelled = false
    fetchCampaignSocialConnectionOptions(campaignId)
      .then((rows) => {
        if (!cancelled) setConnOptsInternal(rows)
      })
      .catch(() => {
        if (!cancelled)
          setConnOptsInternal({ instagram: [], linkedin: [], facebook: [], youtube: [] })
      })
    return () => {
      cancelled = true
    }
  }, [campaignId, connectionControlled, externalConnOpts])

  const platformOpts = connOpts?.[platform] ?? []

  useEffect(() => {
    setAccountOpen(false)
    setPlatformOpen(false)
  }, [platform])

  const connectionCacheKey = connectionControlled ? (externalConnectionId ?? 'auto') : 'intrinsic'

  const loadAnalytics = useCallback(
    async (opts: { refresh?: boolean } = {}) => {
      const key = `${platform}|${timeRange}|${connectionCacheKey}`
      if (hasLoadedOnce.current !== key) setInternalInitialLoading(true)
      else setInternalRefreshing(true)
      try {
        const { since, until } = getSocialAnalyticsRangeDates(timeRange)
        const connectionId =
          connectionControlled && externalConnectionId ? externalConnectionId : undefined
        const result = await fetchCampaignSocialAnalytics(campaignId, platform, {
          since,
          until,
          refresh: opts.refresh,
          connectionId,
        })
        setInternalData(result)
        hasLoadedOnce.current = key
        if (opts.refresh && result.partial) {
          toast.warning("Some metrics couldn't be pulled live — showing what we got.")
        }
      } catch (err) {
        console.error('[SocialPerformance] Failed to load analytics:', err)
        toast.error(STUDIO_INLINE_ERRORS.LOAD_ANALYTICS)
      } finally {
        setInternalInitialLoading(false)
        setInternalRefreshing(false)
      }
    },
    [campaignId, platform, timeRange, connectionControlled, externalConnectionId],
  )

  useEffect(() => {
    if (parentOwnsData) return
    void loadAnalytics()
  }, [parentOwnsData, loadAnalytics])

  useEffect(() => {
    if (parentOwnsData) return
    if (typeof externalRefreshKey !== 'number') return
    if (externalRefreshRef.current === externalRefreshKey) return
    externalRefreshRef.current = externalRefreshKey
    void loadAnalytics({ refresh: true })
  }, [parentOwnsData, campaignId, externalRefreshKey, loadAnalytics, platform, timeRange])

  useEffect(() => {
    if (parentOwnsData || !onRegisterReportingToolbar) return
    const socialAccountConnected: boolean | null = initialLoading
      ? null
      : data != null
        ? data.connected
        : null
    const api: ReportingToolbarApi = {
      refresh: () => {
        void loadAnalytics({ refresh: true })
      },
      refreshing: initialLoading || refreshing,
      socialAccountConnected,
    }
    onRegisterReportingToolbar(api)
    return () => onRegisterReportingToolbar(null)
  }, [onRegisterReportingToolbar, loadAnalytics, initialLoading, refreshing, data])

  const account = data?.account
  const postRows = data?.posts ?? []

  const kpiCards = useMemo(() => {
    if (platform === 'facebook') {
      return [
        {
          label: 'Content views',
          value: account?.impressions ?? 0,
          icon: Eye,
          format: (v: number) => v.toLocaleString(),
        },
        {
          label: 'Followers',
          value: account?.follower_count ?? 0,
          icon: Users,
          format: (v: number) => v.toLocaleString(),
        },
        {
          label: 'Engagements',
          value: account?.total_interactions ?? 0,
          icon: Heart,
          format: (v: number) => v.toLocaleString(),
        },
        {
          label: 'Engagement',
          value: account?.engagement_rate ?? 0,
          icon: TrendingUp,
          format: (v: number) => `${v.toFixed(2)}%`,
        },
      ]
    }
    if (platform === 'youtube') {
      return [
        {
          label: 'Views',
          value: account?.views ?? account?.impressions ?? 0,
          icon: Eye,
          format: (v: number) => v.toLocaleString(),
        },
        {
          label: 'Subscribers',
          value: account?.follower_count ?? 0,
          icon: Users,
          format: (v: number) => v.toLocaleString(),
        },
        {
          label: 'Interactions',
          value: account?.total_interactions ?? 0,
          icon: Heart,
          format: (v: number) => v.toLocaleString(),
        },
        {
          label: 'Engagement',
          value: account?.engagement_rate ?? 0,
          icon: TrendingUp,
          format: (v: number) => `${v.toFixed(2)}%`,
        },
      ]
    }
    if (platform === 'instagram') {
      return [
        {
          label: 'Reach',
          value: account?.reach ?? 0,
          icon: Eye,
          format: (v: number) => v.toLocaleString(),
        },
        {
          label: 'Followers',
          value: account?.follower_count ?? 0,
          icon: Users,
          format: (v: number) => v.toLocaleString(),
        },
        {
          label: 'Interactions',
          value: account?.total_interactions ?? 0,
          icon: Heart,
          format: (v: number) => v.toLocaleString(),
        },
        {
          label: 'Engagement',
          value: account?.engagement_rate ?? 0,
          icon: TrendingUp,
          format: (v: number) => `${v.toFixed(2)}%`,
        },
      ]
    }
    return [
      {
        label: 'Impressions',
        value: account?.impressions ?? 0,
        icon: Eye,
        format: (v: number) => v.toLocaleString(),
      },
      {
        label: 'Clicks',
        value: account?.clicks ?? 0,
        icon: MousePointerClick,
        format: (v: number) => v.toLocaleString(),
      },
      {
        label: 'Interactions',
        value: account?.total_interactions ?? 0,
        icon: Heart,
        format: (v: number) => v.toLocaleString(),
      },
      {
        label: 'Engagement',
        value: account?.engagement_rate ?? 0,
        icon: TrendingUp,
        format: (v: number) => `${v.toFixed(2)}%`,
      },
    ]
  }, [platform, account])

  const chartData = useMemo(() => {
    const src = data?.chart_data ?? []
    const key: 'reach' | 'impressions' = platform === 'instagram' ? 'reach' : 'impressions'
    return src
      .filter((p) => p.date)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((p) => ({ date: p.date, value: p[key] ?? 0 }))
  }, [data, platform])

  const sortedPosts = useMemo(
    () => [...postRows].sort((a, b) => (b.total_interactions ?? 0) - (a.total_interactions ?? 0)),
    [postRows],
  )

  const header = (
    <div className="border-border flex items-center justify-between border-b pb-4">
      <div>
        <p className="body-2 text-foreground font-medium">
          {campaignName ?? 'Campaign'} — Social performance
        </p>
        {!timeRangeExternal ? (
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
                  data-social-dropdown
                >
                  <div className="surface-card border-border rounded-spacing-2 p-spacing-2 min-w-[160px] border shadow-lg">
                    {(Object.keys(TIME_RANGE_LABELS) as TimeRange[]).map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setTimeRangeValue(key)
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
        ) : null}
      </div>
    </div>
  )

  const activePlatformMeta =
    PLATFORM_OPTIONS.find((o) => o.key === platform) ?? PLATFORM_OPTIONS[0]!
  const ActivePlatformIcon = activePlatformMeta.Icon

  const platformSwitcher = (
    <div className="relative">
      <button
        ref={platformBtnRef}
        type="button"
        onClick={() => setPlatformOpen((o) => !o)}
        aria-label={`Platform: ${activePlatformMeta.label}`}
        className="tabs-liquid-glass text-muted-foreground hover:text-foreground inline-flex h-9 shrink-0 items-center gap-1 rounded-lg px-2 transition-colors"
      >
        <ActivePlatformIcon className="icon-sm shrink-0" aria-hidden />
        <ChevronDown className="icon-xs shrink-0" aria-hidden />
      </button>
      {platformOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed z-50"
            style={{ top: platformPos.top, left: platformPos.left }}
            data-social-platform-dropdown
          >
            <div className="surface-card border-border rounded-spacing-2 p-spacing-2 min-w-[168px] border shadow-lg">
              {PLATFORM_OPTIONS.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setPlatform(key)
                    setPlatformOpen(false)
                  }}
                  className={`body-3 px-spacing-2 py-spacing-2 rounded-spacing-1 flex w-full items-center gap-2 text-left transition-colors ${
                    platform === key
                      ? 'bg-primary/10 text-muted-foreground'
                      : 'hover:bg-hover-subtle text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="icon-xs shrink-0" aria-hidden />
                  {label}
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </div>
  )

  const platformLabel = PLATFORM_OPTIONS.find((o) => o.key === platform)?.label ?? platform

  const effectiveConnectionId = useMemo(() => {
    if (!externalConnectionId) return null
    return platformOpts.some((o) => o.id === externalConnectionId) ? externalConnectionId : null
  }, [externalConnectionId, platformOpts])

  const accountMenuLabel = useMemo(() => {
    if (!connectionControlled) return ''
    if (!effectiveConnectionId) return 'Auto'
    const hit = platformOpts.find((o) => o.id === effectiveConnectionId)
    return hit?.label ?? 'Account'
  }, [connectionControlled, effectiveConnectionId, platformOpts])

  const selectedReportingTargetName = useMemo(() => {
    const connId = effectiveConnectionId ?? data?.active_connection?.id ?? null
    const hit = connId ? platformOpts.find((o) => o.id === connId) : platformOpts[0]
    if (platform === 'linkedin') return hit?.linkedin_company_page_name?.trim() || null
    if (platform === 'facebook') return hit?.facebook_page_name?.trim() || null
    if (platform === 'youtube') return hit?.youtube_channel_name?.trim() || null
    return null
  }, [platform, effectiveConnectionId, platformOpts, data?.active_connection?.id])

  const reportingTargetPicker =
    data?.connected && connectionControlled ? (
      platform === 'linkedin' ? (
        <LinkedInReportingCompanyPagePicker
          userIntegrationId={null}
          selectedPageName={selectedReportingTargetName}
          platformOpts={platformOpts}
          effectiveConnectionId={effectiveConnectionId}
          activeConnectionId={data?.active_connection?.id ?? null}
          activeConnectionSource={data?.active_connection?.source ?? null}
          onConnectionChange={onExternalConnectionIdChange}
          onCompanyPageSaved={() => handleReportingTargetSaved?.()}
        />
      ) : platform === 'facebook' ? (
        <FacebookReportingPagePicker
          selectedPageName={selectedReportingTargetName}
          platformOpts={platformOpts}
          effectiveConnectionId={effectiveConnectionId}
          activeConnectionId={data?.active_connection?.id ?? null}
          activeConnectionSource={data?.active_connection?.source ?? null}
          onConnectionChange={onExternalConnectionIdChange}
          onPageSaved={() => handleReportingTargetSaved?.()}
        />
      ) : platform === 'youtube' ? (
        <YoutubeReportingChannelPicker
          selectedChannelName={selectedReportingTargetName}
          platformOpts={platformOpts}
          effectiveConnectionId={effectiveConnectionId}
          activeConnectionId={data?.active_connection?.id ?? null}
          activeConnectionSource={data?.active_connection?.source ?? null}
          onConnectionChange={onExternalConnectionIdChange}
          onChannelSaved={() => handleReportingTargetSaved?.()}
        />
      ) : null
    ) : null

  const accountPicker =
    (platform === 'linkedin' || platform === 'facebook' || platform === 'youtube') &&
    data?.connected ? (
      reportingTargetPicker
    ) : connectionControlled && platformOpts.length > 0 ? (
      <div className="relative">
        <button
          ref={accountBtnRef}
          type="button"
          onClick={() => setAccountOpen((o) => !o)}
          className="border-border body-3 text-muted-foreground hover:text-foreground inline-flex items-center gap-1 rounded-md border px-2 py-1 transition-colors"
        >
          {platformLabel} account: {accountMenuLabel}
          <ChevronDown className="icon-xs" />
        </button>
        {accountOpen &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              className="fixed z-50"
              style={{ top: accountPos.top, left: accountPos.left }}
              data-social-account-dropdown
            >
              <div className="surface-card border-border rounded-spacing-2 p-spacing-2 max-h-[280px] min-w-[200px] overflow-auto border shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    onExternalConnectionIdChange?.(null)
                    setAccountOpen(false)
                  }}
                  className={`body-3 px-spacing-2 py-spacing-2 rounded-spacing-1 block w-full text-left transition-colors ${
                    !effectiveConnectionId
                      ? 'bg-primary/10 text-muted-foreground'
                      : 'hover:bg-hover-subtle text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Auto (default)
                </button>
                {platformOpts.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onExternalConnectionIdChange?.(opt.id)
                      setAccountOpen(false)
                    }}
                    className={`body-3 px-spacing-2 py-spacing-2 rounded-spacing-1 block w-full truncate text-left transition-colors ${
                      effectiveConnectionId === opt.id
                        ? 'bg-primary/10 text-muted-foreground'
                        : 'hover:bg-hover-subtle text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {opt.label}
                    {opt.is_default ? ' · default' : ''}
                  </button>
                ))}
              </div>
            </div>,
            document.body,
          )}
      </div>
    ) : null

  const chartLabel =
    platform === 'instagram'
      ? 'Reach Over Time'
      : platform === 'youtube'
        ? 'Views Over Time'
        : 'Impressions Over Time'

  const disconnected = Boolean(data && !data.connected)

  const missingLinkedInOrgUrn =
    platform === 'linkedin' &&
    Boolean(data?.connected && data.reason === 'missing_linkedin_org_urn')

  const missingFacebookPage =
    platform === 'facebook' &&
    Boolean(data?.connected && data.reason === 'missing_facebook_page_id')

  const missingYoutubeChannel =
    platform === 'youtube' &&
    Boolean(data?.connected && data.reason === 'missing_youtube_channel_id')

  const missingReportingTarget =
    missingLinkedInOrgUrn || missingFacebookPage || missingYoutubeChannel

  const disconnectedCopyBody = (
    <>
      Connect the account in Settings → Integrations
      {embedded ? ' or link it to this campaign' : ''} to see real performance.
    </>
  )

  const notConnectedBannerDefault = disconnected && disconnectedPresentation === 'default' && (
    <div className="border-border bg-muted/20 rounded-xl border p-4">
      <p className="body-3 text-foreground font-medium">{platformLabel} is not connected</p>
      <p className="typo-caption text-muted-foreground mt-1">{disconnectedCopyBody}</p>
    </div>
  )

  const notConnectedBannerAmber = disconnected && disconnectedPresentation === 'amber-banner' && (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
      <p className="body-3 font-medium text-amber-400">{platformLabel} is not connected</p>
      <p className="typo-caption mt-1 text-amber-400/80">{disconnectedCopyBody}</p>
    </div>
  )

  const disconnectedArtifactMockup = disconnected &&
    disconnectedPresentation === 'artifact-mockup' && (
      <div className="gap-spacing-6 py-spacing-6 flex flex-col items-center">
        <SocialDisconnectedArtifactMockup platform={platform} />
        <div className="max-w-md text-center">
          <p className="body-2 text-foreground font-medium">{platformLabel} is not connected</p>
          <p className="typo-caption text-muted-foreground mt-spacing-2">{disconnectedCopyBody}</p>
        </div>
      </div>
    )

  const hideToolbarRowWhenDisconnectedMockup =
    disconnected && disconnectedPresentation === 'artifact-mockup'

  const missingReportingTargetBanner = missingReportingTarget && (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
      <p className="typo-caption text-amber-400">
        {missingLinkedInOrgUrn
          ? 'Choose a company page from the dropdown above. LinkedIn analytics use your company page, not your personal profile.'
          : missingFacebookPage
            ? 'Choose a Facebook Page from the dropdown above. Page insights require a selected Page.'
            : 'Choose a YouTube channel from the dropdown above. Channel analytics require a selected channel.'}
      </p>
    </div>
  )

  const partialBanner = data?.partial && data.connected && !missingReportingTarget && (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
      <p className="typo-caption text-amber-400">
        Some metrics couldn&apos;t be fetched live. Displaying cached values where available.
      </p>
    </div>
  )

  const emptyPostsBanner = data?.connected && postRows.length === 0 && (
    <div className="card-glass rounded-xl p-4">
      <p className="body-3 text-muted-foreground">
        No published posts yet for {platformLabel} in this campaign.
      </p>
    </div>
  )

  const rootClassName = embedded
    ? suppressLoadingOverlay
      ? 'relative w-full'
      : 'relative h-full min-h-[400px] w-full overflow-auto'
    : 'card-glass relative h-full min-h-[400px] w-full overflow-auto rounded-2xl p-4'

  const showLoadingOverlay = initialLoading && !suppressLoadingOverlay

  return (
    <div className={rootClassName}>
      {showLoadingOverlay ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <VibeyLoadingOrb size="sm" text="Loading social analytics..." />
        </div>
      ) : (
        <div className="space-y-4">
          {!hidePerformanceHeader ? header : null}
          {!hideToolbarRowWhenDisconnectedMockup ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {!hidePlatformControl ? platformSwitcher : null}
                {accountPicker}
              </div>
              {data?.fetched_at && !disconnected && (
                <span className="typo-caption text-muted-foreground">
                  Last checked {new Date(data.fetched_at).toLocaleTimeString()}
                </span>
              )}
            </div>
          ) : null}

          {notConnectedBannerDefault}
          {notConnectedBannerAmber}
          {disconnectedArtifactMockup}
          {!disconnected && missingReportingTargetBanner}
          {!disconnected && partialBanner}

          {!disconnected && !missingReportingTarget && (
            <>
              <div
                className={`grid grid-cols-2 gap-3 transition-opacity duration-200 md:grid-cols-4 ${refreshing ? 'opacity-50' : ''}`}
              >
                {kpiCards.map((metric) => (
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
                className={`card-glass rounded-xl p-4 transition-opacity duration-200 ${refreshing ? 'opacity-50' : ''}`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <p className="typo-caption text-muted-foreground">{chartLabel}</p>
                  <span className="typo-caption text-muted-foreground">
                    {chartData.length} data point{chartData.length === 1 ? '' : 's'}
                  </span>
                </div>
                <SimpleLineChart data={chartData} height={140} />
              </div>

              {emptyPostsBanner}

              {postRows.length > 0 && (
                <div className="card-glass overflow-x-auto rounded-xl p-0">
                  <div className="min-w-[900px]">
                    <div className="border-border grid grid-cols-[2.2fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr] items-center border-b px-3 py-2">
                      <p className="typo-caption text-muted-foreground">Post</p>
                      <p className="typo-caption text-muted-foreground text-center">Type</p>
                      <p className="typo-caption text-muted-foreground text-center">Reach</p>
                      <p className="typo-caption text-muted-foreground text-center">Likes</p>
                      <p className="typo-caption text-muted-foreground text-center">Comments</p>
                      <p className="typo-caption text-muted-foreground text-center">Shares</p>
                      <p className="typo-caption text-muted-foreground text-center">Saves</p>
                      <p className="typo-caption text-muted-foreground text-center">Engagement</p>
                    </div>
                    {sortedPosts.map((post) => (
                      <div
                        key={post.social_post_id}
                        className="border-border hover:bg-hover-subtle grid grid-cols-[2.2fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr] items-center border-b px-3 py-2"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          {post.image_url ? (
                            <img
                              src={post.image_url}
                              alt=""
                              className="border-border size-10 shrink-0 rounded border object-cover"
                            />
                          ) : (
                            <div className="border-border bg-muted/30 flex size-10 shrink-0 items-center justify-center rounded border">
                              {platform === 'instagram' ? (
                                <Instagram className="icon-xs text-muted-foreground" />
                              ) : platform === 'linkedin' ? (
                                <Linkedin className="icon-xs text-muted-foreground" />
                              ) : platform === 'facebook' ? (
                                <Facebook className="icon-xs text-muted-foreground" />
                              ) : (
                                <Youtube className="icon-xs text-muted-foreground" />
                              )}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="body-3 text-foreground truncate font-medium">
                              {post.headline?.trim() ||
                                post.caption?.slice(0, 60) ||
                                'Untitled post'}
                            </p>
                            {post.published_at && (
                              <p className="typo-caption text-muted-foreground">
                                {new Date(post.published_at).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                        <p className="typo-caption text-muted-foreground text-center">
                          {post.post_type ?? '-'}
                        </p>
                        <p className="body-3 text-muted-foreground text-center">
                          {post.reach.toLocaleString()}
                        </p>
                        <p className="body-3 text-muted-foreground text-center">
                          {post.likes.toLocaleString()}
                        </p>
                        <p className="body-3 text-muted-foreground text-center">
                          {post.comments.toLocaleString()}
                        </p>
                        <p className="body-3 text-muted-foreground text-center">
                          {post.shares.toLocaleString()}
                        </p>
                        <p className="body-3 text-muted-foreground text-center">
                          {post.saves.toLocaleString()}
                        </p>
                        <p className="body-3 text-muted-foreground text-center">
                          {post.engagement_rate.toFixed(2)}%
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
