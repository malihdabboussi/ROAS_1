'use client'

import { useCallback, type ReactNode } from 'react'
import type { ArtifactPreviewSelection } from './artifact-preview-selection'
import { SpacesArtifactPreviewPane } from './SpacesArtifactPreviewPane'
import { useSpaceArtifactPreviewController } from './use-space-artifact-preview-controller'

interface CampaignSlidePreviewBodyProps {
  campaignId: string
  selection: ArtifactPreviewSelection
  /** Slide-over: dismissal callback (outside click uses this; legacy X when `slideOverShowCloseButton`). */
  onSlideClose?: () => void
  /** When false with `onSlideClose` set — no X chrome; dismissal via host outside-click etc. Defaults true. */
  slideOverShowCloseButton?: boolean
  /** After delete: e.g. clear `?artifact` or close slide-over. Called without onSlideClose when only cleanup is needed. */
  onResourceDeleted?: () => void
  /** Slide-over: jump to full in-place artifact view (`?artifact=`). */
  onOpenFullView?: () => void
  /** Spaces deep-work: Back clears `?artifact=`; extras (e.g. Save view) live in preview toolbars. */
  spacesDeepWorkBack?: () => void
  spacesDeepWorkToolbarExtras?: ReactNode
}

/**
 * Slim Spaces preview body — only fetches the row that was clicked + (for funnel/website/presentation)
 * the metadata `ArtifactPreviewPane` reads at the toolbar level. No campaign-wide catalog load.
 */
export function CampaignSlidePreviewBody({
  campaignId,
  selection,
  onSlideClose,
  slideOverShowCloseButton = true,
  onResourceDeleted,
  onOpenFullView,
  spacesDeepWorkBack,
  spacesDeepWorkToolbarExtras,
}: CampaignSlidePreviewBodyProps) {
  const controller = useSpaceArtifactPreviewController({ campaignId, selection })

  const handleResourceDeleted = useCallback(() => {
    onResourceDeleted?.()
    onSlideClose?.()
  }, [onResourceDeleted, onSlideClose])

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <SpacesArtifactPreviewPane
        selectedResource={controller.selectedResource}
        selectedFunnel={controller.selectedFunnel}
        selectedPresentation={controller.selectedPresentation}
        pageContent={controller.pageContent}
        pageLoading={controller.pageLoading}
        pageError={controller.pageError}
        themePreviewCss={controller.themePreviewCss}
        funnelViewport={controller.funnelViewport}
        setFunnelViewport={controller.setFunnelViewport}
        lmViewport={controller.lmViewport}
        setLmViewport={controller.setLmViewport}
        adViewport={controller.adViewport}
        setAdViewport={controller.setAdViewport}
        onFunnelStatusChange={controller.handleFunnelStatusChange}
        onPresentationStatusChange={controller.handlePresentationStatusChange}
        onPresentationMutated={() => void controller.refreshPresentation()}
        onAdUpdated={controller.handleAdUpdated}
        funnelPages={controller.funnelPages}
        currentPageId={controller.currentPageId}
        onFunnelPageChange={controller.handleFunnelPageChange}
        blogPosts={[]}
        onResourceDeleted={handleResourceDeleted}
        slideOverOnClose={onSlideClose}
        slideOverShowCloseButton={slideOverShowCloseButton}
        slideOverOnOpenFullView={onOpenFullView}
        spacesDeepWorkBack={spacesDeepWorkBack}
        spacesDeepWorkToolbarExtras={spacesDeepWorkToolbarExtras}
      />
    </div>
  )
}
