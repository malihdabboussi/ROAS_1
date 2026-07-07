import { useCallback, useEffect, useState } from 'react'
import {
  fetchAdCampaign,
  fetchMetaCustomAudiences,
} from '../../services/artifact-preview.service'

type CampaignScheduleType = 'continuous' | 'one_time'
type CampaignBudgetType = 'CBO' | 'ABO'

interface MetaAudience {
  id: string
  name: string
  subtype?: string
  approximate_count?: number
}

export function useAdSetSettingsCampaignContext() {
  const [scheduleType, setScheduleType] = useState<CampaignScheduleType>('continuous')
  const [campaignBudgetType, setCampaignBudgetType] = useState<CampaignBudgetType | null>(null)
  const [adAccountId, setAdAccountId] = useState<string | null>(null)
  const [metaAudiences, setMetaAudiences] = useState<MetaAudience[]>([])
  const [audiencesLoading, setAudiencesLoading] = useState(false)

  const loadCampaignContext = useCallback(
    async (adCampaignId: string, shouldApply: () => boolean = () => true) => {
      const campaign = await fetchAdCampaign(adCampaignId)
      if (!shouldApply()) return campaign
      setScheduleType((campaign.schedule_type as CampaignScheduleType) ?? 'continuous')
      setCampaignBudgetType((campaign.budget_type as CampaignBudgetType) ?? 'CBO')
      if (campaign.meta_ad_account_id) {
        setAdAccountId(campaign.meta_ad_account_id)
      }
      return campaign
    },
    [],
  )

  useEffect(() => {
    if (!adAccountId) return
    let cancelled = false
    setAudiencesLoading(true)
    fetchMetaCustomAudiences(adAccountId)
      .then((audiences) => {
        if (!cancelled) setMetaAudiences(audiences)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setAudiencesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [adAccountId])

  return {
    scheduleType,
    campaignBudgetType,
    adAccountId,
    metaAudiences,
    audiencesLoading,
    loadCampaignContext,
  }
}
