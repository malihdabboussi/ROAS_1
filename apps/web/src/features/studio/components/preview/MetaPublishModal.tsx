'use client'

import { MetaPublishModalChecklist } from './meta-publish-modal/meta-publish-modal-checklist'
import { MetaPublishModalErrorSection } from './meta-publish-modal/meta-publish-modal-error-section'
import { MetaPublishModalFailedSection } from './meta-publish-modal/meta-publish-modal-failed-section'
import { MetaPublishModalHeader } from './meta-publish-modal/meta-publish-modal-header'
import { MetaPublishModalPublishingSection } from './meta-publish-modal/meta-publish-modal-publishing-section'
import { MetaPublishModalReadySection } from './meta-publish-modal/meta-publish-modal-ready-section'
import { MetaPublishModalSuccessSection } from './meta-publish-modal/meta-publish-modal-success-section'
import { MetaPublishModalValidatingSection } from './meta-publish-modal/meta-publish-modal-validating-section'
import type { MetaPublishModalProps } from './meta-publish-modal/meta-publish-modal.types'
import { useMetaPublishModal } from './meta-publish-modal/use-meta-publish-modal'

export function MetaPublishModal({
  open,
  adId,
  adCampaignId,
  onClose,
  onPublished,
  defaultAdAccountId,
  defaultPageId,
  defaultInstagramUserId,
  platformCampaignId,
}: MetaPublishModalProps) {
  const {
    step,
    checks,
    msgIndex,
    msgVisible,
    adAccounts,
    pages,
    igAccounts,
    pixels,
    selectedAccountId,
    setSelectedAccountId,
    selectedPageId,
    setSelectedPageId,
    selectedInstagramUserId,
    setSelectedInstagramUserId,
    selectedPixelId,
    setSelectedPixelId,
    summary,
    publishError,
    handlePublish,
    allPassed,
    anyFailed,
    isValidating,
  } = useMetaPublishModal({
    open,
    adId,
    adCampaignId,
    onPublished,
    defaultAdAccountId,
    defaultPageId,
    defaultInstagramUserId,
    platformCampaignId,
  })

  if (!open) return null

  return (
    <div className="px-spacing-4 fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="surface-card border-subtle rounded-spacing-4 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden border">
        <MetaPublishModalHeader onClose={onClose} />

        <div className="px-spacing-6 py-spacing-4 pb-spacing-6 min-h-0 flex-1 overflow-y-auto">
          {isValidating && (
            <MetaPublishModalValidatingSection msgIndex={msgIndex} msgVisible={msgVisible} />
          )}

          <MetaPublishModalChecklist checks={checks} isValidating={isValidating} />

          {step === 'ready' && allPassed && summary && (
            <MetaPublishModalReadySection
              summary={summary}
              adCampaignId={adCampaignId}
              adAccounts={adAccounts}
              pages={pages}
              igAccounts={igAccounts}
              pixels={pixels}
              selectedAccountId={selectedAccountId}
              setSelectedAccountId={setSelectedAccountId}
              selectedPageId={selectedPageId}
              setSelectedPageId={setSelectedPageId}
              selectedInstagramUserId={selectedInstagramUserId}
              setSelectedInstagramUserId={setSelectedInstagramUserId}
              selectedPixelId={selectedPixelId}
              setSelectedPixelId={setSelectedPixelId}
              onPublish={handlePublish}
            />
          )}

          {step === 'ready' && anyFailed && <MetaPublishModalFailedSection onClose={onClose} />}

          {step === 'publishing' && <MetaPublishModalPublishingSection />}

          {step === 'success' && (
            <MetaPublishModalSuccessSection adCampaignId={adCampaignId} onClose={onClose} />
          )}

          {step === 'error' && (
            <MetaPublishModalErrorSection
              publishError={publishError}
              onClose={onClose}
              onRetry={handlePublish}
            />
          )}
        </div>
      </div>
    </div>
  )
}
