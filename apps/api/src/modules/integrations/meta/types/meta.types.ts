export type MetaTokenResponse = {
  access_token: string
  token_type: string
  expires_in: number
}

export type MetaUserIntegration = {
  id: string
  user_id: string
  integration_id: string
  provider: string
  status: 'pending' | 'connected' | 'error' | 'disconnected'
  access_token: string | null
  refresh_token: string | null
  token_expires_at: string | null
  connected_at: string | null
  last_sync_at: string | null
  error_message: string | null
  metadata: Record<string, unknown> | null
}

export type MetaAdAccount = {
  id: string
  account_id: string
  name: string
  currency: string
  account_status: number
}

export type MetaPage = {
  id: string
  name: string
  access_token: string
  picture?: { data?: { url?: string } }
  instagram_business_account?: { id: string; username?: string; profile_picture_url?: string }
}

/** Safe page fields for frontend (e.g. ad preview). */
export type MetaPageInfo = {
  id: string
  name: string
  picture_url: string | null
}

export type MetaInstagramAccount = {
  id: string
  username?: string
  profile_pic?: string
  has_profile_picture?: boolean
}

export type MetaPixel = {
  id: string
  name: string
}

export type MetaCreatePixelInput = {
  name: string
  description?: string
  data_use_setting?: string
}

export type MetaCreatePixelResult = {
  id: string
  name?: string
}

export type MetaImageUploadResult = {
  hash: string
  url?: string
}

export type MetaCampaignInput = {
  name: string
  objective: MetaCampaignObjective
  status?: 'PAUSED' | 'ACTIVE'
  special_ad_categories?: string[]
  is_cbo?: boolean
  daily_budget?: number
  lifetime_budget?: number
  bid_strategy?: string
}

export type MetaCampaignObjective =
  | 'OUTCOME_AWARENESS'
  | 'OUTCOME_ENGAGEMENT'
  | 'OUTCOME_LEADS'
  | 'OUTCOME_SALES'
  | 'OUTCOME_TRAFFIC'
  | 'OUTCOME_APP_PROMOTION'

export type MetaAdSetInput = {
  campaign_id: string
  name: string
  daily_budget?: number
  lifetime_budget?: number
  start_time?: string
  end_time?: string
  billing_event: 'IMPRESSIONS' | 'LINK_CLICKS'
  optimization_goal:
    | 'REACH'
    | 'IMPRESSIONS'
    | 'LINK_CLICKS'
    | 'LANDING_PAGE_VIEWS'
    | 'LEAD_GENERATION'
    | 'CONVERSIONS'
    | 'OFFSITE_CONVERSIONS'
    | 'POST_ENGAGEMENT'
    | 'AD_RECALL_LIFT'
    | 'APP_INSTALLS'
  targeting: MetaTargeting
  promoted_object?: {
    page_id?: string
    pixel_id?: string
    custom_event_type?: string
  }
  dsa_beneficiary?: string
  dsa_payor?: string
  status?: 'PAUSED' | 'ACTIVE'
}

export type MetaTargeting = {
  geo_locations?: {
    countries?: string[]
    regions?: Array<{ key: string }>
    cities?: Array<{ key: string; radius?: number; distance_unit?: string }>
  }
  age_min?: number
  age_max?: number
  genders?: number[]
  interests?: Array<{ id: string; name: string }>
  behaviors?: Array<{ id: string; name: string }>
  publisher_platforms?: Array<'facebook' | 'instagram' | 'audience_network' | 'messenger'>
  facebook_positions?: string[]
  instagram_positions?: string[]
  /** Include these custom audiences (Meta custom audience IDs). */
  custom_audiences?: Array<{ id: string }>
  /** Exclude these custom audiences. */
  excluded_custom_audiences?: Array<{ id: string }>
}

export type MetaCustomAudience = {
  id: string
  name: string
  subtype?: string
  approximate_count?: number
}

/** Create engagement or other custom audience. For engagement use rule (event_sources). */
export type MetaCustomAudienceCreateInput = {
  name: string
  /** JSON rule for engagement audiences (e.g. event_sources with type and id). */
  rule?: Record<string, unknown>
  /** Retention days for engagement (e.g. 7, 14, 30). */
  retention_days?: number
}

export type MetaLookalikeCreateInput = {
  name: string
  origin_audience_id: string
  country: string
  /** 0.01 to 0.10 (1%–10%). */
  ratio?: number
}

export type MetaCustomConversion = {
  id: string
  name: string
  custom_event_type?: string
  rule?: string
  event_source_id?: string
}

export type MetaCustomConversionCreateInput = {
  name: string
  event_source_id: string
  custom_event_type: string
  /** URL rule or event rule string. */
  rule?: string
}

export type MetaAdCreativeInput = {
  name: string
  page_id: string
  instagram_user_id?: string
  image_hash: string
  message: string
  headline?: string
  description?: string
  link: string
  call_to_action_type?: string
}

export type MetaAssetFeedCreativeInput = {
  name: string
  page_id: string
  instagram_user_id?: string
  images: Array<{ hash: string; label: string }>
  message: string
  headline?: string
  description?: string
  link: string
  call_to_action_type?: string
  customization_rules: Array<{
    customization_spec: {
      publisher_platforms: string[]
      facebook_positions?: string[]
      instagram_positions?: string[]
    }
    image_label: { name: string }
  }>
}

export type MetaVideoCreativeInput = {
  name: string
  page_id: string
  instagram_user_id?: string
  video_id: string
  message: string
  headline?: string
  description?: string
  link: string
  image_hash?: string
  call_to_action_type?: string
}

export type MetaCarouselCreativeInput = {
  name: string
  page_id: string
  instagram_user_id?: string
  message: string
  link: string
  call_to_action_type?: string
  child_attachments: Array<{
    image_hash: string
    link: string
    name?: string
    description?: string
  }>
}

export type MetaAdInput = {
  name: string
  adset_id: string
  creative_id: string
  status?: 'PAUSED' | 'ACTIVE'
}

export type MetaPublishAdInput = {
  ad_id: string
  ad_account_id: string
  page_id: string
  instagram_user_id?: string
  campaign_name?: string
  campaign_objective?: MetaCampaignObjective
  budget_type?: 'ABO' | 'CBO'
  schedule_type?: 'continuous' | 'one_time'
  adset_name?: string
  daily_budget?: number
  lifetime_budget?: number
  bid_strategy?: string
  targeting: MetaTargeting
  pixel_id?: string
  custom_event_type?: string
  start_time?: string
  end_time?: string
}

export type MetaPublishCampaignInput = {
  campaign_id: string
  ad_account_id?: string
  page_id?: string
  instagram_user_id?: string
  campaign_name?: string
  campaign_objective?: MetaCampaignObjective
  budget_type?: 'ABO' | 'CBO'
  schedule_type?: 'continuous' | 'one_time'
  daily_budget?: number
  lifetime_budget?: number
  bid_strategy?: string
  targeting?: MetaTargeting
  pixel_id?: string
  custom_event_type?: string
  start_time?: string
  end_time?: string
}

export type MetaBatchValidationIssue = {
  level: 'campaign' | 'adset' | 'ad'
  entity_id: string
  message: string
}

export type MetaBatchPublishSuccessResult = {
  success: true
  campaign_id: string
  meta_campaign_id: string
  total_ad_sets: number
  total_ads: number
  published_ad_sets: Array<{ ad_set_id: string; meta_ad_set_id: string }>
  published_ads: Array<{
    ad_id: string
    ad_set_id: string
    meta_ad_id: string
    meta_ad_set_id: string
    meta_creative_id: string
  }>
}

export type MetaBatchPublishValidationResult = {
  success: false
  campaign_id: string
  validation_errors: MetaBatchValidationIssue[]
}

export type MetaBatchPublishResult =
  | MetaBatchPublishSuccessResult
  | MetaBatchPublishValidationResult

export type MetaCampaignUpdateInput = {
  name?: string
  status?: 'PAUSED' | 'ACTIVE'
  daily_budget?: number
  lifetime_budget?: number
  bid_strategy?: string
  special_ad_categories?: string[]
}

export type MetaAdSetUpdateInput = {
  name?: string
  status?: 'PAUSED' | 'ACTIVE'
  daily_budget?: number
  lifetime_budget?: number
  targeting?: MetaTargeting
  optimization_goal?: string
  billing_event?: 'IMPRESSIONS' | 'LINK_CLICKS'
  start_time?: string
  end_time?: string
  bid_strategy?: string
  promoted_object?: {
    page_id?: string
    pixel_id?: string
    custom_event_type?: string
  }
}

export type MetaDataDeletionPayload = {
  user_id: string
  algorithm: string
  issued_at: number
}

// ---------------------------------------------------------------------------
// Meta Fetch (read existing entities from Meta)
// ---------------------------------------------------------------------------

export type MetaFetchedCampaign = {
  id: string
  name: string
  objective?: string
  status?: string
  effective_status?: string
  daily_budget?: string
  lifetime_budget?: string
  created_time?: string
  start_time?: string
  stop_time?: string
  buying_type?: string
}

export type MetaFetchedAdSet = {
  id: string
  name: string
  status?: string
  effective_status?: string
  daily_budget?: string
  lifetime_budget?: string
  targeting?: Record<string, unknown>
  optimization_goal?: string
  billing_event?: string
  start_time?: string
  end_time?: string
}

export type MetaFetchedAd = {
  id: string
  name: string
  status?: string
  effective_status?: string
  created_time?: string
  creative?: MetaFetchedCreative
}

export type MetaFetchedCreative = {
  id: string
  name?: string
  title?: string
  body?: string
  image_url?: string
  thumbnail_url?: string
  object_story_spec?: Record<string, unknown>
  asset_feed_spec?: Record<string, unknown>
  call_to_action_type?: string
}

export type MetaFetchedHierarchy = {
  campaigns: Array<
    MetaFetchedCampaign & {
      ad_sets: Array<
        MetaFetchedAdSet & {
          ads: MetaFetchedAd[]
        }
      >
    }
  >
  total_campaigns: number
  total_ad_sets: number
  total_ads: number
}
