export interface AdCampaign {
  id: string
  user_id: string
  campaign_id: string | null
  space_id?: string | null
  name: string
  objective: string
  status: 'draft' | 'active' | 'paused' | 'archived'
  budget_type: 'CBO' | 'ABO'
  daily_budget: number | null
  lifetime_budget: number | null
  bid_strategy: string
  special_ad_categories: string[]
  meta_campaign_id: string | null
  meta_ad_account_id: string | null
  meta_page_id: string | null
  meta_effective_status?: string | null
  schedule_type: 'continuous' | 'one_time'
  start_time: string | null
  end_time: string | null
  source?: 'vibey' | 'meta'
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  ad_sets?: AdSet[]
}

export interface AdSet {
  id: string
  user_id: string
  ad_campaign_id: string
  campaign_id?: string | null
  space_id?: string | null
  name: string
  status: 'draft' | 'active' | 'paused' | 'archived'
  daily_budget: number | null
  lifetime_budget: number | null
  start_time: string | null
  end_time: string | null
  optimization_goal: string
  billing_event: string
  targeting: Record<string, unknown>
  meta_adset_id: string | null
  meta_effective_status?: string | null
  source?: 'vibey' | 'meta'
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  ads?: Ad[]
}

export interface AdPlacementImage {
  image_url: string
  image_asset_id?: string | null
}

export type AdFormat = 'SINGLE_IMAGE' | 'SINGLE_VIDEO' | 'CAROUSEL'

export interface CarouselCard {
  image_url: string
  headline?: string
  description?: string
  link?: string
  image_asset_id?: string | null
}

export interface Ad {
  id: string
  user_id: string
  campaign_id: string | null
  space_id?: string | null
  ad_set_id: string | null
  theme_id?: string | null
  platform: string
  placement: string
  primary_text: string
  headline: string
  description: string | null
  cta_type: string | null
  cta_text: string | null
  destination_url: string
  display_link: string | null
  image_url: string | null
  image_asset_id: string | null
  generated_tsx: string | null
  placement_images: Record<string, AdPlacementImage>
  placement_tsx: Record<string, string>
  ad_format: AdFormat
  video_url: string | null
  carousel_cards: CarouselCard[] | null
  meta_ad_id?: string | null
  meta_effective_status?: string | null
  source?: 'vibey' | 'meta'
  tracking_url: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}
