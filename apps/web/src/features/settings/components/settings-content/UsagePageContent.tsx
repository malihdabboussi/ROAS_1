'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Brain,
  Coins,
  FileText,
  History,
  Image,
  MessageSquare,
  Mic,
  Palette,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { FormSelectDropdown } from '@/app/(dashboard)/campaigns/[id]/finance/components/FormSelectDropdown'
import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/navigation/tabs'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { billingApi } from '@/features/settings/services/billing-api'
import type {
  AgentSpendingResponse,
  BillingStatusResponse,
  CreditHistoryItem,
  UsageAnalyticsResponse,
} from '@/features/settings/types/billing.types'
import { formatBrainUsageTitle } from '@/features/settings/utils/brain-usage-labels'

// ============================================================================
// Range + formatting
// ============================================================================

type RangePreset = '7d' | '30d' | '60d' | 'custom'

const USAGE_RANGE_PRESET_OPTIONS: Array<{ value: RangePreset; label: string }> = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '60d', label: 'Last 60 days' },
  { value: 'custom', label: 'Custom' },
]

function getAnalyticsRangeIso(
  preset: RangePreset,
  customStart: string,
  customEnd: string,
): { startDate: string; endDate: string } | null {
  if (preset === 'custom') {
    if (!customStart?.trim() || !customEnd?.trim()) return null
    return {
      startDate: `${customStart}T00:00:00.000Z`,
      endDate: `${customEnd}T23:59:59.999Z`,
    }
  }
  const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 60
  const end = new Date()
  const endUtc = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate(), 23, 59, 59, 999),
  )
  const startUtc = new Date(endUtc)
  startUtc.setUTCDate(startUtc.getUTCDate() - (days - 1))
  startUtc.setUTCHours(0, 0, 0, 0)
  return { startDate: startUtc.toISOString(), endDate: endUtc.toISOString() }
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-US')
}

function formatFeatureLabel(feature: string): string {
  if (!feature) return 'Other'
  if (feature.toLowerCase() === 'scrapecreators') return 'Social Analysis'
  return feature.charAt(0).toUpperCase() + feature.slice(1).replace(/_/g, ' ')
}

function humanizeUsageSlug(slug: string): string {
  const s = slug.replace(/^scrapecreators\//i, '').trim()
  if (!s) return ''
  return s
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

function formatActivityTitle(item: CreditHistoryItem): string {
  if (item.feature?.toLowerCase() === 'scrapecreators') {
    const detail = humanizeUsageSlug(item.action?.trim() || item.model || '')
    return detail ? `Social Analysis · ${detail}` : 'Social Analysis'
  }
  if (item.feature?.toLowerCase() === 'brain') {
    return formatBrainUsageTitle(item.action)
  }
  return item.action
}

function activitySubtitle(item: CreditHistoryItem): string | null {
  const parts = [item.agentName, item.conversationTitle, item.campaignName].filter(Boolean)
  if (parts.length) return parts.join(' · ')
  if (item.feature?.toLowerCase() === 'scrapecreators') return null
  return item.model
}

function formatChartTick(dateStr: string): string {
  if (!dateStr || dateStr.length < 10) return dateStr
  return dateStr.slice(5)
}

function getFeatureIcon(feature: string) {
  const color = getFeatureIconColor(feature)
  switch (feature?.toLowerCase()) {
    case 'chat':
    case 'orchestrator':
      return <MessageSquare className={`h-4 w-4 ${color}`} />
    case 'image':
    case 'media':
      return <Image className={`h-4 w-4 ${color}`} />
    case 'funnel':
    case 'page':
      return <FileText className={`h-4 w-4 ${color}`} />
    case 'offer':
    case 'lead_magnet':
      return <Sparkles className={`h-4 w-4 ${color}`} />
    case 'mission':
      return <Zap className={`h-4 w-4 ${color}`} />
    case 'transcribe':
      return <Mic className={`h-4 w-4 ${color}`} />
    case 'brain':
      return <Brain className={`h-4 w-4 ${color}`} />
    case 'themes':
      return <Palette className={`h-4 w-4 ${color}`} />
    case 'ads':
      return <Sparkles className={`h-4 w-4 ${color}`} />
    default:
      return <Zap className={`h-4 w-4 ${color}`} />
  }
}

function getFeatureIconColor(feature: string): string {
  switch (feature?.toLowerCase()) {
    case 'chat':
    case 'orchestrator':
      return 'text-blue-500'
    case 'image':
    case 'media':
      return 'text-purple-500'
    case 'funnel':
    case 'page':
      return 'text-green-500'
    case 'offer':
    case 'lead_magnet':
      return 'text-amber-500'
    case 'mission':
      return 'text-orange-500'
    case 'transcribe':
      return 'text-cyan-500'
    case 'brain':
      return 'text-violet-500'
    case 'themes':
      return 'text-pink-500'
    default:
      return 'text-emerald-500'
  }
}

function formatRelativeTime(timestamp: string): string {
  const now = new Date()
  const date = new Date(timestamp)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

const usageSpendingChartConfig = {} satisfies ChartConfig

// A failed fetch must render as a failure, never as $0 / empty usage — those
// are data claims the user will act on.
function UsageLoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="gap-spacing-2 flex items-center justify-center">
      <span className="body-3 text-red-300">{message}</span>
      <button
        type="button"
        onClick={onRetry}
        className="body-3 text-foreground cursor-pointer font-medium underline"
      >
        Retry
      </button>
    </div>
  )
}

function UsageSpendingTooltip(props: {
  active?: boolean
  payload?: ReadonlyArray<{ value?: number }>
  label?: unknown
}) {
  const { active, payload, label } = props
  if (!active || !payload?.length) return null
  const raw = payload[0]?.value
  return (
    <div className="dropdown-menu-solid gap-spacing-1 z-dropdown rounded-spacing-2 p-spacing-2 body-3 text-foreground grid min-w-[8rem]">
      <p className="body-3 text-foreground font-medium">{String(label ?? '')}</p>
      <p className="body-3 text-muted-foreground tabular-nums">
        {formatNumber(Number(raw))} credits
      </p>
    </div>
  )
}

// ============================================================================
// Main
// ============================================================================

export default function UsagePageContent() {
  const [status, setStatus] = useState<BillingStatusResponse | null>(null)
  const [creditHistory, setCreditHistory] = useState<CreditHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [preset, setPreset] = useState<RangePreset>('30d')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [analytics, setAnalytics] = useState<UsageAnalyticsResponse | null>(null)
  const [agentSpending, setAgentSpending] = useState<AgentSpendingResponse | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [statusError, setStatusError] = useState(false)
  const [analyticsError, setAnalyticsError] = useState(false)
  const [loadMoreError, setLoadMoreError] = useState(false)
  const [analyticsRetryNonce, setAnalyticsRetryNonce] = useState(0)
  const retryAnalytics = () => setAnalyticsRetryNonce((n) => n + 1)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setStatusError(false)
      const [statusData, historyData] = await Promise.all([
        billingApi.getStatus(),
        billingApi.getCreditHistory({ limit: 20 }),
      ])
      setStatus(statusData)
      setCreditHistory(historyData.items)
      setHasMore(historyData.hasMore)
    } catch {
      setStatusError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const r = getAnalyticsRangeIso(preset, customStart, customEnd)
    if (!r) {
      setAnalytics(null)
      setAgentSpending(null)
      setAnalyticsError(false)
      return
    }
    let cancelled = false
    ;(async () => {
      setAnalyticsLoading(true)
      setAnalyticsError(false)
      try {
        const [usageResult, agentResult] = await Promise.allSettled([
          billingApi.getUsageAnalytics(r),
          billingApi.getAgentSpending(r),
        ])
        if (usageResult.status === 'rejected') {
          throw usageResult.reason
        }
        if (agentResult.status === 'rejected') {
          throw agentResult.reason
        }
        if (!cancelled) {
          setAnalytics(usageResult.value)
          setAgentSpending(agentResult.value)
        }
      } catch (err) {
        if (!cancelled) {
          setAnalytics(null)
          setAgentSpending(null)
          setAnalyticsError(true)
        }
      } finally {
        if (!cancelled) setAnalyticsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [preset, customStart, customEnd, analyticsRetryNonce])

  const loadMore = async () => {
    setHistoryLoading(true)
    setLoadMoreError(false)
    try {
      const res = await billingApi.getCreditHistory({ limit: 20, offset: creditHistory.length })
      setCreditHistory([...creditHistory, ...res.items])
      setHasMore(res.hasMore)
    } catch {
      setLoadMoreError(true)
    } finally {
      setHistoryLoading(false)
    }
  }

  const categoryTotalCredits = useMemo(() => {
    if (!analytics?.categoryBreakdown?.length) return 0
    return analytics.categoryBreakdown.reduce((s, c) => s + c.credits, 0)
  }, [analytics])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <VibeyLoadingOrb text="Loading Usage..." state="processing" size="sm" />
      </div>
    )
  }

  const balance = status?.balance
  const purchasedAvailable = balance
    ? Math.max(0, balance.purchasedCredits - balance.purchasedCreditsUsed)
    : 0
  const baseAvailable = balance ? Math.max(0, balance.baseCredits - balance.baseCreditsUsed) : 0
  const rolloverAvailable = balance?.rolloverCredits ?? 0
  const totalAvailable = balance?.totalAvailable ?? 0

  return (
    <div className="p-spacing-4 md:p-spacing-8">
      <div className="gap-spacing-6 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] md:items-stretch">
        <div className="section-card rounded-spacing-3 p-spacing-4 flex h-full min-h-0 flex-col">
          <div className="mb-spacing-3 gap-spacing-2 flex items-center">
            <div className="flex h-9 w-9 items-center justify-center">
              <Coins className="text-muted-foreground h-4 w-4" />
            </div>
            <div>
              <h2 className="body-2 text-foreground font-semibold">Credits</h2>
              <p className="typo-caption text-muted-foreground">Balance &amp; breakdown</p>
            </div>
          </div>

          {statusError && (
            <div className="rounded-spacing-2 bg-secondary/50 p-spacing-4 my-auto">
              <UsageLoadError
                message="Couldn't load your credits."
                onRetry={() => void loadData()}
              />
            </div>
          )}

          {balance && (
            <div className="space-y-spacing-2">
              <CreditSourceRow
                label="Monthly Allowance"
                remaining={baseAvailable}
                total={balance.baseCredits}
              />
              <CreditSourceRow
                label="Rollover Credits"
                remaining={rolloverAvailable}
                total={rolloverAvailable}
              />
              <CreditSourceRow
                label="Purchased Credits"
                remaining={purchasedAvailable}
                total={balance.purchasedCredits}
              />
              <div className="border-border mt-spacing-2 pt-spacing-2 border-t">
                <CreditSourceRow
                  label="Credits Remaining"
                  remaining={totalAvailable}
                  total={totalAvailable}
                  highlight
                />
              </div>
            </div>
          )}
        </div>

        <div className="section-card mt-spacing-6 rounded-spacing-3 p-spacing-4 flex h-full min-h-0 flex-col md:mt-0">
          <div className="mb-spacing-3 gap-spacing-2 flex shrink-0 flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="body-2 text-foreground font-semibold">Spending by day</h2>
              <p className="typo-caption text-muted-foreground">Credits used in range</p>
            </div>
            <div className="gap-spacing-2 flex flex-wrap items-center">
              <div className="min-w-max max-w-full shrink-0">
                <FormSelectDropdown
                  value={preset}
                  onChange={(v) => setPreset(v as RangePreset)}
                  options={USAGE_RANGE_PRESET_OPTIONS}
                  id="usage-spending-range-preset"
                />
              </div>
            </div>
          </div>

          {preset === 'custom' && (
            <div className="mb-spacing-3 gap-spacing-2 flex shrink-0 flex-wrap items-center">
              <label className="gap-spacing-1 flex items-center">
                <span className="typo-caption text-muted-foreground">Start</span>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="body-3 border-border bg-secondary rounded-spacing-2 px-spacing-2 py-spacing-1 text-foreground border"
                />
              </label>
              <label className="gap-spacing-1 flex items-center">
                <span className="typo-caption text-muted-foreground">End</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="body-3 border-border bg-secondary rounded-spacing-2 px-spacing-2 py-spacing-1 text-foreground border"
                />
              </label>
            </div>
          )}

          <div className="flex min-h-0 w-full flex-1 flex-col">
            {analyticsLoading ? (
              <div className="text-muted-foreground body-3 py-spacing-8 flex flex-1 items-center justify-center text-center">
                Loading chart…
              </div>
            ) : analyticsError ? (
              <div className="flex flex-1 items-center justify-center">
                <div className="rounded-spacing-2 bg-secondary/50 p-spacing-4 w-full text-center">
                  <UsageLoadError message="Couldn't load spend data." onRetry={retryAnalytics} />
                </div>
              </div>
            ) : analytics && analytics.dailySpending.length > 0 ? (
              <div className="text-primary max-md:h-spacing-48 min-h-0 w-full flex-1 max-md:flex-none">
                <ChartContainer
                  config={usageSpendingChartConfig}
                  className="[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground aspect-auto h-full min-h-0 w-full justify-center text-xs"
                >
                  <BarChart
                    data={analytics.dailySpending}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="usageDailyBarGlass" x1="0" y1="0" x2="1" y2="0">
                        <stop
                          offset="0%"
                          stopColor="rgb(var(--color-primary-rgb))"
                          stopOpacity={0.52}
                        />
                        <stop
                          offset="100%"
                          stopColor="rgb(var(--color-primary-rgb))"
                          stopOpacity={0.26}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tickFormatter={formatChartTick} tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} width={40} />
                    <ChartTooltip content={(p) => <UsageSpendingTooltip {...p} />} />
                    <Bar dataKey="credits" fill="url(#usageDailyBarGlass)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <div className="rounded-spacing-2 bg-secondary/50 p-spacing-4 w-full text-center">
                  <p className="body-3 text-muted-foreground">No usage in this range.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="section-card mt-spacing-6 rounded-spacing-3 p-spacing-6">
        <h2 className="body-1 text-foreground mb-spacing-1 font-semibold">Spending by category</h2>
        <p className="body-3 text-muted-foreground mb-spacing-4">
          Credits by feature in selected range
        </p>
        {analyticsLoading ? (
          <p className="body-3 text-muted-foreground">Loading…</p>
        ) : analyticsError ? (
          <div className="flex justify-start">
            <UsageLoadError message="Couldn't load spend data." onRetry={retryAnalytics} />
          </div>
        ) : analytics && analytics.categoryBreakdown.length > 0 ? (
          <div className="space-y-spacing-3">
            {analytics.categoryBreakdown.map((row) => {
              const pct =
                categoryTotalCredits > 0
                  ? Math.min(100, (row.credits / categoryTotalCredits) * 100)
                  : 0
              return (
                <div key={row.feature} className="space-y-spacing-1">
                  <div className="flex items-center justify-between">
                    <span className="body-2 text-foreground font-medium">
                      {formatFeatureLabel(row.feature)}
                    </span>
                    <span className="body-3 text-muted-foreground">
                      {formatNumber(row.credits)} · {formatNumber(row.count)} events
                    </span>
                  </div>
                  <div className="bar-glass-muted-light h-2 w-full overflow-hidden rounded-full">
                    <div
                      className="bar-glass-green h-full rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="body-3 text-muted-foreground">No category data for this range.</p>
        )}
      </div>

      <div className="mt-spacing-6">
        <Tabs defaultValue="activity" className="gap-spacing-4">
          <TabsList variant="liquid" className="w-full max-w-md">
            <TabsTrigger
              value="activity"
              className="gap-spacing-1 flex flex-1 items-center justify-center"
            >
              <History className="h-4 w-4" />
              Recent activity
            </TabsTrigger>
            <TabsTrigger
              value="agents"
              className="gap-spacing-1 flex flex-1 items-center justify-center"
            >
              <Users className="h-4 w-4" />
              Per agent
            </TabsTrigger>
          </TabsList>

          <TabsContent value="activity">
            <div className="section-card rounded-spacing-3 p-spacing-6">
              <div className="mb-spacing-4 gap-spacing-3 flex items-center">
                <div className="flex h-10 w-10 items-center justify-center">
                  <History className="text-muted-foreground h-5 w-5" />
                </div>
                <div className="gap-spacing-2 flex flex-1 items-center">
                  <div>
                    <h2 className="body-1 text-foreground font-semibold">Recent activity</h2>
                    <p className="body-3 text-muted-foreground">Credit consumption detail</p>
                  </div>
                  {status?.role === 'enterprise' && status?.creditDiscountPercent ? (
                    <span className="rounded-spacing-1 px-spacing-2 py-spacing-1 typo-caption bg-emerald-500/15 font-medium text-emerald-600 dark:text-emerald-400">
                      Enterprise · At cost
                    </span>
                  ) : null}
                </div>
              </div>

              {creditHistory.length === 0 ? (
                <div className="rounded-spacing-2 bg-secondary/50 p-spacing-4 text-center">
                  {statusError ? (
                    <UsageLoadError
                      message="Couldn't load your activity."
                      onRetry={() => void loadData()}
                    />
                  ) : (
                    <p className="body-2 text-muted-foreground">
                      No usage history yet. Your activity will appear here.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-spacing-1">
                  {creditHistory.map((item) => {
                    const subtitle = activitySubtitle(item)
                    return (
                      <div
                        key={item.id}
                        className="gap-spacing-3 rounded-spacing-2 p-spacing-3 flex items-center"
                      >
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full">
                          {item.agentImageUrl ? (
                            <img
                              src={item.agentImageUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            getFeatureIcon(item.feature)
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="body-2 text-foreground truncate font-medium">
                            {formatActivityTitle(item)}
                          </p>
                          {subtitle ? (
                            <p className="body-3 text-muted-foreground truncate">{subtitle}</p>
                          ) : null}
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="body-2 text-foreground font-medium">
                            -{formatNumber(item.credits)} credits
                          </p>
                          <p className="body-3 text-muted-foreground">
                            {formatRelativeTime(item.timestamp)}
                          </p>
                        </div>
                      </div>
                    )
                  })}

                  {hasMore && (
                    <div className="pt-spacing-3 text-center">
                      <button
                        type="button"
                        onClick={loadMore}
                        disabled={historyLoading}
                        className="body-2 rounded-spacing-2 bg-secondary px-spacing-4 py-spacing-2 text-foreground hover:bg-secondary/80 font-medium transition-colors disabled:opacity-50"
                      >
                        {historyLoading ? 'Loading...' : 'Load more'}
                      </button>
                      {loadMoreError && !historyLoading ? (
                        <p className="body-3 pt-spacing-2 text-red-300">
                          Couldn&apos;t load more activity. Try again.
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="agents">
            <div className="section-card rounded-spacing-3 p-spacing-6">
              <div className="mb-spacing-4 gap-spacing-3 flex items-center">
                <div className="flex h-10 w-10 items-center justify-center">
                  <Users className="text-muted-foreground h-5 w-5" />
                </div>
                <div>
                  <h2 className="body-1 text-foreground font-semibold">Per agent</h2>
                  <p className="body-3 text-muted-foreground">Spending in selected date range</p>
                </div>
              </div>
              {analyticsLoading ? (
                <p className="body-3 text-muted-foreground">Loading…</p>
              ) : analyticsError ? (
                <div className="flex justify-start">
                  <UsageLoadError message="Couldn't load spend data." onRetry={retryAnalytics} />
                </div>
              ) : agentSpending && agentSpending.agents.length > 0 ? (
                <div className="space-y-spacing-1">
                  {agentSpending.agents.map((a) => (
                    <div
                      key={`${a.agentKey}-${a.agentName}`}
                      className="gap-spacing-3 rounded-spacing-2 p-spacing-3 flex items-center"
                    >
                      <div className="bg-secondary flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full">
                        {a.imageUrl ? (
                          <img src={a.imageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-primary body-3 font-bold">
                            {(a.agentName?.charAt(0) || '?').toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="body-2 text-foreground font-medium">{a.agentName}</p>
                        <p className="body-3 text-muted-foreground">
                          {formatNumber(a.eventCount)} events · {a.agentKey}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="body-2 text-foreground font-medium">
                          {formatNumber(a.credits)} credits
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="body-3 text-muted-foreground">No agent-tied usage in this range.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function CreditSourceRow({
  label,
  remaining: remainingRaw,
  total,
  highlight,
}: {
  label: string
  remaining: number
  total: number
  highlight?: boolean
}) {
  const remaining = Math.max(0, remainingRaw)
  const pct = total > 0 ? Math.min(100, (remaining / total) * 100) : 0
  const ratio = total > 0 ? remaining / total : 0
  const barFill =
    ratio > 0.5 ? 'bar-glass-green' : ratio > 0.2 ? 'bar-glass-orange' : 'bar-glass-red'

  return (
    <div className="rounded-spacing-2 bg-secondary/50 p-spacing-3">
      <div className="mb-spacing-1 flex items-center justify-between">
        <span
          className={
            highlight
              ? 'body-3 text-foreground font-semibold'
              : 'typo-caption text-muted-foreground'
          }
        >
          {label}
        </span>
        <span
          className={
            highlight ? 'body-3 font-bold text-emerald-400' : 'body-3 text-foreground font-medium'
          }
        >
          {formatNumber(remaining)}{' '}
          <span className="text-muted-foreground font-normal">/ {formatNumber(total)}</span>
        </span>
      </div>
      {total > 0 && (
        <div className="bar-glass-muted-light h-1.5 w-full overflow-hidden rounded-full">
          <div
            className={`h-full rounded-full transition-all ${barFill}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  )
}
