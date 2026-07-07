'use client'

import {
  ArtifactPreviewPane as SharedArtifactPreviewPane,
  type ArtifactPreviewPaneProps,
} from '@/components/artifacts/ArtifactPreviewPaneAdapter'
import { AdMenuDropdown } from './ad/AdMenuDropdown'
import { EmailArtifactPreview } from './email/EmailArtifactPreview'
import { FormPreviewPane } from './form/FormPreviewPane'
import { FunnelMenuDropdown } from './funnel/FunnelMenuDropdown'
import { SocialPostMenuDropdown } from './social-post/SocialPostMenuDropdown'

export function SpacesArtifactPreviewPane({
  renderAdMenu,
  renderEmailPreview,
  renderFormPreview,
  renderFunnelMenu,
  renderSocialPostMenu,
  ...props
}: ArtifactPreviewPaneProps) {
  return (
    <SharedArtifactPreviewPane
      {...props}
      renderAdMenu={renderAdMenu ?? ((menuProps) => <AdMenuDropdown {...menuProps} />)}
      renderEmailPreview={
        renderEmailPreview ?? ((previewProps) => <EmailArtifactPreview {...previewProps} />)
      }
      renderFormPreview={
        renderFormPreview ?? ((previewProps) => <FormPreviewPane {...previewProps} />)
      }
      renderFunnelMenu={
        renderFunnelMenu ?? ((menuProps) => <FunnelMenuDropdown {...menuProps} />)
      }
      renderSocialPostMenu={
        renderSocialPostMenu ?? ((menuProps) => <SocialPostMenuDropdown {...menuProps} />)
      }
    />
  )
}
