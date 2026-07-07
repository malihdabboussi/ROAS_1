'use client'

import { EmailArtifactPreview } from '@/features/spaces/components/artifacts/email/EmailArtifactPreview'
import { FormPreviewPane } from '@/features/spaces/components/artifacts/form/FormPreviewPane'
import { StudioAdMenuDropdown } from '@/features/studio/components/preview/StudioAdMenuDropdown'
import { StudioFunnelMenuDropdown } from '@/features/studio/components/preview/StudioFunnelMenuDropdown'
import {
  ArtifactPreviewPane as StudioArtifactPreviewPane,
  type ArtifactPreviewPaneProps,
  type SelectedResource,
} from '@/features/studio/components/preview/artifacts/preview/ArtifactPreviewPane'

export type { ArtifactPreviewPaneProps, SelectedResource }

// Transitional bridge: the preview host is still Studio-owned while Phase 3 peels
// artifact branches into true shared surfaces. Keep this out of public barrels.
export function ArtifactPreviewPane({
  renderAdMenu,
  renderEmailPreview,
  renderFormPreview,
  renderFunnelMenu,
  ...props
}: ArtifactPreviewPaneProps) {
  return (
    <StudioArtifactPreviewPane
      {...props}
      renderAdMenu={renderAdMenu ?? ((menuProps) => <StudioAdMenuDropdown {...menuProps} />)}
      renderEmailPreview={
        renderEmailPreview ?? ((previewProps) => <EmailArtifactPreview {...previewProps} />)
      }
      renderFormPreview={
        renderFormPreview ?? ((previewProps) => <FormPreviewPane {...previewProps} />)
      }
      renderFunnelMenu={
        renderFunnelMenu ?? ((menuProps) => <StudioFunnelMenuDropdown {...menuProps} />)
      }
    />
  )
}
