'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Brain,
  ChevronDown,
  ChevronRight,
  CloudDownload,
  ExternalLink,
  Pencil,
  Play,
  RefreshCw,
  Rocket,
} from 'lucide-react'
import { toast } from 'sonner'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import type { ReportingToolbarApi } from '@/features/spaces/components/reporting/shared/reporting-toolbar.types'
import type { ReportingTimeRange } from '@/features/spaces/types/space-schema'
import { STUDIO_INLINE_ERRORS } from '@/features/studio/config/studio-inline-errors.config'
import {
  fetchMetaAdsInsights,
  setMetaRowStatus,
  updateMetaAdSetBudget,
  updateMetaCampaignBudget,
  type AdsInsightsLevel,
  type MetaAdsInsightsResponse,
  type MetaAdsInsightsRow,
} from '../../services/analytics.service'
import {
  fetchMetaAdAccounts,
  getMetaConnectionStatus,
  syncMetaAdAccount,
} from '../../services/artifact-preview.service'
import { fetchCampaign } from '../../services/campaign.service'
import { AdAnalysisPanel } from './AdAnalysisPanel'
import { buildAdsManagerUrl } from './meta-ads-analysis'
import { MetaPublishModal } from './MetaPublishModal'

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

interface AdsPerformanceViewProps {
  campaignId: string
  campaignName?: string | null
  /** When true, root has no card-glass (e.g. embedded in Spaces reporting). */
  embedded?: boolean
  externalTimeRange?: ReportingTimeRange
  onExternalTimeRangeChange?: (value: ReportingTimeRange) => void
  onRegisterReportingToolbar?: (api: ReportingToolbarApi | null) => void
  /** When set, only these ROAS ad campaign row IDs appear at the top level; undefined = all. */
  adCampaignRowIdsFilter?: string[] | undefined
}

type AdsSortKey = 'spend' | 'impressions' | 'clicks' | 'ctr' | 'cpc' | 'cpm' | 'results' | 'roas'

function formatBudgetDollars(cents: number | null): string {
  if (!cents || cents <= 0) return ''
  const dollars = cents / 100
  return Number.isInteger(dollars) ? String(dollars) : dollars.toFixed(2).replace(/\.00$/, '')
}

function formatBudgetCell(cents: number | null): string {
  if (!cents || cents <= 0) return '-'
  const dollars = cents / 100
  const text = Number.isInteger(dollars) ? String(dollars) : dollars.toFixed(2).replace(/\.00$/, '')
  return `$${text}/day`
}

function statusBadgeClass(status: string): string {
  if (status === 'ACTIVE') return 'bg-green-500/15 text-green-400'
  if (status === 'PAUSED') return 'bg-amber-500/15 text-amber-400'
  if (status === 'DELETED' || status === 'ARCHIVED') return 'bg-red-500/15 text-destructive'
  if (status === 'UNPUBLISHED') return 'bg-secondary text-muted-foreground'
  return 'bg-secondary text-muted-foreground'
}

function isUnpublished(row: MetaAdsInsightsRow): boolean {
  const status = (row.meta_effective_status ?? '').trim().toUpperCase()
  return !row.meta_id || !row.meta_effective_status || status === '' || status === 'UNKNOWN'
}

export function AdsPerformanceView({
  campaignId,
  campaignName,
  embedded = false,
  externalTimeRange,
  onExternalTimeRangeChange,
  onRegisterReportingToolbar,
  adCampaignRowIdsFilter,
}: AdsPerformanceViewProps) {
  const [adsInsights, setAdsInsights] = useState<MetaAdsInsightsResponse | null>(null)
  const [adsLoading, setAdsLoading] = useState(false)
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
  const [expandedCampaignIds, setExpandedCampaignIds] = useState<Set<string>>(new Set())
  const [expandedAdSetIds, setExpandedAdSetIds] = useState<Set<string>>(new Set())
  const [adSetsByCampaignId, setAdSetsByCampaignId] = useState<
    Record<string, MetaAdsInsightsRow[]>
  >({})
  const [adsByAdSetId, setAdsByAdSetId] = useState<Record<string, MetaAdsInsightsRow[]>>({})
  const [loadingAdSets, setLoadingAdSets] = useState<Set<string>>(new Set())
  const [loadingAds, setLoadingAds] = useState<Set<string>>(new Set())
  const [budgetEditId, setBudgetEditId] = useState<string | null>(null)
  const [budgetEditLevel, setBudgetEditLevel] = useState<AdsInsightsLevel>('campaign')
  const [budgetEditField, setBudgetEditField] = useState<'daily_budget' | 'lifetime_budget'>(
    'daily_budget',
  )
  const [budgetDraft, setBudgetDraft] = useState('')
  const [budgetSavingId, setBudgetSavingId] = useState<string | null>(null)
  const [statusSavingId, setStatusSavingId] = useState<string | null>(null)
  const [adsSortKey, setAdsSortKey] = useState<AdsSortKey>('spend')
  const [adsSortDir, setAdsSortDir] = useState<'asc' | 'desc'>('desc')
  const timeRangeBtnRef = useRef<HTMLButtonElement>(null)
  const [timeRangePos, setTimeRangePos] = useState({ top: 0, left: 0 })
  const [publishModalOpen, setPublishModalOpen] = useState(false)
  const [publishModalContext, setPublishModalContext] = useState<{
    adId?: string
    adCampaignId?: string
  } | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [analysisOpen, setAnalysisOpen] = useState(false)
  const [metaConnected, setMetaConnected] = useState<boolean | null>(null)
  const [metaAdAccountId, setMetaAdAccountId] = useState<string | null>(null)
  const [hasSyncedData, setHasSyncedData] = useState(false)

  const resolveAdAccountId = useCallback(async (): Promise<string | null> => {
    const campaign = await fetchCampaign(campaignId)
    const config = campaign.config as Record<string, unknown> | undefined

    const defaults = config?.meta_defaults as { meta_ad_account_id?: string | null } | undefined
    if (defaults?.meta_ad_account_id) return defaults.meta_ad_account_id

    const profiles = (config?.meta_asset_profiles ?? []) as Array<{
      ad_account_id: string | null
    }>
    const profileAccountId = profiles[0]?.ad_account_id
    if (profileAccountId) return profileAccountId

    try {
      const accounts = await fetchMetaAdAccounts()
      return accounts[0]?.id ?? null
    } catch {
      return null
    }
  }, [campaignId])

  const handleSyncMetaAds = useCallback(async () => {
    setSyncing(true)
    try {
      const adAccountId = await resolveAdAccountId()

      if (!adAccountId) {
        toast.error('No Meta ad account found. Connect an ad account in Settings first.')
        return
      }

      setMetaAdAccountId(adAccountId)

      const result = await syncMetaAdAccount(adAccountId, campaignId)
      const created = result.campaigns_created + result.ad_sets_created + result.ads_created
      const updated = result.campaigns_updated + result.ad_sets_updated + result.ads_updated

      if (created === 0 && updated === 0) {
        toast.info('Everything is already in sync.')
      } else {
        toast.success(
          `Synced from Meta: ${created} new, ${updated} updated ` +
            `(${result.total_campaigns} campaigns, ${result.total_ad_sets} ad sets, ${result.total_ads} ads)`,
        )
      }

      setHasSyncedData(true)
      void loadAdsInsights()
    } catch (err) {
      console.error('[AdsPerformance] Meta sync failed:', err)
      toast.error('Failed to sync ads from Meta. Check your connection and try again.')
    } finally {
      setSyncing(false)
    }
  }, [campaignId, resolveAdAccountId])

  useLayoutEffect(() => {
    if (!timeRangeOpen || !timeRangeBtnRef.current) return
    const rect = timeRangeBtnRef.current.getBoundingClientRect()
    setTimeRangePos({ top: rect.bottom + 4, left: rect.left })
  }, [timeRangeOpen])

  const loadAdsInsights = useCallback(async () => {
    setAdsLoading(true)
    try {
      const startDate = getStartDate(timeRange)
      const data = await fetchMetaAdsInsights({
        campaignId,
        level: 'campaign',
        startDate,
      })
      setAdsInsights(data)
      setAdSetsByCampaignId({})
      setAdsByAdSetId({})
      setExpandedCampaignIds(new Set())
      setExpandedAdSetIds(new Set())
    } catch (err) {
      console.error('[AdsPerformance] Failed to load meta insights:', err)
      toast.error(STUDIO_INLINE_ERRORS.LOAD_META_INSIGHTS)
      setAdsInsights(null)
    } finally {
      setAdsLoading(false)
    }
  }, [campaignId, timeRange])

  const loadAdSets = useCallback(
    async (adCampaignId: string) => {
      setLoadingAdSets((prev) => new Set(prev).add(adCampaignId))
      try {
        const startDate = getStartDate(timeRange)
        const data = await fetchMetaAdsInsights({
          campaignId,
          level: 'adset',
          adCampaignId,
          startDate,
        })
        setAdSetsByCampaignId((prev) => ({ ...prev, [adCampaignId]: data.rows }))
      } catch (err) {
        console.error('[AdsPerformance] Failed to load ad sets:', err)
        toast.error(STUDIO_INLINE_ERRORS.LOAD_META_INSIGHTS)
      } finally {
        setLoadingAdSets((prev) => {
          const next = new Set(prev)
          next.delete(adCampaignId)
          return next
        })
      }
    },
    [campaignId, timeRange],
  )

  const loadAds = useCallback(
    async (adSetId: string, adCampaignId: string) => {
      setLoadingAds((prev) => new Set(prev).add(adSetId))
      try {
        const startDate = getStartDate(timeRange)
        const data = await fetchMetaAdsInsights({
          campaignId,
          level: 'ad',
          adCampaignId,
          adSetId,
          startDate,
        })
        setAdsByAdSetId((prev) => ({ ...prev, [adSetId]: data.rows }))
      } catch (err) {
        console.error('[AdsPerformance] Failed to load ads:', err)
        toast.error(STUDIO_INLINE_ERRORS.LOAD_META_INSIGHTS)
      } finally {
        setLoadingAds((prev) => {
          const next = new Set(prev)
          next.delete(adSetId)
          return next
        })
      }
    },
    [campaignId, timeRange],
  )

  const toggleCampaign = useCallback(
    (id: string) => {
      setExpandedCampaignIds((prev) => {
        const next = new Set(prev)
        if (next.has(id)) {
          next.delete(id)
          return next
        }
        next.add(id)
        if (!adSetsByCampaignId[id]) void loadAdSets(id)
        return next
      })
    },
    [adSetsByCampaignId, loadAdSets],
  )

  const toggleAdSet = useCallback(
    (id: string, parentCampaignId: string) => {
      setExpandedAdSetIds((prev) => {
        const next = new Set(prev)
        if (next.has(id)) {
          next.delete(id)
          return next
        }
        next.add(id)
        if (!adsByAdSetId[id]) void loadAds(id, parentCampaignId)
        return next
      })
    },
    [adsByAdSetId, loadAds],
  )

  useEffect(() => {
    void loadAdsInsights()
  }, [loadAdsInsights])

  useEffect(() => {
    if (!onRegisterReportingToolbar) return
    onRegisterReportingToolbar({
      refresh: () => {
        void loadAdsInsights()
      },
      refreshing: adsLoading,
      metaAdsConnected: metaConnected,
    })
    return () => onRegisterReportingToolbar(null)
  }, [onRegisterReportingToolbar, loadAdsInsights, adsLoading, metaConnected])

  useEffect(() => {
    let cancelled = false
    void Promise.all([getMetaConnectionStatus(), resolveAdAccountId()])
      .then(([status, adAccountId]) => {
        if (cancelled) return
        setMetaConnected(status.connected)
        setMetaAdAccountId(adAccountId)
      })
      .catch(() => {
        if (!cancelled) setMetaConnected(false)
      })
    return () => {
      cancelled = true
    }
  }, [resolveAdAccountId])

  useEffect(() => {
    if (adsInsights && adsInsights.rows.length > 0 && adsInsights.summary.impressions > 0) {
      setHasSyncedData(true)
    }
  }, [adsInsights])

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

  const sortedAdsRows = useMemo(() => {
    return [...(adsInsights?.rows ?? [])].sort((a, b) => {
      const dir = adsSortDir === 'asc' ? 1 : -1
      const va = Number((a as unknown as Record<string, unknown>)[adsSortKey] ?? 0)
      const vb = Number((b as unknown as Record<string, unknown>)[adsSortKey] ?? 0)
      return (va - vb) * dir
    })
  }, [adsInsights?.rows, adsSortDir, adsSortKey])

  const topCampaignRows = useMemo(() => {
    const campaigns = sortedAdsRows.filter((r) => r.level === 'campaign')
    if (adCampaignRowIdsFilter === undefined) return campaigns
    const allow = new Set(adCampaignRowIdsFilter)
    return campaigns.filter((r) => allow.has(r.id))
  }, [sortedAdsRows, adCampaignRowIdsFilter])

  const toggleSort = (key: AdsSortKey) => {
    if (adsSortKey === key) {
      setAdsSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }
    setAdsSortKey(key)
    setAdsSortDir('desc')
  }

  const startBudgetEdit = (row: MetaAdsInsightsRow, field: 'daily_budget' | 'lifetime_budget') => {
    const value = field === 'daily_budget' ? row.daily_budget : row.lifetime_budget
    setBudgetEditId(row.id)
    setBudgetEditLevel(row.level)
    setBudgetEditField(field)
    setBudgetDraft(formatBudgetDollars(value))
  }

  const saveBudget = async () => {
    if (!budgetEditId) return
    const parsed = Number(budgetDraft)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setBudgetEditId(null)
      setBudgetDraft('')
      return
    }
    const level = budgetEditLevel
    setBudgetSavingId(budgetEditId)
    try {
      if (level === 'campaign') {
        await updateMetaCampaignBudget(budgetEditId, {
          [budgetEditField]: Math.round(parsed * 100),
        })
      } else if (level === 'adset') {
        await updateMetaAdSetBudget(budgetEditId, {
          [budgetEditField]: Math.round(parsed * 100),
        })
      }
      await loadAdsInsights()
    } catch (err) {
      console.error('[AdsPerformance] Failed to save budget:', err)
      toast.error(STUDIO_INLINE_ERRORS.SAVE_BUDGET)
    } finally {
      setBudgetEditId(null)
      setBudgetDraft('')
      setBudgetSavingId(null)
    }
  }

  const toggleStatus = async (row: MetaAdsInsightsRow) => {
    const current = (row.meta_effective_status ?? '').toUpperCase()
    const next = current === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    setStatusSavingId(row.id)
    try {
      await setMetaRowStatus(row.level, row.id, next as 'ACTIVE' | 'PAUSED')
      await loadAdsInsights()
    } catch (err) {
      console.error('[AdsPerformance] Failed to update status:', err)
      toast.error(STUDIO_INLINE_ERRORS.UPDATE_STATUS)
    } finally {
      setStatusSavingId(null)
    }
  }

  const showSyncBanner = metaConnected === true && !hasSyncedData

  const rootClassName = embedded
    ? 'h-full min-h-[400px] w-full overflow-auto'
    : 'card-glass h-full min-h-[400px] w-full overflow-auto rounded-2xl p-4'

  return (
    <div className={rootClassName}>
      <div className="space-y-3">
        {metaConnected === false && !embedded && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
            <CloudDownload className="h-5 w-5 flex-shrink-0 text-amber-400" />
            <div className="flex-1">
              <p className="body-3 text-foreground font-medium">Connect your Meta account</p>
              <p className="typo-caption text-muted-foreground">
                Go to Settings → Integrations to connect Meta, then come back to sync your ads.
              </p>
            </div>
          </div>
        )}

        {showSyncBanner && (
          <div className="bg-green-500/8 flex items-center gap-3 rounded-xl border border-green-500/20 px-4 py-3">
            <CloudDownload className="h-5 w-5 flex-shrink-0 text-green-400" />
            <div className="flex-1">
              <p className="body-3 text-foreground font-medium">
                Pull in your current ads from Meta to manage and analyze
              </p>
              <p className="typo-caption text-muted-foreground">
                Sync your existing Meta campaigns, ad sets, and ads into ROAS for performance
                analysis and iteration.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleSyncMetaAds()}
              disabled={syncing}
              className="flex h-9 flex-shrink-0 items-center gap-2 rounded-lg bg-green-500/15 px-4 font-medium text-green-400 transition-colors hover:bg-green-500/25 disabled:opacity-60"
            >
              <CloudDownload className={`h-4 w-4 ${syncing ? 'animate-pulse' : ''}`} />
              <span className="body-3">{syncing ? 'Syncing...' : 'Sync'}</span>
            </button>
          </div>
        )}

        <div className="border-border flex items-center justify-between border-b pb-4">
          <div>
            <p className="body-2 text-foreground font-medium">
              {campaignName ?? 'Campaign'} — Meta performance
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
                      data-dropdown
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
          <div className="flex items-center gap-2">
            {hasSyncedData && (
              <button
                type="button"
                onClick={() => void handleSyncMetaAds()}
                disabled={syncing}
                className="chip-glass-neutral flex h-8 items-center gap-1 rounded-lg px-3"
              >
                <CloudDownload
                  className={`icon-xs text-muted-foreground ${syncing ? 'animate-pulse' : ''}`}
                />
                <span className="typo-caption text-muted-foreground">
                  {syncing ? 'Syncing...' : 'Sync'}
                </span>
              </button>
            )}
            {!timeRangeExternal ? (
              <button
                type="button"
                onClick={() => void loadAdsInsights()}
                disabled={adsLoading}
                className="chip-glass-neutral flex h-8 items-center gap-1 rounded-lg px-3"
              >
                <RefreshCw
                  className={`icon-xs text-muted-foreground ${adsLoading ? 'animate-spin' : ''}`}
                />
                <span className="typo-caption text-muted-foreground">Refresh</span>
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-[repeat(8,1fr)]">
          {[
            {
              label: 'Spend',
              value: adsInsights?.summary.spend ?? 0,
              format: (v: number) => `$${v.toFixed(2)}`,
            },
            {
              label: 'Impressions',
              value: adsInsights?.summary.impressions ?? 0,
              format: (v: number) => Math.round(v).toLocaleString(),
            },
            {
              label: 'Clicks',
              value: adsInsights?.summary.clicks ?? 0,
              format: (v: number) => Math.round(v).toLocaleString(),
            },
            {
              label: 'Results',
              value: adsInsights?.summary.results ?? 0,
              format: (v: number) => Math.round(v).toLocaleString(),
            },
            {
              label: 'CTR',
              value: adsInsights?.summary.ctr ?? 0,
              format: (v: number) => `${v.toFixed(2)}%`,
            },
            {
              label: 'Blended Purchase ROAS',
              value: adsInsights?.summary.roas ?? 0,
              format: (v: number) => `${v.toFixed(2)}x`,
            },
          ].map((metric) => (
            <div key={metric.label} className="card-glass rounded-xl p-4">
              <p className="typo-caption text-muted-foreground">{metric.label}</p>
              <p className="text-foreground text-xl font-semibold">
                <AnimatedMetricValue value={metric.value} format={metric.format} />
              </p>
            </div>
          ))}
        </div>

        {hasSyncedData && (
          <>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setAnalysisOpen((p) => !p)}
                className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-green-400 transition-colors hover:bg-green-500/10"
              >
                <Brain className="h-4 w-4" />
                <span className="body-3 font-medium">
                  {analysisOpen ? 'Hide AI Analysis' : 'Conduct AI Analysis'}
                </span>
                <ChevronDown
                  className={`icon-xs transition-transform ${analysisOpen ? 'rotate-180' : ''}`}
                />
              </button>
            </div>

            {analysisOpen && (
              <AdAnalysisPanel
                campaignId={campaignId}
                campaignName={campaignName}
                campaignRows={topCampaignRows}
                timeRangeLabel={TIME_RANGE_LABELS[timeRange]}
              />
            )}
          </>
        )}

        <div className="card-glass overflow-x-auto rounded-xl p-0">
          <div className="min-w-[1080px]">
            <div className="border-border grid grid-cols-[1fr_0.9fr_1fr_2.2fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1.8fr] items-center border-b px-3 py-2">
              <p className="typo-caption text-muted-foreground text-center">Actions</p>
              <p className="typo-caption text-muted-foreground text-center">Status</p>
              <p className="typo-caption text-muted-foreground text-center">Meta</p>
              <p className="typo-caption text-muted-foreground">Name</p>
              {(
                [
                  ['spend', 'Spend'],
                  ['impressions', 'Impressions'],
                  ['clicks', 'Clicks'],
                  ['ctr', 'CTR'],
                  ['cpc', 'CPC'],
                  ['cpm', 'CPM'],
                  ['results', 'Results'],
                  ['roas', 'Purchase ROAS'],
                ] as Array<[AdsSortKey, string]>
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleSort(key)}
                  className="typo-caption text-muted-foreground text-center"
                >
                  {label}
                </button>
              ))}
              <p className="typo-caption text-muted-foreground text-center">Budget</p>
            </div>
            {adsLoading ? (
              <div className="p-6">
                <VibeyLoadingOrb size="sm" text="Loading Meta data..." />
              </div>
            ) : topCampaignRows.length === 0 ? (
              <div className="p-6">
                <p className="body-3 text-muted-foreground">No rows found for this level.</p>
              </div>
            ) : (
              (() => {
                const renderRow = (
                  row: MetaAdsInsightsRow,
                  opts: {
                    indent?: string
                    hasChildren: boolean
                    isExpanded: boolean
                    onToggle?: () => void
                    publishCampaignId?: string
                  },
                ) => (
                  <div
                    key={row.id}
                    className="border-border hover:bg-hover-subtle grid grid-cols-[1fr_0.9fr_1fr_2.2fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1.8fr] items-center border-b px-3 py-2"
                  >
                    <div className="flex items-center justify-center gap-1">
                      {isUnpublished(row) ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (row.level === 'campaign') {
                              setPublishModalContext({ adCampaignId: row.id })
                            } else {
                              setPublishModalContext({
                                adCampaignId: opts.publishCampaignId,
                                ...(row.level === 'ad' ? { adId: row.id } : {}),
                              })
                            }
                            setPublishModalOpen(true)
                          }}
                          className="chip-glass-neutral inline-flex h-7 items-center justify-center gap-1 rounded px-2 text-green-400 hover:bg-green-500/10"
                        >
                          <Rocket className="icon-xs" />
                          <span className="typo-caption">Publish</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggleStatus(row)}
                          disabled={statusSavingId === row.id}
                          className="chip-glass-neutral inline-flex h-7 items-center justify-center gap-1 rounded px-2"
                          title={
                            (row.meta_effective_status ?? '').toUpperCase() === 'ACTIVE'
                              ? 'Pause'
                              : 'Turn on'
                          }
                        >
                          {(row.meta_effective_status ?? '').toUpperCase() === 'ACTIVE' ? (
                            <span className="typo-caption text-muted-foreground">Pause</span>
                          ) : (
                            <>
                              <Play className="icon-xs text-muted-foreground" />
                              <span className="typo-caption text-muted-foreground">Turn on</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    <div className="flex items-center justify-center">
                      {!isUnpublished(row) ? (
                        <span
                          className={`typo-caption h-7 rounded px-2 ${statusBadgeClass((row.meta_effective_status ?? '').toUpperCase())}`}
                        >
                          {(row.meta_effective_status ?? '').toUpperCase()}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex justify-center">
                      {row.meta_id ? (
                        <a
                          href={buildAdsManagerUrl(row, metaAdAccountId)}
                          target="_blank"
                          rel="noreferrer"
                          className="chip-glass-neutral inline-flex h-7 items-center justify-center gap-1 rounded px-2"
                        >
                          <ExternalLink className="icon-xs text-muted-foreground" />
                          <span className="typo-caption text-muted-foreground">Open</span>
                        </a>
                      ) : null}
                    </div>
                    <div
                      className={`body-3 text-foreground flex min-w-0 items-center gap-1 truncate text-left font-medium ${opts.indent ?? ''}`}
                    >
                      {opts.hasChildren ? (
                        <button
                          type="button"
                          onClick={opts.onToggle}
                          className="text-muted-foreground hover:text-foreground shrink-0"
                        >
                          {opts.isExpanded ? (
                            <ChevronDown className="icon-xs" />
                          ) : (
                            <ChevronRight className="icon-xs" />
                          )}
                        </button>
                      ) : opts.indent ? (
                        <span className="w-4 shrink-0" />
                      ) : null}
                      <span className="min-w-0 truncate">{row.name}</span>
                    </div>
                    <p className="body-3 text-muted-foreground text-center">
                      ${row.spend.toFixed(2)}
                    </p>
                    <p className="body-3 text-muted-foreground text-center">
                      {row.impressions.toLocaleString()}
                    </p>
                    <p className="body-3 text-muted-foreground text-center">
                      {row.clicks.toLocaleString()}
                    </p>
                    <p className="body-3 text-muted-foreground text-center">
                      {row.ctr.toFixed(2)}%
                    </p>
                    <p className="body-3 text-muted-foreground text-center">
                      ${row.cpc.toFixed(2)}
                    </p>
                    <p className="body-3 text-muted-foreground text-center">
                      ${row.cpm.toFixed(2)}
                    </p>
                    <p className="body-3 text-muted-foreground text-center">
                      {row.results.toLocaleString()}
                    </p>
                    <p className="body-3 text-muted-foreground text-center">
                      {row.result_type === 'registration' || row.result_type === 'lead'
                        ? '-'
                        : `${row.roas.toFixed(2)}x`}
                    </p>
                    <div className="group/budget-cell flex items-center justify-center gap-1">
                      {row.level !== 'ad' && budgetEditId === row.id ? (
                        <input
                          type="number"
                          inputMode="decimal"
                          autoFocus
                          value={budgetDraft}
                          onChange={(e) => setBudgetDraft(e.target.value)}
                          onBlur={() => void saveBudget()}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              setBudgetEditId(null)
                              setBudgetDraft('')
                            } else if (e.key === 'Enter') {
                              ;(e.currentTarget as HTMLInputElement).blur()
                            }
                          }}
                          className="body-3 border-border text-muted-foreground h-6 w-16 border-b bg-transparent px-0.5 outline-none"
                        />
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              if (row.level !== 'ad') startBudgetEdit(row, 'daily_budget')
                            }}
                            className="body-3 text-muted-foreground text-left"
                          >
                            {formatBudgetCell(row.daily_budget)}
                          </button>
                          {row.level !== 'ad' && (
                            <button
                              type="button"
                              onClick={() => startBudgetEdit(row, 'daily_budget')}
                              disabled={budgetSavingId === row.id}
                              className="h-5 w-5 opacity-0 transition-opacity group-hover/budget-cell:opacity-100"
                            >
                              <Pencil className="icon-xs text-muted-foreground" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )

                return topCampaignRows.map((campaign) => {
                  const campaignExpanded = expandedCampaignIds.has(campaign.id)
                  const adSets = adSetsByCampaignId[campaign.id]
                  const adSetsLoading = loadingAdSets.has(campaign.id)
                  return (
                    <div key={campaign.id}>
                      {renderRow(campaign, {
                        hasChildren: true,
                        isExpanded: campaignExpanded,
                        onToggle: () => toggleCampaign(campaign.id),
                        publishCampaignId: campaign.id,
                      })}
                      {campaignExpanded && (
                        <>
                          {adSetsLoading ? (
                            <div className="border-border grid grid-cols-[1fr_0.9fr_1fr_2.2fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1.8fr] items-center border-b px-3 py-4 pl-10">
                              <div className="flex items-center gap-2">
                                <VibeyLoadingOrb size="sm" text="Loading ad sets..." />
                              </div>
                            </div>
                          ) : (
                            (adSets ?? []).map((adSet) => {
                              const adSetExpanded = expandedAdSetIds.has(adSet.id)
                              const ads = adsByAdSetId[adSet.id]
                              const adsLoading = loadingAds.has(adSet.id)
                              const parentCampaignId = adSet.parent_id ?? campaign.id
                              return (
                                <div key={adSet.id}>
                                  {renderRow(adSet, {
                                    indent: 'pl-8',
                                    hasChildren: true,
                                    isExpanded: adSetExpanded,
                                    onToggle: () => toggleAdSet(adSet.id, parentCampaignId),
                                    publishCampaignId: campaign.id,
                                  })}
                                  {adSetExpanded && (
                                    <>
                                      {adsLoading ? (
                                        <div className="border-border grid grid-cols-[1fr_0.9fr_1fr_2.2fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1.8fr] items-center border-b px-3 py-4 pl-14">
                                          <div className="flex items-center gap-2">
                                            <VibeyLoadingOrb size="sm" text="Loading ads..." />
                                          </div>
                                        </div>
                                      ) : (
                                        (ads ?? []).map((ad) =>
                                          renderRow(ad, {
                                            indent: 'pl-12',
                                            hasChildren: false,
                                            isExpanded: false,
                                            publishCampaignId: campaign.id,
                                          }),
                                        )
                                      )}
                                    </>
                                  )}
                                </div>
                              )
                            })
                          )}
                        </>
                      )}
                    </div>
                  )
                })
              })()
            )}
          </div>
        </div>
      </div>
      <MetaPublishModal
        open={publishModalOpen}
        adId={publishModalContext?.adId}
        adCampaignId={publishModalContext?.adCampaignId ?? undefined}
        platformCampaignId={publishModalContext?.adCampaignId ?? undefined}
        onClose={() => {
          setPublishModalOpen(false)
          setPublishModalContext(null)
        }}
        onPublished={() => {
          setPublishModalOpen(false)
          setPublishModalContext(null)
          void loadAdsInsights()
        }}
      />
    </div>
  )
}
