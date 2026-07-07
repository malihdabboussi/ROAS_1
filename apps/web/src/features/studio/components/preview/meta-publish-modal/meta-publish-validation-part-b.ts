import { STUDIO_INLINE_ERRORS } from '@/features/studio/config/studio-inline-errors.config'
import { fetchAdCampaign, fetchAdSet } from '../../../services/artifact-preview.service'
import type {
  MetaPublishConfig,
  MetaPublishSummary,
  MetaPublishValidationMutable,
  ValidationCheck,
} from './meta-publish-modal.types'
import { hasPositiveBudget } from './meta-publish-modal.utils'

export interface MetaPublishValidationPartBDeps {
  adCampaignId?: string
  updateCheck: (id: string, update: Partial<ValidationCheck>) => void
  setSelectedAccountId: (v: string) => void
  setSelectedPageId: (v: string) => void
  setSelectedPixelId: (v: string) => void
  setCustomEventType: (v: string) => void
  setLinkedCampaignId: (v: string | null) => void
  setLinkedCampaignMetadata: (v: Record<string, unknown>) => void
  setPublishConfig: (v: MetaPublishConfig) => void
  setSummary: (v: MetaPublishSummary) => void
  setStep: (s: 'validating' | 'ready' | 'publishing' | 'success' | 'error') => void
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function runMetaPublishValidationPartB(
  deps: MetaPublishValidationPartBDeps,
  m: MetaPublishValidationMutable,
): Promise<void> {
  const {
    adCampaignId,
    updateCheck,
    setSelectedAccountId,
    setSelectedPageId,
    setSelectedPixelId,
    setCustomEventType,
    setLinkedCampaignId,
    setLinkedCampaignMetadata,
    setPublishConfig,
    setSummary,
    setStep,
  } = deps

  const isCampaignMode = !!adCampaignId

  const fail = (id: string, error: string) => {
    updateCheck(id, { status: 'failed', error })
  }

  // 6. Campaign + budget + targeting (from ad set → ad campaign chain)
  updateCheck('campaign', { status: 'checking' })
  await delay(300)
  try {
    if (isCampaignMode && m.adCampaignData) {
      m.campaignName = (m.adCampaignData.name as string) ?? ''
      m.objective = (m.adCampaignData.objective as string) ?? ''
      m.dailyBudget = (m.adCampaignData.daily_budget as number | null) ?? null
      m.lifetimeBudget = (m.adCampaignData.lifetime_budget as number | null) ?? null
      m.budgetType = ((m.adCampaignData.budget_type as 'ABO' | 'CBO' | undefined) ?? 'ABO') as
        | 'ABO'
        | 'CBO'
      m.scheduleType = ((m.adCampaignData.schedule_type as 'continuous' | 'one_time' | undefined) ??
        'continuous') as 'continuous' | 'one_time'
      m.bidStrategy =
        (m.adCampaignData.bid_strategy as string | undefined) ?? 'LOWEST_COST_WITHOUT_CAP'
      m.startTime = (m.adCampaignData.start_time as string | null) ?? null
      m.endTime = (m.adCampaignData.end_time as string | null) ?? null
      if (m.adCampaignData.meta_ad_account_id)
        m.preferredAccountId = m.adCampaignData.meta_ad_account_id as string
      if (m.adCampaignData.meta_page_id) m.preferredPageId = m.adCampaignData.meta_page_id as string
      const campaignMetadata = (m.adCampaignData.metadata ?? {}) as Record<string, unknown>
      m.resolvedCampaignMetadata = campaignMetadata
      const campaignMetaIg = campaignMetadata.meta_instagram_user_id
      if (typeof campaignMetaIg === 'string' && campaignMetaIg) {
        m.preferredInstagramUserId = campaignMetaIg
      }
      const campaignMetaPixel = campaignMetadata.meta_pixel_id
      if (typeof campaignMetaPixel === 'string' && campaignMetaPixel) {
        m.preferredPixelId = campaignMetaPixel
      }
      const campaignMetaCustomEventType = campaignMetadata.meta_custom_event_type
      if (typeof campaignMetaCustomEventType === 'string' && campaignMetaCustomEventType) {
        m.preferredCustomEventType = campaignMetaCustomEventType
      }
      m.resolvedCampaignId = String(m.adCampaignData.id ?? adCampaignId ?? '')

      if (!m.objective) {
        fail('campaign', STUDIO_INLINE_ERRORS.META_PUBLISH_OBJECTIVE_NOT_SET)
      } else {
        updateCheck('campaign', { status: 'passed' })
      }

      updateCheck('budget', { status: 'checking' })
      await delay(200)
      const adSets = (m.adCampaignData.ad_sets as Array<Record<string, unknown>> | undefined) ?? []
      const isContinuous = m.scheduleType === 'continuous'
      if (m.budgetType === 'CBO') {
        if (isContinuous) {
          if (!hasPositiveBudget(m.dailyBudget)) {
            fail('budget', STUDIO_INLINE_ERRORS.META_PUBLISH_SET_CAMPAIGN_BUDGET_BEFORE)
          } else {
            updateCheck('budget', { status: 'passed' })
          }
        } else {
          if (!hasPositiveBudget(m.lifetimeBudget)) {
            fail('budget', 'One-Time CBO requires a lifetime budget on the campaign')
          } else {
            updateCheck('budget', { status: 'passed' })
          }
        }
      } else {
        if (isContinuous) {
          const missingAdSetBudget = adSets.some((adSet) => {
            const adSetDailyBudget =
              typeof adSet.daily_budget === 'number' ? (adSet.daily_budget as number) : null
            return !hasPositiveBudget(adSetDailyBudget)
          })
          if (missingAdSetBudget) {
            fail('budget', 'All ad sets need a daily budget for ABO (Continuous schedule)')
          } else {
            updateCheck('budget', { status: 'passed' })
          }
        } else {
          const missingAdSetBudget = adSets.some((adSet) => {
            const adSetDailyBudget =
              typeof adSet.daily_budget === 'number' ? (adSet.daily_budget as number) : null
            const adSetLifetimeBudget =
              typeof adSet.lifetime_budget === 'number' ? (adSet.lifetime_budget as number) : null
            return !hasPositiveBudget(adSetDailyBudget) && !hasPositiveBudget(adSetLifetimeBudget)
          })
          if (missingAdSetBudget) {
            fail('budget', 'All ad sets need a daily or lifetime budget for ABO (One-Time)')
          } else {
            updateCheck('budget', { status: 'passed' })
          }
        }
      }

      updateCheck('targeting', { status: 'checking' })
      await delay(200)
      const hasMissingTargeting = adSets.some((adSet) => {
        const targeting = (adSet.targeting ?? {}) as Record<string, unknown>
        return Object.keys(targeting).length === 0
      })
      if (hasMissingTargeting) {
        fail('targeting', STUDIO_INLINE_ERRORS.META_PUBLISH_NEED_TARGETING)
      } else {
        const firstTargeting =
          ((adSets[0]?.targeting as Record<string, unknown> | undefined)?.geo_locations as
            | Record<string, unknown>
            | undefined) ?? {}
        m.countries = (firstTargeting.countries as string[] | undefined) ?? []
        updateCheck('targeting', { status: 'passed' })
      }
    } else if (m.adData?.ad_set_id) {
      const adSet = await fetchAdSet(m.adData.ad_set_id as string)
      const targeting = (adSet.targeting ?? {}) as Record<string, unknown>
      const geo = (targeting.geo_locations ?? {}) as Record<string, unknown>
      m.countries = (geo.countries ?? []) as string[]

      if (adSet.ad_campaign_id) {
        const adCampaign = await fetchAdCampaign(adSet.ad_campaign_id)
        m.resolvedCampaignId = String(adCampaign.id ?? adSet.ad_campaign_id)
        m.campaignName = adCampaign.name ?? ''
        m.objective = adCampaign.objective ?? ''
        m.dailyBudget = adCampaign.daily_budget ?? null
        m.lifetimeBudget = adCampaign.lifetime_budget ?? null
        m.budgetType = (adCampaign.budget_type as 'ABO' | 'CBO' | undefined) ?? 'ABO'
        m.scheduleType =
          (adCampaign.schedule_type as 'continuous' | 'one_time' | undefined) ?? 'continuous'
        m.bidStrategy = (adCampaign.bid_strategy as string | undefined) ?? 'LOWEST_COST_WITHOUT_CAP'
        m.startTime = (adCampaign.start_time as string | null) ?? null
        m.endTime = (adCampaign.end_time as string | null) ?? null
        if (adCampaign.meta_ad_account_id) m.preferredAccountId = adCampaign.meta_ad_account_id
        if (adCampaign.meta_page_id) m.preferredPageId = adCampaign.meta_page_id

        const campaignMetadata = (adCampaign.metadata ?? {}) as Record<string, unknown>
        m.resolvedCampaignMetadata = campaignMetadata
        const campaignMetaIg = campaignMetadata.meta_instagram_user_id
        if (typeof campaignMetaIg === 'string' && campaignMetaIg) {
          m.preferredInstagramUserId = campaignMetaIg
        }
        const campaignMetaPixel = campaignMetadata.meta_pixel_id
        if (typeof campaignMetaPixel === 'string' && campaignMetaPixel) {
          m.preferredPixelId = campaignMetaPixel
        }
        const campaignMetaCustomEventType = campaignMetadata.meta_custom_event_type
        if (typeof campaignMetaCustomEventType === 'string' && campaignMetaCustomEventType) {
          m.preferredCustomEventType = campaignMetaCustomEventType
        }

        if (!m.objective) {
          fail('campaign', STUDIO_INLINE_ERRORS.META_PUBLISH_OBJECTIVE_NOT_SET)
        } else {
          updateCheck('campaign', { status: 'passed' })
        }
      } else {
        updateCheck('campaign', { status: 'passed' })
      }

      // Budget
      updateCheck('budget', { status: 'checking' })
      await delay(200)
      const adSetDailyBudget =
        typeof adSet.daily_budget === 'number' ? (adSet.daily_budget as number) : null
      const adSetLifetimeBudget =
        typeof adSet.lifetime_budget === 'number' ? (adSet.lifetime_budget as number) : null
      const isContinuous = m.scheduleType === 'continuous'
      const campaignHasBudget =
        m.budgetType === 'CBO'
          ? isContinuous
            ? hasPositiveBudget(m.dailyBudget)
            : hasPositiveBudget(m.lifetimeBudget)
          : hasPositiveBudget(m.dailyBudget) || hasPositiveBudget(m.lifetimeBudget)
      const adSetHasBudget = isContinuous
        ? hasPositiveBudget(adSetDailyBudget)
        : hasPositiveBudget(adSetDailyBudget) || hasPositiveBudget(adSetLifetimeBudget)
      const hasValidBudget = m.budgetType === 'CBO' ? campaignHasBudget : adSetHasBudget

      if (!hasValidBudget) {
        fail(
          'budget',
          m.budgetType === 'CBO'
            ? STUDIO_INLINE_ERRORS.META_PUBLISH_SET_CAMPAIGN_BUDGET
            : STUDIO_INLINE_ERRORS.META_PUBLISH_SET_ADSET_BUDGET,
        )
      } else {
        updateCheck('budget', { status: 'passed' })
      }

      // Targeting
      updateCheck('targeting', { status: 'checking' })
      await delay(200)
      const isWorldwide = m.countries.includes('WW')
      if (m.countries.length === 0 && !isWorldwide) {
        fail('targeting', STUDIO_INLINE_ERRORS.META_PUBLISH_ADD_TARGET_COUNTRY)
      } else {
        updateCheck('targeting', { status: 'passed' })
      }
    } else {
      updateCheck('campaign', { status: 'passed' })
      updateCheck('budget', { status: 'checking' })
      await delay(200)
      fail('budget', STUDIO_INLINE_ERRORS.META_PUBLISH_AD_NOT_LINKED)
      updateCheck('targeting', { status: 'checking' })
      await delay(200)
      fail('targeting', STUDIO_INLINE_ERRORS.META_PUBLISH_AD_NOT_LINKED)
    }
  } catch {
    fail('campaign', STUDIO_INLINE_ERRORS.LOAD_CAMPAIGN_DATA)
    fail('budget', 'Skipped')
    fail('targeting', 'Skipped')
  }

  const adMetadata = (m.adData?.metadata ?? {}) as Record<string, unknown>
  if (!isCampaignMode) {
    const adMetaIg = adMetadata.meta_instagram_user_id
    if (typeof adMetaIg === 'string' && adMetaIg) m.preferredInstagramUserId = adMetaIg
    const adMetaPage = adMetadata.meta_page_id
    if (typeof adMetaPage === 'string' && adMetaPage) m.preferredPageId = adMetaPage
    const adMetaAccount = adMetadata.meta_ad_account_id
    if (typeof adMetaAccount === 'string' && adMetaAccount) m.preferredAccountId = adMetaAccount
  }

  if (m.preferredAccountId && m.fetchedAccounts.some((a) => a.id === m.preferredAccountId)) {
    setSelectedAccountId(m.preferredAccountId)
  }
  if (m.preferredPageId && m.fetchedPages.some((p) => p.id === m.preferredPageId)) {
    setSelectedPageId(m.preferredPageId)
  }
  setSelectedPixelId(m.preferredPixelId)
  setCustomEventType(m.preferredCustomEventType)
  setLinkedCampaignId(m.resolvedCampaignId)
  setLinkedCampaignMetadata(m.resolvedCampaignMetadata)
  setPublishConfig({
    budgetType: m.budgetType,
    scheduleType: m.scheduleType,
    bidStrategy: m.bidStrategy,
    objective: m.objective,
    dailyBudget: m.dailyBudget,
    lifetimeBudget: m.lifetimeBudget,
    startTime: m.startTime,
    endTime: m.endTime,
    campaignName: m.campaignName,
  })

  setSummary({
    campaignName: m.campaignName,
    objective: m.objective,
    dailyBudget: m.dailyBudget,
    lifetimeBudget: m.lifetimeBudget,
    countries: m.countries,
    headline: isCampaignMode ? m.campaignName : ((m.adData?.headline as string) ?? ''),
    adName: isCampaignMode ? m.campaignName : ((m.adData?.headline as string) ?? 'Untitled Ad'),
    totalAdSets: isCampaignMode
      ? ((m.adCampaignData?.ad_sets as Array<Record<string, unknown>> | undefined) ?? []).length
      : undefined,
    totalAds: isCampaignMode
      ? ((m.adCampaignData?.ad_sets as Array<Record<string, unknown>> | undefined) ?? []).reduce(
          (sum, set) =>
            sum + ((set.ads as Array<Record<string, unknown>> | undefined) ?? []).length,
          0,
        )
      : undefined,
  })

  setStep('ready')
}
