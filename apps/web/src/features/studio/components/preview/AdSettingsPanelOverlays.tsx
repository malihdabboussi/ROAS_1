import type { RefObject } from 'react'
import type { MediaAsset } from '@/lib/services/media-api'
import type { Ad } from '../../types'
import { AdSettingsMediaOverlays } from './AdSettingsMediaOverlays'
import { MetaIntegrationsReviewModal } from './MetaIntegrationsReviewModal'
import { MetaPublishModal } from './MetaPublishModal'

type MenuPosition = {
  top: number
  left: number
}

type DriveFileSelection = {
  id: string
  name: string
  mimeType?: string
}

interface AdSettingsPanelOverlaysProps {
  ad: Ad
  adId: string
  adCreativeImageFileRef: RefObject<HTMLInputElement | null>
  reviewModalOpen: boolean
  publishModalOpen: boolean
  mediaPickerOpen: boolean
  carouselCardMenuOpen: number | null
  carouselCardMenuPos: MenuPosition
  videoMenuOpen: boolean
  videoMenuPos: MenuPosition
  imageMenuOpen: boolean
  imageMenuPos: MenuPosition
  selectPostModalOpen: boolean
  existingPostId: string
  onAdCreativeImageUpload: (file: File) => void
  onReviewModalClose: () => void
  onContinueToPublish: () => void
  onPublishModalClose: () => void
  onPublished: () => void
  onMediaPickerClose: () => void
  onSelectMediaUrl: (url: string) => void
  onSelectMediaAsset: (asset: MediaAsset) => void
  onSelectDriveFile: (file: DriveFileSelection) => void
  onRegenerateCarouselCard: () => void
  onOpenCarouselCardLibraryFromMenu: () => void
  onRegenerateCurrentVideo: () => void
  onOpenVideoLibraryFromMenu: () => void
  onRegenerateCurrentImage: () => void
  onOpenImageLibraryFromMenu: () => void
  onSetExistingPostId: (value: string) => void
  onSaveExistingPostId: () => void
  onCloseSelectPostModal: () => void
}

export function AdSettingsPanelOverlays({
  ad,
  adId,
  adCreativeImageFileRef,
  reviewModalOpen,
  publishModalOpen,
  mediaPickerOpen,
  carouselCardMenuOpen,
  carouselCardMenuPos,
  videoMenuOpen,
  videoMenuPos,
  imageMenuOpen,
  imageMenuPos,
  selectPostModalOpen,
  existingPostId,
  onAdCreativeImageUpload,
  onReviewModalClose,
  onContinueToPublish,
  onPublishModalClose,
  onPublished,
  onMediaPickerClose,
  onSelectMediaUrl,
  onSelectMediaAsset,
  onSelectDriveFile,
  onRegenerateCarouselCard,
  onOpenCarouselCardLibraryFromMenu,
  onRegenerateCurrentVideo,
  onOpenVideoLibraryFromMenu,
  onRegenerateCurrentImage,
  onOpenImageLibraryFromMenu,
  onSetExistingPostId,
  onSaveExistingPostId,
  onCloseSelectPostModal,
}: AdSettingsPanelOverlaysProps) {
  const meta = ad.metadata as Record<string, unknown> | undefined

  return (
    <>
      <input
        ref={adCreativeImageFileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onAdCreativeImageUpload(file)
          event.target.value = ''
        }}
      />
      <MetaIntegrationsReviewModal
        open={reviewModalOpen}
        onClose={onReviewModalClose}
        onContinueToPublish={onContinueToPublish}
      />
      <MetaPublishModal
        open={publishModalOpen}
        adId={adId}
        defaultAdAccountId={(meta?.meta_ad_account_id as string | undefined) ?? null}
        defaultPageId={(meta?.meta_page_id as string | undefined) ?? null}
        defaultInstagramUserId={(meta?.meta_instagram_user_id as string | undefined) ?? null}
        onClose={onPublishModalClose}
        onPublished={onPublished}
      />
      <AdSettingsMediaOverlays
        mediaPickerOpen={mediaPickerOpen}
        carouselCardMenuOpen={carouselCardMenuOpen}
        carouselCardMenuPos={carouselCardMenuPos}
        videoMenuOpen={videoMenuOpen}
        videoMenuPos={videoMenuPos}
        imageMenuOpen={imageMenuOpen}
        imageMenuPos={imageMenuPos}
        selectPostModalOpen={selectPostModalOpen}
        existingPostId={existingPostId}
        adAccountId={meta?.meta_ad_account_id as string | undefined}
        onMediaPickerClose={onMediaPickerClose}
        onSelectMediaUrl={onSelectMediaUrl}
        onSelectMediaAsset={onSelectMediaAsset}
        onSelectDriveFile={onSelectDriveFile}
        onRegenerateCarouselCard={onRegenerateCarouselCard}
        onOpenCarouselCardLibraryFromMenu={onOpenCarouselCardLibraryFromMenu}
        onRegenerateCurrentVideo={onRegenerateCurrentVideo}
        onOpenVideoLibraryFromMenu={onOpenVideoLibraryFromMenu}
        onRegenerateCurrentImage={onRegenerateCurrentImage}
        onOpenImageLibraryFromMenu={onOpenImageLibraryFromMenu}
        onSetExistingPostId={onSetExistingPostId}
        onSaveExistingPostId={onSaveExistingPostId}
        onCloseSelectPostModal={onCloseSelectPostModal}
      />
    </>
  )
}
