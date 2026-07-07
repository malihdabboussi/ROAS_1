'use client'

import type { RefObject, ReactNode } from 'react'
import { AdCampaignSettingsPanel } from '@/features/studio/components/preview/AdCampaignSettingsPanel'
import { AdSetSettingsPanel } from '@/features/studio/components/preview/AdSetSettingsPanel'
import { AdsTab } from '@/features/studio/components/preview/AdsTab'
import { AvatarPreview } from '@/features/studio/components/preview/AvatarPreview'
import {
  BlogPostPreview,
  type BlogPostPreviewHandle,
  type BlogPostSavePulse,
} from '@/features/studio/components/preview/BlogPostPreview'
import { OfferPreview } from '@/features/studio/components/preview/OfferPreview'
import { OfferStepPreview } from '@/features/studio/components/preview/OfferStepPreview'
import { PresentationFullModeShell } from '@/features/studio/components/preview/PresentationFullModeShell'
import { PresentationPreview } from '@/features/studio/components/preview/PresentationPreview'
import { SequencePreview } from '@/features/studio/components/preview/SequencePreview'
import { SettingsTab } from '@/features/studio/components/preview/SettingsTab'
import SocialPostPreview from '@/features/studio/components/preview/SocialPostPreview'
import type { SocialPostPreviewMenuProps } from '@/features/studio/components/preview/social-post-preview/SocialPostPreviewToolbar'
import type { Ad } from '@/features/studio/types'
import { ArtifactPreviewAdPanel, type ArtifactPreviewAdMenuProps } from './ArtifactPreviewAdPanel'
import {
  ArtifactPreviewFunnelContent,
  shouldRenderArtifactPreviewFunnelContent,
} from './ArtifactPreviewFunnelContent'
import type {
  ArtifactPreviewEmailPreviewProps,
  ArtifactPreviewPaneProps,
} from './artifact-preview-pane.types'
import { ConversationDocumentArtifactPreview } from './ConversationDocumentArtifactPreview'

type FunnelHistoryDirection = 'undo' | 'redo'

interface ArtifactPreviewContentProps {
  selectedResource: ArtifactPreviewPaneProps['selectedResource']
  selectedFunnel: ArtifactPreviewPaneProps['selectedFunnel']
  selectedPresentation: ArtifactPreviewPaneProps['selectedPresentation']
  pageContent: ArtifactPreviewPaneProps['pageContent']
  pageLoading: boolean
  pageError: string | null
  themePreviewCss: string
  funnelViewport: ArtifactPreviewPaneProps['funnelViewport']
  setFunnelViewport: ArtifactPreviewPaneProps['setFunnelViewport']
  lmViewport: ArtifactPreviewPaneProps['lmViewport']
  setLmViewport: ArtifactPreviewPaneProps['setLmViewport']
  adViewport: ArtifactPreviewPaneProps['adViewport']
  setAdViewport: ArtifactPreviewPaneProps['setAdViewport']
  onAdUpdated: (updatedAd: Ad) => void
  funnelPages: ArtifactPreviewPaneProps['funnelPages']
  currentPageId: ArtifactPreviewPaneProps['currentPageId']
  onFunnelPageChange: ArtifactPreviewPaneProps['onFunnelPageChange']
  onResourceDeleted?: () => void
  onOpenWebsiteSettings: () => void
  onFunnelHistoryRequest: (direction: FunnelHistoryDirection) => void
  funnelHtmlBundleFullMode: boolean
  spacesDeepWorkBack?: () => void
  slideOverOnOpenFullView?: () => void
  activeCampaignId?: string | null
  activeCampaignName?: string | null
  blogPostPreviewRef: RefObject<BlogPostPreviewHandle | null>
  onBlogPostStatus: (status: 'draft' | 'published' | 'archived') => void
  onBlogLoadState: (loading: boolean) => void
  onBlogSavePulse: (pulse: BlogPostSavePulse) => void
  renderAdMenu?: (props: ArtifactPreviewAdMenuProps) => ReactNode
  renderEmailPreview?: (props: ArtifactPreviewEmailPreviewProps) => ReactNode
  renderSocialPostMenu?: (props: SocialPostPreviewMenuProps) => ReactNode
  spacesDeepBackButton: ReactNode
  slideOverTrailingWithDeepExtras: ReactNode
  funnelTrailingChrome: ReactNode
  spacesArtifactFullscreenBtn: ReactNode
  slideOverCloseChrome: ReactNode
}

export function ArtifactPreviewContent({
  selectedResource,
  selectedFunnel,
  selectedPresentation,
  pageContent,
  pageLoading,
  pageError,
  themePreviewCss,
  funnelViewport,
  setFunnelViewport,
  lmViewport,
  setLmViewport,
  adViewport,
  setAdViewport,
  onAdUpdated,
  funnelPages,
  currentPageId,
  onFunnelPageChange,
  onResourceDeleted,
  onOpenWebsiteSettings,
  onFunnelHistoryRequest,
  funnelHtmlBundleFullMode,
  spacesDeepWorkBack,
  slideOverOnOpenFullView,
  activeCampaignId,
  activeCampaignName,
  blogPostPreviewRef,
  onBlogPostStatus,
  onBlogLoadState,
  onBlogSavePulse,
  renderAdMenu,
  renderEmailPreview,
  renderSocialPostMenu,
  spacesDeepBackButton,
  slideOverTrailingWithDeepExtras,
  funnelTrailingChrome,
  spacesArtifactFullscreenBtn,
  slideOverCloseChrome,
}: ArtifactPreviewContentProps) {
  if (
    shouldRenderArtifactPreviewFunnelContent({
      selectedResource,
      selectedFunnel,
      pageContent,
      pageLoading,
      pageError,
      funnelHtmlBundleFullMode,
    })
  ) {
    return (
      <ArtifactPreviewFunnelContent
        selectedResource={selectedResource}
        selectedFunnel={selectedFunnel}
        pageContent={pageContent}
        pageLoading={pageLoading}
        pageError={pageError}
        themePreviewCss={themePreviewCss}
        funnelViewport={funnelViewport}
        setFunnelViewport={setFunnelViewport}
        funnelPages={funnelPages}
        currentPageId={currentPageId}
        onFunnelPageChange={onFunnelPageChange}
        onOpenWebsiteSettings={onOpenWebsiteSettings}
        onFunnelHistoryRequest={onFunnelHistoryRequest}
        funnelHtmlBundleFullMode={funnelHtmlBundleFullMode}
        spacesDeepBackButton={spacesDeepBackButton}
        slideOverTrailingWithDeepExtras={slideOverTrailingWithDeepExtras}
      />
    )
  }

  if (selectedResource?.type === 'offer') {
    return (
      <OfferPreview
        offerId={selectedResource.id}
        toolbarTrailing={slideOverTrailingWithDeepExtras}
      />
    )
  }

  if (selectedResource?.type === 'offer-step') {
    return (
      <OfferStepPreview
        offerId={selectedResource.id}
        stepNumber={selectedResource.stepNumber}
        toolbarTrailing={slideOverTrailingWithDeepExtras}
      />
    )
  }

  if (selectedResource?.type === 'ad-campaign') {
    return (
      <AdCampaignSettingsPanel
        key={selectedResource.id}
        adCampaignId={selectedResource.id}
        headerTrailing={slideOverTrailingWithDeepExtras}
      />
    )
  }

  if (selectedResource?.type === 'ad-set') {
    return (
      <AdSetSettingsPanel
        key={selectedResource.id}
        adSetId={selectedResource.id}
        headerTrailing={slideOverTrailingWithDeepExtras}
      />
    )
  }

  if (selectedResource?.type === 'ad') {
    return (
      <ArtifactPreviewAdPanel
        selectedResource={selectedResource}
        adViewport={adViewport}
        setAdViewport={setAdViewport}
        onAdUpdated={onAdUpdated}
        onResourceDeleted={onResourceDeleted}
        renderAdMenu={renderAdMenu}
        slideOverOnOpenFullView={slideOverOnOpenFullView}
        slideOverTrailingWithDeepExtras={slideOverTrailingWithDeepExtras}
        spacesDeepBackButton={spacesDeepBackButton}
        isDeepWorkFull={Boolean(spacesDeepWorkBack)}
      />
    )
  }

  if (selectedResource?.type === 'doc') {
    return (
      <ConversationDocumentArtifactPreview
        documentId={selectedResource.id}
        titleFallback={selectedResource.name}
        toolbarLeading={spacesDeepBackButton}
        toolbarTrailing={slideOverTrailingWithDeepExtras}
      />
    )
  }

  if (selectedResource?.type === 'sequence') {
    return (
      <SequencePreview
        sequenceId={selectedResource.id}
        selectedEmailId={selectedResource.emailId}
        leadingChrome={spacesDeepWorkBack ? spacesDeepBackButton : undefined}
        trailingChrome={funnelTrailingChrome}
        publishAdjacentChrome={spacesArtifactFullscreenBtn}
        onOpenFullView={slideOverOnOpenFullView}
        onResourceDeleted={onResourceDeleted}
        centerEmailCard={Boolean(spacesDeepWorkBack)}
      />
    )
  }

  if (selectedResource?.type === 'email' && renderEmailPreview) {
    return renderEmailPreview({
      emailId: selectedResource.id,
      toolbarLeading: spacesDeepWorkBack ? spacesDeepBackButton : undefined,
      trailingChrome: funnelTrailingChrome,
      publishAdjacentChrome: spacesArtifactFullscreenBtn,
      onOpenFullView: slideOverOnOpenFullView,
      onResourceDeleted,
      centerEmailCard: Boolean(spacesDeepWorkBack),
    })
  }

  if (selectedResource?.type === 'presentation' && selectedPresentation && spacesDeepWorkBack) {
    const artifactMetaKey = `${selectedPresentation.name}|${selectedPresentation.status}|${selectedPresentation.publishedUrl ?? ''}|${selectedPresentation.fileUrl ?? ''}|${selectedPresentation.generatedHtml ? '1' : '0'}|${selectedPresentation.bundleVersion ?? 0}`
    return (
      <PresentationFullModeShell
        presentationId={selectedResource.id}
        name={selectedPresentation.name}
        bundleVersionKey={artifactMetaKey}
        renderPreview={({ mode, activeSlideIndex, onElementSelect, onSlideChange, onDrawingEvent }) => (
          <PresentationPreview
            presentationId={selectedResource.id}
            themeCss={themePreviewCss}
            hideSandpackToolbar
            hideToolbar
            artifactMetaKey={artifactMetaKey}
            viewport={lmViewport}
            onViewportChange={setLmViewport}
            editMode={mode}
            activeSlideIndex={activeSlideIndex}
            onElementSelect={onElementSelect}
            onSlideChange={onSlideChange}
            onDrawingEvent={onDrawingEvent}
          />
        )}
      />
    )
  }

  if (selectedResource?.type === 'presentation' && selectedPresentation) {
    const artifactMetaKey = `${selectedPresentation.name}|${selectedPresentation.status}|${selectedPresentation.publishedUrl ?? ''}|${selectedPresentation.fileUrl ?? ''}|${selectedPresentation.generatedHtml ? '1' : '0'}|${selectedPresentation.bundleVersion ?? 0}`
    return (
      <PresentationPreview
        presentationId={selectedResource.id}
        themeCss={themePreviewCss}
        hideSandpackToolbar
        hideToolbar
        artifactMetaKey={artifactMetaKey}
        viewport={lmViewport}
        onViewportChange={setLmViewport}
      />
    )
  }

  if (selectedResource?.type === 'avatar') {
    return (
      <AvatarPreview
        avatarId={selectedResource.id}
        toolbarLeading={spacesDeepBackButton}
        headerTitleFallback={selectedResource.name}
        toolbarTrailing={spacesDeepWorkBack ? funnelTrailingChrome : slideOverTrailingWithDeepExtras}
        onOpenFullView={slideOverOnOpenFullView}
        onResourceDeleted={onResourceDeleted}
        fallbackCampaignId={activeCampaignId ?? null}
      />
    )
  }

  if (selectedResource?.type === 'social-post') {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <SocialPostPreview
          socialPostId={selectedResource.id}
          onResourceDeleted={onResourceDeleted}
          toolbarLeading={spacesDeepBackButton}
          fullscreenButton={spacesArtifactFullscreenBtn}
          closeChrome={slideOverCloseChrome}
          renderPostMenu={renderSocialPostMenu}
        />
      </div>
    )
  }

  if (selectedResource?.type === 'blog-hub') {
    return (
      <div className="p-spacing-8 gap-spacing-2 flex min-h-0 flex-1 flex-col items-center justify-center text-center">
        <p className="body-2 text-muted-foreground">No blog posts yet for this website.</p>
      </div>
    )
  }

  if (selectedResource?.type === 'blog-post') {
    return (
      <BlogPostPreview
        ref={blogPostPreviewRef}
        blogPostId={selectedResource.id}
        funnelId={selectedResource.funnelId}
        onPostStatusChange={onBlogPostStatus}
        onLoadStateChange={onBlogLoadState}
        onSavePulseChange={onBlogSavePulse}
      />
    )
  }

  if (selectedResource?.type === 'category-settings' && activeCampaignId) {
    return (
      <>
        {slideOverTrailingWithDeepExtras ? (
          <div className="border-border px-spacing-2 py-spacing-2 flex shrink-0 justify-end border-b">
            {slideOverTrailingWithDeepExtras}
          </div>
        ) : null}
        {selectedResource.section === 'ads' ? (
          <AdsTab key="ads" campaignId={activeCampaignId} campaignName={activeCampaignName} />
        ) : (
          <SettingsTab
            key={selectedResource.section}
            campaignId={activeCampaignId}
            initialSection={selectedResource.section}
            hideSidebar
          />
        )}
      </>
    )
  }

  return null
}
