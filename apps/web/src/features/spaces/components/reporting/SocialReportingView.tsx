'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Facebook, Instagram, Linkedin, Youtube } from 'lucide-react'
import { toast } from 'sonner'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import {
  getSocialAnalyticsRangeDates,
  SocialPerformanceView,
} from '@/features/studio/components/preview/SocialPerformanceView'
import { STUDIO_INLINE_ERRORS } from '@/features/studio/config/studio-inline-errors.config'
import {
  fetchCampaignSocialAnalytics,
  fetchCampaignSocialConnectionOptions,
  type SocialAnalyticsPlatform,
  type SocialAnalyticsResponse,
  type SocialConnectionOption,
} from '@/features/studio/services/analytics.service'
import type { ReportingTimeRange, ViewDef } from '../../types/space-schema'
import {
  filterReportingSocialPlatformsToConnected,
  normalizeReportingSocialPlatforms,
  patchReportingSocialPlatforms,
  reportingSocialPlatformsEqual,
} from './shared/reporting-social-platforms'
import type { ReportingToolbarApi } from './shared/reporting-toolbar.types'

interface SocialReportingViewProps {
  campaignId: string
  campaignName: string | null
  activeView: ViewDef
  onViewPatch: (patch: Partial<ViewDef>) => void
  onRegisterReportingToolbar?: (api: ReportingToolbarApi | null) => void
}

const PLATFORM_SECTION_META: Record<
  SocialAnalyticsPlatform,
  { label: string; Icon: typeof Instagram }
> = {
  instagram: { label: 'Instagram', Icon: Instagram },
  linkedin: { label: 'LinkedIn', Icon: Linkedin },
  facebook: { label: 'Facebook', Icon: Facebook },
  youtube: { label: 'YouTube', Icon: Youtube },
}

function connectionIdForPlatform(
  platform: SocialAnalyticsPlatform,
  config: ViewDef['reporting_config'],
): string | undefined {
  const id =
    platform === 'instagram'
      ? config?.social_instagram_connection_id
      : platform === 'linkedin'
        ? config?.social_linkedin_connection_id
        : platform === 'facebook'
          ? config?.social_facebook_connection_id
          : config?.social_youtube_connection_id
  return id ? id : undefined
}

function connectionIdPatchForPlatform(
  platform: SocialAnalyticsPlatform,
  connId: string | null,
): Partial<ViewDef['reporting_config']> {
  if (platform === 'instagram') return { social_instagram_connection_id: connId }
  if (platform === 'linkedin') return { social_linkedin_connection_id: connId }
  if (platform === 'facebook') return { social_facebook_connection_id: connId }
  return { social_youtube_connection_id: connId }
}

export function SocialReportingView({
  campaignId,
  campaignName,
  activeView,
  onViewPatch,
  onRegisterReportingToolbar,
}: SocialReportingViewProps) {
  const config = activeView.reporting_config ?? {}
  const hasCustomDates = Boolean(config.custom_start || config.custom_end)
  const tr: ReportingTimeRange = hasCustomDates ? 'all' : (config.time_range ?? '30d')

  const configuredPlatforms = useMemo(
    () => normalizeReportingSocialPlatforms(config),
    [config.social_platforms, config.social_platform],
  )

  const [connOpts, setConnOpts] = useState<{
    instagram: SocialConnectionOption[]
    linkedin: SocialConnectionOption[]
    facebook: SocialConnectionOption[]
    youtube: SocialConnectionOption[]
  } | null>(null)

  const [dataByPlatform, setDataByPlatform] = useState<
    Partial<Record<SocialAnalyticsPlatform, SocialAnalyticsResponse>>
  >({})
  const [initialLoading, setInitialLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const hasLoadedOnce = useRef('')

  useEffect(() => {
    let cancelled = false
    fetchCampaignSocialConnectionOptions(campaignId)
      .then((rows) => {
        if (!cancelled) setConnOpts(rows)
      })
      .catch(() => {
        if (!cancelled) setConnOpts({ instagram: [], linkedin: [], facebook: [], youtube: [] })
      })
    return () => {
      cancelled = true
    }
  }, [campaignId])

  const platforms = useMemo(
    () => filterReportingSocialPlatformsToConnected(config, connOpts),
    [config, connOpts],
  )

  useEffect(() => {
    if (!connOpts) return
    const visible = filterReportingSocialPlatformsToConnected(config, connOpts)
    if (reportingSocialPlatformsEqual(visible, configuredPlatforms)) return
    onViewPatch({
      reporting_config: {
        ...config,
        ...patchReportingSocialPlatforms(visible),
      },
    })
  }, [
    connOpts,
    config,
    config.social_platforms,
    config.social_platform,
    configuredPlatforms,
    onViewPatch,
  ])

  useEffect(() => {
    if (!connOpts) return
    const patch: Record<string, string | null> = {}
    const pairs: Array<{
      key: keyof typeof patch
      id: string | null | undefined
      opts: SocialConnectionOption[]
    }> = [
      {
        key: 'social_instagram_connection_id',
        id: config.social_instagram_connection_id,
        opts: connOpts.instagram ?? [],
      },
      {
        key: 'social_linkedin_connection_id',
        id: config.social_linkedin_connection_id,
        opts: connOpts.linkedin ?? [],
      },
      {
        key: 'social_facebook_connection_id',
        id: config.social_facebook_connection_id,
        opts: connOpts.facebook ?? [],
      },
      {
        key: 'social_youtube_connection_id',
        id: config.social_youtube_connection_id,
        opts: connOpts.youtube ?? [],
      },
    ]
    for (const row of pairs) {
      if (row.id && !row.opts.some((o) => o.id === row.id)) {
        patch[row.key] = null
      }
    }
    if (Object.keys(patch).length === 0) return
    onViewPatch({ reporting_config: { ...config, ...patch } })
  }, [connOpts, config, onViewPatch])

  const loadKey = useMemo(
    () =>
      [
        platforms.join(','),
        tr,
        config.social_instagram_connection_id ?? '',
        config.social_linkedin_connection_id ?? '',
        config.social_facebook_connection_id ?? '',
        config.social_youtube_connection_id ?? '',
      ].join('|'),
    [
      platforms,
      tr,
      config.social_instagram_connection_id,
      config.social_linkedin_connection_id,
      config.social_facebook_connection_id,
      config.social_youtube_connection_id,
    ],
  )

  const loadAllPlatforms = useCallback(
    async (opts: { refresh?: boolean } = {}) => {
      if (platforms.length === 0) {
        setDataByPlatform({})
        setInitialLoading(false)
        setRefreshing(false)
        return
      }

      const isFirstLoad = hasLoadedOnce.current !== loadKey
      if (isFirstLoad) setInitialLoading(true)
      else setRefreshing(true)

      const { since, until } = getSocialAnalyticsRangeDates(tr as '7d' | '30d' | '90d' | 'all')

      try {
        const settled = await Promise.allSettled(
          platforms.map((platform) =>
            fetchCampaignSocialAnalytics(campaignId, platform, {
              since,
              until,
              refresh: opts.refresh,
              connectionId: connectionIdForPlatform(platform, config),
            }),
          ),
        )

        const next: Partial<Record<SocialAnalyticsPlatform, SocialAnalyticsResponse>> = {}
        let anyPartial = false
        let anyFailed = false

        settled.forEach((result, index) => {
          const platform = platforms[index]!
          if (result.status === 'fulfilled') {
            next[platform] = result.value
            if (result.value.partial) anyPartial = true
          } else {
            anyFailed = true
            console.error(`[SocialReporting] Failed to load ${platform}:`, result.reason)
          }
        })

        setDataByPlatform(next)
        hasLoadedOnce.current = loadKey

        if (anyFailed) toast.error(STUDIO_INLINE_ERRORS.LOAD_ANALYTICS)
        if (opts.refresh && anyPartial) {
          toast.warning("Some metrics couldn't be pulled live — showing what we got.")
        }
      } catch (err) {
        console.error('[SocialReporting] Failed to load analytics:', err)
        toast.error(STUDIO_INLINE_ERRORS.LOAD_ANALYTICS)
      } finally {
        setInitialLoading(false)
        setRefreshing(false)
      }
    },
    [campaignId, config, loadKey, platforms, tr],
  )

  useEffect(() => {
    if (!connOpts) return
    void loadAllPlatforms()
  }, [connOpts, loadAllPlatforms])

  useEffect(() => {
    if (!onRegisterReportingToolbar) return

    if (initialLoading || platforms.length === 0) {
      onRegisterReportingToolbar({
        refresh: () => void loadAllPlatforms({ refresh: true }),
        refreshing: initialLoading || refreshing,
        socialAccountConnected: null,
      })
      return () => onRegisterReportingToolbar(null)
    }

    const connectedStates = platforms.map((p) => dataByPlatform[p]?.connected ?? false)
    const socialAccountConnected = connectedStates.every((c) => c)
      ? true
      : connectedStates.some((c) => c)
        ? false
        : null

    onRegisterReportingToolbar({
      refresh: () => void loadAllPlatforms({ refresh: true }),
      refreshing: refreshing,
      socialAccountConnected,
    })
    return () => onRegisterReportingToolbar(null)
  }, [
    onRegisterReportingToolbar,
    platforms,
    dataByPlatform,
    initialLoading,
    refreshing,
    loadAllPlatforms,
  ])

  const multiPlatform = platforms.length > 1

  return (
    <div className="scrollbar-thin relative flex h-0 min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-4 py-3">
      {initialLoading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <VibeyLoadingOrb size="sm" text="Loading social analytics..." />
        </div>
      ) : platforms.length === 0 ? (
        <div className="card-glass rounded-xl p-6">
          <p className="body-2 text-foreground font-medium">No social accounts connected</p>
          <p className="typo-caption text-muted-foreground mt-spacing-2">
            Connect Instagram, LinkedIn, Facebook, or YouTube in Settings → Integrations, then
            return here. For LinkedIn, Facebook, and YouTube, also select the Page or channel on the
            connection.
          </p>
        </div>
      ) : (
        <div
          className={`flex flex-col gap-8 transition-opacity duration-200 ${refreshing ? 'opacity-50' : ''}`}
        >
          {platforms.map((p, i) => {
            const { label, Icon } = PLATFORM_SECTION_META[p]
            return (
              <section key={p} className="flex flex-col gap-3">
                {multiPlatform ? (
                  <div className="flex items-center gap-2">
                    <Icon className="icon-sm text-muted-foreground shrink-0" aria-hidden />
                    <p className="body-2 text-foreground font-medium">{label}</p>
                  </div>
                ) : null}
                <SocialPerformanceView
                  campaignId={campaignId}
                  campaignName={campaignName}
                  embedded
                  hidePerformanceHeader={multiPlatform || i > 0}
                  externalTimeRange={tr}
                  onExternalTimeRangeChange={(v) =>
                    onViewPatch({ reporting_config: { ...config, time_range: v } })
                  }
                  externalPlatform={p}
                  externalConnectionId={connectionIdForPlatform(p, config) ?? null}
                  onExternalConnectionIdChange={(connId) => {
                    onViewPatch({
                      reporting_config: {
                        ...config,
                        ...connectionIdPatchForPlatform(p, connId),
                      },
                    })
                  }}
                  disconnectedPresentation={
                    platforms.length === 1 ? 'artifact-mockup' : 'amber-banner'
                  }
                  externalData={dataByPlatform[p] ?? null}
                  suppressLoadingOverlay
                  externalRefreshing={refreshing}
                  externalConnOpts={connOpts}
                  onReportingTargetSaved={() => {
                    void fetchCampaignSocialConnectionOptions(campaignId).then(setConnOpts)
                    void loadAllPlatforms({ refresh: true })
                  }}
                />
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
