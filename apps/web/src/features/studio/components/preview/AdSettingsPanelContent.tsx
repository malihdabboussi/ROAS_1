import type { RefObject } from 'react'
import type { MediaAsset } from '@/lib/services/media-api'
import type { Ad, AdFormat, CarouselCard } from '../../types'
import { stripCopyFromAdHeadline } from '../../utils/ad-headline'
import { AdAdvancedSettingsSections } from './AdAdvancedSettingsSections'
import { AdAdvantageCreativeEnhancements } from './AdAdvantageCreativeEnhancements'
import { AdCarouselCardsEditor } from './AdCarouselCardsEditor'
import { AdConceptWorkflowPanel } from './AdConceptWorkflowPanel'
import { AdCoreSettingsFields } from './AdCoreSettingsFields'
import { AdDestinationSettingsFields } from './AdDestinationSettingsFields'
import { AdMetaSourceBanner } from './AdMetaSourceBanner'
import { AdSingleImageCreativeEditor, type ImagePlacement } from './AdSingleImageCreativeEditor'
import { AdVideoCreativeEditor, type VideoPlacement } from './AdVideoCreativeEditor'
import type { FieldState } from './ad-settings-panel-primitives'

type AdSetupType = 'create_ad' | 'use_existing_post'

interface AdSettingsPanelContentProps {
  ad: Ad
  adId: string
  fieldStates: Record<string, FieldState>
  simpleMode: boolean
  perPlacement: boolean
  activePlacement: ImagePlacement
  driveFileId: string | null
  drivePreviewUrl: string | null
  imageMenuOpen: boolean
  imageMenuTriggerRef: RefObject<HTMLButtonElement | null>
  perPlacementVideo: boolean
  activeVideoPlacement: VideoPlacement
  videoMenuOpen: boolean
  videoMenuRef: RefObject<HTMLButtonElement | null>
  carouselCardMenuOpen: number | null
  carouselCardMenuRef: RefObject<HTMLButtonElement | null>
  enhancementsCustomize: boolean
  advancedExpanded: boolean
  refreshError: string | null
  adPageId: string | null
  adIgUserId: string | null
  effectivePageId: string | null
  campaignPageName: string | null
  metaPages: Array<{ id: string; name: string }>
  metaIgAccounts: Array<{ id: string; username?: string; profile_pic?: string }>
  partnershipAd: boolean
  adSetupType: AdSetupType
  existingPostId: string
  onChange: (field: string, value: string | null) => void
  onSelectChange: (field: string, value: string | null) => void
  onAdFormatChange: (value: AdFormat) => void
  onSetSimpleMode: (simpleMode: boolean) => void
  onToggleImagePerPlacement: (enabled: boolean) => void
  onSetActivePlacement: (placement: ImagePlacement) => void
  onToggleImageMenu: () => void
  onOpenImageLibrary: () => void
  onOpenUpload: () => void
  onAdCreativeImageUpload: (file: File) => void
  onSingleImageRemove: () => void
  onRestoreGeneratedTsxFromBackup: () => Promise<void> | void
  onRestorePlacementTsxFromBackup: (placement: ImagePlacement) => Promise<void> | void
  onRequestRegenerateImage: (imageUrl: string | null) => void
  onPlacementMediaPicked: (
    placement: ImagePlacement,
    url: string,
    asset?: MediaAsset,
  ) => Promise<void> | void
  onMediaPicked: (url: string, asset?: MediaAsset) => Promise<void> | void
  onToggleVideoPerPlacement: (enabled: boolean) => void
  onSetActiveVideoPlacement: (placement: VideoPlacement) => void
  onToggleVideoMenu: () => void
  onClearCurrentVideo: () => void
  onPasteVideoUrl: (videoUrl: string | null) => void
  onOpenVideoLibrary: (target: 'default' | VideoPlacement) => void
  onAddCarouselCard: () => void
  onRemoveCarouselCard: (index: number) => void
  onUpdateCarouselCard: (index: number, patch: Partial<CarouselCard>) => void
  onSaveCarouselCards: () => void
  onToggleCarouselCardMenu: (index: number) => void
  onCloseCarouselCardMenu: () => void
  onOpenCarouselLibrary: (index: number) => void
  onSetEnhancementsCustomize: (open: boolean) => void
  onSaveAdvantageEnhancements: (enhancements: Record<string, boolean>) => void
  onToggleAdvancedExpanded: () => void
  onSetMetaPageId: (value: string) => void
  onSetInstagramUserId: (value: string) => void
  onSetPartnershipAd: (checked: boolean) => void
  onSetAdSetupType: (value: AdSetupType) => void
  onSetExistingPostId: (value: string) => void
  onSaveExistingPostId: () => void
  onOpenSelectPostModal: () => void
}

export function AdSettingsPanelContent({
  ad,
  adId,
  fieldStates,
  simpleMode,
  perPlacement,
  activePlacement,
  driveFileId,
  drivePreviewUrl,
  imageMenuOpen,
  imageMenuTriggerRef,
  perPlacementVideo,
  activeVideoPlacement,
  videoMenuOpen,
  videoMenuRef,
  carouselCardMenuOpen,
  carouselCardMenuRef,
  enhancementsCustomize,
  advancedExpanded,
  refreshError,
  adPageId,
  adIgUserId,
  effectivePageId,
  campaignPageName,
  metaPages,
  metaIgAccounts,
  partnershipAd,
  adSetupType,
  existingPostId,
  onChange,
  onSelectChange,
  onAdFormatChange,
  onSetSimpleMode,
  onToggleImagePerPlacement,
  onSetActivePlacement,
  onToggleImageMenu,
  onOpenImageLibrary,
  onOpenUpload,
  onAdCreativeImageUpload,
  onSingleImageRemove,
  onRestoreGeneratedTsxFromBackup,
  onRestorePlacementTsxFromBackup,
  onRequestRegenerateImage,
  onPlacementMediaPicked,
  onMediaPicked,
  onToggleVideoPerPlacement,
  onSetActiveVideoPlacement,
  onToggleVideoMenu,
  onClearCurrentVideo,
  onPasteVideoUrl,
  onOpenVideoLibrary,
  onAddCarouselCard,
  onRemoveCarouselCard,
  onUpdateCarouselCard,
  onSaveCarouselCards,
  onToggleCarouselCardMenu,
  onCloseCarouselCardMenu,
  onOpenCarouselLibrary,
  onSetEnhancementsCustomize,
  onSaveAdvantageEnhancements,
  onToggleAdvancedExpanded,
  onSetMetaPageId,
  onSetInstagramUserId,
  onSetPartnershipAd,
  onSetAdSetupType,
  onSetExistingPostId,
  onSaveExistingPostId,
  onOpenSelectPostModal,
}: AdSettingsPanelContentProps) {
  return (
    <div className="scrollbar-thin flex-1 overflow-y-auto">
      {ad.source === 'meta' && <AdMetaSourceBanner metaAdId={ad.meta_ad_id} />}
      <div className="space-y-8 px-5 py-5">
        <div className="space-y-6">
          <AdCoreSettingsFields
            ad={ad}
            fieldStates={fieldStates}
            simpleMode={simpleMode}
            onChange={onChange}
            onSelectChange={onSelectChange}
            onAdFormatChange={onAdFormatChange}
          />

          {ad.ad_format === 'SINGLE_VIDEO' && (
            <AdVideoCreativeEditor
              ad={ad}
              fieldState={fieldStates['video_url']}
              perPlacement={perPlacementVideo}
              activePlacement={activeVideoPlacement}
              videoMenuOpen={videoMenuOpen}
              videoMenuRef={videoMenuRef}
              onTogglePerPlacement={onToggleVideoPerPlacement}
              onSetActivePlacement={onSetActiveVideoPlacement}
              onToggleVideoMenu={onToggleVideoMenu}
              onClearCurrentVideo={onClearCurrentVideo}
              onPasteVideoUrl={onPasteVideoUrl}
              onOpenLibrary={onOpenVideoLibrary}
            />
          )}

          {ad.ad_format === 'CAROUSEL' && (
            <AdCarouselCardsEditor
              cards={ad.carousel_cards ?? []}
              menuOpenIndex={carouselCardMenuOpen}
              menuButtonRef={carouselCardMenuRef}
              onAddCard={onAddCarouselCard}
              onRemoveCard={onRemoveCarouselCard}
              onUpdateCard={onUpdateCarouselCard}
              onSaveCards={onSaveCarouselCards}
              onToggleCardMenu={onToggleCarouselCardMenu}
              onCloseCardMenu={onCloseCarouselCardMenu}
              onOpenLibrary={onOpenCarouselLibrary}
            />
          )}

          {ad.ad_format === 'SINGLE_IMAGE' && (
            <AdSingleImageCreativeEditor
              ad={ad}
              fieldState={fieldStates[perPlacement ? `placement_images_${activePlacement}` : 'image_url']}
              perPlacement={perPlacement}
              activePlacement={activePlacement}
              driveFileId={driveFileId}
              drivePreviewUrl={drivePreviewUrl}
              imageMenuOpen={imageMenuOpen}
              imageMenuTriggerRef={imageMenuTriggerRef}
              onTogglePerPlacement={onToggleImagePerPlacement}
              onSetActivePlacement={onSetActivePlacement}
              onToggleImageMenu={onToggleImageMenu}
              onOpenLibrary={onOpenImageLibrary}
              onOpenUpload={onOpenUpload}
              onUploadFile={onAdCreativeImageUpload}
              onRemove={onSingleImageRemove}
              onRestoreGeneratedDesign={() => void onRestoreGeneratedTsxFromBackup()}
              onRestorePlacementDesign={(placement) =>
                void onRestorePlacementTsxFromBackup(placement)
              }
              onRequestRegenerate={onRequestRegenerateImage}
            />
          )}

          {ad.ad_format === 'SINGLE_IMAGE' && !simpleMode && (
            <AdConceptWorkflowPanel
              adId={adId}
              campaignId={ad.campaign_id}
              aspectRatio={
                perPlacement && (activePlacement === 'story' || activePlacement === 'reels')
                  ? '9:16'
                  : '1:1'
              }
              placementLabel={
                perPlacement
                  ? activePlacement === 'feed'
                    ? 'Feed'
                    : activePlacement === 'story'
                      ? 'Story'
                      : 'Reels'
                  : 'Feed'
              }
              headline={stripCopyFromAdHeadline(ad.headline)}
              primaryText={ad.primary_text ?? ''}
              onImageReady={(url, asset) => {
                if (perPlacement) void onPlacementMediaPicked(activePlacement, url, asset)
                else void onMediaPicked(url, asset)
              }}
              themeHint="Theme → Images: upload headshots & product shots, then reference them in Attached assets."
            />
          )}
          {ad.ad_format === 'SINGLE_IMAGE' && simpleMode && (
            <p className="typo-caption text-muted-foreground border-border mt-spacing-4 pt-spacing-3 border-t">
              <button
                type="button"
                onClick={() => onSetSimpleMode(false)}
                className="text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Advanced mode
              </button>{' '}
              — AI concepts + Gemini images (matches Feed 1:1 or Story/Reels 9:16 when
              per-placement is on).
            </p>
          )}
        </div>

        {!simpleMode && (
          <AdAdvantageCreativeEnhancements
            enhancements={
              (ad.metadata?.advantage_plus_enhancements ?? {}) as Record<string, boolean>
            }
            customizeOpen={enhancementsCustomize}
            onSetCustomizeOpen={onSetEnhancementsCustomize}
            onSaveEnhancements={onSaveAdvantageEnhancements}
          />
        )}

        <AdDestinationSettingsFields
          ad={ad}
          fieldStates={fieldStates}
          simpleMode={simpleMode}
          onChange={onChange}
        />

        <AdAdvancedSettingsSections
          ad={ad}
          simpleMode={simpleMode}
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
          onToggleAdvancedExpanded={onToggleAdvancedExpanded}
          onSetMetaPageId={onSetMetaPageId}
          onSetInstagramUserId={onSetInstagramUserId}
          onSetPartnershipAd={onSetPartnershipAd}
          onSetAdSetupType={onSetAdSetupType}
          onSetExistingPostId={onSetExistingPostId}
          onSaveExistingPostId={onSaveExistingPostId}
          onOpenSelectPostModal={onOpenSelectPostModal}
        />
      </div>
    </div>
  )
}
