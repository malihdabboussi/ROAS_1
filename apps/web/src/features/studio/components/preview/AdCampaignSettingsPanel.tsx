'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { ADS_TOAST_ERRORS } from '../../config/ads-toast-errors.config'
import { STUDIO_INLINE_ERRORS } from '../../config/studio-inline-errors.config'
import {
  fetchAdCampaign,
  setAdCampaignMetaStatus,
  updateAdCampaign,
} from '../../services/artifact-preview.service'
import { fetchCampaign } from '../../services/campaign.service'
import type { AdCampaign } from '../../types'
import { AdCampaignSettingsHeaderControls } from './AdCampaignSettingsHeaderControls'
import { AdCampaignSettingsPanelBody } from './AdCampaignSettingsPanelBody'
import { MetaIntegrationsReviewModal } from './MetaIntegrationsReviewModal'
import { MetaPublishModal } from './MetaPublishModal'
import type {
  AdCampaignFieldState,
  AdCampaignSettingsAppearance,
} from './ad-campaign-settings-panel.types'

function formatBudgetDisplay(cents: number | null): string {
  if (cents === null || cents === 0) return ''
  return (cents / 100).toFixed(2)
}

function parseBudgetInput(val: string): number | null {
  const n = parseFloat(val)
  if (isNaN(n) || n <= 0) return null
  return Math.round(n * 100)
}

interface AdCampaignSettingsPanelProps {
  adCampaignId: string
  onUpdated?: (c: AdCampaign) => void
  /** Fired on optimistic local edits (e.g. name while typing) so parent lists stay in sync. */
  onCampaignChange?: (c: AdCampaign) => void
  headerTrailing?: ReactNode
  /** Spaces paid-ads detail: bordered panel, standard field chrome (no glass). */
  appearance?: AdCampaignSettingsAppearance
}

export function AdCampaignSettingsPanel({
  adCampaignId,
  onUpdated,
  onCampaignChange,
  headerTrailing,
  appearance = 'studio',
}: AdCampaignSettingsPanelProps) {
  const isSpaces = appearance === 'spaces'
  const [data, setData] = useState<AdCampaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fieldStates, setFieldStates] = useState<Record<string, AdCampaignFieldState>>({})
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const [settingMetaStatus, setSettingMetaStatus] = useState(false)

  const hasMetaCampaignId = !!data?.meta_campaign_id
  const hasCompletePublishedTree =
    hasMetaCampaignId &&
    (data?.ad_sets ?? []).length > 0 &&
    (data?.ad_sets ?? []).every((adSet) => {
      if (!adSet.meta_adset_id) return false
      return (adSet.ads ?? []).every((ad) => !!ad.meta_ad_id)
    })
  const isPublished = hasCompletePublishedTree
  const canRepublish = hasMetaCampaignId && !hasCompletePublishedTree
  const isPostLaunchLocked = hasCompletePublishedTree
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [publishModalOpen, setPublishModalOpen] = useState(false)
  const [simpleMode, setSimpleMode] = useState(true)
  const [dailyBudgetText, setDailyBudgetText] = useState('')
  const [lifetimeBudgetText, setLifetimeBudgetText] = useState('')
  const [campaignMetaDefaults, setCampaignMetaDefaults] = useState<{
    meta_ad_account_id?: string | null
    meta_page_id?: string | null
    meta_instagram_user_id?: string | null
    meta_pixel_id?: string | null
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchAdCampaign(adCampaignId)
      .then((row) => {
        if (cancelled) return
        setData(row)
        setDailyBudgetText(formatBudgetDisplay(row.daily_budget))
        setLifetimeBudgetText(formatBudgetDisplay(row.lifetime_budget))
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : STUDIO_INLINE_ERRORS.LOAD_GENERIC)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [adCampaignId])

  useEffect(() => {
    if (!data?.campaign_id) {
      setCampaignMetaDefaults(null)
      return
    }
    let cancelled = false
    fetchCampaign(data.campaign_id)
      .then((c) => {
        if (cancelled) return
        const defaults = (c.config as Record<string, unknown> | undefined)?.meta_defaults as
          | {
              meta_ad_account_id?: string | null
              meta_page_id?: string | null
              meta_instagram_user_id?: string | null
              meta_pixel_id?: string | null
            }
          | undefined
        setCampaignMetaDefaults(defaults ?? null)
      })
      .catch(() => {
        if (!cancelled) setCampaignMetaDefaults(null)
      })
    return () => {
      cancelled = true
    }
  }, [data?.campaign_id])

  const handleSetMetaStatus = useCallback(
    async (status: 'ACTIVE' | 'PAUSED') => {
      setSettingMetaStatus(true)
      setRefreshError(null)
      try {
        await setAdCampaignMetaStatus(adCampaignId, status)
        const updated = await fetchAdCampaign(adCampaignId)
        setData(updated)
        onUpdated?.(updated)
      } catch (err) {
        setRefreshError(
          err instanceof Error ? err.message : STUDIO_INLINE_ERRORS.UPDATE_META_STATUS,
        )
      } finally {
        setSettingMetaStatus(false)
      }
    },
    [adCampaignId, onUpdated],
  )

  const saveField = useCallback(
    async (field: string, value: unknown) => {
      setFieldStates((prev) => ({ ...prev, [field]: 'saving' }))
      try {
        const updated = await updateAdCampaign(adCampaignId, { [field]: value })
        setData(updated)
        onUpdated?.(updated)
        setFieldStates((prev) => ({ ...prev, [field]: 'saved' }))
        setTimeout(() => setFieldStates((prev) => ({ ...prev, [field]: 'idle' })), 1500)
      } catch {
        toast.error(ADS_TOAST_ERRORS.SAVE_FAILED.userMessage)
        setFieldStates((prev) => ({ ...prev, [field]: 'error' }))
        setTimeout(() => setFieldStates((prev) => ({ ...prev, [field]: 'idle' })), 3000)
      }
    },
    [adCampaignId, onUpdated],
  )

  const handleTextChange = useCallback(
    (field: string, value: string) => {
      setData((prev) => {
        if (!prev) return prev
        const next = { ...prev, [field]: value }
        onCampaignChange?.(next)
        return next
      })
      if (debounceTimers.current[field]) clearTimeout(debounceTimers.current[field])
      debounceTimers.current[field] = setTimeout(() => saveField(field, value), 800)
    },
    [saveField, onCampaignChange],
  )

  const handleSelectChange = useCallback(
    (field: string, value: string) => {
      setData((prev) => (prev ? { ...prev, [field]: value } : prev))
      void saveField(field, value)
    },
    [saveField],
  )

  const handleBudgetChange = useCallback(
    (field: 'daily_budget' | 'lifetime_budget', textValue: string) => {
      if (field === 'daily_budget') setDailyBudgetText(textValue)
      else setLifetimeBudgetText(textValue)
      if (debounceTimers.current[field]) clearTimeout(debounceTimers.current[field])
      debounceTimers.current[field] = setTimeout(() => {
        const cents = parseBudgetInput(textValue)
        void saveField(field, cents)
      }, 800)
    },
    [saveField],
  )

  const handleApplyTimelinePreset = useCallback(
    async (days: number) => {
      const start = new Date()
      start.setDate(start.getDate() + 1)
      start.setHours(0, 0, 0, 0)
      const end = new Date(start)
      end.setDate(end.getDate() + days)
      const startIso = start.toISOString()
      const endIso = end.toISOString()
      setData((prev) => (prev ? { ...prev, start_time: startIso, end_time: endIso } : prev))
      setFieldStates((prev) => ({
        ...prev,
        start_time: 'saving',
        end_time: 'saving',
      }))
      try {
        const updated = await updateAdCampaign(adCampaignId, {
          start_time: startIso,
          end_time: endIso,
        })
        setData(updated)
        onUpdated?.(updated)
        setFieldStates((prev) => ({
          ...prev,
          start_time: 'saved',
          end_time: 'saved',
        }))
        setTimeout(
          () =>
            setFieldStates((prev) => ({
              ...prev,
              start_time: 'idle',
              end_time: 'idle',
            })),
          1500,
        )
      } catch {
        toast.error(ADS_TOAST_ERRORS.SAVE_FAILED.userMessage)
        setFieldStates((prev) => ({
          ...prev,
          start_time: 'error',
          end_time: 'error',
        }))
      }
    },
    [adCampaignId, onUpdated],
  )

  const handleStartTimeChange = useCallback(
    (value: string | null) => {
      setData((prev) => (prev ? { ...prev, start_time: value } : prev))
      void saveField('start_time', value)
    },
    [saveField],
  )

  const handleEndTimeChange = useCallback(
    (value: string | null) => {
      setData((prev) => (prev ? { ...prev, end_time: value } : prev))
      void saveField('end_time', value)
    },
    [saveField],
  )

  const handleToggleAdvanced = useCallback(() => {
    setSimpleMode((prev) => !prev)
  }, [])

  const handleOpenPublish = useCallback(() => {
    if (!data) return
    setReviewModalOpen(true)
  }, [data])

  const handleContinueToPublish = useCallback(() => {
    setPublishModalOpen(true)
  }, [])

  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(clearTimeout)
    }
  }, [])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <VibeyLoadingOrb size="sm" text="Loading campaign..." />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <AlertCircle className="text-muted-foreground/40 h-8 w-8" />
        <p className="body-3 text-muted-foreground">{error ?? 'Not found'}</p>
      </div>
    )
  }

  return (
    <div
      className={
        isSpaces
          ? 'flex min-h-0 flex-1 flex-col overflow-hidden'
          : 'bg-card flex h-full flex-col overflow-hidden'
      }
    >
      {!isSpaces ? (
        <div className="border-border space-y-2 border-b px-5 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="body-2 text-foreground truncate font-semibold">CAMPAIGN SETTINGS</p>
            <AdCampaignSettingsHeaderControls
              isPublished={isPublished}
              canRepublish={canRepublish}
              metaEffectiveStatus={data.meta_effective_status}
              settingMetaStatus={settingMetaStatus}
              headerTrailing={headerTrailing}
              onOpenPublish={handleOpenPublish}
              onSetMetaStatus={handleSetMetaStatus}
            />
          </div>
          {refreshError && <span className="typo-caption text-destructive">{refreshError}</span>}
        </div>
      ) : null}

      <AdCampaignSettingsPanelBody
        appearance={appearance}
        data={data}
        fieldStates={fieldStates}
        simpleMode={simpleMode}
        dailyBudgetText={dailyBudgetText}
        lifetimeBudgetText={lifetimeBudgetText}
        isPostLaunchLocked={isPostLaunchLocked}
        onTextChange={handleTextChange}
        onSelectChange={handleSelectChange}
        onBudgetChange={handleBudgetChange}
        onToggleAdvanced={handleToggleAdvanced}
        onApplyTimelinePreset={handleApplyTimelinePreset}
        onStartTimeChange={handleStartTimeChange}
        onEndTimeChange={handleEndTimeChange}
      />
      {!isSpaces ? (
        <>
          <MetaIntegrationsReviewModal
            open={reviewModalOpen}
            onClose={() => setReviewModalOpen(false)}
            onContinueToPublish={handleContinueToPublish}
            platformCampaignId={data.campaign_id ?? null}
          />
          <MetaPublishModal
            open={publishModalOpen}
            adCampaignId={adCampaignId}
            defaultAdAccountId={
              data.meta_ad_account_id ?? campaignMetaDefaults?.meta_ad_account_id ?? null
            }
            defaultPageId={data.meta_page_id ?? campaignMetaDefaults?.meta_page_id ?? null}
            defaultInstagramUserId={
              ((data.metadata as Record<string, unknown> | undefined)?.meta_instagram_user_id as
                | string
                | undefined) ??
              campaignMetaDefaults?.meta_instagram_user_id ??
              null
            }
            platformCampaignId={data.campaign_id ?? null}
            onClose={() => {
              setPublishModalOpen(false)
            }}
            onPublished={async () => {
              const updated = await fetchAdCampaign(adCampaignId)
              setData(updated)
              onUpdated?.(updated)
            }}
          />
        </>
      ) : null}
    </div>
  )
}
