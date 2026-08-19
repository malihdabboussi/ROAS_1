import { DEFAULT_CONTACT_VISIBLE_FIELD_IDS } from '../lib/contact-view-field-meta'
import { REPORTING_VIEW_TYPES, type ViewDef } from '../types/space-schema'
import { VIEW_ADD_PARENT_ARTIFACT, VIEW_ADD_PARENT_REPORTING } from './view-type-tab-meta'

export type CatalogViewType = ViewDef['type']
export function isEditorGatedViewType(type: CatalogViewType): boolean {
  return type === 'contacts' || REPORTING_VIEW_TYPES.has(type)
}

export function isChannelViewType(type: CatalogViewType): boolean {
  return type === 'channels' || type === 'channel'
}

export const REUSABLE_TASK_VIEW_TYPES = new Set<CatalogViewType>(['list', 'table', 'kanban'])

export function findReusableTaskView(type: CatalogViewType, views: ViewDef[]): ViewDef | null {
  if (!REUSABLE_TASK_VIEW_TYPES.has(type)) return null
  return views.find((view) => view.type === type) ?? null
}

export interface ViewCatalogItem {
  type: CatalogViewType
  label: string
  icon: string
  description: string
  /** If set, new view uses this `id` (e.g. `ig_research` for Instagram). */
  newViewId?: string
}

export type ViewCatalogParentRow = {
  type: typeof VIEW_ADD_PARENT_REPORTING | typeof VIEW_ADD_PARENT_ARTIFACT
  label: string
  icon: string
  description: string
}

export type ViewAddPanelItem = ViewCatalogItem | ViewCatalogParentRow

export const REPORTING_PARENT_ROW: ViewCatalogParentRow = {
  type: VIEW_ADD_PARENT_REPORTING,
  label: 'All reporting views',
  icon: 'bar-chart-3',
  description: 'Overview, social, funnel, email, ads, finance',
}

export const ARTIFACT_PARENT_ROW: ViewCatalogParentRow = {
  type: VIEW_ADD_PARENT_ARTIFACT,
  label: 'All artifact views',
  icon: 'layers',
  description: 'Funnels, forms, emails, ads, social, and more',
}

export function isCatalogParentRow(item: ViewAddPanelItem): item is ViewCatalogParentRow {
  return item.type === VIEW_ADD_PARENT_REPORTING || item.type === VIEW_ADD_PARENT_ARTIFACT
}

export function isArtifactCatalogSection(section: string): boolean {
  return section.startsWith('Artifacts')
}

export function isSubmodalCatalogSection(section: string): boolean {
  return isArtifactCatalogSection(section) || section === 'Reporting'
}

export const VIEW_CATALOG: { section: string; items: ViewCatalogItem[] }[] = [
  {
    section: 'Tasks',
    items: [
      {
        type: 'list',
        label: 'List',
        icon: 'list',
        description: 'Rows, columns, and grouping',
      },
      {
        type: 'table',
        label: 'Table',
        icon: 'table-2',
        description: 'Dense spreadsheet-style layout',
      },
      {
        type: 'kanban',
        label: 'Board',
        icon: 'columns-2',
        description: 'Columns by status or field',
      },
      {
        type: 'missions',
        label: 'Missions',
        icon: 'rocket',
        description: 'Campaign mission control',
      },
      {
        type: 'calendar',
        label: 'Calendar',
        icon: 'calendar-days',
        description: 'Tasks and scheduled social posts by date',
      },
      {
        type: 'canvas',
        label: 'Canvas',
        icon: 'panels-top-left',
        description: 'Map campaign assets and their connections',
        newViewId: 'canvas',
      },
    ],
  },
  {
    section: 'Communications',
    items: [
      {
        type: 'channels',
        label: 'Channels',
        icon: 'messages-square',
        description: 'Multiple pinned chats with a sidebar',
        newViewId: 'channels',
      },
      {
        type: 'channel',
        label: 'Channel',
        icon: 'hash',
        description: 'One channel as a dedicated tab',
      },
    ],
  },
  {
    section: 'Docs & media',
    items: [
      {
        type: 'docs',
        label: 'Docs',
        icon: 'file-text',
        description: 'Documents with categories and pins',
      },
      {
        type: 'media',
        label: 'Media',
        icon: 'images',
        description: 'Images, video, and generated assets',
        newViewId: 'media',
      },
    ],
  },
  {
    section: 'Artifacts — Campaign',
    items: [
      {
        type: 'all_artifacts',
        label: 'All Artifacts',
        icon: 'layers',
        description: 'Funnels, offers, avatars, and more in one view',
        newViewId: 'all_artifacts',
      },
      {
        type: 'funnels',
        label: 'Funnels',
        icon: 'git-branch',
        description: 'Sales and opt-in funnel assets',
        newViewId: 'funnels',
      },
      {
        type: 'forms',
        label: 'Forms',
        icon: 'clipboard-list',
        description: 'Collect submissions and create tasks',
        newViewId: 'forms',
      },
      {
        type: 'websites',
        label: 'Websites',
        icon: 'globe',
        description: 'Website funnels and blog posts',
        newViewId: 'websites',
      },
      {
        type: 'offers',
        label: 'Offers',
        icon: 'package',
        description: 'Campaign offers and offer workbooks',
        newViewId: 'offers',
      },
    ],
  },
  {
    section: 'Artifacts — Marketing',
    items: [
      {
        type: 'emails',
        label: 'Emails',
        icon: 'mail',
        description: 'Draft emails from agents and flows',
        newViewId: 'emails',
      },
      {
        type: 'sequences',
        label: 'Sequences',
        icon: 'mail',
        description: 'Email sequences and email counts',
        newViewId: 'sequences',
      },
      {
        type: 'social_posts',
        label: 'Social Posts',
        icon: 'share-2',
        description: 'Draft, scheduled, and published posts',
        newViewId: 'social_posts',
      },
      {
        type: 'ads',
        label: 'Paid Ads',
        icon: 'megaphone',
        description: 'Campaign structure, ad sets, and creatives',
        newViewId: 'ads',
      },
    ],
  },
  {
    section: 'Artifacts — Creative',
    items: [
      {
        type: 'avatars',
        label: 'Avatars',
        icon: 'user',
        description: 'Buyer personas and campaign avatars',
        newViewId: 'avatars',
      },
      {
        type: 'presentations',
        label: 'Presentations',
        icon: 'presentation',
        description: 'Generated slide decks and presentations',
        newViewId: 'presentations',
      },
    ],
  },
  {
    section: 'CRM',
    items: [
      {
        type: 'contacts',
        label: 'Contacts',
        icon: 'contact',
        description: 'Campaign leads and contacts',
        newViewId: 'contacts',
      },
    ],
  },
  {
    section: 'Research',
    items: [
      {
        type: 'all_social_research',
        label: 'All Research',
        icon: 'layers',
        description: 'IG, TikTok, YouTube, and X in one view',
        newViewId: 'all_research',
      },
      {
        type: 'instagram_research',
        label: 'IG Research',
        icon: 'telescope',
        description: 'Track accounts and content',
        newViewId: 'ig_research',
      },
      {
        type: 'tiktok_research',
        label: 'TikTok Research',
        icon: 'telescope',
        description: 'Track accounts and content',
        newViewId: 'tiktok_research',
      },
      {
        type: 'youtube_research',
        label: 'YouTube Research',
        icon: 'telescope',
        description: 'Track channels and content',
        newViewId: 'youtube_research',
      },
      {
        type: 'twitter_research',
        label: 'X Research',
        icon: 'twitter',
        description: 'Track X accounts and tweets',
        newViewId: 'twitter_research',
      },
      {
        type: 'ads_research',
        label: 'Ads Research',
        icon: 'megaphone',
        description: 'Meta, TikTok, and Google ad libraries',
        newViewId: 'ads_research',
      },
    ],
  },
  {
    section: 'Reporting',
    items: [
      {
        type: 'campaign_overview',
        label: 'Overview',
        icon: 'layout-dashboard',
        description: 'KPIs, trends, and alerts across all channels',
        newViewId: 'campaign_overview',
      },
      {
        type: 'social_reporting',
        label: 'Social',
        icon: 'share-2',
        description: 'Instagram & LinkedIn performance',
        newViewId: 'social_reporting',
      },
      {
        type: 'funnel_analytics',
        label: 'Funnel',
        icon: 'filter',
        description: 'Visitors, leads, and conversions',
        newViewId: 'funnel_analytics',
      },
      {
        type: 'email_analytics',
        label: 'Email',
        icon: 'mail',
        description: 'Opens, clicks, and delivery rates',
        newViewId: 'email_analytics',
      },
      {
        type: 'ads_performance',
        label: 'Ads',
        icon: 'megaphone',
        description: 'Meta spend, ROAS, and campaign drill-down',
        newViewId: 'ads_performance',
      },
      {
        type: 'finance_overview',
        label: 'Finance',
        icon: 'wallet',
        description: 'Stripe revenue, products, and payment links',
        newViewId: 'finance_overview',
      },
    ],
  },
]

export function buildNewViewDef(item: ViewCatalogItem): ViewDef {
  const id = item.newViewId ?? item.type
  return {
    id,
    type: item.type,
    name: item.label,
    ...(item.type === 'kanban' ? { group_by: 'status' } : {}),
    ...(item.type === 'calendar'
      ? {
          calendar_config: {
            date_field: 'due_date',
            default_zoom: 'month',
            week_start: 1,
            source_mode: 'space_items',
            show_task_list: true,
            time_format: '12h',
            social_platform_filters: [],
            sources: [
              { id: 'space_items', type: 'space_items' as const, visible: true, color: 'blue' },
              {
                id: 'campaign_social_posts',
                type: 'campaign_social_posts' as const,
                visible: true,
                color: 'purple',
              },
              {
                id: 'google_calendar',
                type: 'google_calendar' as const,
                visible: true,
                color: 'green',
              },
              { id: 'outlook', type: 'outlook' as const, visible: true, color: 'blue' },
            ],
          },
        }
      : {}),
    ...(item.type === 'docs'
      ? {
          group_by: 'category',
          docs_config: { pinned_item_ids: [], display_mode: 'grid' },
          visible_fields: ['title', 'category'],
        }
      : {}),
    ...(item.type === 'channels'
      ? {
          icon: 'messages-square',
          channels_config: { channel_ids: [] },
        }
      : {}),
    ...(item.type === 'instagram_research' ? { ig_research_config: { tracked_accounts: [] } } : {}),
    ...(item.type === 'tiktok_research'
      ? { tiktok_research_config: { tracked_accounts: [] } }
      : {}),
    ...(item.type === 'youtube_research'
      ? { youtube_research_config: { tracked_accounts: [] } }
      : {}),
    ...(item.type === 'twitter_research'
      ? { twitter_research_config: { tracked_accounts: [], time_range: 'all' } }
      : {}),
    ...(item.type === 'all_social_research'
      ? {
          all_social_research_config: {
            tracked_accounts: [],
            platform_filters: ['instagram', 'tiktok', 'youtube', 'twitter'],
            tracked_accounts_by_platform: {},
            people_hidden_by_platform: {},
          },
        }
      : {}),
    ...(item.type === 'ads_research'
      ? {
          ads_research_config: {
            display_mode: 'grid',
            sort_by: 'days_running',
            sort_dir: 'desc',
          },
        }
      : {}),
    ...(item.type === 'contacts'
      ? {
          contacts_config: { sort_by: 'created_at', sort_dir: 'desc', status_filter: 'all' },
          visible_fields: [...DEFAULT_CONTACT_VISIBLE_FIELD_IDS],
        }
      : {}),
    ...(item.type === 'media'
      ? {
          media_config: {
            type_filters: [],
            source_filter: 'all',
            group_by: 'date',
            group_sort: 'desc',
            layout: 'gallery',
            preview_card_size: 'preview',
          },
        }
      : {}),
    ...(item.type === 'all_artifacts'
      ? {
          all_artifacts_config: {
            display_mode: 'grid',
            time_range: 'all',
            sort_by: 'created_at',
            sort_dir: 'desc',
            group_by: 'artifact_type',
            group_sort: 'asc',
            artifact_type_filters: [
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
            ],
          },
        }
      : {}),
    ...(item.type === 'funnels'
      ? {
          funnels_config: {
            display_mode: 'grid',
            time_range: 'all',
            sort_by: 'created_at',
            sort_dir: 'desc',
            funnel_card_fields: ['funnel_type', 'status'],
          },
        }
      : {}),
    ...(item.type === 'forms'
      ? {
          forms_config: {
            display_mode: 'grid',
            time_range: 'all',
            sort_by: 'created_at',
            sort_dir: 'desc',
            form_card_fields: ['status', 'visibility', 'created_at'],
          },
        }
      : {}),
    ...(item.type === 'emails'
      ? {
          emails_config: {
            display_mode: 'grid',
            time_range: 'all',
            sort_by: 'created_at',
            sort_dir: 'desc',
          },
        }
      : {}),
    ...(item.type === 'websites'
      ? {
          websites_config: {
            display_mode: 'grid',
            time_range: 'all',
            sort_by: 'created_at',
            sort_dir: 'desc',
          },
        }
      : {}),
    ...(item.type === 'offers'
      ? {
          offers_config: {
            display_mode: 'grid',
            time_range: 'all',
            sort_by: 'created_at',
            sort_dir: 'desc',
          },
        }
      : {}),
    ...(item.type === 'avatars'
      ? {
          avatars_config: {
            display_mode: 'grid',
            time_range: 'all',
            sort_by: 'created_at',
            sort_dir: 'desc',
            avatar_card_fields: ['offer', 'created_at'],
          },
        }
      : {}),
    ...(item.type === 'ads'
      ? {
          ads_config: {
            display_mode: 'grid',
            paid_ads_mode: 'structure',
            time_range: 'all',
            sort_by: 'created_at',
            sort_dir: 'desc',
            ad_card_fields: ['platform', 'placement', 'status', 'ad_set'],
          },
        }
      : {}),
    ...(item.type === 'ad_campaigns'
      ? {
          ad_campaigns_config: {
            display_mode: 'grid',
            time_range: 'all',
            sort_by: 'created_at',
            sort_dir: 'desc',
          },
        }
      : {}),
    ...(item.type === 'sequences'
      ? {
          sequences_config: {
            display_mode: 'grid',
            time_range: 'all',
            sort_by: 'created_at',
            sort_dir: 'desc',
            sequence_card_fields: ['status', 'funnel', 'email_count'],
          },
        }
      : {}),
    ...(item.type === 'presentations'
      ? {
          presentations_config: {
            display_mode: 'grid',
            time_range: 'all',
            sort_by: 'created_at',
            sort_dir: 'desc',
            presentation_card_fields: ['status', 'slide_count', 'published_url'],
          },
        }
      : {}),
    ...(item.type === 'social_posts'
      ? {
          social_posts_config: {
            display_mode: 'grid',
            time_range: 'all',
            time_field: 'created_at',
            sort_by: 'created_at',
            sort_dir: 'desc',
            social_post_card_fields: ['platform', 'post_type', 'status'],
          },
        }
      : {}),
    ...(REPORTING_VIEW_TYPES.has(item.type)
      ? {
          reporting_config: {
            time_range: '30d',
            chart_type: 'area',
            ...(item.type === 'social_reporting'
              ? {
                  social_platform: 'instagram' as const,
                  social_platforms: ['instagram'] as ('instagram' | 'linkedin')[],
                }
              : {}),
          },
        }
      : {}),
  }
}

export function buildChannelViewDef(channel: { id: string; name: string }): ViewDef {
  return {
    id: `channel_${channel.id}`,
    type: 'channel',
    name: channel.name,
    icon: 'hash',
    channel_config: { channel_id: channel.id },
  }
}

/**
 * When the same view type already exists, give the new tab a unique `id`
 * (`list`, `list_2`, `list_3` …) and a human-readable `name` ("List 2") so users
 * can keep multiple instances of the same view (different filters, group-bys, etc.).
 * `channel` views are skipped — uniqueness is per channel id, enforced by the picker.
 */
export function ensureUniqueViewIdentity(view: ViewDef, existingViews: ViewDef[]): ViewDef {
  if (view.type === 'channel') return view
  const existingIds = new Set(existingViews.map((v) => v.id))
  const existingNames = new Set(existingViews.map((v) => v.name))
  if (!existingIds.has(view.id) && !existingNames.has(view.name)) return view

  let n = 2
  let nextId = `${view.id}_${n}`
  while (existingIds.has(nextId)) {
    n += 1
    nextId = `${view.id}_${n}`
  }
  let nextName = `${view.name} ${n}`
  while (existingNames.has(nextName)) {
    n += 1
    nextName = `${view.name} ${n}`
  }
  return { ...view, id: nextId, name: nextName }
}
