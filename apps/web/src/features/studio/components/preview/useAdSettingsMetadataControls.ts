import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import {
  fetchAdCampaign,
  fetchAdSet,
  fetchMetaInstagramAccountsForPage,
  fetchMetaPage,
  fetchMetaPages,
} from '../../services/artifact-preview.service'
import type { Ad } from '../../types'

type AdSetupType = 'create_ad' | 'use_existing_post'

interface UseAdSettingsMetadataControlsParams {
  ad: Ad | null
  saveMetadata: (meta: Record<string, unknown>) => Promise<void>
  setPerPlacement: Dispatch<SetStateAction<boolean>>
  onPerPlacementChange?: (perPlacement: boolean) => void
}

export function useAdSettingsMetadataControls({
  ad,
  saveMetadata,
  setPerPlacement,
  onPerPlacementChange,
}: UseAdSettingsMetadataControlsParams) {
  const [metaPages, setMetaPages] = useState<Array<{ id: string; name: string }>>([])
  const [metaIgAccounts, setMetaIgAccounts] = useState<
    Array<{ id: string; username?: string; profile_pic?: string }>
  >([])
  const [campaignPageId, setCampaignPageId] = useState<string | null>(null)
  const [campaignPageName, setCampaignPageName] = useState<string | null>(null)
  const [partnershipAd, setPartnershipAd] = useState(false)
  const [adSetupType, setAdSetupType] = useState<AdSetupType>('create_ad')
  const [existingPostId, setExistingPostId] = useState('')
  const [advancedExpanded, setAdvancedExpanded] = useState(false)
  const [selectPostModalOpen, setSelectPostModalOpen] = useState(false)

  const adPageId = (ad?.metadata?.meta_page_id as string) || null
  const adIgUserId = (ad?.metadata?.meta_instagram_user_id as string) || null
  const effectivePageId = adPageId || campaignPageId

  useEffect(() => {
    const hasPlacementImages = ad && Object.keys(ad.placement_images ?? {}).length > 0
    if (hasPlacementImages) setPerPlacement(true)
    onPerPlacementChange?.(!!hasPlacementImages)
    const meta = ad?.metadata || {}
    setPartnershipAd(!!meta.partnership_ad)
    if (meta.ad_setup_type === 'use_existing_post') {
      setAdSetupType('use_existing_post')
      setExistingPostId((meta.existing_post_id as string) || '')
    }
  }, [ad?.id, ad?.metadata, ad?.placement_images, onPerPlacementChange, setPerPlacement])

  useEffect(() => {
    if (!ad?.ad_set_id) return
    let cancelled = false
    fetchAdSet(ad.ad_set_id)
      .then((adSet) => fetchAdCampaign(adSet.ad_campaign_id))
      .then((campaign) => {
        if (cancelled || !campaign.meta_page_id) return
        setCampaignPageId(campaign.meta_page_id)
        return fetchMetaPage(campaign.meta_page_id)
      })
      .then((page) => {
        if (!cancelled && page) setCampaignPageName(page.name)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [ad?.ad_set_id])

  useEffect(() => {
    fetchMetaPages()
      .then(setMetaPages)
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!effectivePageId) {
      setMetaIgAccounts([])
      return
    }
    fetchMetaInstagramAccountsForPage(effectivePageId)
      .then(setMetaIgAccounts)
      .catch(() => setMetaIgAccounts([]))
  }, [effectivePageId])

  const handleSetMetaPageId = useCallback(
    (value: string) => {
      const meta = { ...(ad?.metadata || {}) }
      if (value === 'campaign_default') {
        delete meta.meta_page_id
        delete meta.meta_instagram_user_id
        void saveMetadata(meta)
        return
      }
      void saveMetadata({ ...meta, meta_page_id: value })
    },
    [ad?.metadata, saveMetadata],
  )

  const handleSetInstagramUserId = useCallback(
    (value: string) => {
      void saveMetadata({ ...(ad?.metadata || {}), meta_instagram_user_id: value })
    },
    [ad?.metadata, saveMetadata],
  )

  const handleSetPartnershipAd = useCallback(
    (checked: boolean) => {
      setPartnershipAd(checked)
      void saveMetadata({ ...(ad?.metadata || {}), partnership_ad: checked })
    },
    [ad?.metadata, saveMetadata],
  )

  const handleSetAdSetupType = useCallback(
    (value: AdSetupType) => {
      setAdSetupType(value)
      void saveMetadata({
        ...(ad?.metadata || {}),
        ad_setup_type: value,
        ...(value === 'create_ad' ? { existing_post_id: null } : {}),
      })
    },
    [ad?.metadata, saveMetadata],
  )

  const handleSaveExistingPostId = useCallback(() => {
    void saveMetadata({
      ...(ad?.metadata || {}),
      ad_setup_type: 'use_existing_post',
      existing_post_id: existingPostId,
    })
  }, [ad?.metadata, existingPostId, saveMetadata])

  const handleSaveAdvantageEnhancements = useCallback(
    (next: Record<string, boolean>) => {
      void saveMetadata({ ...(ad?.metadata || {}), advantage_plus_enhancements: next })
    },
    [ad?.metadata, saveMetadata],
  )

  return {
    adPageId,
    adIgUserId,
    effectivePageId,
    metaPages,
    metaIgAccounts,
    campaignPageName,
    partnershipAd,
    adSetupType,
    existingPostId,
    advancedExpanded,
    selectPostModalOpen,
    handleSetMetaPageId,
    handleSetInstagramUserId,
    handleSetPartnershipAd,
    handleSetAdSetupType,
    setExistingPostId,
    handleSaveExistingPostId,
    handleSaveAdvantageEnhancements,
    handleToggleAdvancedExpanded: () => setAdvancedExpanded((previous) => !previous),
    handleOpenSelectPostModal: () => setSelectPostModalOpen(true),
    handleCloseSelectPostModal: () => setSelectPostModalOpen(false),
  }
}
