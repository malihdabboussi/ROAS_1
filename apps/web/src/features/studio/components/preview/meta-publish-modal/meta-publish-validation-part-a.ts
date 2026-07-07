import { STUDIO_INLINE_ERRORS } from '@/features/studio/config/studio-inline-errors.config'
import {
  fetchAd,
  fetchAdCampaign,
  fetchMetaAdAccounts,
  fetchMetaInstagramAccountsForPage,
  fetchMetaPages,
  getMetaConnectionStatus,
} from '../../../services/artifact-preview.service'
import type { MetaPublishValidationMutable, ValidationCheck } from './meta-publish-modal.types'

export interface MetaPublishValidationPartADeps {
  adId?: string
  adCampaignId?: string
  updateCheck: (id: string, update: Partial<ValidationCheck>) => void
  setChecks: (v: ValidationCheck[] | ((prev: ValidationCheck[]) => ValidationCheck[])) => void
  setStep: (s: 'validating' | 'ready' | 'publishing' | 'success' | 'error') => void
  setPublishError: (e: string | null) => void
  setAdAccounts: (v: Array<{ id: string; name: string }>) => void
  setPages: (v: Array<{ id: string; name: string }>) => void
  setSelectedAccountId: (v: string) => void
  setSelectedPageId: (v: string) => void
  setIgAccounts: (v: Array<{ id: string; username?: string }>) => void
  setSelectedInstagramUserId: (v: string) => void
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** @returns whether to continue to part B (campaign / budget / targeting / finalize) */
export async function runMetaPublishValidationPartA(
  deps: MetaPublishValidationPartADeps,
  m: MetaPublishValidationMutable,
): Promise<boolean> {
  const {
    adId,
    adCampaignId,
    updateCheck,
    setChecks,
    setStep,
    setPublishError,
    setAdAccounts,
    setPages,
    setSelectedAccountId,
    setSelectedPageId,
    setIgAccounts,
    setSelectedInstagramUserId,
  } = deps

  const isCampaignMode = !!adCampaignId
  if (!adId && !adCampaignId) {
    setChecks([])
    setStep('ready')
    setPublishError(STUDIO_INLINE_ERRORS.META_PUBLISH_MISSING_ID)
    return false
  }
  const initialChecks: ValidationCheck[] = [
    { id: 'meta_connection', label: 'Meta account connected', status: 'pending' },
    { id: 'ad_accounts', label: 'Ad accounts available', status: 'pending' },
    { id: 'fb_pages', label: 'Facebook pages available', status: 'pending' },
    { id: 'ig_accounts', label: 'Instagram accounts available', status: 'pending' },
    { id: 'campaign', label: 'Campaign configured', status: 'pending' },
    { id: 'budget', label: 'Budget set', status: 'pending' },
    { id: 'targeting', label: 'Targeting configured', status: 'pending' },
    { id: 'ad_creative', label: 'Ad creative ready', status: 'pending' },
    { id: 'destination', label: 'Destination URL set', status: 'pending' },
  ]
  setChecks(initialChecks)
  setStep('validating')

  const fail = (id: string, error: string) => {
    updateCheck(id, { status: 'failed', error })
  }

  // 1. Meta connection
  updateCheck('meta_connection', { status: 'checking' })
  await delay(400)
  try {
    const status = await getMetaConnectionStatus()
    if (!status.connected) {
      fail('meta_connection', STUDIO_INLINE_ERRORS.META_PUBLISH_CONNECT_META)
      updateCheck('ad_accounts', {
        status: 'failed',
        error: STUDIO_INLINE_ERRORS.META_PUBLISH_SKIPPED,
      })
      updateCheck('fb_pages', {
        status: 'failed',
        error: STUDIO_INLINE_ERRORS.META_PUBLISH_SKIPPED,
      })
      updateCheck('ig_accounts', {
        status: 'failed',
        error: STUDIO_INLINE_ERRORS.META_PUBLISH_SKIPPED,
      })
      setStep('ready')
      return false
    }
    updateCheck('meta_connection', { status: 'passed' })
  } catch {
    fail('meta_connection', STUDIO_INLINE_ERRORS.META_CONNECTION_CHECK)
    setStep('ready')
    return false
  }

  // 2. Ad accounts
  updateCheck('ad_accounts', { status: 'checking' })
  await delay(300)
  try {
    m.fetchedAccounts = await fetchMetaAdAccounts()
    if (m.fetchedAccounts.length === 0) {
      fail('ad_accounts', STUDIO_INLINE_ERRORS.META_PUBLISH_NO_AD_ACCOUNTS)
    } else {
      updateCheck('ad_accounts', { status: 'passed' })
      setAdAccounts(m.fetchedAccounts)
      const preferredAccount =
        m.preferredAccountId && m.fetchedAccounts.some((a) => a.id === m.preferredAccountId)
          ? m.preferredAccountId
          : (m.fetchedAccounts[0]?.id ?? '')
      setSelectedAccountId(preferredAccount)
    }
  } catch {
    fail('ad_accounts', STUDIO_INLINE_ERRORS.LOAD_AD_ACCOUNTS)
  }

  // 3. Facebook pages
  updateCheck('fb_pages', { status: 'checking' })
  await delay(300)
  try {
    m.fetchedPages = await fetchMetaPages()
    if (m.fetchedPages.length === 0) {
      fail('fb_pages', STUDIO_INLINE_ERRORS.META_PUBLISH_NO_FB_PAGES)
    } else {
      updateCheck('fb_pages', { status: 'passed' })
      setPages(m.fetchedPages)
      const preferredPage =
        m.preferredPageId && m.fetchedPages.some((p) => p.id === m.preferredPageId)
          ? m.preferredPageId
          : (m.fetchedPages[0]?.id ?? '')
      setSelectedPageId(preferredPage)
    }
  } catch {
    fail('fb_pages', STUDIO_INLINE_ERRORS.LOAD_FB_PAGES)
  }

  // 3.5 Instagram accounts for selected page
  updateCheck('ig_accounts', { status: 'checking' })
  await delay(250)
  try {
    const selectedPageCandidate = m.preferredPageId || m.fetchedPages[0]?.id || ''
    if (!selectedPageCandidate) {
      fail('ig_accounts', STUDIO_INLINE_ERRORS.META_PUBLISH_SELECT_PAGE_FIRST)
    } else {
      const fetchedIgAccounts = await fetchMetaInstagramAccountsForPage(selectedPageCandidate)
      if (fetchedIgAccounts.length === 0) {
        fail('ig_accounts', STUDIO_INLINE_ERRORS.META_PUBLISH_NO_IG_ACCOUNT)
      } else {
        setSelectedPageId(selectedPageCandidate)
        updateCheck('ig_accounts', { status: 'passed' })
        setIgAccounts(fetchedIgAccounts)
        const preferredIg =
          m.preferredInstagramUserId &&
          fetchedIgAccounts.some((account) => account.id === m.preferredInstagramUserId)
            ? m.preferredInstagramUserId
            : (fetchedIgAccounts[0]?.id ?? '')
        setSelectedInstagramUserId(preferredIg)
      }
    }
  } catch {
    fail('ig_accounts', STUDIO_INLINE_ERRORS.LOAD_IG_ACCOUNTS)
  }

  // 4. Load ad or campaign data
  updateCheck('ad_creative', { status: 'checking' })
  await delay(300)
  try {
    if (isCampaignMode) {
      m.adCampaignData = (await fetchAdCampaign(adCampaignId)) as unknown as Record<string, unknown>
    } else {
      m.adData = (await fetchAd(adId as string)) as unknown as Record<string, unknown>
    }
  } catch {
    fail(
      'ad_creative',
      isCampaignMode
        ? STUDIO_INLINE_ERRORS.LOAD_CAMPAIGN_DATA
        : STUDIO_INLINE_ERRORS.LOAD_AD_CREATIVE,
    )
    fail('destination', STUDIO_INLINE_ERRORS.META_PUBLISH_SKIPPED)
    fail('campaign', STUDIO_INLINE_ERRORS.META_PUBLISH_SKIPPED)
    fail('budget', STUDIO_INLINE_ERRORS.META_PUBLISH_SKIPPED)
    fail('targeting', STUDIO_INLINE_ERRORS.META_PUBLISH_SKIPPED)
    setStep('ready')
    return false
  }

  if (isCampaignMode) {
    const adSets = (m.adCampaignData?.ad_sets as Array<Record<string, unknown>> | undefined) ?? []
    const allAds = adSets.flatMap(
      (set) => (set.ads as Array<Record<string, unknown>> | undefined) ?? [],
    )
    if (adSets.length === 0 || allAds.length === 0) {
      fail('ad_creative', 'Campaign must include ad sets and ads')
    } else {
      updateCheck('ad_creative', { status: 'passed' })
    }
  } else {
    if (!m.adData?.image_url && !m.adData?.generated_tsx) {
      fail('ad_creative', STUDIO_INLINE_ERRORS.META_PUBLISH_AD_NEEDS_IMAGE)
    } else if (!m.adData?.headline || !m.adData?.primary_text) {
      fail('ad_creative', STUDIO_INLINE_ERRORS.META_PUBLISH_MISSING_HEADLINE_TEXT)
    } else {
      updateCheck('ad_creative', { status: 'passed' })
    }
  }

  // 5. Destination URL
  updateCheck('destination', { status: 'checking' })
  await delay(200)
  if (isCampaignMode) {
    const adSets = (m.adCampaignData?.ad_sets as Array<Record<string, unknown>> | undefined) ?? []
    const allAds = adSets.flatMap(
      (set) => (set.ads as Array<Record<string, unknown>> | undefined) ?? [],
    )
    if (allAds.some((ad) => !ad.destination_url)) {
      fail('destination', STUDIO_INLINE_ERRORS.META_PUBLISH_ALL_ADS_NEED_URL)
    } else {
      updateCheck('destination', { status: 'passed' })
    }
  } else {
    if (!m.adData?.destination_url) {
      fail('destination', STUDIO_INLINE_ERRORS.META_PUBLISH_DESTINATION_REQUIRED)
    } else {
      updateCheck('destination', { status: 'passed' })
    }
  }

  return true
}

export function createMetaPublishMutable(
  adCampaignId: string | undefined,
  defaultAdAccountId: string | null | undefined,
  defaultPageId: string | null | undefined,
  defaultInstagramUserId: string | null | undefined,
): MetaPublishValidationMutable {
  return {
    adData: null,
    adCampaignData: null,
    campaignName: '',
    objective: '',
    dailyBudget: null,
    lifetimeBudget: null,
    countries: [],
    fetchedAccounts: [],
    fetchedPages: [],
    preferredAccountId: defaultAdAccountId ?? '',
    preferredPageId: defaultPageId ?? '',
    preferredInstagramUserId: defaultInstagramUserId ?? '',
    preferredPixelId: '',
    preferredCustomEventType: 'PURCHASE',
    resolvedCampaignId: adCampaignId ? (adCampaignId ?? null) : null,
    budgetType: 'ABO',
    scheduleType: 'continuous',
    bidStrategy: 'LOWEST_COST_WITHOUT_CAP',
    startTime: null,
    endTime: null,
    resolvedCampaignMetadata: {},
  }
}
