import type { AdSet } from '../../types'
import { MetaIntegrationsReviewModal } from './MetaIntegrationsReviewModal'
import { MetaPublishModal } from './MetaPublishModal'

interface AdSetSettingsPublishModalsProps {
  data: AdSet
  reviewModalOpen: boolean
  publishModalOpen: boolean
  onReviewModalClose: () => void
  onContinueToPublish: () => void
  onPublishModalClose: () => void
  onPublished: () => void
}

export function AdSetSettingsPublishModals({
  data,
  reviewModalOpen,
  publishModalOpen,
  onReviewModalClose,
  onContinueToPublish,
  onPublishModalClose,
  onPublished,
}: AdSetSettingsPublishModalsProps) {
  const metadata = data.metadata as Record<string, unknown> | undefined

  return (
    <>
      <MetaIntegrationsReviewModal
        open={reviewModalOpen}
        onClose={onReviewModalClose}
        onContinueToPublish={onContinueToPublish}
      />
      <MetaPublishModal
        open={publishModalOpen}
        adCampaignId={data.ad_campaign_id}
        defaultAdAccountId={(metadata?.meta_ad_account_id as string | undefined) ?? null}
        defaultPageId={(metadata?.meta_page_id as string | undefined) ?? null}
        defaultInstagramUserId={(metadata?.meta_instagram_user_id as string | undefined) ?? null}
        onClose={onPublishModalClose}
        onPublished={onPublished}
      />
    </>
  )
}
