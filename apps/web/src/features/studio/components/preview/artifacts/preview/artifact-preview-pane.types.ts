import type { Dispatch, ReactNode, SetStateAction } from 'react'
import type { ViewportSize } from '@/features/studio/components/preview/FunnelToolbar'
import type { SocialPostPreviewMenuProps } from '@/features/studio/components/preview/social-post-preview/SocialPostPreviewToolbar'
import type {
  BlogPost,
  FunnelPage,
  FunnelPageBundle,
} from '@/features/studio/services/artifact-preview.service'
import type { Ad } from '@/features/studio/types'
import type { ArtifactPreviewResource } from '@/lib/artifacts/artifact-preview-types'
import type { ArtifactPreviewAdMenuProps } from './ArtifactPreviewAdPanel'
import type { ArtifactPreviewFunnelMenuProps } from './artifact-preview-chrome'

export type SelectedResource = ArtifactPreviewResource

export interface ArtifactPreviewEmailPreviewProps {
  emailId: string
  toolbarLeading?: ReactNode
  trailingChrome?: ReactNode
  publishAdjacentChrome?: ReactNode
  onOpenFullView?: () => void
  onResourceDeleted?: () => void
  centerEmailCard?: boolean
}

export interface ArtifactPreviewFormPreviewProps {
  formId: string
  toolbarLeading?: ReactNode
  fullscreenButton?: ReactNode
  trailingAfterDivider?: ReactNode
  buildShowAddQuestionRail?: boolean
  onOpenFullView?: () => void
}

export interface ArtifactPreviewPaneProps {
  selectedResource: SelectedResource | null
  selectedFunnel: {
    id: string
    name: string
    status: string
    slug: string
    publishedUrl: string | null
    funnelType: string
    campaignId?: string | null
    themeId?: string | null
    metadata?: Record<string, unknown> | null
    layout?: Record<string, unknown> | null
  } | null
  selectedPresentation: {
    id: string
    name: string
    status: 'draft' | 'generated' | 'published'
    fileUrl: string | null
    generatedHtml: string | null
    publishedUrl: string | null
    campaignId: string | null
    bundleVersion?: number
  } | null
  pageContent: {
    code: string
    css: string
    name: string
    contract?: {
      normalization_applied: string[]
      recovery_applied: string[]
      used_fallback: boolean
    }
    bundle?: FunnelPageBundle
  } | null
  pageLoading: boolean
  pageError: string | null
  themePreviewCss: string
  funnelViewport: ViewportSize
  setFunnelViewport: Dispatch<SetStateAction<ViewportSize>>
  lmViewport: ViewportSize
  setLmViewport: Dispatch<SetStateAction<ViewportSize>>
  adViewport: ViewportSize
  setAdViewport: Dispatch<SetStateAction<ViewportSize>>
  onFunnelStatusChange: (newStatus: string, newSlug: string, newPublishedUrl?: string) => void
  onPresentationStatusChange: (
    newStatus: 'draft' | 'generated' | 'published',
    newPublishedUrl: string | null,
  ) => void
  onPresentationMutated?: () => void
  onAdUpdated: (updatedAd: Ad) => void
  funnelPages?: FunnelPage[]
  currentPageId?: string | null
  onFunnelPageChange?: (pageId: string) => void
  onFunnelPreviewRefresh?: () => Promise<void> | void
  blogPosts?: BlogPost[]
  onBlogPostChange?: (postId: string) => void
  onResourceDeleted?: () => void
  /** Spaces slide-over: dismissed via this callback (X only if `slideOverShowCloseButton`). */
  slideOverOnClose?: () => void
  /** Spaces slide-over X; default true when callers pass `slideOverOnClose`. */
  slideOverShowCloseButton?: boolean
  /** Spaces slide-over: opens full in-place view (`?artifact=`). */
  slideOverOnOpenFullView?: () => void
  /** Spaces deep-work: single header - Back clears `?artifact=`. */
  spacesDeepWorkBack?: () => void
  /** Spaces deep-work: appended after primary toolbar actions (e.g. Save view). */
  spacesDeepWorkToolbarExtras?: ReactNode
  /** Feature-owned ad menu renderer. Spaces supplies its own artifact menu here. */
  renderAdMenu?: (props: ArtifactPreviewAdMenuProps) => ReactNode
  /** Feature-owned email preview renderer. Transitional adapter supplies the current implementation. */
  renderEmailPreview?: (props: ArtifactPreviewEmailPreviewProps) => ReactNode
  /** Feature-owned form preview renderer. Transitional adapter supplies the current implementation. */
  renderFormPreview?: (props: ArtifactPreviewFormPreviewProps) => ReactNode
  /** Feature-owned funnel menu renderer. Spaces supplies its own artifact menu here. */
  renderFunnelMenu?: (props: ArtifactPreviewFunnelMenuProps) => ReactNode
  /** Feature-owned social-post menu renderer. Spaces supplies its own artifact menu here. */
  renderSocialPostMenu?: (props: SocialPostPreviewMenuProps) => ReactNode
}
