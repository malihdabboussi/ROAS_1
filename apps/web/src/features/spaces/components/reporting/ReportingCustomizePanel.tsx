'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import type { LucideIcon as LucideIconType } from 'lucide-react'
import {
  Activity,
  ArrowLeft,
  Award,
  BarChart3,
  Bell,
  Calendar,
  Check,
  CheckCircle,
  ChevronRight,
  Clapperboard,
  DollarSign,
  Eye,
  Facebook,
  FileText,
  Filter,
  GitBranch,
  Globe,
  Heart,
  Image as ImageIcon,
  Instagram,
  Layers,
  LayoutDashboard,
  LineChart,
  Linkedin,
  Mail,
  MailOpen,
  MousePointerClick,
  OctagonAlert,
  Package,
  Percent,
  PieChart,
  Scale,
  Send,
  Share2,
  ShoppingBag,
  TrendingDown,
  Trophy,
  UserPlus,
  Users,
  Waypoints,
  X,
  XCircle,
  Youtube,
  Zap,
} from 'lucide-react'
import { ColorPickerPanelStandalone } from '@/components/ui/ColorPicker'
import { ListSkeleton } from '@/components/ui/feedback/ListSkeleton'
import Switch from '@/components/ui/forms/switch'
import { getIconColor, IconPicker, LucideIcon, type IconColorId } from '@/components/ui/IconPicker'
import {
  fetchCampaignSocialConnectionOptions,
  type SocialConnectionOption,
} from '@/features/studio/services/analytics.service'
import {
  fetchCampaignAssetSummary,
  type CampaignAssetSummary,
} from '@/features/studio/services/campaign.service'
import { cn } from '@/lib/utils/cn'
import {
  REPORTING_VIEW_TYPES,
  type ReportingViewConfig,
  type ReportingViewType,
  type ViewDef,
} from '../../types/space-schema'
import {
  ColorPickerPopover,
  initialTagPanelValueFromOption,
  MAX_CUSTOM_TAG_SWATCHES,
  positionTagFullPickerNextToPresets,
  presetToHex,
  readCustomSwatchesFromStorage,
  shouldSaveAsNewCustom,
  swatchVisualStyle,
  tagCustomSwatchesKey,
} from '../cells/field-color-presets-popover'
import { CustomizeViewManagementSection } from '../customize-view-management-section'
import { VIBEY_SPACE_FLOATING_CONTROL } from '@/lib/ui/floating-control-attrs'
import { REPORTING_DISPLAY_ITEMS_BY_TYPE } from './reporting-display-items'
import {
  REPORTING_DATE_RANGE_PRESETS,
  ViewDateRangeSubView,
} from './shared/view-date-range-subview'

const CHART_TYPE_OPTIONS: {
  value: NonNullable<ReportingViewConfig['chart_type']>
  label: string
}[] = [
  { value: 'area', label: 'Area' },
  { value: 'line', label: 'Line' },
  { value: 'bar', label: 'Bar' },
  { value: 'pie', label: 'Pie' },
]

type RepPage =
  | 'main'
  | 'dates'
  | 'display'
  | 'channels'
  | 'funnels'
  | 'sequences'
  | 'ads'
  | 'social_accounts'

const OVERVIEW_CHANNEL_OPTIONS: { id: 'funnels' | 'emails' | 'ads' | 'social'; label: string }[] = [
  { id: 'funnels', label: 'Funnels' },
  { id: 'emails', label: 'Emails' },
  { id: 'ads', label: 'Ads' },
  { id: 'social', label: 'Social' },
]

const OVERVIEW_CHANNEL_ROW_ICONS: Record<
  (typeof OVERVIEW_CHANNEL_OPTIONS)[number]['id'],
  LucideIconType
> = {
  funnels: Filter,
  emails: Mail,
  ads: Clapperboard,
  social: Share2,
}

/** Icons for Display / Cards rows (all reporting view types that use ReportingDisplaySubView). */
const REPORTING_DISPLAY_ROW_ICONS: Record<string, LucideIconType> = {
  kpi_leads: Users,
  kpi_conversion: Percent,
  kpi_email_open: MailOpen,
  kpi_social_engagement: Heart,
  kpi_reach: Globe,
  kpi_visitors: Eye,
  kpi_bounce_rate: XCircle,
  card_unified_trend: Activity,
  card_contribution: PieChart,
  card_alerts: Bell,
  card_revenue_summary: DollarSign,
  card_revenue_trend: LineChart,
  card_customer_journey: Waypoints,
  card_best_channel: Trophy,
  card_mission_status: LayoutDashboard,
  kpi_missions_active: Zap,
  kpi_mission_completion: CheckCircle,
  kpi_missions_blocked: OctagonAlert,
  kpi_follower_growth: UserPlus,
  card_best_post: ImageIcon,
  card_deliverables_by_type: Package,
  kpi_new_contacts: GitBranch,
  card_contacts_growth: BarChart3,
  card_sequence_performance: Send,
  card_best_email: Mail,
  card_top_products: ShoppingBag,
  card_top_funnels: Filter,
  card_contact_sources: PieChart,
  kpi_lead_customer: Percent,
  card_campaign_leaderboard: Award,
  card_funnel_dropoff: TrendingDown,
  card_roi_by_channel: Scale,
  visitors: Users,
  leads: UserPlus,
  conversion: Percent,
  page_views: FileText,
  chart_visitors: LineChart,
  chart_leads: LineChart,
  sent: Send,
  opens: MailOpen,
  clicks: MousePointerClick,
  open_rate: Percent,
  delivered: CheckCircle,
  bounced: XCircle,
  click_rate: Percent,
  chart_opens: LineChart,
  chart_clicks: LineChart,
}

const DISPLAY_ITEMS_BY_TYPE = REPORTING_DISPLAY_ITEMS_BY_TYPE

function getReportingConfig(view: ViewDef): ReportingViewConfig {
  return view.reporting_config ?? {}
}

function patchReporting(
  onViewPatch: (patch: Partial<ViewDef>) => void | Promise<void>,
  current: ReportingViewConfig,
  patch: Partial<ReportingViewConfig>,
) {
  void onViewPatch({ reporting_config: { ...current, ...patch } })
}

function toggleScopeSelection(
  allIds: string[],
  current: string[] | undefined,
  id: string,
  on: boolean,
): string[] | undefined {
  const full = new Set(allIds)
  const effective =
    current === undefined ? new Set(allIds) : new Set(current.filter((x) => full.has(x)))
  if (on) effective.add(id)
  else effective.delete(id)
  if (effective.size === allIds.length) return undefined
  if (effective.size === 0) return []
  return allIds.filter((x) => effective.has(x))
}

export function ReportingCustomizePanel({
  activeView,
  onViewPatch,
  onViewPinToStart,
  canDeleteView,
  onDeleteView,
  onClose,
  campaignId,
  isTeamSpace = false,
  canSaveForEveryone = false,
  hasViewOverride = false,
  onSaveForEveryone,
  onResetToDefault,
  onOpenSharingPermissions,
}: {
  activeView: ViewDef
  onViewPatch: (patch: Partial<ViewDef>) => Promise<void>
  onViewPinToStart: (pinned: boolean) => Promise<void>
  canDeleteView: boolean
  onDeleteView: () => Promise<void>
  onClose: () => void
  campaignId: string | null
  isTeamSpace?: boolean
  canSaveForEveryone?: boolean
  hasViewOverride?: boolean
  onSaveForEveryone?: () => Promise<void>
  onResetToDefault?: () => Promise<void>
  onOpenSharingPermissions?: () => void
}) {
  const [repPage, setRepPage] = useState<RepPage>('main')
  const [assets, setAssets] = useState<CampaignAssetSummary | null>(null)
  const [assetsLoading, setAssetsLoading] = useState(false)
  const [nameDraft, setNameDraft] = useState(activeView.name)
  const [socialConnOpts, setSocialConnOpts] = useState<{
    instagram: SocialConnectionOption[]
    linkedin: SocialConnectionOption[]
    facebook: SocialConnectionOption[]
    youtube: SocialConnectionOption[]
  } | null>(null)
  const [socialConnOptsLoading, setSocialConnOptsLoading] = useState(false)

  const viewType = activeView.type as ReportingViewType
  const config = getReportingConfig(activeView)
  const DEFAULT_VIEW_ICONS: Record<string, string> = {
    campaign_overview: 'layout-dashboard',
    social_reporting: 'share-2',
    funnel_analytics: 'filter',
    email_analytics: 'mail',
    ads_performance: 'clapperboard',
    finance_overview: 'circle-dollar-sign',
  }
  const viewIconName = activeView.icon ?? DEFAULT_VIEW_ICONS[activeView.type] ?? 'bar-chart-3'
  const viewIconColor = getIconColor(activeView.icon_color)

  useEffect(() => {
    setNameDraft(activeView.name)
  }, [activeView.name])

  useEffect(() => {
    setRepPage('main')
  }, [activeView.id])

  useEffect(() => {
    if (!campaignId || !REPORTING_VIEW_TYPES.has(activeView.type)) return
    setAssetsLoading(true)
    fetchCampaignAssetSummary(campaignId)
      .then(setAssets)
      .catch(() => setAssets(null))
      .finally(() => setAssetsLoading(false))
  }, [campaignId, activeView.type])

  const patchConfig = useCallback(
    (patch: Partial<ReportingViewConfig>) => {
      patchReporting(onViewPatch, config, patch)
    },
    [config, onViewPatch],
  )

  const isOverview = viewType === 'campaign_overview'
  const isSocial = viewType === 'social_reporting'
  const showFunnelsScope = viewType === 'funnel_analytics'
  const showSequencesScope = viewType === 'email_analytics'
  const showAdsScope = viewType === 'ads_performance'
  const displayItems = DISPLAY_ITEMS_BY_TYPE[viewType]

  useEffect(() => {
    if (!campaignId || !(isSocial || isOverview)) return
    setSocialConnOptsLoading(true)
    fetchCampaignSocialConnectionOptions(campaignId)
      .then(setSocialConnOpts)
      .catch(() => setSocialConnOpts({ instagram: [], linkedin: [], facebook: [], youtube: [] }))
      .finally(() => setSocialConnOptsLoading(false))
  }, [campaignId, isSocial, isOverview])

  const dateRangeSummary = useMemo(() => {
    if (config.custom_start || config.custom_end) {
      const fmt = (v: string | undefined) =>
        v
          ? new Date(v + 'T00:00:00').toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })
          : '—'
      return `${fmt(config.custom_start)} → ${fmt(config.custom_end)}`
    }
    return (
      REPORTING_DATE_RANGE_PRESETS.find((p) => p.key === (config.time_range ?? '30d'))?.label ??
      'Last 30 days'
    )
  }, [config.custom_start, config.custom_end, config.time_range])

  const displaySummary = useMemo(() => {
    if (!displayItems?.length) return 'Chart style'
    const ids = new Set(displayItems.map((i) => i.id))
    const on = config.visible_kpis?.length
      ? config.visible_kpis.filter((k) => ids.has(k))
      : displayItems.map((i) => i.id)
    return `${on.length}/${displayItems.length} visible`
  }, [config.visible_kpis, displayItems])

  const channelsSummary = useMemo(() => {
    const ch = config.overview_channels
    if (!ch || ch.length === 4) return 'All (4)'
    if (ch.length === 0) return 'None'
    return `${ch.length} of 4`
  }, [config.overview_channels])

  const funnelScopeSummary = useMemo(() => {
    if (!assets?.funnels?.length) return '—'
    const all = assets.funnels.map((f) => f.id)
    if (config.funnel_ids === undefined) return `All (${all.length})`
    if (config.funnel_ids.length === 0) return 'None'
    return `${config.funnel_ids.length} of ${all.length}`
  }, [assets?.funnels, config.funnel_ids])

  const sequenceScopeSummary = useMemo(() => {
    if (!assets?.sequences?.length) return '—'
    const all = assets.sequences.map((s) => s.id)
    if (config.sequence_ids === undefined) return `All (${all.length})`
    if (config.sequence_ids.length === 0) return 'None'
    return `${config.sequence_ids.length} of ${all.length}`
  }, [assets?.sequences, config.sequence_ids])

  const adsScopeSummary = useMemo(() => {
    if (!assets?.ads?.length) return '—'
    const all = assets.ads.map((a) => a.id)
    if (config.ad_campaign_ids === undefined) return `All (${all.length})`
    if (config.ad_campaign_ids.length === 0) return 'None'
    return `${config.ad_campaign_ids.length} of ${all.length}`
  }, [assets?.ads, config.ad_campaign_ids])

  const socialAccountsSummary = useMemo(() => {
    const labelFor = (opts: SocialConnectionOption[], id: string | null | undefined) =>
      id == null || id === '' ? 'Auto' : (opts.find((o) => o.id === id)?.label ?? 'Account')
    const igLab = labelFor(socialConnOpts?.instagram ?? [], config.social_instagram_connection_id)
    const liLab = labelFor(socialConnOpts?.linkedin ?? [], config.social_linkedin_connection_id)
    const fbLab = labelFor(socialConnOpts?.facebook ?? [], config.social_facebook_connection_id)
    const ytLab = labelFor(socialConnOpts?.youtube ?? [], config.social_youtube_connection_id)
    return `IG: ${igLab} · LI: ${liLab} · FB: ${fbLab} · YT: ${ytLab}`
  }, [
    socialConnOpts,
    config.social_instagram_connection_id,
    config.social_linkedin_connection_id,
    config.social_facebook_connection_id,
    config.social_youtube_connection_id,
  ])

  if (repPage === 'dates') {
    return (
      <ViewDateRangeSubView
        value={{
          time_range: config.time_range,
          custom_start: config.custom_start,
          custom_end: config.custom_end,
        }}
        onPatch={(patch) => void onViewPatch({ reporting_config: { ...config, ...patch } })}
        onBack={() => setRepPage('main')}
        onClose={onClose}
      />
    )
  }

  if (repPage === 'channels' && isOverview) {
    return (
      <OverviewChannelsSubView
        config={config}
        onViewPatch={onViewPatch}
        onBack={() => setRepPage('main')}
        onClose={onClose}
      />
    )
  }

  if (repPage === 'display' && displayItems?.length) {
    return (
      <ReportingDisplaySubView
        title={isOverview ? 'Cards' : 'Display'}
        items={displayItems}
        groupOverviewMetrics={isOverview}
        config={config}
        onViewPatch={onViewPatch}
        onBack={() => setRepPage('main')}
        onClose={onClose}
      />
    )
  }

  if (repPage === 'funnels' && showFunnelsScope) {
    return (
      <ReportingScopeSubView
        title="Funnels"
        emptyHint={assetsLoading ? 'Loading…' : 'No funnels in this campaign'}
        items={assets?.funnels ?? []}
        selectedIds={config.funnel_ids}
        onChange={(ids) => patchConfig({ funnel_ids: ids })}
        onBack={() => setRepPage('main')}
        onClose={onClose}
      />
    )
  }

  if (repPage === 'sequences' && showSequencesScope) {
    return (
      <ReportingScopeSubView
        title="Sequences"
        emptyHint={assetsLoading ? 'Loading…' : 'No sequences in this campaign'}
        items={assets?.sequences ?? []}
        selectedIds={config.sequence_ids}
        onChange={(ids) => patchConfig({ sequence_ids: ids })}
        onBack={() => setRepPage('main')}
        onClose={onClose}
      />
    )
  }

  if (repPage === 'ads' && showAdsScope) {
    return (
      <ReportingScopeSubView
        title="Ad campaigns"
        emptyHint={assetsLoading ? 'Loading…' : 'No ad campaigns in this campaign'}
        items={assets?.ads ?? []}
        selectedIds={config.ad_campaign_ids}
        onChange={(ids) => patchConfig({ ad_campaign_ids: ids })}
        onBack={() => setRepPage('main')}
        onClose={onClose}
      />
    )
  }

  if (repPage === 'social_accounts' && (isSocial || isOverview) && campaignId) {
    return (
      <SocialAccountsReportingSubView
        config={config}
        instagramOptions={socialConnOpts?.instagram ?? []}
        linkedinOptions={socialConnOpts?.linkedin ?? []}
        facebookOptions={socialConnOpts?.facebook ?? []}
        youtubeOptions={socialConnOpts?.youtube ?? []}
        loading={socialConnOptsLoading}
        onPatch={(patch) => patchConfig(patch)}
        onBack={() => setRepPage('main')}
        onClose={onClose}
      />
    )
  }

  return (
    <motion.div
      key="reporting-main"
      className="flex flex-1 flex-col overflow-hidden"
      initial={{ x: 30, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -30, opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <IconPicker
            className="z-10 shrink-0"
            value={viewIconName}
            color={activeView.icon_color}
            size="sm"
            onChange={(name) => void onViewPatch({ icon: name })}
            onColorChange={(colorId: IconColorId) => void onViewPatch({ icon_color: colorId })}
            customTrigger={
              <LucideIcon name={viewIconName} className={`h-4 w-4 ${viewIconColor.textColor}`} />
            }
          />
          <input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={() => {
              const trimmed = nameDraft.trim()
              if (!trimmed) {
                setNameDraft(activeView.name)
                return
              }
              if (trimmed !== activeView.name) void onViewPatch({ name: trimmed })
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            }}
            className="body-3 min-w-0 flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-secondary)] px-2 py-1 font-semibold text-[var(--foreground)] outline-none focus:border-[var(--border)]"
          />
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close panel"
          title="Close panel"
          className="shrink-0 rounded-md p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-3 px-4 py-3">
          {/* Data range → sub-page */}
          <button
            type="button"
            onClick={() => setRepPage('dates')}
            className="flex w-full items-center justify-between transition-colors hover:opacity-80"
          >
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
              <span className="body-3 font-semibold text-[var(--foreground)]">Data range</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-[var(--color-muted-foreground)]">
                {dateRangeSummary}
              </span>
              <ChevronRight className="h-3 w-3 text-[var(--color-muted-foreground)]" />
            </div>
          </button>

          {(isSocial || isOverview) && campaignId ? (
            <button
              type="button"
              onClick={() => setRepPage('social_accounts')}
              className="flex w-full items-center justify-between transition-colors hover:opacity-80"
            >
              <div className="flex items-center gap-1.5">
                <Share2 className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
                <span className="body-3 font-semibold text-[var(--foreground)]">
                  Social accounts
                </span>
              </div>
              <div className="flex min-w-0 flex-1 items-center justify-end gap-1 pl-2">
                <span className="truncate text-right text-[10px] text-[var(--color-muted-foreground)]">
                  {socialConnOptsLoading ? 'Loading…' : socialAccountsSummary}
                </span>
                <ChevronRight className="h-3 w-3 shrink-0 text-[var(--color-muted-foreground)]" />
              </div>
            </button>
          ) : null}

          {isOverview ? (
            <button
              type="button"
              onClick={() => setRepPage('channels')}
              className="flex w-full items-center justify-between transition-colors hover:opacity-80"
            >
              <div className="flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
                <span className="body-3 font-semibold text-[var(--foreground)]">Channels</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-[var(--color-muted-foreground)]">
                  {channelsSummary}
                </span>
                <ChevronRight className="h-3 w-3 text-[var(--color-muted-foreground)]" />
              </div>
            </button>
          ) : null}

          {displayItems?.length ? (
            <button
              type="button"
              onClick={() => setRepPage('display')}
              className="flex w-full items-center justify-between transition-colors hover:opacity-80"
            >
              <div className="flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
                <span className="body-3 font-semibold text-[var(--foreground)]">
                  {isOverview ? 'Cards' : 'Display'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-[var(--color-muted-foreground)]">
                  {displaySummary}
                </span>
                <ChevronRight className="h-3 w-3 text-[var(--color-muted-foreground)]" />
              </div>
            </button>
          ) : null}

          {showFunnelsScope ? (
            <button
              type="button"
              onClick={() => setRepPage('funnels')}
              className="flex w-full items-center justify-between transition-colors hover:opacity-80"
            >
              <div className="flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
                <span className="body-3 font-semibold text-[var(--foreground)]">Funnels</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-[var(--color-muted-foreground)]">
                  {funnelScopeSummary}
                </span>
                <ChevronRight className="h-3 w-3 text-[var(--color-muted-foreground)]" />
              </div>
            </button>
          ) : null}

          {showSequencesScope ? (
            <button
              type="button"
              onClick={() => setRepPage('sequences')}
              className="flex w-full items-center justify-between transition-colors hover:opacity-80"
            >
              <div className="flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
                <span className="body-3 font-semibold text-[var(--foreground)]">Sequences</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-[var(--color-muted-foreground)]">
                  {sequenceScopeSummary}
                </span>
                <ChevronRight className="h-3 w-3 text-[var(--color-muted-foreground)]" />
              </div>
            </button>
          ) : null}

          {showAdsScope ? (
            <button
              type="button"
              onClick={() => setRepPage('ads')}
              className="flex w-full items-center justify-between transition-colors hover:opacity-80"
            >
              <div className="flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
                <span className="body-3 font-semibold text-[var(--foreground)]">Ad campaigns</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-[var(--color-muted-foreground)]">
                  {adsScopeSummary}
                </span>
                <ChevronRight className="h-3 w-3 text-[var(--color-muted-foreground)]" />
              </div>
            </button>
          ) : null}
        </div>

        {!campaignId ? (
          <div className="px-4 py-3">
            <p className="body-3 text-[var(--color-muted-foreground)]">
              Link a campaign to this space to load funnels, sequences, and ads for filtering.
            </p>
          </div>
        ) : null}

        <CustomizeViewManagementSection
          activeView={activeView}
          onViewPatch={onViewPatch}
          onViewPinToStart={onViewPinToStart}
          canDeleteView={canDeleteView}
          onDeleteView={onDeleteView}
          isTeamSpace={isTeamSpace}
          canSaveForEveryone={canSaveForEveryone}
          hasViewOverride={hasViewOverride}
          onSaveForEveryone={onSaveForEveryone}
          onResetToDefault={onResetToDefault}
          onSharingPermissions={onOpenSharingPermissions}
        />
      </div>
    </motion.div>
  )
}

type OverviewGlassFieldKey =
  | 'overview_glass_primary'
  | 'overview_glass_accent_1'
  | 'overview_glass_accent_2'

const OVERVIEW_GLASS_ROWS: { field: OverviewGlassFieldKey; label: string }[] = [
  { field: 'overview_glass_primary', label: 'Primary glass' },
  { field: 'overview_glass_accent_1', label: 'Accent 1' },
  { field: 'overview_glass_accent_2', label: 'Accent 2' },
]

function readOverviewGlassField(
  config: ReportingViewConfig,
  field: OverviewGlassFieldKey,
): string | undefined {
  if (field === 'overview_glass_primary') return config.overview_glass_primary
  if (field === 'overview_glass_accent_1') return config.overview_glass_accent_1
  return config.overview_glass_accent_2
}

function GlassOverviewColorsSection({
  config,
  onViewPatch,
}: {
  config: ReportingViewConfig
  onViewPatch: (patch: Partial<ViewDef>) => Promise<void>
}) {
  const STORAGE_KEY = 'overview-glass-colors'
  const menuRef = useRef<HTMLDivElement>(null)
  const fullRef = useRef<HTMLDivElement>(null)
  const sw0 = useRef<HTMLButtonElement>(null)
  const sw1 = useRef<HTMLButtonElement>(null)
  const sw2 = useRef<HTMLButtonElement>(null)
  const swatches = [sw0, sw1, sw2]

  const [picker, setPicker] = useState<{
    field: OverviewGlassFieldKey
    top: number
    left: number
  } | null>(null)
  const [tagPos, setTagPos] = useState<{
    field: OverviewGlassFieldKey
    top: number
    left: number
  } | null>(null)
  const [tagPanelValue, setTagPanelValue] = useState('#6366f1')

  const chartBase = useMemo(() => {
    const c = config.chart_color
    if (!c) return 'var(--color-primary)'
    return c.startsWith('#') || c.startsWith('linear-gradient') ? c : presetToHex(c)
  }, [config.chart_color])

  function resolveGlass(val: string | undefined, fb: string) {
    if (!val) return fb
    if (
      val.startsWith('#') ||
      val.startsWith('linear-gradient') ||
      val.startsWith('rgb') ||
      val.startsWith('var(')
    ) {
      return val
    }
    return presetToHex(val)
  }

  const resolvedByField = useMemo(() => {
    const p = resolveGlass(config.overview_glass_primary, chartBase)
    const a1 = resolveGlass(config.overview_glass_accent_1, p)
    const a2 = resolveGlass(config.overview_glass_accent_2, p)
    return {
      overview_glass_primary: p,
      overview_glass_accent_1: a1,
      overview_glass_accent_2: a2,
    } satisfies Record<OverviewGlassFieldKey, string>
  }, [
    config.overview_glass_primary,
    config.overview_glass_accent_1,
    config.overview_glass_accent_2,
    chartBase,
  ])

  const customSwatches = useMemo(() => readCustomSwatchesFromStorage(STORAGE_KEY), [picker])

  function tryCommitFull() {
    const v = tagPanelValue.trim()
    if (!v) return
    if (shouldSaveAsNewCustom(v, customSwatches)) {
      const next = [v, ...customSwatches].slice(0, MAX_CUSTOM_TAG_SWATCHES)
      try {
        localStorage.setItem(tagCustomSwatchesKey(STORAGE_KEY), JSON.stringify(next))
      } catch {}
    }
  }

  function patchField(field: OverviewGlassFieldKey, value: string) {
    void onViewPatch({ reporting_config: { ...config, [field]: value } })
  }

  function applyChoice(c: string) {
    if (tagPos) tryCommitFull()
    if (picker) patchField(picker.field, c)
    setPicker(null)
    setTagPos(null)
  }

  useEffect(() => {
    if (!picker) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (fullRef.current?.contains(t)) return
      if (menuRef.current?.contains(t)) return
      for (const r of swatches) {
        if (r.current?.contains(t)) return
      }
      if (tagPos) tryCommitFull()
      setPicker(null)
      setTagPos(null)
    }
    const id = setTimeout(() => document.addEventListener('mousedown', onDown, true), 0)
    return () => {
      clearTimeout(id)
      document.removeEventListener('mousedown', onDown, true)
    }
  }, [picker, tagPos])

  return (
    <>
      <div className="border-t border-[var(--border)] px-4 py-3">
        <div className="mb-2 text-[10px] text-[var(--color-muted-foreground)]">
          Charts & data colors
        </div>
        <p className="body-3 mb-3 text-[var(--color-muted-foreground)]">
          Primary + two accents for chart lines, bars, and on-card metrics. Overview cards stay
          default glass.
        </p>
        <div className="space-y-2">
          {OVERVIEW_GLASS_ROWS.map((row, i) => (
            <div key={row.field} className="flex items-center justify-between gap-2">
              <span className="body-3 text-[var(--foreground)]">{row.label}</span>
              <button
                ref={swatches[i]}
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  const r = e.currentTarget.getBoundingClientRect()
                  const w = 220
                  const left = Math.min(Math.max(8, r.left), window.innerWidth - w - 8)
                  setPicker((prev) =>
                    prev?.field === row.field
                      ? null
                      : { field: row.field, top: r.bottom + 4, left },
                  )
                  setTagPos(null)
                  setTagPanelValue(
                    initialTagPanelValueFromOption(readOverviewGlassField(config, row.field)),
                  )
                }}
                className="h-5 w-5 shrink-0 rounded-md transition-opacity hover:opacity-90"
                style={swatchVisualStyle(resolvedByField[row.field])}
                title={row.label}
              />
            </div>
          ))}
        </div>
      </div>

      {picker &&
        typeof document !== 'undefined' &&
        createPortal(
          <ColorPickerPopover
            ref={menuRef}
            top={picker.top}
            left={picker.left}
            customSwatches={customSwatches}
            onSelect={(c) => applyChoice(c)}
            onOpenFullPicker={() => {
              setTagPanelValue(
                initialTagPanelValueFromOption(readOverviewGlassField(config, picker.field)),
              )
              const menu = menuRef.current
              if (!menu) return
              const rect = menu.getBoundingClientRect()
              const p = positionTagFullPickerNextToPresets(rect)
              setTagPos({ field: picker.field, top: p.top, left: p.left })
            }}
          />,
          document.body,
        )}

      {tagPos &&
        picker &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={fullRef}
            {...{ [VIBEY_SPACE_FLOATING_CONTROL]: '' }}
            className="fixed z-[100001]"
            style={{ top: tagPos.top, left: tagPos.left }}
          >
            <ColorPickerPanelStandalone
              value={tagPanelValue}
              onChange={(v) => {
                setTagPanelValue(v)
                patchField(tagPos.field, v)
              }}
              allowGradient
            />
          </div>,
          document.body,
        )}
    </>
  )
}

function ReportingDisplaySubView({
  title = 'Display',
  items,
  groupOverviewMetrics = false,
  config,
  onViewPatch,
  onBack,
  onClose,
}: {
  title?: string
  items: { id: string; label: string; defaultOn: boolean }[]
  /** When true (campaign Overview only), split toggles into Key metrics vs Cards. */
  groupOverviewMetrics?: boolean
  config: ReportingViewConfig
  onViewPatch: (patch: Partial<ViewDef>) => Promise<void>
  onBack: () => void
  onClose: () => void
}) {
  const visible = config.visible_kpis
  const isOn = (id: string) => {
    if (!visible?.length) return items.find((i) => i.id === id)?.defaultOn ?? true
    return visible.includes(id)
  }

  const toggleKpi = (id: string, on: boolean) => {
    const allIds = items.map((i) => i.id)
    const current = visible?.length ? visible : allIds
    const set = new Set(current)
    if (on) set.add(id)
    else set.delete(id)
    const next = allIds.filter((x) => set.has(x))
    void onViewPatch({
      reporting_config: {
        ...config,
        visible_kpis: next.length === allIds.length ? undefined : next,
      },
    })
  }

  const STORAGE_KEY = 'chart-color'
  const colorSwatchRef = useRef<HTMLButtonElement>(null)
  const colorMenuRef = useRef<HTMLDivElement>(null)
  const tagFullPickerRef = useRef<HTMLDivElement>(null)
  const openFullPanelPendingCommitRef = useRef(false)

  const [colorPickerPos, setColorPickerPos] = useState<{ top: number; left: number } | null>(null)
  const [tagThemePos, setTagThemePos] = useState<{ top: number; left: number } | null>(null)
  const [tagPanelValue, setTagPanelValue] = useState('#6366f1')

  const chartColor = config.chart_color
  const resolvedColor = chartColor
    ? chartColor.startsWith('#') || chartColor.startsWith('linear-gradient')
      ? chartColor
      : presetToHex(chartColor)
    : 'var(--color-primary)'

  const customSwatches = useMemo(() => readCustomSwatchesFromStorage(STORAGE_KEY), [colorPickerPos])

  function tryCommitCustomFromFullPanel() {
    const v = tagPanelValue.trim()
    if (!v) return
    if (shouldSaveAsNewCustom(v, customSwatches)) {
      const next = [v, ...customSwatches].slice(0, MAX_CUSTOM_TAG_SWATCHES)
      try {
        localStorage.setItem(tagCustomSwatchesKey(STORAGE_KEY), JSON.stringify(next))
      } catch {}
    }
  }

  function applyColorChoice(c: string) {
    if (tagThemePos) tryCommitCustomFromFullPanel()
    void onViewPatch({ reporting_config: { ...config, chart_color: c } })
    setTagThemePos(null)
  }

  useEffect(() => {
    if (!colorPickerPos) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (tagFullPickerRef.current?.contains(t)) return
      if (colorMenuRef.current?.contains(t)) return
      if (colorSwatchRef.current?.contains(t)) return
      if (tagThemePos) tryCommitCustomFromFullPanel()
      setColorPickerPos(null)
      setTagThemePos(null)
    }
    const id = setTimeout(() => document.addEventListener('mousedown', onDown, true), 0)
    return () => {
      clearTimeout(id)
      document.removeEventListener('mousedown', onDown, true)
    }
  }, [colorPickerPos, tagThemePos])

  return (
    <motion.div
      className="flex flex-1 flex-col overflow-hidden"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.15 }}
    >
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-md p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="body-3 font-semibold text-[var(--foreground)]">{title}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close panel"
          title="Close panel"
          className="shrink-0 rounded-md p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="px-4 pb-3">
          {groupOverviewMetrics ? (
            <>
              {(
                [
                  { sectionLabel: 'Key metrics', pred: (id: string) => id.startsWith('kpi_') },
                  { sectionLabel: 'Cards', pred: (id: string) => id.startsWith('card_') },
                ] as const
              ).map(({ sectionLabel, pred }) => {
                const sectionItems = items.filter((i) => pred(i.id))
                if (!sectionItems.length) return null
                return (
                  <div key={sectionLabel}>
                    <div className="mb-1 mt-3 text-[10px] text-[var(--color-muted-foreground)]">
                      {sectionLabel}
                    </div>
                    <div className="space-y-0.5">
                      {sectionItems.map((item) => {
                        const RowIcon = REPORTING_DISPLAY_ROW_ICONS[item.id] ?? Layers
                        return (
                          <div
                            key={item.id}
                            className="flex h-8 items-center justify-between rounded-lg px-3 transition-colors hover:bg-[var(--color-hover-subtle)]"
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <RowIcon
                                className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]"
                                aria-hidden
                              />
                              <span className="body-3 truncate text-[var(--foreground)]">
                                {item.label}
                              </span>
                            </span>
                            <Switch
                              checked={isOn(item.id)}
                              onCheckedChange={(v) => toggleKpi(item.id, v)}
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </>
          ) : (
            <>
              <div className="mb-1 mt-3 text-[10px] text-[var(--color-muted-foreground)]">
                Visible metrics
              </div>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const RowIcon = REPORTING_DISPLAY_ROW_ICONS[item.id] ?? Layers
                  return (
                    <div
                      key={item.id}
                      className="flex h-8 items-center justify-between rounded-lg px-3 transition-colors hover:bg-[var(--color-hover-subtle)]"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <RowIcon
                          className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]"
                          aria-hidden
                        />
                        <span className="body-3 truncate text-[var(--foreground)]">
                          {item.label}
                        </span>
                      </span>
                      <Switch
                        checked={isOn(item.id)}
                        onCheckedChange={(v) => toggleKpi(item.id, v)}
                      />
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        <div className="border-t border-[var(--border)] px-4 py-3">
          <ChartStyleMockup chartType={config.chart_type ?? 'area'} color={resolvedColor} />
          <div className="mb-2 mt-3 text-[10px] text-[var(--color-muted-foreground)]">
            Chart style
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CHART_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() =>
                  void onViewPatch({
                    reporting_config: { ...config, chart_type: opt.value },
                  })
                }
                className={cn(
                  'body-3 rounded-lg px-3 py-1.5 transition-colors',
                  (config.chart_type ?? 'area') === opt.value
                    ? 'chip-glass-blue font-medium'
                    : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="body-3 text-[var(--foreground)]">Chart color</span>
            <button
              ref={colorSwatchRef}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                const r = e.currentTarget.getBoundingClientRect()
                const w = 220
                const left = Math.min(Math.max(8, r.left), window.innerWidth - w - 8)
                openFullPanelPendingCommitRef.current = false
                setColorPickerPos((p) => (p ? null : { top: r.bottom + 4, left }))
                setTagThemePos(null)
                setTagPanelValue(initialTagPanelValueFromOption(chartColor ?? undefined))
              }}
              className="h-5 w-5 shrink-0 rounded-md transition-opacity hover:opacity-90"
              style={swatchVisualStyle(resolvedColor)}
              title="Chart color"
            />
          </div>
          {groupOverviewMetrics ? (
            <GlassOverviewColorsSection config={config} onViewPatch={onViewPatch} />
          ) : null}
        </div>
      </div>

      {colorPickerPos &&
        typeof document !== 'undefined' &&
        createPortal(
          <ColorPickerPopover
            ref={colorMenuRef}
            top={colorPickerPos.top}
            left={colorPickerPos.left}
            customSwatches={customSwatches}
            onSelect={(c) => applyColorChoice(c)}
            onOpenFullPicker={() => {
              openFullPanelPendingCommitRef.current = true
              setTagPanelValue(initialTagPanelValueFromOption(chartColor ?? undefined))
              const menu = colorMenuRef.current
              if (!menu) return
              setTagThemePos(positionTagFullPickerNextToPresets(menu.getBoundingClientRect()))
            }}
          />,
          document.body,
        )}

      {tagThemePos &&
        colorPickerPos &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={tagFullPickerRef}
            {...{ [VIBEY_SPACE_FLOATING_CONTROL]: '' }}
            className="fixed z-[100001]"
            style={{ top: tagThemePos.top, left: tagThemePos.left }}
          >
            <ColorPickerPanelStandalone
              value={tagPanelValue}
              onChange={(v) => {
                setTagPanelValue(v)
                void onViewPatch({ reporting_config: { ...config, chart_color: v } })
              }}
              allowGradient
            />
          </div>,
          document.body,
        )}
    </motion.div>
  )
}

function ReportingScopeSubView({
  title,
  emptyHint,
  items,
  selectedIds,
  onChange,
  onBack,
  onClose,
}: {
  title: string
  emptyHint: string
  items: { id: string; name: string }[]
  selectedIds: string[] | undefined
  onChange: (ids: string[] | undefined) => void
  onBack: () => void
  onClose: () => void
}) {
  const allIds = items.map((i) => i.id)

  const rowOn = (id: string) => {
    if (!allIds.length) return false
    if (selectedIds === undefined) return true
    return selectedIds.includes(id)
  }

  return (
    <motion.div
      className="flex flex-1 flex-col overflow-hidden"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.15 }}
    >
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-md p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="body-3 font-semibold text-[var(--foreground)]">{title}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close panel"
          title="Close panel"
          className="shrink-0 rounded-md p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
        {items.length === 0 ? (
          <p className="body-3 py-4 text-[var(--color-muted-foreground)]">{emptyHint}</p>
        ) : (
          <div className="space-y-0.5 pt-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex h-8 items-center justify-between rounded-lg px-3 transition-colors hover:bg-[var(--color-hover-subtle)]"
              >
                <span className="body-3 truncate text-[var(--foreground)]">{item.name}</span>
                <Switch
                  checked={rowOn(item.id)}
                  onCheckedChange={(on) =>
                    onChange(toggleScopeSelection(allIds, selectedIds, item.id, on))
                  }
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Chart style mini mockup (glass SVG preview)
// ---------------------------------------------------------------------------

const MOCK_POINTS = [12, 28, 22, 38, 32, 45, 40, 55, 48, 60]

function ChartStyleMockup({
  chartType,
  color = 'var(--color-primary)',
}: {
  chartType: NonNullable<ReportingViewConfig['chart_type']>
  color?: string
}) {
  const w = 100
  const h = 50
  const pad = 4
  const max = Math.max(...MOCK_POINTS)
  const pts = MOCK_POINTS.map((v, i) => ({
    x: pad + (i / (MOCK_POINTS.length - 1)) * (w - pad * 2),
    y: pad + (1 - v / max) * (h - pad * 2),
  }))

  const linePath = pts.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`
    const prev = pts[i - 1]!
    const cpx = (prev.x + p.x) / 2
    return `${acc} C ${cpx} ${prev.y}, ${cpx} ${p.y}, ${p.x} ${p.y}`
  }, '')

  const areaPath = `${linePath} L ${pts[pts.length - 1]!.x} ${h} L ${pts[0]!.x} ${h} Z`

  const isGradient = color.startsWith('linear-gradient')
  const strokeColor = isGradient ? '#6366f1' : color

  if (chartType === 'pie') {
    const slices = [35, 25, 22, 18]
    const opacities = [0.9, 0.55, 0.3, 0.15]
    const cx = 50
    const cy = 25
    const r = 18
    let cumAngle = -90
    const paths = slices.map((pct, i) => {
      const angle = (pct / 100) * 360
      const startAngle = cumAngle
      const endAngle = cumAngle + angle
      cumAngle = endAngle
      const rad = (a: number) => (a * Math.PI) / 180
      const x1 = cx + r * Math.cos(rad(startAngle))
      const y1 = cy + r * Math.sin(rad(startAngle))
      const x2 = cx + r * Math.cos(rad(endAngle))
      const y2 = cy + r * Math.sin(rad(endAngle))
      const large = angle > 180 ? 1 : 0
      return (
        <path
          key={i}
          d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`}
          fill={strokeColor}
          opacity={opacities[i]}
        />
      )
    })
    return (
      <div
        className="card-glass flex items-center justify-center rounded-xl"
        style={{ height: 72 }}
      >
        <svg
          viewBox="0 0 100 50"
          preserveAspectRatio="xMidYMid meet"
          style={{ width: '100%', height: '100%' }}
        >
          {paths}
        </svg>
      </div>
    )
  }

  if (chartType === 'bar') {
    const barW = (w - pad * 2) / MOCK_POINTS.length - 1
    return (
      <div className="card-glass rounded-xl" style={{ height: 72 }}>
        <svg
          viewBox={`0 0 ${w} ${h}`}
          preserveAspectRatio="none"
          style={{ width: '100%', height: '100%' }}
        >
          <defs>
            <linearGradient id="mockbar-g" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.7" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.15" />
            </linearGradient>
          </defs>
          {MOCK_POINTS.map((v, i) => {
            const barH = (v / max) * (h - pad * 2)
            const x = pad + i * ((w - pad * 2) / MOCK_POINTS.length) + 0.5
            return (
              <rect
                key={i}
                x={x}
                y={h - pad - barH}
                width={barW}
                height={barH}
                rx={1.5}
                fill="url(#mockbar-g)"
              />
            )
          })}
        </svg>
      </div>
    )
  }

  const showArea = chartType === 'area'

  return (
    <div className="card-glass rounded-xl" style={{ height: 72 }}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        style={{ width: '100%', height: '100%' }}
      >
        <defs>
          <linearGradient id="mockline-g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {showArea ? <path d={areaPath} fill="url(#mockline-g)" /> : null}
        <path
          d={linePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Reporting: Social accounts (per-platform connection pin)
// ---------------------------------------------------------------------------

function SocialAccountsReportingSubView({
  config,
  instagramOptions,
  linkedinOptions,
  facebookOptions,
  youtubeOptions,
  loading,
  onPatch,
  onBack,
  onClose,
}: {
  config: ReportingViewConfig
  instagramOptions: SocialConnectionOption[]
  linkedinOptions: SocialConnectionOption[]
  facebookOptions: SocialConnectionOption[]
  youtubeOptions: SocialConnectionOption[]
  loading: boolean
  onPatch: (patch: Partial<ReportingViewConfig>) => void
  onBack: () => void
  onClose: () => void
}) {
  const igSel =
    config.social_instagram_connection_id == null || config.social_instagram_connection_id === ''
      ? null
      : config.social_instagram_connection_id
  const liSel =
    config.social_linkedin_connection_id == null || config.social_linkedin_connection_id === ''
      ? null
      : config.social_linkedin_connection_id
  const fbSel =
    config.social_facebook_connection_id == null || config.social_facebook_connection_id === ''
      ? null
      : config.social_facebook_connection_id
  const ytSel =
    config.social_youtube_connection_id == null || config.social_youtube_connection_id === ''
      ? null
      : config.social_youtube_connection_id

  return (
    <motion.div
      className="flex flex-1 flex-col overflow-hidden"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.15 }}
    >
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-md p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="body-3 font-semibold text-[var(--foreground)]">Social accounts</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close panel"
          title="Close panel"
          className="shrink-0 rounded-md p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
        <p className="body-3 pt-3 text-[var(--color-muted-foreground)]">
          Choose which connected account powers each platform&apos;s metrics for this view.
        </p>

        <div className="pt-3">
          <div className="mb-1 flex items-center gap-2 px-3">
            <Instagram
              className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]"
              aria-hidden
            />
            <span className="body-3 font-semibold text-[var(--foreground)]">Instagram</span>
          </div>
          {loading ? (
            <div className="px-3 py-2"><ListSkeleton rows={3} label="Loading…" /></div>
          ) : (
            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => onPatch({ social_instagram_connection_id: null })}
                className="body-3 flex h-8 w-full items-center justify-between rounded-lg px-3 transition-colors hover:bg-[var(--color-hover-subtle)]"
              >
                <span className="text-[var(--foreground)]">Auto (default order)</span>
                {igSel == null ? <Check className="h-3 w-3 text-[var(--color-primary)]" /> : null}
              </button>
              {instagramOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onPatch({ social_instagram_connection_id: opt.id })}
                  className="body-3 flex min-h-8 w-full items-center justify-between gap-2 rounded-lg px-3 py-1 transition-colors hover:bg-[var(--color-hover-subtle)]"
                >
                  <span className="min-w-0 truncate text-left text-[var(--foreground)]">
                    {opt.label}
                    {opt.is_default ? ' · default' : ''}
                  </span>
                  {igSel === opt.id ? (
                    <Check className="h-3 w-3 shrink-0 text-[var(--color-primary)]" />
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="pt-4">
          <div className="mb-1 flex items-center gap-2 px-3">
            <Linkedin
              className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]"
              aria-hidden
            />
            <span className="body-3 font-semibold text-[var(--foreground)]">LinkedIn</span>
          </div>
          {loading ? (
            <div className="px-3 py-2"><ListSkeleton rows={3} label="Loading…" /></div>
          ) : (
            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => onPatch({ social_linkedin_connection_id: null })}
                className="body-3 flex h-8 w-full items-center justify-between rounded-lg px-3 transition-colors hover:bg-[var(--color-hover-subtle)]"
              >
                <span className="text-[var(--foreground)]">Auto (default order)</span>
                {liSel == null ? <Check className="h-3 w-3 text-[var(--color-primary)]" /> : null}
              </button>
              {linkedinOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onPatch({ social_linkedin_connection_id: opt.id })}
                  className="body-3 flex min-h-8 w-full items-center justify-between gap-2 rounded-lg px-3 py-1 transition-colors hover:bg-[var(--color-hover-subtle)]"
                >
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-[var(--foreground)]">
                      {opt.label}
                      {opt.is_default ? ' · default' : ''}
                    </span>
                    {opt.linkedin_company_page_name ? (
                      <span className="typo-caption block truncate text-[var(--color-muted-foreground)]">
                        Company page: {opt.linkedin_company_page_name}
                      </span>
                    ) : null}
                  </span>
                  {liSel === opt.id ? (
                    <Check className="h-3 w-3 shrink-0 text-[var(--color-primary)]" />
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="pt-4">
          <div className="mb-1 flex items-center gap-2 px-3">
            <Facebook
              className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]"
              aria-hidden
            />
            <span className="body-3 font-semibold text-[var(--foreground)]">Facebook</span>
          </div>
          {loading ? (
            <div className="px-3 py-2"><ListSkeleton rows={3} label="Loading…" /></div>
          ) : (
            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => onPatch({ social_facebook_connection_id: null })}
                className="body-3 flex h-8 w-full items-center justify-between rounded-lg px-3 transition-colors hover:bg-[var(--color-hover-subtle)]"
              >
                <span className="text-[var(--foreground)]">Auto (default order)</span>
                {fbSel == null ? <Check className="h-3 w-3 text-[var(--color-primary)]" /> : null}
              </button>
              {facebookOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onPatch({ social_facebook_connection_id: opt.id })}
                  className="body-3 flex min-h-8 w-full items-center justify-between gap-2 rounded-lg px-3 py-1 transition-colors hover:bg-[var(--color-hover-subtle)]"
                >
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-[var(--foreground)]">
                      {opt.label}
                      {opt.is_default ? ' · default' : ''}
                    </span>
                    {opt.facebook_page_name ? (
                      <span className="typo-caption block truncate text-[var(--color-muted-foreground)]">
                        Page: {opt.facebook_page_name}
                      </span>
                    ) : null}
                  </span>
                  {fbSel === opt.id ? (
                    <Check className="h-3 w-3 shrink-0 text-[var(--color-primary)]" />
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="pt-4">
          <div className="mb-1 flex items-center gap-2 px-3">
            <Youtube
              className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]"
              aria-hidden
            />
            <span className="body-3 font-semibold text-[var(--foreground)]">YouTube</span>
          </div>
          {loading ? (
            <div className="px-3 py-2"><ListSkeleton rows={3} label="Loading…" /></div>
          ) : (
            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => onPatch({ social_youtube_connection_id: null })}
                className="body-3 flex h-8 w-full items-center justify-between rounded-lg px-3 transition-colors hover:bg-[var(--color-hover-subtle)]"
              >
                <span className="text-[var(--foreground)]">Auto (default order)</span>
                {ytSel == null ? <Check className="h-3 w-3 text-[var(--color-primary)]" /> : null}
              </button>
              {youtubeOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onPatch({ social_youtube_connection_id: opt.id })}
                  className="body-3 flex min-h-8 w-full items-center justify-between gap-2 rounded-lg px-3 py-1 transition-colors hover:bg-[var(--color-hover-subtle)]"
                >
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-[var(--foreground)]">
                      {opt.label}
                      {opt.is_default ? ' · default' : ''}
                    </span>
                    {opt.youtube_channel_name ? (
                      <span className="typo-caption block truncate text-[var(--color-muted-foreground)]">
                        Channel: {opt.youtube_channel_name}
                      </span>
                    ) : null}
                  </span>
                  {ytSel === opt.id ? (
                    <Check className="h-3 w-3 shrink-0 text-[var(--color-primary)]" />
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Overview: Channels sub-view (Funnels / Emails / Ads / Social switches)
// ---------------------------------------------------------------------------

function OverviewChannelsSubView({
  config,
  onViewPatch,
  onBack,
  onClose,
}: {
  config: ReportingViewConfig
  onViewPatch: (patch: Partial<ViewDef>) => Promise<void>
  onBack: () => void
  onClose: () => void
}) {
  const active = config.overview_channels

  const isOn = (id: 'funnels' | 'emails' | 'ads' | 'social') => {
    if (!active) return true
    return active.includes(id)
  }

  const toggle = (id: 'funnels' | 'emails' | 'ads' | 'social', on: boolean) => {
    const allIds: ('funnels' | 'emails' | 'ads' | 'social')[] = [
      'funnels',
      'emails',
      'ads',
      'social',
    ]
    const current = active ?? [...allIds]
    const set = new Set(current)
    if (on) set.add(id)
    else set.delete(id)
    const next = allIds.filter((x) => set.has(x))
    void onViewPatch({
      reporting_config: {
        ...config,
        overview_channels: next.length === allIds.length ? undefined : next,
      },
    })
  }

  return (
    <motion.div
      className="flex flex-1 flex-col overflow-hidden"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.15 }}
    >
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-md p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="body-3 font-semibold text-[var(--foreground)]">Channels</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close panel"
          title="Close panel"
          className="shrink-0 rounded-md p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
        <div className="space-y-0.5 pt-3">
          {OVERVIEW_CHANNEL_OPTIONS.map((ch) => {
            const RowIcon = OVERVIEW_CHANNEL_ROW_ICONS[ch.id]
            return (
              <div
                key={ch.id}
                className="flex h-8 items-center justify-between rounded-lg px-3 transition-colors hover:bg-[var(--color-hover-subtle)]"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <RowIcon
                    className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]"
                    aria-hidden
                  />
                  <span className="body-3 truncate text-[var(--foreground)]">{ch.label}</span>
                </span>
                <Switch checked={isOn(ch.id)} onCheckedChange={(v) => toggle(ch.id, v)} />
              </div>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}
