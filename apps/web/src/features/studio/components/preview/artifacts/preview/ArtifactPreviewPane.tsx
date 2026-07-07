'use client'

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type {
  BlogPostPreviewHandle,
  BlogPostSavePulse,
} from '@/features/studio/components/preview/BlogPostPreview'
import { BlogToolbar } from '@/features/studio/components/preview/BlogToolbar'
import { FunnelHistoryControls } from '@/features/studio/components/preview/FunnelHistoryControls'
import { FunnelToolbar } from '@/features/studio/components/preview/FunnelToolbar'
import { useFunnelUndoRedo } from '@/features/studio/components/preview/hooks/useFunnelUndoRedo'
import { PresentationToolbar } from '@/features/studio/components/preview/PresentationToolbar'
import { useCampaignMode } from '@/features/studio/contexts/CampaignModeContext'
import { isFunnelHtmlBundleFullMode } from '@/features/studio/lib/funnel-view-mode.util'
import { useFunnelFullModeStore } from '@/features/studio/store/use-funnel-full-mode-store'
import { ArtifactPreviewContent } from './ArtifactPreviewContent'
import type { ArtifactPreviewPaneProps } from './artifact-preview-pane.types'
import { useArtifactPreviewChrome } from './artifact-preview-chrome'

export type {
  ArtifactPreviewEmailPreviewProps,
  ArtifactPreviewFormPreviewProps,
  ArtifactPreviewPaneProps,
  SelectedResource,
} from './artifact-preview-pane.types'

export function ArtifactPreviewPane({
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
  onFunnelStatusChange,
  onPresentationStatusChange,
  onPresentationMutated,
  onAdUpdated,
  funnelPages,
  currentPageId,
  onFunnelPageChange,
  onFunnelPreviewRefresh,
  blogPosts = [],
  onBlogPostChange,
  onResourceDeleted,
  slideOverOnClose,
  slideOverShowCloseButton = true,
  slideOverOnOpenFullView,
  spacesDeepWorkBack,
  spacesDeepWorkToolbarExtras,
  renderAdMenu,
  renderEmailPreview,
  renderFormPreview,
  renderFunnelMenu,
  renderSocialPostMenu,
}: ArtifactPreviewPaneProps) {
  const { activeCampaignId, activeCampaignName, expandPanel } = useCampaignMode()
  const blogPostPreviewRef = useRef<BlogPostPreviewHandle>(null)
  const [blogToolbarPublished, setBlogToolbarPublished] = useState(false)
  const [blogPostLoading, setBlogPostLoading] = useState(false)
  const [blogSavePulse, setBlogSavePulse] = useState<BlogPostSavePulse>('idle')
  const blogPostSelectionId = selectedResource?.type === 'blog-post' ? selectedResource.id : null

  const funnelHtmlBundleFullMode = useMemo(
    () =>
      isFunnelHtmlBundleFullMode({
        spacesDeepWorkBack,
        selectedFunnel,
        funnelPages,
        currentPageId,
        pageBundle: pageContent?.bundle ?? null,
      }),
    [spacesDeepWorkBack, selectedFunnel, funnelPages, currentPageId, pageContent?.bundle],
  )

  useLayoutEffect(() => {
    if (!funnelHtmlBundleFullMode || !selectedFunnel) {
      useFunnelFullModeStore.getState().deactivate()
      return
    }
    useFunnelFullModeStore.getState().activate(selectedFunnel.id)
    return () => {
      useFunnelFullModeStore.getState().deactivate()
    }
  }, [funnelHtmlBundleFullMode, selectedFunnel?.id])

  const activeFunnelPageId = currentPageId ?? pageContent?.bundle?.page.id ?? null
  const historyFunnelId = selectedFunnel && pageContent?.bundle ? selectedFunnel.id : null
  const funnelHistory = useFunnelUndoRedo({
    funnelId: historyFunnelId,
    funnelPageId: activeFunnelPageId,
    pageUpdatedAt: pageContent?.bundle?.page.updated_at ?? null,
    onRestored: onFunnelPreviewRefresh,
  })
  const funnelHistoryControls =
    historyFunnelId && pageContent?.bundle ? (
      <FunnelHistoryControls
        canUndo={funnelHistory.canUndo}
        canRedo={funnelHistory.canRedo}
        isLoading={funnelHistory.isLoading}
        pendingAction={funnelHistory.pendingAction}
        onUndo={() => void funnelHistory.undo()}
        onRedo={() => void funnelHistory.redo()}
      />
    ) : null

  const blogToolbarPosts = useMemo(() => {
    const funnelId =
      selectedResource?.type === 'blog-post' || selectedResource?.type === 'blog-hub'
        ? selectedResource.funnelId
        : null
    if (!funnelId) return []
    return [...blogPosts]
      .filter((p) => p.funnel_id === funnelId)
      .sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime() ||
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .map((p) => ({
        id: p.id,
        title: p.title ?? '',
        slug: p.slug ?? '',
      }))
  }, [selectedResource, blogPosts])

  useEffect(() => {
    if (selectedResource?.type !== 'blog-post') return
    setBlogToolbarPublished(false)
    setBlogPostLoading(true)
  }, [selectedResource?.type, blogPostSelectionId])

  const handleBlogPostStatus = useCallback((s: 'draft' | 'published' | 'archived') => {
    setBlogToolbarPublished(s === 'published')
  }, [])

  const handleBlogLoadState = useCallback((loading: boolean) => {
    setBlogPostLoading(loading)
  }, [])

  const handleBlogSavePulse = useCallback((p: BlogPostSavePulse) => {
    setBlogSavePulse(p)
  }, [])

  const handleBlogToolbarPublish = useCallback((next: boolean) => {
    blogPostPreviewRef.current?.setPublishedFromToolbar(next)
  }, [])

  const handleOpenWebsiteSettings = useCallback(() => {
    window.dispatchEvent(
      new CustomEvent('navigate-settings-section', {
        detail: { section: 'website' },
      }),
    )
    expandPanel('settings')
  }, [expandPanel])

  const {
    funnelTrailingChrome,
    slideOverCloseChrome,
    slideOverTrailingWithDeepExtras,
    spacesArtifactFullscreenBtn,
    spacesDeepBackButton,
    spacesFunnelMenu,
    spacesFunnelOptionsButton,
  } = useArtifactPreviewChrome({
    selectedFunnel,
    slideOverOnClose,
    slideOverShowCloseButton,
    slideOverOnOpenFullView,
    spacesDeepWorkBack,
    spacesDeepWorkToolbarExtras,
    renderFunnelMenu,
  })

  return (
    <div
      className={`flex min-h-0 flex-col overflow-hidden transition-[flex,opacity] duration-500 ease-in-out ${
        selectedResource ? 'flex-1 opacity-100' : 'flex-[0_0_0%] opacity-0'
      }`}
    >
      {selectedResource?.type === 'form' && renderFormPreview ? (
        renderFormPreview({
          formId: selectedResource.id,
          toolbarLeading: spacesDeepBackButton,
          fullscreenButton: spacesArtifactFullscreenBtn,
          trailingAfterDivider: funnelTrailingChrome,
          buildShowAddQuestionRail: !slideOverOnClose,
          onOpenFullView: slideOverOnOpenFullView,
        })
      ) : (
        selectedFunnel &&
        (selectedResource?.type === 'page' || selectedResource?.type === 'funnel') && (
          <>
            <FunnelToolbar
              funnelId={selectedFunnel.id}
              funnelName={selectedFunnel.name}
              status={selectedFunnel.status}
              slug={selectedFunnel.slug}
              publishedUrl={selectedFunnel.publishedUrl}
              onStatusChange={onFunnelStatusChange}
              viewport={funnelViewport}
              onViewportChange={setFunnelViewport}
              pages={funnelPages}
              currentPageId={currentPageId}
              onPageChange={onFunnelPageChange}
              hideFunnelSettingsButton={Boolean(
                slideOverOnClose || slideOverOnOpenFullView || spacesDeepWorkBack,
              )}
              leadingChrome={spacesDeepBackButton}
              publishAdjacentChrome={spacesArtifactFullscreenBtn}
              publishLeadingChrome={spacesFunnelOptionsButton}
              trailingChrome={funnelTrailingChrome}
              funnelFullMode={funnelHtmlBundleFullMode}
              hidePagePicker={Boolean(spacesDeepWorkBack)}
              historyChrome={funnelHistoryControls}
            />
            {spacesFunnelMenu}
          </>
        )
      )}

      {(selectedResource?.type === 'blog-post' || selectedResource?.type === 'blog-hub') &&
        selectedResource.funnelId &&
        onBlogPostChange && (
          <BlogToolbar
            posts={blogToolbarPosts}
            currentPostId={selectedResource.type === 'blog-post' ? selectedResource.id : ''}
            onPostChange={onBlogPostChange}
            funnelId={selectedResource.funnelId}
            published={blogToolbarPublished}
            publishDisabled={
              selectedResource.type !== 'blog-post' || blogPostLoading || blogSavePulse === 'saving'
            }
            onPublishedChange={handleBlogToolbarPublish}
            leadingChrome={spacesDeepBackButton}
            trailingChrome={slideOverTrailingWithDeepExtras}
          />
        )}

      {selectedPresentation && selectedResource?.type === 'presentation' && (
        <PresentationToolbar
          presentationId={selectedPresentation.id}
          name={selectedPresentation.name}
          status={selectedPresentation.status}
          fileUrl={selectedPresentation.fileUrl}
          generatedHtml={selectedPresentation.generatedHtml}
          publishedUrl={selectedPresentation.publishedUrl}
          onStatusChange={onPresentationStatusChange}
          viewport={lmViewport}
          onViewportChange={setLmViewport}
          leadingChrome={spacesDeepBackButton}
          trailingChrome={funnelTrailingChrome}
          publishAdjacentChrome={spacesArtifactFullscreenBtn}
          campaignId={selectedPresentation.campaignId}
          onPresentationMenuChanged={onPresentationMutated}
          onOpenFullView={slideOverOnOpenFullView}
          onResourceDeleted={onResourceDeleted}
          presentationFullMode={Boolean(spacesDeepWorkBack)}
        />
      )}

      <ArtifactPreviewContent
        selectedResource={selectedResource}
        selectedFunnel={selectedFunnel}
        selectedPresentation={selectedPresentation}
        pageContent={pageContent}
        pageLoading={pageLoading}
        pageError={pageError}
        themePreviewCss={themePreviewCss}
        funnelViewport={funnelViewport}
        setFunnelViewport={setFunnelViewport}
        lmViewport={lmViewport}
        setLmViewport={setLmViewport}
        adViewport={adViewport}
        setAdViewport={setAdViewport}
        onAdUpdated={onAdUpdated}
        funnelPages={funnelPages}
        currentPageId={currentPageId}
        onFunnelPageChange={onFunnelPageChange}
        onResourceDeleted={onResourceDeleted}
        onOpenWebsiteSettings={handleOpenWebsiteSettings}
        onFunnelHistoryRequest={(direction) => void funnelHistory.requestHistory(direction)}
        funnelHtmlBundleFullMode={funnelHtmlBundleFullMode}
        spacesDeepWorkBack={spacesDeepWorkBack}
        slideOverOnOpenFullView={slideOverOnOpenFullView}
        activeCampaignId={activeCampaignId}
        activeCampaignName={activeCampaignName}
        blogPostPreviewRef={blogPostPreviewRef}
        onBlogPostStatus={handleBlogPostStatus}
        onBlogLoadState={handleBlogLoadState}
        onBlogSavePulse={handleBlogSavePulse}
        renderAdMenu={renderAdMenu}
        renderEmailPreview={renderEmailPreview}
        renderSocialPostMenu={renderSocialPostMenu}
        spacesDeepBackButton={spacesDeepBackButton}
        slideOverTrailingWithDeepExtras={slideOverTrailingWithDeepExtras}
        funnelTrailingChrome={funnelTrailingChrome}
        spacesArtifactFullscreenBtn={spacesArtifactFullscreenBtn}
        slideOverCloseChrome={slideOverCloseChrome}
      />
    </div>
  )
}
