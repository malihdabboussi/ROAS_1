export type ArtifactPreviewSelection =
  | { type: 'doc'; id: string; title: string }
  | { type: 'funnel' | 'website'; id: string; title: string }
  | { type: 'form'; id: string; title: string }
  | { type: 'task' | 'mission' | 'flow' | 'theme' | 'custom_object'; id: string; title: string }
  | { type: 'offer'; id: string; title: string }
  | { type: 'ad'; id: string; title: string }
  | { type: 'ad_set'; id: string; title: string }
  | { type: 'ad_campaign'; id: string; title: string }
  | { type: 'sequence'; id: string; title: string }
  | { type: 'email'; id: string; title: string }
  | { type: 'presentation'; id: string; title: string }
  | { type: 'avatar'; id: string; title: string }
  | { type: 'social_post'; id: string; title: string }

export type ArtifactPreviewType =
  | 'campaign'
  | 'canvas'
  | 'offer'
  | 'funnel'
  | 'avatar'
  | 'sequence'
  | 'presentation'
  | 'ad'
  | 'ad-set'
  | 'ad-campaign'
  | 'social-post'
  | 'blog-post'
  | 'email'
  | 'visual-doc'
  | 'form'
  | 'task'
  | 'mission'
  | 'flow'
  | 'website'
  | 'theme'
  | 'custom-object'

export type ArtifactPreviewResource =
  | { type: 'funnel'; id: string; name?: string }
  | { type: 'form'; id: string; name?: string }
  | { type: 'offer'; id: string; name?: string }
  | { type: 'offer-step'; id: string; stepNumber: number; name?: string }
  | { type: 'page'; id: string; funnelId: string; pageId: string; name?: string }
  | { type: 'ad'; id: string; name?: string }
  | { type: 'ad-campaign'; id: string; name?: string }
  | { type: 'ad-set'; id: string; name?: string }
  | { type: 'sequence'; id: string; name?: string; emailId?: string }
  | { type: 'email'; id: string; name?: string }
  | { type: 'presentation'; id: string; name?: string }
  | { type: 'avatar'; id: string; name?: string }
  | { type: 'social-post'; id: string; name?: string }
  | { type: 'doc'; id: string; name?: string }
  | { type: 'blog-post'; id: string; funnelId?: string; name?: string }
  | { type: 'blog-hub'; funnelId: string; name?: string }
  | { type: 'category-settings'; id: string; section: string; name?: string }
