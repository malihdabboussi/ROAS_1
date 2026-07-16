export type ArtifactNodeType =
  | 'offer'
  | 'offer-step'
  | 'funnel'
  | 'page'
  | 'ad'
  | 'ad-campaign'
  | 'ad-set'
  | 'sequence'
  | 'sequence-email'
  | 'email'
  | 'presentation'
  | 'avatar'
  | 'social-post'
  | 'instagram-research'
  | 'tiktok-research'
  | 'youtube-research'
  | 'twitter-research'
  | 'space-task'
  | 'notification'
  | 'contact-conversation'
  | 'space_doc'
  | 'document'
  | 'media-image'
  | 'media-video'

export interface AttachedArtifact {
  id: string
  type: ArtifactNodeType
  label: string
}
