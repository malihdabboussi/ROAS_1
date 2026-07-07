import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { STUDIO_INLINE_ERRORS } from '../../config/studio-inline-errors.config'
import {
  fetchAdSet,
  getAdSetDeliveryEstimate,
  setAdSetMetaStatus,
} from '../../services/artifact-preview.service'
import type { AdSet } from '../../types'
import type { AdSetDeliveryEstimate } from './AdSetDeliveryEstimateField'

interface UseAdSetSettingsLifecycleParams {
  adSetId: string
  adSet: AdSet | null
  setAdSet: Dispatch<SetStateAction<AdSet | null>>
  syncBudgetText: (adSet: Pick<AdSet, 'daily_budget' | 'lifetime_budget'>) => void
  loadCampaignContext: (
    adCampaignId: string,
    shouldApply?: () => boolean,
  ) => Promise<unknown>
  onUpdated?: (adSet: AdSet) => void
}

function normalizeEstimateError(error: unknown): string {
  const message = error instanceof Error ? error.message : STUDIO_INLINE_ERRORS.LOAD_ESTIMATE
  if (
    message.includes('No Meta ad account found') ||
    message.includes('Connect Meta first') ||
    message.includes('Missing') ||
    message.includes('not connected')
  ) {
    return 'Not Connected'
  }
  return message
}

export function useAdSetSettingsLifecycle({
  adSetId,
  adSet,
  setAdSet,
  syncBudgetText,
  loadCampaignContext,
  onUpdated,
}: UseAdSetSettingsLifecycleParams) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const [settingMetaStatus, setSettingMetaStatus] = useState(false)
  const [deliveryEstimate, setDeliveryEstimate] = useState<AdSetDeliveryEstimate | null>(null)
  const [estimateLoading, setEstimateLoading] = useState(false)
  const [estimateError, setEstimateError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchAdSet(adSetId)
      .then(async (row) => {
        if (cancelled) return
        setAdSet(row)
        syncBudgetText(row)
        if (row.ad_campaign_id) {
          await loadCampaignContext(row.ad_campaign_id, () => !cancelled)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : STUDIO_INLINE_ERRORS.LOAD_GENERIC)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [adSetId, loadCampaignContext, setAdSet, syncBudgetText])

  const handleSetMetaStatus = useCallback(
    async (status: 'ACTIVE' | 'PAUSED') => {
      setSettingMetaStatus(true)
      setRefreshError(null)
      try {
        await setAdSetMetaStatus(adSetId, status)
        const updated = await fetchAdSet(adSetId)
        setAdSet(updated)
        onUpdated?.(updated)
      } catch (err) {
        setRefreshError(
          err instanceof Error ? err.message : STUDIO_INLINE_ERRORS.UPDATE_META_STATUS,
        )
      } finally {
        setSettingMetaStatus(false)
      }
    },
    [adSetId, onUpdated, setAdSet],
  )

  const handleFetchEstimate = useCallback(async () => {
    setEstimateLoading(true)
    setEstimateError(null)
    try {
      const estimate = await getAdSetDeliveryEstimate(adSetId)
      setDeliveryEstimate(estimate)
    } catch (err) {
      setEstimateError(normalizeEstimateError(err))
    } finally {
      setEstimateLoading(false)
    }
  }, [adSetId])

  useEffect(() => {
    if (!adSet) return
    const targeting = (adSet.targeting ?? {}) as Record<string, unknown>
    const geo = (targeting.geo_locations ?? {}) as Record<string, unknown>
    const countries = (geo.countries ?? []) as string[]
    if (countries.length > 0) {
      void handleFetchEstimate()
    }
  }, [adSet?.id, handleFetchEstimate])

  return {
    loading,
    error,
    refreshError,
    settingMetaStatus,
    deliveryEstimate,
    estimateLoading,
    estimateError,
    handleSetMetaStatus,
    handleFetchEstimate,
  }
}
