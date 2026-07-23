import type {
  FieldDef,
  FieldType,
  MissionsConfig,
  SelectOption,
  SubtasksDisplayMode,
} from '@/lib/spaces/space-schema-types'

export type {
  FieldDef,
  FieldType,
  MissionColumnId,
  MissionGroupBy,
  MissionsConfig,
  SelectOption,
  StatusCategory,
  SubtasksDisplayMode,
} from '@/lib/spaces/space-schema-types'

/** Legacy / disabled types: hidden from all space UI; may still exist in stored schema. */
const FIELD_TYPES_HIDDEN_FROM_UI: ReadonlySet<FieldType> = new Set(['duration'])

export function isSpaceFieldVisibleInUi(field: FieldDef): boolean {
  return !FIELD_TYPES_HIDDEN_FROM_UI.has(field.type)
}

export interface SortDef {
  field: string
  dir: 'asc' | 'desc'
}

export type DateDisplayFormat = 'relative' | 'date_time' | 'date' | 'time'
export type DateDisplayFormats = Partial<
  Record<'start_date' | 'due_date' | 'call_date', DateDisplayFormat>
>

/** Platforms supported by the unified Social Research view. */
export type SocialPlatform = 'instagram' | 'tiktok' | 'youtube' | 'twitter'

export const SOCIAL_PLATFORMS: readonly SocialPlatform[] = [
  'instagram',
  'tiktok',
  'youtube',
  'twitter',
] as const

export interface SocialTrackedAccount {
  handle: string
  /** Instagram numeric user id. TikTok uses `sec_uid` here when available. */
  user_id_ig?: string
  profile_pic_url?: string
  profile_pic_source_url?: string
  profile_pic_asset_id?: string
  profile_pic_storage_path?: string
  profile_pic_cached_at?: string
  profile_pic_cache_status?: 'ready' | 'failed'
  profile_pic_cache_error?: string
  follower_count?: number
  last_synced_at?: string
}

/** @deprecated Use `SocialTrackedAccount`. Kept as an alias so existing imports keep compiling. */
export type IgTrackedAccount = SocialTrackedAccount

export type SocialResearchGroupBy =
  | 'account'
  | 'outlier_tier'
  | 'date_range'
  | 'media_type'
  | 'platform'

export type SocialResearchDisplayMode = 'grid' | 'list'

/** List layout columns (preview thumbnail is always the first column; not toggled here). */
export type SocialResearchListColumnId =
  | 'format'
  | 'multiplier'
  | 'views'
  | 'likes'
  | 'comments'
  | 'posted'
  | 'account'
  | 'caption'
  | 'hook'
  | 'transcript'

export const SOCIAL_RESEARCH_LIST_COLUMN_IDS: readonly SocialResearchListColumnId[] = [
  'format',
  'multiplier',
  'views',
  'likes',
  'comments',
  'posted',
  'account',
  'caption',
  'hook',
  'transcript',
] as const

/** @deprecated Use `SocialResearchGroupBy`. */
export type IgResearchGroupBy = SocialResearchGroupBy
/** @deprecated Use `SocialResearchDisplayMode`. */
export type IgResearchDisplayMode = SocialResearchDisplayMode
/** @deprecated Use `SocialResearchListColumnId`. */
export type IgResearchListColumnId = SocialResearchListColumnId
/** @deprecated Use `SOCIAL_RESEARCH_LIST_COLUMN_IDS`. */
export const IG_RESEARCH_LIST_COLUMN_IDS = SOCIAL_RESEARCH_LIST_COLUMN_IDS

export interface SocialResearchConfig {
  tracked_accounts: SocialTrackedAccount[]
  sort_by?: 'outlier_score' | 'play_count' | 'taken_at'
  sort_dir?: 'asc' | 'desc'
  /** Include video posts (Reels for IG, Videos for TikTok) in the grid. */
  media_show_reels?: boolean
  /** Include still images / image posts in the grid. */
  media_show_images?: boolean
  /** Include TikTok slideshows (image-carousel posts) in the grid. Ignored on Instagram. */
  media_show_slideshows?: boolean
  /** Include YouTube long-form videos in the grid. Ignored on IG/TikTok. */
  media_show_yt_videos?: boolean
  /** Include YouTube Shorts in the grid. Ignored on IG/TikTok. */
  media_show_yt_shorts?: boolean
  /** Include X tweets (text/image) in the grid. Ignored on other platforms. */
  media_show_x_tweets?: boolean
  /** Include X video tweets in the grid. Ignored on other platforms. */
  media_show_x_videos?: boolean
  /** @deprecated Prefer `media_show_reels` / `media_show_images`; still read when those are unset. */
  media_filter?: 'all' | 'reels' | 'images'
  min_outlier_score?: number
  group_by?: SocialResearchGroupBy
  group_sort?: 'asc' | 'desc'
  /** When false, hide items whose `_handle` matches the workspace member's own connected social account. Default true. */
  show_connected_ig_in_grid?: boolean
  /** Tracked account handles (lowercase) excluded from grid/list (People toolbar). Omitted = all tracked accounts shown. */
  people_hidden_handles?: string[]
  /** Post date window; same presets as reporting Overview (`resolveReportingDates`). */
  time_range?: ReportingTimeRange
  custom_start?: string
  custom_end?: string
  /** Grid (cards) vs list table. */
  display_mode?: SocialResearchDisplayMode
  /** Which data columns show in list mode (preview is always first). Omitted = all columns. */
  list_visible_columns?: SocialResearchListColumnId[]
  /** List mode column widths (px). Includes `ig_list_preview` + each visible data column id. */
  list_column_widths?: Record<string, number>
}

/** @deprecated Use `SocialResearchConfig`. Kept as an alias so existing imports keep compiling. */
export type IgResearchConfig = SocialResearchConfig

/** Unified All Research view — aggregates IG, TikTok, YouTube, and X in one surface. */
export interface AllSocialResearchConfig extends SocialResearchConfig {
  /** Platforms shown in this view. Default: all four. */
  platform_filters?: SocialPlatform[]
  /** Per-platform tracked accounts owned by this unified view. */
  tracked_accounts_by_platform?: Partial<Record<SocialPlatform, SocialTrackedAccount[]>>
  /** Per-platform People toolbar hide list. */
  people_hidden_by_platform?: Partial<Record<SocialPlatform, string[]>>
}

/** Default social research view config (merged with `view.ig_research_config` / `view.tiktok_research_config`). */
export const DEFAULT_SOCIAL_RESEARCH_CONFIG: SocialResearchConfig = {
  tracked_accounts: [],
  sort_by: 'outlier_score',
  sort_dir: 'desc',
  media_filter: 'all',
  time_range: '90d',
  display_mode: 'grid',
}

export const DEFAULT_ALL_SOCIAL_RESEARCH_CONFIG: AllSocialResearchConfig = {
  ...DEFAULT_SOCIAL_RESEARCH_CONFIG,
  platform_filters: [...SOCIAL_PLATFORMS],
  tracked_accounts_by_platform: {},
  people_hidden_by_platform: {},
}

/** @deprecated Use `DEFAULT_SOCIAL_RESEARCH_CONFIG`. */
export const DEFAULT_IG_RESEARCH_CONFIG = DEFAULT_SOCIAL_RESEARCH_CONFIG

/** Docs view: card grid, same list/table as tasks (`ListView`), or nested tree (planned). */
export type DocsDisplayMode = 'grid' | 'list' | 'tree'

export type DocSourceKey = 'space' | 'studio' | 'channel' | 'dm' | 'mission' | 'drive' | 'campaign'

/** Grid/list toolbar + customize: filter rows for first-class Docs origins only (Drive stays separate). */
export const DOCS_VIEW_SOURCE_KEYS = [
  'studio',
  'channel',
  'dm',
  'space',
  'mission',
  'campaign',
] as const

export const DOC_SOURCE_LABELS: Record<DocSourceKey, string> = {
  studio: 'Studio',
  channel: 'Channels',
  dm: 'DMs',
  space: 'Space',
  mission: 'Missions',
  drive: 'Drive',
  campaign: 'Campaign docs',
}

export type DocsDriveGroupBy = 'flat' | 'type' | 'modified'
export type DocsDriveCardSize = 'preview' | 'compact' | 'small'

export interface DocsConfig {
  pinned_item_ids?: string[]
  /** Docs grid/list: show `_doc_cover_url` thumbnails on cards when true */
  show_cover_images?: boolean
  /** Shared view links: allow public viewers to open and read doc bodies from the shared Docs view. */
  public_doc_access_enabled?: boolean
  /** Card grid vs space list (`visible_fields`, `column_widths`) vs tree placeholder. */
  display_mode?: DocsDisplayMode
  /** Tree view: filter sidebar by doc source (multi-select; empty = all) */
  doc_source_filters?: DocSourceKey[]
  /** Inline Drive browse only: how to bucket files in current folder. */
  drive_group_by?: DocsDriveGroupBy
  /** Inline Drive browse only: card density. */
  drive_card_size?: DocsDriveCardSize
  /** Filter docs by title, notes, description, and body (grid/list/tree). */
  search_query?: string
}

export type ReportingTimeRange =
  | '24h'
  | '7d'
  | '15d'
  | '30d'
  | '90d'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'last_quarter'
  | 'this_year'
  | 'last_year'
  | 'all'

/** Campaign overview: user-placed heading + subtitle block (`ovcw_h_*` ids). */
export interface OverviewCustomHeadingWidget {
  id: string
  kind: 'heading'
  title: string
  subtitle: string
}

/** Campaign overview: user-placed note (`ovcw_n_*` ids). */
export interface OverviewCustomNoteWidget {
  id: string
  kind: 'note'
  body: string
}

export type OverviewCustomWidget = OverviewCustomHeadingWidget | OverviewCustomNoteWidget

export interface ReportingViewConfig {
  time_range?: ReportingTimeRange
  /** Custom absolute start date (ISO string); overrides `time_range` when both set. */
  custom_start?: string
  /** Custom absolute end date (ISO string); overrides `time_range` when both set. */
  custom_end?: string
  chart_type?: 'bar' | 'area' | 'line' | 'pie'
  /** Chart stroke/fill color (preset id, hex, or linear-gradient). Default primary. */
  chart_color?: string
  /**
   * Campaign overview card glass: primary tint for surfaces, borders, and main highlights.
   * Defaults to `chart_color` then theme primary when unset.
   */
  overview_glass_primary?: string
  /** First accent for badges, bars, and secondary highlights (defaults to primary when unset). */
  overview_glass_accent_1?: string
  /** Second accent for tertiary highlights and contrast (defaults to primary when unset). */
  overview_glass_accent_2?: string
  /**
   * When set, only these overview widgets render. IDs include executive KPIs (`kpi_*`),
   * layout cards (`card_*`), and funnel/email chart toggles for other reporting view types.
   * Campaign overview: `kpi_bounce_rate`, `card_revenue_summary`, `card_revenue_trend`,
   * `card_customer_journey`, `card_best_channel`, mission/social and extended reporting IDs
   * from the customize Display list.
   */
  visible_kpis?: string[]
  social_platform?: 'instagram' | 'linkedin' | 'facebook' | 'youtube'
  /**
   * Social reporting: which platforms render (multi-select). When omitted, `social_platform`
   * defaults to a single entry (`instagram` if unset).
   */
  social_platforms?: ('instagram' | 'linkedin' | 'facebook' | 'youtube')[]
  /**
   * Social reporting: pin analytics to a specific connection (`user_integrations.id` or
   * `campaign_integration_connections.id`). `null` = default resolution order for that platform.
   */
  social_instagram_connection_id?: string | null
  social_linkedin_connection_id?: string | null
  social_facebook_connection_id?: string | null
  social_youtube_connection_id?: string | null
  ads_sort_key?: string
  ads_sort_dir?: 'asc' | 'desc'
  /** Overview: which channel source cards to show; omit or undefined = all. */
  overview_channels?: ('funnels' | 'emails' | 'ads' | 'social')[]
  /** Funnel analytics: restrict to these funnel IDs; omit or undefined = all campaign funnels. */
  funnel_ids?: string[]
  /** Email analytics: restrict to these sequence IDs; omit or undefined = all campaign sequences. */
  sequence_ids?: string[]
  /** Ads performance: show only these ROAS ad campaign row IDs; omit or undefined = all. */
  ad_campaign_ids?: string[]
  /**
   * Campaign overview: user-added blocks (heading pair + note). IDs use prefixes `ovcw_h_*` / `ovcw_n_*` for default grid sizes.
   */
  overview_custom_widgets?: ReadonlyArray<OverviewCustomWidget>
  /**
   * Campaign overview: persisted react-grid-layout section positions (`ov_*` ids).
   * Omitted until the user rearranges the dashboard.
   */
  overview_dashboard_layout?: ReadonlyArray<{
    i: string
    x: number
    y: number
    w: number
    h: number
  }>
}

export type ReportingViewType =
  | 'campaign_overview'
  | 'social_reporting'
  | 'funnel_analytics'
  | 'email_analytics'
  | 'ads_performance'
  | 'finance_overview'

export const REPORTING_VIEW_TYPES: ReadonlySet<string> = new Set<ReportingViewType>([
  'campaign_overview',
  'social_reporting',
  'funnel_analytics',
  'email_analytics',
  'ads_performance',
  'finance_overview',
])

export type ArtifactDisplayMode = 'grid' | 'list'
export type ArtifactSortDir = 'asc' | 'desc'

export interface ArtifactViewBaseConfig {
  display_mode?: ArtifactDisplayMode
  visible_columns?: string[]
  column_widths?: Record<string, number>
  group_by?: string
  group_sort?: ArtifactSortDir
  sort_by?: string
  sort_dir?: ArtifactSortDir
  time_range?: ReportingTimeRange
  custom_start?: string
  custom_end?: string
  search_query?: string
}

export interface FunnelsConfig extends ArtifactViewBaseConfig {
  status_filters?: string[]
  funnel_type_filters?: string[]
  /** Grid card meta rows under the title; order preserved. */
  funnel_card_fields?: string[]
}

export interface FormsConfig extends ArtifactViewBaseConfig {
  status_filters?: string[]
  visibility_filters?: string[]
  /** Grid card meta rows under the title; order preserved. */
  form_card_fields?: string[]
}

export interface EmailsConfig extends ArtifactViewBaseConfig {
  status_filters?: string[]
}

export interface OffersConfig extends ArtifactViewBaseConfig {
  processing_status_filters?: string[]
}

/** Hierarchy navigator inside the unified Paid Ads space view (not grid/list `display_mode`). */
export type PaidAdsHierarchyMode = 'structure' | 'ad_sets' | 'creatives'
export type PaidAdsWorkspaceMode = 'creating' | 'production' | 'reporting' | 'research'

export interface AdsConfig extends ArtifactViewBaseConfig {
  /** Primary workspace surface: Analyze, Research, Production, or Launch. */
  paid_ads_workspace_mode?: PaidAdsWorkspaceMode
  /** Ads Research mission currently feeding the Production workspace. */
  paid_ads_production_source_mission_id?: string
  /** Campaign tree, ad-set list, or creatives grid. Defaults to `creatives`. */
  paid_ads_mode?: PaidAdsHierarchyMode
  platform_filters?: string[]
  placement_filters?: string[]
  status_filters?: string[]
  source_filters?: string[]
  ad_set_id_filters?: string[]
  /** Grid card meta rows under the title; order preserved. */
  ad_card_fields?: string[]
}

export interface AdCampaignsConfig extends ArtifactViewBaseConfig {
  objective_filters?: string[]
  status_filters?: string[]
  meta_sync_filter?: 'all' | 'synced' | 'not_synced'
}

export interface SequencesConfig extends ArtifactViewBaseConfig {
  status_filters?: string[]
  trigger_filters?: string[]
  /** Grid card meta rows under the title; order preserved. */
  sequence_card_fields?: string[]
}

export interface PresentationsConfig extends ArtifactViewBaseConfig {
  status_filters?: string[]
  /** Grid card meta rows under the title; order preserved. */
  presentation_card_fields?: string[]
}

export interface AvatarsConfig extends ArtifactViewBaseConfig {
  avatar_type_filters?: string[]
  offer_id_filters?: string[]
  /** Grid card meta rows under the header; order preserved. */
  avatar_card_fields?: string[]
}

export interface SocialPostsConfig extends ArtifactViewBaseConfig {
  platform_filters?: string[]
  post_type_filters?: string[]
  status_filters?: string[]
  time_field?: 'created_at' | 'scheduled_at'
  /** Grid card meta rows under the title; order preserved. */
  social_post_card_fields?: string[]
}

export interface WebsitesConfig extends ArtifactViewBaseConfig {
  status_filters?: string[]
}

export type ArtifactViewType =
  | 'funnels'
  | 'forms'
  | 'emails'
  | 'offers'
  | 'ads'
  | 'ad_campaigns'
  | 'sequences'
  | 'presentations'
  | 'avatars'
  | 'social_posts'
  | 'websites'

export const ARTIFACT_VIEW_TYPES: ReadonlySet<string> = new Set<ArtifactViewType>([
  'funnels',
  'forms',
  'emails',
  'offers',
  'ads',
  'ad_campaigns',
  'sequences',
  'presentations',
  'avatars',
  'social_posts',
  'websites',
])

/** Artifact kinds shown in the unified All Artifacts grid (excludes ad campaign hierarchy). */
export const ALL_ARTIFACT_KIND_TYPES: readonly ArtifactViewType[] = [
  'funnels',
  'forms',
  'websites',
  'offers',
  'emails',
  'sequences',
  'social_posts',
  'ads',
  'avatars',
  'presentations',
] as const

export type AllArtifactsViewType = 'all_artifacts'

export interface AllArtifactsConfig extends ArtifactViewBaseConfig {
  /** Artifact view types shown in this unified view. Default: all grid kinds. */
  artifact_type_filters?: ArtifactViewType[]
}

export const DEFAULT_ALL_ARTIFACTS_CONFIG: AllArtifactsConfig = {
  display_mode: 'grid',
  time_range: 'all',
  sort_by: 'created_at',
  sort_dir: 'desc',
  group_by: 'artifact_type',
  group_sort: 'asc',
  artifact_type_filters: [...ALL_ARTIFACT_KIND_TYPES],
}

export type ContactsGroupBy = 'contact_type' | 'contact_source' | 'tags' | 'funnel'

export interface ContactsConfig {
  /** Contact scope: campaign-filtered (default) or all org contacts. */
  scope?: 'campaign' | 'all'
  group_by?: ContactsGroupBy
  group_sort?: 'asc' | 'desc'
  sort_by?: 'created_at' | 'email' | 'name'
  sort_dir?: 'asc' | 'desc'
  show_archived?: boolean
  status_filter?: 'all' | 'lead' | 'customer'
  tag_options?: SelectOption[]
  contact_type_options?: SelectOption[]
}

export interface ChannelsViewConfig {
  channel_ids: string[]
  active_channel_id?: string
}

export interface ChannelViewConfig {
  channel_id: string
}

export type MediaViewTypeFilter = 'all' | 'image' | 'video'
/** Space Media view only surfaces images and videos (documents belong in Docs). */
export type MediaAssetTypePick = 'image' | 'video'
export type MediaSourceFilter = 'all' | 'generated' | 'uploaded' | 'agent'
export type MediaGroupBy = 'none' | 'date' | 'source'
export type MediaLayoutMode = 'gallery' | 'grid' | 'list'
/** Card density for gallery/grid layouts — every option keeps an image preview on the card (unlike Drive “small”). */
export type MediaPreviewCardSize = 'preview' | 'compact' | 'small'

export interface MediaViewConfig {
  /** @deprecated Prefer `type_filters`. */
  type_filter?: MediaViewTypeFilter
  /** Empty or omitted = all gallery types (images + videos). Multi-select (e.g. image + video). */
  type_filters?: MediaAssetTypePick[]
  source_filter?: MediaSourceFilter
  group_by?: MediaGroupBy
  group_sort?: 'asc' | 'desc'
  layout?: MediaLayoutMode
  /** Thumbnail grid density for gallery/grid layouts. */
  preview_card_size?: MediaPreviewCardSize
  search_query?: string
}

export const DEFAULT_MEDIA_VIEW_CONFIG: MediaViewConfig = {
  type_filters: [],
  source_filter: 'all',
  group_by: 'date',
  group_sort: 'desc',
  layout: 'gallery',
  preview_card_size: 'preview',
}

const EMPTY_MEDIA_TYPE_FILTERS: MediaAssetTypePick[] = []

/** Resolved picks for filtering; legacy `type_filter` maps here when `type_filters` is absent. Drops `document` (gallery is image/video only). */
export function resolveMediaTypeFilters(
  mc: Pick<MediaViewConfig, 'type_filter' | 'type_filters'> | undefined,
): MediaAssetTypePick[] {
  if (!mc) return EMPTY_MEDIA_TYPE_FILTERS
  const out: MediaAssetTypePick[] = []
  const seen = new Set<MediaAssetTypePick>()
  if (Array.isArray(mc.type_filters)) {
    for (const x of mc.type_filters) {
      if ((x === 'image' || x === 'video') && !seen.has(x)) {
        seen.add(x)
        out.push(x)
      }
    }
    if (out.length > 0) return out
  }
  const legacy = mc.type_filter as MediaViewTypeFilter | 'document' | undefined
  if (legacy === 'document') return EMPTY_MEDIA_TYPE_FILTERS
  if (legacy && legacy !== 'all' && (legacy === 'image' || legacy === 'video')) {
    return [legacy]
  }
  return EMPTY_MEDIA_TYPE_FILTERS
}

export type CalendarDateField = 'due_date' | 'start_date' | string
export type CalendarDefaultZoom = 'month' | 'week' | 'day'
/**
 * @deprecated Calendar views now persist visibility per source through `sources`.
 * Keep this for legacy view payloads created before multi-source calendars.
 */
export type CalendarSourceMode = 'space_items' | 'campaign_social_posts'
export type CalendarSocialPlatform = 'linkedin' | 'instagram'
export type CalendarTimeFormat = '12h' | '24h'

export type CalendarSourceConfig =
  | { id: string; type: 'space_items'; visible: boolean; color: string }
  | { id: string; type: 'campaign_social_posts'; visible: boolean; color: string }
  | { id: string; type: 'google_calendar'; visible: boolean; color: string }
  | { id: string; type: 'outlook'; visible: boolean; color: string }

export interface CalendarConfig {
  date_field?: CalendarDateField
  default_zoom?: CalendarDefaultZoom
  week_start?: 0 | 1
  source_mode?: CalendarSourceMode
  show_task_list?: boolean
  time_format?: CalendarTimeFormat
  social_platform_filters?: CalendarSocialPlatform[]
  sources?: CalendarSourceConfig[]
}

export type SocialResearchViewType =
  | 'instagram_research'
  | 'tiktok_research'
  | 'youtube_research'
  | 'twitter_research'

/** Per-platform research view types (items store `_view_type` as one of these). */
export const SOCIAL_RESEARCH_PLATFORM_VIEW_TYPES: ReadonlySet<string> =
  new Set<SocialResearchViewType>([
    'instagram_research',
    'tiktok_research',
    'youtube_research',
    'twitter_research',
  ])

/** @deprecated Use `SOCIAL_RESEARCH_PLATFORM_VIEW_TYPES` when filtering items by `_view_type`. */
export const SOCIAL_RESEARCH_VIEW_TYPES = SOCIAL_RESEARCH_PLATFORM_VIEW_TYPES

export type AllSocialResearchViewType = 'all_social_research'

/** Ads Research view — Meta / TikTok / Google ad libraries via SearchAPI.io. */
export type AdsResearchViewType = 'ads_research'

export type AdsResearchGroupBy = 'advertiser' | 'platform' | 'format' | 'longevity'
export type AdsResearchDisplayMode = 'grid' | 'list'
export type AdsResearchSortBy = 'days_running' | 'last_shown' | 'first_shown'

/** Toolbar prefs for the Ads Research view (results + Saved ads surfaces). */
export interface AdsResearchConfig {
  display_mode?: AdsResearchDisplayMode
  group_by?: AdsResearchGroupBy
  group_sort?: 'asc' | 'desc'
  sort_by?: AdsResearchSortBy
  sort_dir?: 'asc' | 'desc'
}

export function socialResearchPlatformForViewType(type: SocialResearchViewType): SocialPlatform {
  if (type === 'tiktok_research') return 'tiktok'
  if (type === 'youtube_research') return 'youtube'
  if (type === 'twitter_research') return 'twitter'
  return 'instagram'
}

export function socialResearchConfigKeyForPlatform(
  platform: SocialPlatform,
):
  | 'ig_research_config'
  | 'tiktok_research_config'
  | 'youtube_research_config'
  | 'twitter_research_config' {
  if (platform === 'tiktok') return 'tiktok_research_config'
  if (platform === 'youtube') return 'youtube_research_config'
  if (platform === 'twitter') return 'twitter_research_config'
  return 'ig_research_config'
}

export interface ViewDef {
  id: string
  type:
    | 'list'
    | 'table'
    | 'kanban'
    | 'missions'
    | SocialResearchViewType
    | AllSocialResearchViewType
    | AdsResearchViewType
    | 'docs'
    | 'contacts'
    | 'channels'
    | 'channel'
    | 'calendar'
    | 'media'
    | 'form_responses'
    | ReportingViewType
    | ArtifactViewType
    | AllArtifactsViewType
  name: string
  /** Lucide icon name override (kebab-case). Falls back to type-based icon. */
  icon?: string
  /** Icon color from ICON_COLORS palette */
  icon_color?: string
  group_by?: string
  group_sort?: 'asc' | 'desc'
  visible_fields?: string[]
  sort?: SortDef[]
  /**
   * When `sort` is set on list/table task views: `global` sorts all items before grouping;
   * `per_group` sorts rows only inside each group bucket.
   */
  sort_scope?: 'per_group' | 'global'
  column_widths?: Record<string, number>
  /** @deprecated List/table task views: legacy shared display format for date columns. */
  date_display_format?: DateDisplayFormat
  /** List/table task views: per-field display format for Start Date and Due Date columns. */
  date_display_formats?: DateDisplayFormats
  show_empty_statuses?: boolean
  show_closed_tasks?: boolean
  /**
   * Hard view filters on field values (system columns or custom_data).
   * Values may be a single id/string or a list (OR). Missing custom values
   * match only when filtering for `call` on `entry_type` (legacy meeting rows).
   */
  field_value_filters?: Record<string, string | string[]>
  /** Toolbar: show only tasks assigned to the current user (human). */
  toolbar_assigned_to_me?: boolean
  /** Toolbar: filter by assignee roster `participant_id`s. */
  toolbar_filter_assignee_participant_ids?: string[]
  subtasks_expanded?: boolean
  subtasks_display?: SubtasksDisplayMode
  ig_research_config?: SocialResearchConfig
  tiktok_research_config?: SocialResearchConfig
  youtube_research_config?: SocialResearchConfig
  twitter_research_config?: SocialResearchConfig
  all_social_research_config?: AllSocialResearchConfig
  ads_research_config?: AdsResearchConfig
  all_artifacts_config?: AllArtifactsConfig
  missions_config?: MissionsConfig
  docs_config?: DocsConfig
  reporting_config?: ReportingViewConfig
  contacts_config?: ContactsConfig
  channels_config?: ChannelsViewConfig
  channel_config?: ChannelViewConfig
  media_config?: MediaViewConfig
  calendar_config?: CalendarConfig
  funnels_config?: FunnelsConfig
  forms_config?: FormsConfig
  emails_config?: EmailsConfig
  offers_config?: OffersConfig
  ads_config?: AdsConfig
  ad_campaigns_config?: AdCampaignsConfig
  sequences_config?: SequencesConfig
  presentations_config?: PresentationsConfig
  avatars_config?: AvatarsConfig
  social_posts_config?: SocialPostsConfig
  websites_config?: WebsitesConfig
  /** When false, client may defer persisting view tweaks (reserved; default true). */
  autosave_for_me?: boolean
  /** When true, view is ordered first in the space tab strip. */
  pinned_to_start?: boolean
  /** Form responses views: source form id used to filter `space_items.form_id`. */
  _form_id?: string
}

export function resolveSubtasksDisplay(
  view: Pick<ViewDef, 'subtasks_display' | 'subtasks_expanded'>,
): SubtasksDisplayMode {
  if (view.subtasks_display) return view.subtasks_display
  return view.subtasks_expanded ? 'expanded' : 'collapsed'
}

export function resolveMissionsSubtasksDisplay(mc: MissionsConfig): SubtasksDisplayMode {
  if (mc.subtasks_display) return mc.subtasks_display
  if (mc.subtasks_expanded === true) return 'expanded'
  return 'collapsed'
}

// ---------------------------------------------------------------------------
// Automations
// ---------------------------------------------------------------------------

export type AutomationTaskScope = 'tasks' | 'subtasks' | 'all'
export type GmailInboxCategory = 'primary' | 'promotions' | 'social' | 'updates' | 'forums'

type AutomationTaskTriggerContext = {
  task_scope?: AutomationTaskScope
  /** Space whose task schema drives Setup/Configure fields (required in concept sandbox). */
  context_space_id?: string
}

export type AutomationTrigger =
  | ({ type: 'status_change'; from?: string; to: string } & AutomationTaskTriggerContext)
  | ({ type: 'task_created'; in_status?: string } & AutomationTaskTriggerContext)
  | ({ type: 'mission_completed' } & AutomationTaskTriggerContext)
  | ({ type: 'mission_failed' } & AutomationTaskTriggerContext)
  | ({ type: 'field_changed'; field_id: string; to?: string } & AutomationTaskTriggerContext)
  | ({
      type: 'priority_changed'
      from?: 'low' | 'medium' | 'high' | 'urgent'
      to?: 'low' | 'medium' | 'high' | 'urgent'
    } & AutomationTaskTriggerContext)
  | ({
      type: 'assignee_changed'
      assignee_type?: 'human' | 'agent' | 'unassigned'
      assignee_id?: string
    } & AutomationTaskTriggerContext)
  | ({ type: 'due_date_changed'; from?: string; to?: string } & AutomationTaskTriggerContext)
  | ({ type: 'start_date_changed'; from?: string; to?: string } & AutomationTaskTriggerContext)
  | ({ type: 'tag_added'; tag?: string } & AutomationTaskTriggerContext)
  | ({ type: 'tag_removed'; tag?: string } & AutomationTaskTriggerContext)
  | { type: 'form_submitted'; form_id?: string; field_id?: string; field_value?: string }
  | { type: 'contact_created' }
  | { type: 'contact_updated'; field_id?: string; to?: string }
  | { type: 'contact_tag_added'; tag?: string }
  | { type: 'contact_tag_removed'; tag?: string }
  | { type: 'contact_type_changed'; to?: string }
  | { type: 'contact_source_changed'; to?: string }
  | {
      type: 'artifact_lifecycle'
      artifact_kind?:
        | 'funnel'
        | 'website'
        | 'form'
        | 'email'
        | 'sequence'
        | 'social_post'
        | 'presentation'
        | 'ad'
        | 'offer'
        | 'avatar'
      lifecycle_event?: string
      artifact_id?: string
      status?: string
    }
  | {
      type: 'external_email_received'
      provider?: 'gmail' | 'outlook'
      trigger_slug?: 'GMAIL_NEW_GMAIL_MESSAGE' | 'OUTLOOK_MESSAGE_TRIGGER'
      connected_account_id?: string
      gmail_category?: GmailInboxCategory
      from_contains?: string
      subject_contains?: string
    }
  | {
      type: 'external_slack_message_received'
      trigger_slug?:
        | 'SLACK_RECEIVE_DIRECT_MESSAGE'
        | 'SLACK_CHANNEL_MESSAGE_RECEIVED'
        | 'SLACK_RECEIVE_THREAD_REPLY'
        | 'SLACKBOT_RECEIVE_DIRECT_MESSAGE'
        | 'SLACKBOT_CHANNEL_MESSAGE_RECEIVED'
        | 'SLACKBOT_RECEIVE_THREAD_REPLY'
      connected_account_id?: string
      channel_id?: string
      from_contains?: string
      text_contains?: string
    }
  | {
      type: 'external_fathom_recording_ready'
      title_contains?: string
      recorded_by_contains?: string
      /**
       * Fathom source picker. Defaults to `self` when undefined (backward
       * compatible with rules saved before Phase 2). Only org admin/owner
       * can save `user` or `team` modes — enforced server-side.
       */
      source?: FathomTriggerSource
    }
  | {
      type: 'external_app_event'
      provider?:
        | 'googlecalendar'
        | 'googledrive'
        | 'googlesheets'
        | 'salesforce'
        | 'github'
        | 'notion'
      trigger_slug?: string
      connected_account_id?: string
      trigger_config?: Record<string, unknown>
    }
  | { type: 'webhook_received'; webhook_endpoint_id?: string }
  | {
      type: 'schedule'
      schedule: AutomationSchedule
      timezone: string
    }
  | { type: 'choose_action' }

export type FathomTriggerSource =
  | { mode: 'self' }
  | { mode: 'user'; user_integration_id: string }
  | { mode: 'team'; team_id: string }

export type AutomationSchedulePreset =
  | 'minutes'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'

export type AutomationSchedule =
  | {
      mode: 'preset'
      preset: AutomationSchedulePreset
      /** Minutes/hours/days/weeks/months between fires (defaults to 1). Preset `minutes`: 1–59. */
      interval?: number
      /** "HH:MM" (24h). Required for daily/weekly/monthly/yearly. Ignored for hourly. */
      time?: string
      /** 0=Sunday … 6=Saturday. Legacy single weekday when `weekdays` is unset. */
      day_of_week?: number
      /** Fire on each listed weekday (weekly); 0=Sunday … 6=Saturday. */
      weekdays?: number[]
      /** 1-31. Monthly/yearly calendar day. */
      day_of_month?: number
      /** Calendar month for yearly preset (1–12). */
      month?: number
    }
  | {
      mode: 'custom'
      /** 5-field cron expression (legacy / API-only). */
      cron: string
    }

export type AutomationContinuation = 'immediately' | 'after_task_completes'
export interface AutomationAssigneeTarget {
  type: 'human' | 'agent'
  id: string
}

/**
 * Send-to-agent output handoff. `none` runs a free-form agent invocation; every other value
 * appends an OUTPUT CONTRACT to the prompt that tells the agent which `vibey_backend` save tool to call.
 */
export type SocialResearchAutomationPlatform =
  | 'instagram'
  | 'tiktok'
  | 'youtube'
  | 'twitter'
  | 'both'
  | 'all'
export type SocialResearchAutomationSyncMode = 'use_existing' | 'resync_30d'
export type SocialResearchAutomationEnrichment = 'caption' | 'hook' | 'transcript'
export type BrainImportDomain =
  | 'strategy'
  | 'marketing'
  | 'finance'
  | 'operations'
  | 'creative'
  | 'general'

export type SendToAgentOutputType =
  | 'none'
  | 'email_artifact'
  | 'document_artifact'
  | 'pdf_artifact'
  | 'funnel_artifact'
  | 'website_artifact'
  | 'sequence_artifact'
  | 'social_post_artifact'
  | 'presentation_artifact'
  | 'ad_artifact'
  | 'offer_artifact'
  | 'avatar_artifact'
  | 'blog_post_artifact'

export type AgentCollaborationMode = 'allowed' | 'disabled'

export type AutomationAction =
  | {
      type: 'create_task'
      title_template: string
      status?: string
      assignees?: AutomationAssigneeTarget[]
      assignee_type?: 'human' | 'agent' | 'unassigned'
      assignee_id?: string
      priority?: 'low' | 'medium' | 'high' | 'urgent'
      notes_template?: string
      /** Custom field values keyed by field id; written into the new task's `custom_data`. */
      field_values?: Record<string, unknown>
      continuation?: AutomationContinuation
    }
  | {
      type: 'send_to_agent'
      agent_key: string
      prompt_template: string
      inject_fields?: string[]
      output_type?: SendToAgentOutputType
      target_item_ref?: string
      extended_brain_knowledge?: boolean
      agent_collaboration?: AgentCollaborationMode
      priority?: 'low' | 'medium' | 'high' | 'urgent'
      continuation?: AutomationContinuation
      /** Status to apply to the source task once the agent finishes. Pauses the run until completion. */
      completed_status?: string
    }
  | {
      type: 'send_to_agents'
      prompt_template: string
      agent_tasks: Array<{ agent_key: string; prompt_template?: string }>
      inject_fields?: string[]
      target_item_ref?: string
      extended_brain_knowledge?: boolean
      agent_collaboration?: AgentCollaborationMode
      priority?: 'low' | 'medium' | 'high' | 'urgent'
      continuation?: AutomationContinuation
      /** Status to apply to the source task once the agent finishes. Pauses the run until completion. */
      completed_status?: string
    }
  | {
      type: 'send_to_cursor'
      connection_id?: string
      repo_url: string
      base_branch: string
      branch_name?: string
      prompt_template: string
      model_id?: string
      inject_fields?: string[]
      target_item_ref?: string
      priority?: 'low' | 'medium' | 'high' | 'urgent'
      continuation?: AutomationContinuation
      completed_status?: string
    }
  | {
      type: 'add_brain_context_to_task'
      target_item_ref?: string
      query_template?: string
      continuation?: AutomationContinuation
    }
  | {
      type: 'agent_suggest_tasks'
      agent_key?: string
      max_suggestions?: number
      instructions?: string
      extended_brain_knowledge?: boolean
      continuation?: AutomationContinuation
    }
  | {
      type: 'assign_to'
      assignees: AutomationAssigneeTarget[]
      assignee_type?: 'human' | 'agent'
      assignee_id?: string
      target_item_ref?: string
      continuation?: AutomationContinuation
    }
  | {
      type: 'change_status'
      status: string
      target_item_ref?: string
      continuation?: AutomationContinuation
    }
  | {
      type: 'change_priority'
      priority?: 'low' | 'medium' | 'high' | 'urgent'
      target_item_ref?: string
      continuation?: AutomationContinuation
    }
  | {
      type: 'add_comment'
      message_template: string
      target_item_ref?: string
      continuation?: AutomationContinuation
    }
  | {
      type: 'human_gate'
      target_item_ref?: string
      assignees?: AutomationAssigneeTarget[]
      assignee_type?: 'human' | 'agent'
      assignee_id?: string
      waiting_status?: string
      resume_on_status?: string
      reject_on_status?: string
      on_reject_goto_step_index?: number
      message_template?: string
      continuation?: AutomationContinuation
    }
  | {
      type: 'flow_loop'
      target_step_index: number
      when?: 'on_reject' | 'always'
      max_iterations?: number
      continuation?: AutomationContinuation
    }
  | {
      type: 'flow_branch'
      field_id: string
      operator?: 'equals' | 'not_equals' | 'contains' | 'is_empty' | 'is_not_empty'
      value?: string
      then_step_index: number
      else_step_index?: number
      continuation?: AutomationContinuation
    }
  | {
      type: 'send_email'
      tool_slug?: string
      connected_account_id?: string
      to?: string
      subject_template?: string
      body_template?: string
      subject_source?: 'manual' | 'artifact'
      email_artifact_id?: string
      continuation?: AutomationContinuation
    }
  | {
      type: 'send_slack_message'
      channel_id?: string
      text_template?: string
      thread_ts?: string
      continuation?: AutomationContinuation
    }
  | {
      type: 'request_slack_follow_up_confirm'
      delivery_mode?: 'shadow' | 'active'
      dm_email?: string
      confirm_reaction?: string
      suggestion_ids?: string[]
      continuation?: AutomationContinuation
    }
  | {
      type: 'observe_slack_team'
      loop_kind:
        | 'brain_compounding'
        | 'workflow_discovery'
        | 'unanswered_questions'
        | 'client_risk'
        | 'all'
      delivery_mode: 'shadow' | 'active'
      channel_ids?: string[]
      person_ids?: string[]
      lookback_minutes?: number
      daily_limit?: number
      quiet_hours?: { start: string; end: string; timezone: string }
      instructions?: string
      continuation?: AutomationContinuation
    }
  | {
      type: 'send_channel_message'
      channel_id?: string
      content_template?: string
      continuation?: AutomationContinuation
    }
  | {
      type: 'create_contact'
      email_template?: string
      name_template?: string
      source?: string
      /** Additional contact column values keyed by column name (rendered as templates server-side). */
      field_values?: Record<string, string>
      continuation?: AutomationContinuation
    }
  | {
      type: 'update_contact_field'
      contact_id?: string
      field_id?: string
      value_template?: string
      continuation?: AutomationContinuation
    }
  | {
      type: 'add_contact_tag'
      contact_id?: string
      tag?: string
      continuation?: AutomationContinuation
    }
  | {
      type: 'remove_contact_tag'
      contact_id?: string
      tag?: string
      continuation?: AutomationContinuation
    }
  | {
      type: 'attach_note_to_contact'
      contact_id?: string
      content_template?: string
      continuation?: AutomationContinuation
    }
  | { type: 'link_item_to_contact'; contact_id?: string; continuation?: AutomationContinuation }
  | {
      type: 'create_artifact'
      artifact_kind?: string
      title_template?: string
      campaign_id?: string
      continuation?: AutomationContinuation
    }
  | {
      type: 'publish_artifact'
      artifact_kind?: string
      artifact_id?: string
      continuation?: AutomationContinuation
    }
  | {
      type: 'unpublish_artifact'
      artifact_kind?: string
      artifact_id?: string
      continuation?: AutomationContinuation
    }
  | {
      type: 'ask_agent_to_improve_artifact'
      artifact_kind?: string
      artifact_id?: string
      agent_key?: string
      prompt_template?: string
      continuation?: AutomationContinuation
    }
  | {
      type: 'attach_artifact_to_item'
      artifact_kind?: string
      artifact_id?: string
      target_item_ref?: string
      continuation?: AutomationContinuation
    }
  | {
      type: 'create_subtask'
      title_template: string
      assignees?: AutomationAssigneeTarget[]
      assignee_type?: 'human' | 'agent' | 'unassigned'
      assignee_id?: string
      target_item_ref?: string
      continuation?: AutomationContinuation
    }
  | {
      type: 'sync_social_research'
      platform?: SocialResearchAutomationPlatform
      sync_mode?: SocialResearchAutomationSyncMode
      continuation?: AutomationContinuation
    }
  | {
      type: 'select_social_outliers'
      platform?: SocialResearchAutomationPlatform
      min_outlier_score?: number
      limit?: number
      since_days?: number
      source_step?: string
      continuation?: AutomationContinuation
    }
  | {
      type: 'enrich_social_research_items'
      enrichments?: SocialResearchAutomationEnrichment[]
      source_step?: string
      continuation?: AutomationContinuation
    }
  | {
      type: 'ingest_youtube_channel_to_agent_brain'
      agent_key?: string
      brain_id?: string
      channel_urls?: string[]
      since_days?: number
      max_videos_per_channel?: number
      include_shorts?: boolean
      domain?: BrainImportDomain
      continuation?: AutomationContinuation
    }
  | {
      type: 'meetings_precall_prep'
      refresh?: boolean
      timezone?: string
      continuation?: AutomationContinuation
    }
  | { type: 'choose_action'; continuation?: AutomationContinuation }

export interface SpaceAutomation {
  id: string
  name: string
  enabled: boolean
  /** When true, rule is not executed until completed and published */
  is_draft?: boolean
  trigger: AutomationTrigger
  actions: AutomationAction[]
  created_at?: string
  updated_at?: string
  /**
   * User id of the author. Edit-level callers can only modify automations they
   * created themselves; admins can modify any. Backfilled to the space owner
   * for automations that existed before this column.
   */
  created_by?: string | null
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export interface SpaceSchema {
  version: 1
  fields: FieldDef[]
  views: ViewDef[]
  /** Lucide icon name (kebab-case), e.g. layout-grid */
  icon?: string
  /** Color ID from ICON_COLORS palette, e.g. 'purple' */
  icon_color?: string
}

export const DEFAULT_TASK_VISIBLE_FIELD_IDS = [
  'status',
  'title',
  'priority',
  'assignee',
  'due_date',
] as const

export const DEFAULT_SPACE_SCHEMA: SpaceSchema = {
  version: 1,
  icon: 'layout-grid',
  fields: [
    { id: 'title', name: 'Name', type: 'text', system: true, required: true },
    {
      id: 'status',
      name: 'Status',
      type: 'select',
      system: true,
      required: true,
      options: [
        { id: 'todo', label: 'To Do', color: 'cyan', group: 'not_started' },
        { id: 'in_progress', label: 'In Progress', color: 'amber', group: 'active' },
        { id: 'in_review', label: 'In Review', color: 'violet', group: 'active' },
        { id: 'needs_revision', label: 'Needs revision', color: 'orange', group: 'active' },
        { id: 'done', label: 'Completed', color: 'emerald', group: 'closed' },
        { id: 'archived', label: 'Closed', color: 'slate', group: 'closed' },
      ],
    },
    {
      id: 'priority',
      name: 'Priority',
      type: 'select',
      system: true,
      required: true,
      options: [
        { id: 'low', label: 'Low', color: 'slate' },
        { id: 'medium', label: 'Medium', color: 'blue' },
        { id: 'high', label: 'High', color: 'orange' },
        { id: 'urgent', label: 'Urgent', color: 'red' },
      ],
    },
    { id: 'assignee', name: 'Assignee', type: 'assignee', system: true },
    { id: 'due_date', name: 'Due Date', type: 'date', system: true },
    { id: 'tags', name: 'Tags', type: 'multi_select', system: true, options: [] },
    {
      id: 'category',
      name: 'Category',
      type: 'select',
      options: [],
    },
    { id: 'start_date', name: 'Start Date', type: 'date' },
    { id: 'notes', name: 'Notes', type: 'text' },
    { id: 'email', name: 'Email', type: 'email' },
    { id: 'phone', name: 'Phone', type: 'phone' },
    { id: 'url', name: 'URL', type: 'url' },
    { id: 'number', name: 'Number', type: 'number' },
    { id: 'currency', name: 'Currency', type: 'currency' },
    { id: 'checkbox', name: 'Checkbox', type: 'checkbox' },
    { id: 'rating', name: 'Rating', type: 'rating' },
    { id: 'progress', name: 'Progress', type: 'progress' },
    // { id: 'duration', name: 'Duration', type: 'duration' },
    { id: 'created_at', name: 'Created', type: 'created_at', system: true },
    { id: 'updated_at', name: 'Updated', type: 'updated_at', system: true },
    { id: 'mission', name: 'Mission', type: 'mission', system: true },
  ],
  views: [
    {
      id: 'list',
      type: 'list',
      name: 'List',
      visible_fields: ['status', 'title', 'priority', 'assignee', 'due_date', 'tags', 'mission'],
    },
    {
      id: 'table',
      type: 'table',
      name: 'Table',
      visible_fields: ['status', 'title', 'priority', 'assignee', 'due_date', 'tags', 'mission'],
    },
    {
      id: 'board',
      type: 'kanban',
      name: 'Board',
      group_by: 'status',
      visible_fields: ['title', 'priority', 'assignee', 'due_date', 'tags', 'mission'],
    },
    {
      id: 'calendar',
      type: 'calendar',
      name: 'Calendar',
      calendar_config: {
        date_field: 'due_date',
        default_zoom: 'month',
        week_start: 1,
        source_mode: 'space_items',
        show_task_list: true,
        time_format: '12h',
        social_platform_filters: [],
        sources: [
          { id: 'space_items', type: 'space_items', visible: true, color: 'blue' },
          {
            id: 'campaign_social_posts',
            type: 'campaign_social_posts',
            visible: true,
            color: 'purple',
          },
          { id: 'google_calendar', type: 'google_calendar', visible: true, color: 'green' },
          { id: 'outlook', type: 'outlook', visible: true, color: 'blue' },
        ],
      },
    },
    {
      id: 'missions',
      type: 'missions',
      name: 'Missions',
    },
  ],
}

/** New spaces created from the app: same fields as `DEFAULT_SPACE_SCHEMA`, starting with a single List view so added items are immediately visible. */
export const NEW_SPACE_SCHEMA: SpaceSchema = {
  ...DEFAULT_SPACE_SCHEMA,
  views: [
    {
      id: 'list',
      type: 'list',
      name: 'List',
      visible_fields: ['status', 'title', 'priority', 'assignee', 'due_date', 'tags', 'mission'],
    },
  ],
}

/** Default status for newly created tasks — not `options[0]`, which changes when users reorder columns. */
export function defaultNewTaskStatusId(statusField: FieldDef | null | undefined): string {
  const opts = statusField?.options ?? []
  const todo = opts.find((o) => o.id === 'todo')
  if (todo) return todo.id
  const notStarted = opts.find((o) => o.group === 'not_started')
  if (notStarted) return notStarted.id
  return opts[0]?.id ?? ''
}
