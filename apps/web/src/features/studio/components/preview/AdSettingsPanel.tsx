'use client'

import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'
import { updateAd } from '../../services/artifact-preview.service'
import type { Ad } from '../../types'
import { AdSettingsHeaderControls } from './AdSettingsHeaderControls'
import { AdSettingsPanelContent } from './AdSettingsPanelContent'
import { AdSettingsPanelOverlays } from './AdSettingsPanelOverlays'
import { AdSettingsPanelErrorState, AdSettingsPanelLoadingState } from './AdSettingsPanelStates'
import type { ImagePlacement } from './AdSingleImageCreativeEditor'
import { mergeAdResponse } from './ad-settings-panel-response'
import { useAdSettingsAdData } from './useAdSettingsAdData'
import { useAdSettingsCarouselCards } from './useAdSettingsCarouselCards'
import { useAdSettingsCreativeMenuControls } from './useAdSettingsCreativeMenuControls'
import { useAdSettingsDrivePreview } from './useAdSettingsDrivePreview'
import { useAdSettingsFieldSaves } from './useAdSettingsFieldSaves'
import { useAdSettingsImageMediaSaves } from './useAdSettingsImageMediaSaves'
import { useAdSettingsMediaPickerRouting } from './useAdSettingsMediaPickerRouting'
import { useAdSettingsMetadataControls } from './useAdSettingsMetadataControls'
import { useAdSettingsMetaControls } from './useAdSettingsMetaControls'
import { useAdSettingsRegenerationActions } from './useAdSettingsRegenerationActions'
import { useAdSettingsVideoMediaSaves } from './useAdSettingsVideoMediaSaves'

interface AdSettingsPanelProps {
  adId: string
  onAdUpdated?: (ad: Ad) => void
  initialAd?: Ad
  onPerPlacementChange?: (perPlacement: boolean) => void
  /** Back to preview: desktop closes side panel, mobile switches to preview tab. */
  onCollapseSettings?: () => void
  /** Spaces deep-work full mode: portal Publish + status into this DOM node and hide the inner toolbar. */
  publishHostEl?: HTMLElement | null
  /** Spaces deep-work full mode: portal Refresh button into this DOM node and hide the inner toolbar. */
  refreshHostEl?: HTMLElement | null
}

export function AdSettingsPanel({
  adId,
  onAdUpdated,
  initialAd,
  onPerPlacementChange,
  onCollapseSettings,
  publishHostEl,
  refreshHostEl,
}: AdSettingsPanelProps) {
  const { ad, setAd, loading, error } = useAdSettingsAdData({ adId, initialAd })
  const saveVersion = useRef(0)
  const { fieldStates, setFieldStates, handleChange, handleSelectChange, handleAdFormatChange } =
    useAdSettingsFieldSaves({
      adId,
      saveVersion,
      setAd,
      onAdUpdated,
      mergeAdResponse,
    })
  const {
    isPublished,
    hasPendingChanges,
    refreshingStatus,
    refreshError,
    settingMetaStatus,
    reviewModalOpen,
    publishModalOpen,
    openReviewModal,
    closeReviewModal,
    continueToPublish,
    closePublishModal,
    handleRefreshStatus,
    handleSetMetaStatus,
    handlePublished,
  } = useAdSettingsMetaControls({
    ad,
    adId,
    saveVersion,
    setAd,
    onAdUpdated,
    mergeAdResponse,
  })
  const {
    mediaPickerOpen,
    setMediaPickerOpen,
    mediaPickerForVideo,
    setMediaPickerForVideo,
    mediaPickerForCarousel,
    setMediaPickerForCarousel,
    carouselCardMenuOpen,
    setCarouselCardMenuOpen,
    carouselCardMenuPos,
    carouselCardMenuRef,
    videoMenuOpen,
    setVideoMenuOpen,
    videoMenuPos,
    videoMenuRef,
    imageMenuOpen,
    setImageMenuOpen,
    imageMenuPos,
    imageMenuTriggerRef,
  } = useAdSettingsCreativeMenuControls()
  const [perPlacement, setPerPlacement] = useState(false)
  const [activePlacement, setActivePlacement] = useState<ImagePlacement>('feed')
  const [enhancementsCustomize, setEnhancementsCustomize] = useState(false)
  const [simpleMode, setSimpleMode] = useState(true)
  const adRef = useRef<Ad | null>(null)
  adRef.current = ad
  const adCreativeImageFileRef = useRef<HTMLInputElement>(null)
  const {
    handleMediaPicked,
    restoreGeneratedTsxFromBackup,
    handleDriveFileSelect,
    handlePlacementMediaPicked,
    restorePlacementTsxFromBackup,
    handleAdCreativeImageUpload,
    handleToggleImagePerPlacement,
    handleSingleImageRemove,
  } = useAdSettingsImageMediaSaves({
    ad,
    adId,
    adRef,
    saveVersion,
    activePlacement,
    perPlacement,
    setPerPlacement,
    setAd,
    setFieldStates,
    onAdUpdated,
    onPerPlacementChange,
    mergeAdResponse,
  })
  const {
    updateCarouselCard,
    saveCarouselCards,
    handleAddCarouselCard,
    handleRemoveCarouselCard,
    handleOpenCarouselLibrary,
    handleCarouselMediaPickedFromPicker,
  } = useAdSettingsCarouselCards({
    ad,
    adId,
    adRef,
    saveVersion,
    setAd,
    setMediaPickerOpen,
    setMediaPickerForVideo,
    setMediaPickerForCarousel,
    onAdUpdated,
    mergeAdResponse,
  })

  const { driveFileId, drivePreviewUrl } = useAdSettingsDrivePreview({ ad, perPlacement })

  const saveMetadata = useCallback(
    async (meta: Record<string, unknown>) => {
      const v = ++saveVersion.current
      setAd((prev) => (prev ? { ...prev, metadata: meta } : prev))
      try {
        const updated = await updateAd(adId, { metadata: meta })
        if (saveVersion.current === v) {
          setAd((prev) => {
            const next = mergeAdResponse(prev, updated)
            onAdUpdated?.(next)
            return next
          })
        } else {
          onAdUpdated?.(updated)
        }
        window.dispatchEvent(new CustomEvent('ad-identity-changed', { detail: { adId } }))
      } catch {
        toast.error('Failed to save')
      }
    },
    [adId, onAdUpdated],
  )

  const {
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
    handleToggleAdvancedExpanded,
    handleOpenSelectPostModal,
    handleCloseSelectPostModal,
  } = useAdSettingsMetadataControls({
    ad,
    saveMetadata,
    setPerPlacement,
    onPerPlacementChange,
  })

  const {
    perPlacementVideo,
    activeVideoPlacement,
    setActiveVideoPlacement,
    handleVideoMediaPickedFromPicker,
    handleToggleVideoPerPlacement,
    handleOpenVideoLibrary,
    handleOpenVideoLibraryFromMenu,
    handleClearCurrentVideo,
    handlePasteVideoUrl,
  } = useAdSettingsVideoMediaSaves({
    ad,
    saveMetadata,
    handleChange,
    setAd,
    setMediaPickerOpen,
    setMediaPickerForCarousel,
    setMediaPickerForVideo,
    setVideoMenuOpen,
  })
  const {
    handleOpenImageLibrary,
    handleMediaPickerClose,
    handleSelectMediaUrl,
    handleSelectMediaAsset,
  } = useAdSettingsMediaPickerRouting({
    activePlacement,
    mediaPickerForCarousel,
    mediaPickerForVideo,
    perPlacement,
    setMediaPickerOpen,
    setMediaPickerForVideo,
    setMediaPickerForCarousel,
    handleCarouselMediaPickedFromPicker,
    handleVideoMediaPickedFromPicker,
    handlePlacementMediaPicked,
    handleMediaPicked,
  })
  const {
    handleRequestRegenerateImage,
    handleRegenerateCarouselCardFromMenu,
    handleOpenCarouselCardLibraryFromMenu,
    handleRegenerateCurrentVideoFromMenu,
    handleRegenerateCurrentImageFromMenu,
    handleOpenImageLibraryFromMenu,
  } = useAdSettingsRegenerationActions({
    ad,
    adId,
    activePlacement,
    activeVideoPlacement,
    carouselCardMenuOpen,
    driveFileId,
    drivePreviewUrl,
    perPlacement,
    perPlacementVideo,
    setCarouselCardMenuOpen,
    setImageMenuOpen,
    setMediaPickerForCarousel,
    setMediaPickerForVideo,
    setMediaPickerOpen,
    setVideoMenuOpen,
  })

  if (loading) {
    return <AdSettingsPanelLoadingState />
  }

  if (error || !ad) {
    return <AdSettingsPanelErrorState message={error ?? 'Ad not found'} />
  }

  return (
    <div className="bg-card flex h-full flex-col overflow-hidden">
      <AdSettingsHeaderControls
        isPublished={isPublished}
        hasPendingChanges={hasPendingChanges}
        metaEffectiveStatus={ad.meta_effective_status}
        settingMetaStatus={settingMetaStatus}
        refreshingStatus={refreshingStatus}
        onSetMetaStatus={(status) => void handleSetMetaStatus(status)}
        onRefreshStatus={() => void handleRefreshStatus()}
        onOpenReview={openReviewModal}
        onCollapseSettings={onCollapseSettings}
        publishHostEl={publishHostEl}
        refreshHostEl={refreshHostEl}
      />

      <AdSettingsPanelContent
        ad={ad}
        adId={adId}
        fieldStates={fieldStates}
        simpleMode={simpleMode}
        perPlacement={perPlacement}
        activePlacement={activePlacement}
        driveFileId={driveFileId}
        drivePreviewUrl={drivePreviewUrl}
        imageMenuOpen={imageMenuOpen}
        imageMenuTriggerRef={imageMenuTriggerRef}
        perPlacementVideo={perPlacementVideo}
        activeVideoPlacement={activeVideoPlacement}
        videoMenuOpen={videoMenuOpen}
        videoMenuRef={videoMenuRef}
        carouselCardMenuOpen={carouselCardMenuOpen}
        carouselCardMenuRef={carouselCardMenuRef}
        enhancementsCustomize={enhancementsCustomize}
        advancedExpanded={advancedExpanded}
        refreshError={refreshError}
        adPageId={adPageId}
        adIgUserId={adIgUserId}
        effectivePageId={effectivePageId}
        campaignPageName={campaignPageName}
        metaPages={metaPages}
        metaIgAccounts={metaIgAccounts}
        partnershipAd={partnershipAd}
        adSetupType={adSetupType}
        existingPostId={existingPostId}
        onChange={handleChange}
        onSelectChange={handleSelectChange}
        onAdFormatChange={handleAdFormatChange}
        onSetSimpleMode={setSimpleMode}
        onToggleImagePerPlacement={handleToggleImagePerPlacement}
        onSetActivePlacement={setActivePlacement}
        onToggleImageMenu={() => setImageMenuOpen((previous) => !previous)}
        onOpenImageLibrary={handleOpenImageLibrary}
        onOpenUpload={() => adCreativeImageFileRef.current?.click()}
        onAdCreativeImageUpload={(file) => void handleAdCreativeImageUpload(file)}
        onSingleImageRemove={handleSingleImageRemove}
        onRestoreGeneratedTsxFromBackup={restoreGeneratedTsxFromBackup}
        onRestorePlacementTsxFromBackup={restorePlacementTsxFromBackup}
        onRequestRegenerateImage={handleRequestRegenerateImage}
        onPlacementMediaPicked={handlePlacementMediaPicked}
        onMediaPicked={handleMediaPicked}
        onToggleVideoPerPlacement={handleToggleVideoPerPlacement}
        onSetActiveVideoPlacement={setActiveVideoPlacement}
        onToggleVideoMenu={() => setVideoMenuOpen((previous) => !previous)}
        onClearCurrentVideo={handleClearCurrentVideo}
        onPasteVideoUrl={handlePasteVideoUrl}
        onOpenVideoLibrary={handleOpenVideoLibrary}
        onAddCarouselCard={handleAddCarouselCard}
        onRemoveCarouselCard={handleRemoveCarouselCard}
        onUpdateCarouselCard={updateCarouselCard}
        onSaveCarouselCards={saveCarouselCards}
        onToggleCarouselCardMenu={(idx) =>
          setCarouselCardMenuOpen((current) => (current === idx ? null : idx))
        }
        onCloseCarouselCardMenu={() => setCarouselCardMenuOpen(null)}
        onOpenCarouselLibrary={handleOpenCarouselLibrary}
        onSetEnhancementsCustomize={setEnhancementsCustomize}
        onSaveAdvantageEnhancements={handleSaveAdvantageEnhancements}
        onToggleAdvancedExpanded={handleToggleAdvancedExpanded}
        onSetMetaPageId={handleSetMetaPageId}
        onSetInstagramUserId={handleSetInstagramUserId}
        onSetPartnershipAd={handleSetPartnershipAd}
        onSetAdSetupType={handleSetAdSetupType}
        onSetExistingPostId={setExistingPostId}
        onSaveExistingPostId={handleSaveExistingPostId}
        onOpenSelectPostModal={handleOpenSelectPostModal}
      />
      <AdSettingsPanelOverlays
        ad={ad}
        adId={adId}
        adCreativeImageFileRef={adCreativeImageFileRef}
        reviewModalOpen={reviewModalOpen}
        publishModalOpen={publishModalOpen}
        mediaPickerOpen={mediaPickerOpen}
        carouselCardMenuOpen={carouselCardMenuOpen}
        carouselCardMenuPos={carouselCardMenuPos}
        videoMenuOpen={videoMenuOpen}
        videoMenuPos={videoMenuPos}
        imageMenuOpen={imageMenuOpen}
        imageMenuPos={imageMenuPos}
        selectPostModalOpen={selectPostModalOpen}
        existingPostId={existingPostId}
        onAdCreativeImageUpload={(file) => void handleAdCreativeImageUpload(file)}
        onReviewModalClose={closeReviewModal}
        onContinueToPublish={continueToPublish}
        onPublishModalClose={closePublishModal}
        onPublished={handlePublished}
        onMediaPickerClose={handleMediaPickerClose}
        onSelectMediaUrl={handleSelectMediaUrl}
        onSelectMediaAsset={handleSelectMediaAsset}
        onSelectDriveFile={handleDriveFileSelect}
        onRegenerateCarouselCard={handleRegenerateCarouselCardFromMenu}
        onOpenCarouselCardLibraryFromMenu={handleOpenCarouselCardLibraryFromMenu}
        onRegenerateCurrentVideo={handleRegenerateCurrentVideoFromMenu}
        onOpenVideoLibraryFromMenu={handleOpenVideoLibraryFromMenu}
        onRegenerateCurrentImage={handleRegenerateCurrentImageFromMenu}
        onOpenImageLibraryFromMenu={handleOpenImageLibraryFromMenu}
        onSetExistingPostId={setExistingPostId}
        onSaveExistingPostId={handleSaveExistingPostId}
        onCloseSelectPostModal={handleCloseSelectPostModal}
      />
    </div>
  )
}
