'use client'

import type { ReactNode } from 'react'
import type { ArtifactPreviewSelection } from './artifact-preview-selection'
import { CampaignSlidePreviewBody } from './campaign-slide-preview-body'
import { useArtifactDetailQuery } from './use-artifact-detail-query'

export function ArtifactDeepView({
  campaignId,
  selection,
  onResourceDeleted,
  toolbarExtras,
}: {
  campaignId: string
  selection: ArtifactPreviewSelection
  onResourceDeleted?: () => void
  /** Rendered in preview chrome (e.g. Save view) for unified header with funnel/blog/presentation toolbars. */
  toolbarExtras?: ReactNode
}) {
  const { setArtifactQuery } = useArtifactDetailQuery()

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <CampaignSlidePreviewBody
        campaignId={campaignId}
        selection={selection}
        onResourceDeleted={onResourceDeleted}
        spacesDeepWorkBack={() => setArtifactQuery(null)}
        spacesDeepWorkToolbarExtras={toolbarExtras}
      />
    </div>
  )
}
