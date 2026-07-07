/**
 * Payload set before navigating to Studio so useArtifactsController opens the right preview.
 * Stored on window.__vibey_pending_artifact_open
 */
export type VibeyPendingArtifactOpenSimpleType =
  | 'funnel'
  | 'offer'
  | 'sequence'
  | 'presentation'
  | 'avatar'
  | 'ad'
  | 'ad-campaign'
  | 'ad-set'
  | 'social-post'
  | 'blog-post'

export type VibeyPendingArtifactOpen =
  | {
      kind: 'simple'
      type: VibeyPendingArtifactOpenSimpleType
      id: string
      name: string
      /** Present for blog-post when known (e.g. studio search). */
      funnelId?: string
    }
  | { kind: 'sequence-email'; sequenceId: string; emailId: string; name: string }
  | { kind: 'offer-step'; offerId: string; stepNumber: number; name: string }
  | { kind: 'page'; funnelId: string; pageId: string; name: string }

declare global {
  interface Window {
    __vibey_pending_artifact_open?: VibeyPendingArtifactOpen
  }
}

export {}
