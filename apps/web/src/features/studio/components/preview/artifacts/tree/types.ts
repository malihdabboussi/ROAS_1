import type { ReactNode } from 'react'
import type { BlogPost, Funnel } from '@/features/studio/services/artifact-preview.service'
import type {
  Ad,
  AdCampaign,
  Avatar,
  Offer,
  Presentation,
  Sequence,
  SocialPost,
} from '@/features/studio/types'

export interface TreeNode {
  id: string
  label: string
  type:
    | 'category'
    | 'funnel'
    | 'page'
    | 'offer'
    | 'offer-step'
    | 'sequence'
    | 'sequence-email'
    | 'presentation'
    | 'avatar'
    | 'ad'
    | 'ad-campaign'
    | 'ad-set'
    | 'social-post'
    | 'social-platform'
    | 'blog-post'
    | 'website-blog'
  icon: ReactNode
  children?: TreeNode[]
  funnelId?: string
  pageId?: string
  resourceId?: string
  stepNumber?: number
  emailId?: string
  adPlacement?: string
  subtitle?: string
  metaStatus?: string | null
  source?: 'vibey' | 'meta'
  isPublishedToMeta?: boolean
}

export type ArtifactCategoryId =
  | 'offers'
  | 'funnels'
  | 'websites'
  | 'ads'
  | 'sequences'
  | 'presentations'
  | 'avatars'
  | 'social-content'

export interface ArtifactsState {
  funnels: Funnel[]
  offers: Offer[]
  ads: Ad[]
  sequences: Sequence[]
  presentations: Presentation[]
  avatars: Avatar[]
  adCampaigns: AdCampaign[]
  socialPosts: SocialPost[]
  blogPosts: BlogPost[]
}

export interface CampaignOption {
  id: string
  name: string
  icon: string
}
