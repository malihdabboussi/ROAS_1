export type SocialAnalyticsPlatform = 'instagram' | 'linkedin' | 'facebook' | 'youtube'

export interface SocialConnectionOption {
  id: string
  source: 'campaign_integration' | 'user_integration'
  label: string
  platform: SocialAnalyticsPlatform
  scope_mode: string | null
  is_default: boolean
  /** LinkedIn company page name from connection metadata when selected. */
  linkedin_company_page_name?: string | null
  facebook_page_name?: string | null
  youtube_channel_name?: string | null
}
