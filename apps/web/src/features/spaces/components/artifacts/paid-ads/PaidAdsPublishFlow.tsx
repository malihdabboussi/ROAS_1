'use client'

import { useCallback, useEffect, useState } from 'react'
import { MetaIntegrationsReviewModal } from '@/components/artifacts/paid-ads/MetaIntegrationsReviewModalAdapter'
import { MetaPublishModal } from '@/components/artifacts/paid-ads/MetaPublishModalAdapter'
import type { AdCampaign } from '@/lib/artifacts'
import { fetchAdCampaign, fetchCampaignAdCampaigns } from '@/lib/artifacts/paid-ads-api'
import { fetchCampaign } from '@/lib/campaigns'
import { PAID_ADS_META_STATUS_REFRESHED_EVENT } from './use-paid-ads-data'

export function PaidAdsPublishFlow({
  platformCampaignId,
  reviewOpen,
  onReviewClose,
}: {
  platformCampaignId: string
  reviewOpen: boolean
  onReviewClose: () => void
}) {
  const [adCampaignOptions, setAdCampaignOptions] = useState<Array<{ id: string; name: string }>>(
    [],
  )
  const [publishModalOpen, setPublishModalOpen] = useState(false)
  const [publishTarget, setPublishTarget] = useState<AdCampaign | null>(null)
  const [campaignMetaDefaults, setCampaignMetaDefaults] = useState<{
    meta_ad_account_id?: string | null
    meta_page_id?: string | null
    meta_instagram_user_id?: string | null
    meta_pixel_id?: string | null
  } | null>(null)

  useEffect(() => {
    if (!reviewOpen) return
    let cancelled = false
    fetchCampaignAdCampaigns(platformCampaignId)
      .then((rows) => {
        if (cancelled) return
        setAdCampaignOptions(
          rows.map((c) => ({ id: c.id, name: c.name?.trim() || 'Untitled Campaign' })),
        )
      })
      .catch(() => {
        if (!cancelled) setAdCampaignOptions([])
      })
    return () => {
      cancelled = true
    }
  }, [reviewOpen, platformCampaignId])

  const handleContinueToPublish = useCallback(
    async (adCampaignId?: string) => {
      if (!adCampaignId) return
      const [row, platform] = await Promise.all([
        fetchAdCampaign(adCampaignId),
        fetchCampaign(platformCampaignId),
      ])
      const defaults = (platform.config as Record<string, unknown> | undefined)?.meta_defaults as
        | {
            meta_ad_account_id?: string | null
            meta_page_id?: string | null
            meta_instagram_user_id?: string | null
            meta_pixel_id?: string | null
          }
        | undefined
      setCampaignMetaDefaults(defaults ?? null)
      setPublishTarget(row)
      onReviewClose()
      setPublishModalOpen(true)
    },
    [onReviewClose, platformCampaignId],
  )

  const handlePublished = useCallback(async () => {
    window.dispatchEvent(
      new CustomEvent(PAID_ADS_META_STATUS_REFRESHED_EVENT, {
        detail: { campaignId: platformCampaignId },
      }),
    )
  }, [platformCampaignId])

  return (
    <>
      <MetaIntegrationsReviewModal
        open={reviewOpen}
        onClose={onReviewClose}
        onContinueToPublish={(id) => void handleContinueToPublish(id)}
        platformCampaignId={platformCampaignId}
        adCampaignOptions={adCampaignOptions}
        launchBeforeReview
      />
      {publishTarget ? (
        <MetaPublishModal
          open={publishModalOpen}
          adCampaignId={publishTarget.id}
          defaultAdAccountId={
            publishTarget.meta_ad_account_id ?? campaignMetaDefaults?.meta_ad_account_id ?? null
          }
          defaultPageId={publishTarget.meta_page_id ?? campaignMetaDefaults?.meta_page_id ?? null}
          defaultInstagramUserId={
            ((publishTarget.metadata as Record<string, unknown> | undefined)
              ?.meta_instagram_user_id as string | undefined) ??
            campaignMetaDefaults?.meta_instagram_user_id ??
            null
          }
          platformCampaignId={platformCampaignId}
          onClose={() => {
            setPublishModalOpen(false)
            setPublishTarget(null)
          }}
          onPublished={() => void handlePublished()}
        />
      ) : null}
    </>
  )
}
