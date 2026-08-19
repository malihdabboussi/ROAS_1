'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { Pin } from 'lucide-react'
import { getIconColor, LucideIcon } from '@/components/ui/IconPicker'
import { ChannelPickerModal } from '@/features/channels'
import type { Channel } from '@/features/channels/services/channels.service'
import { useAccountContextGate } from '@/features/org/store/use-org-store'
import { cn } from '@/lib/utils/cn'
import { DEFAULT_CONTACT_VISIBLE_FIELD_IDS } from '../lib/contact-view-field-meta'
import { useSpacesStore } from '../store/use-spaces-store'
import { REPORTING_VIEW_TYPES, type ViewDef } from '../types/space-schema'
import {
  VIEW_ADD_PARENT_ARTIFACT,
  VIEW_ADD_PARENT_REPORTING,
  VIEW_META,
} from './view-type-tab-meta'
import { AddViewTemplateModal, type AddViewTemplateParent } from './views/AddViewTemplateModal'

/** Same blue edge indicator as `DraggableColumnHeaders` (list view column drag). */
const DROP_LINE_STYLE: { background: string } = {
  background:
    'linear-gradient(180deg, transparent 0%, rgb(59 130 246) 20%, rgb(59 130 246) 80%, transparent 100%)',
}

const VIEW_TAB_STRIP_FADE_PX = 28
const VIEW_ADD_PANEL_WIDTH_PX = 448

function viewTabStripMaskStyle(fadeEdges: {
  left: boolean
  right: boolean
}): CSSProperties | undefined {
  const f = VIEW_TAB_STRIP_FADE_PX
  if (!fadeEdges.left && !fadeEdges.right) return undefined
  let gradient: string
  if (fadeEdges.left && fadeEdges.right) {
    gradient = `linear-gradient(90deg, transparent 0px, black ${f}px, black calc(100% - ${f}px), transparent 100%)`
  } else if (fadeEdges.right) {
    gradient = `linear-gradient(90deg, black 0%, black calc(100% - ${f}px), transparent 100%)`
  } else {
    gradient = `linear-gradient(90deg, transparent 0px, black ${f}px, black 100%)`
  }
  return {
    maskImage: gradient,
    WebkitMaskImage: gradient,
    maskSize: '100% 100%',
    WebkitMaskSize: '100% 100%',
    maskRepeat: 'no-repeat',
    WebkitMaskRepeat: 'no-repeat',
  }
}

/** Re-export for modules that imported `getViewTypeTabMeta` from ViewSwitcher. */
export { getViewTypeTabMeta } from './view-type-tab-meta'

type CatalogViewType = ViewDef['type']
function isEditorGatedViewType(type: CatalogViewType): boolean {
  return type === 'contacts' || REPORTING_VIEW_TYPES.has(type)
}

function isChannelViewType(type: CatalogViewType): boolean {
  return type === 'channels' || type === 'channel'
}

const REUSABLE_TASK_VIEW_TYPES = new Set<CatalogViewType>(['list', 'table', 'kanban'])

export function findReusableTaskView(type: CatalogViewType, views: ViewDef[]): ViewDef | null {
  if (!REUSABLE_TASK_VIEW_TYPES.has(type)) return null
  return views.find((view) => view.type === type) ?? null
}

interface ViewCatalogItem {
  type: CatalogViewType
  label: string
  icon: string
  description: string
  /** If set, new view uses this `id` (e.g. `ig_research` for Instagram). */
  newViewId?: string
}

type ViewCatalogParentRow = {
  type: typeof VIEW_ADD_PARENT_REPORTING | typeof VIEW_ADD_PARENT_ARTIFACT
  label: string
  icon: string
  description: string
}

type ViewAddPanelItem = ViewCatalogItem | ViewCatalogParentRow

const REPORTING_PARENT_ROW: ViewCatalogParentRow = {
  type: VIEW_ADD_PARENT_REPORTING,
  label: 'All reporting views',
  icon: 'bar-chart-3',
  description: 'Overview, social, funnel, email, ads, finance',
}

const ARTIFACT_PARENT_ROW: ViewCatalogParentRow = {
  type: VIEW_ADD_PARENT_ARTIFACT,
  label: 'All artifact views',
  icon: 'layers',
  description: 'Funnels, forms, emails, ads, social, and more',
}

function isCatalogParentRow(item: ViewAddPanelItem): item is ViewCatalogParentRow {
  return item.type === VIEW_ADD_PARENT_REPORTING || item.type === VIEW_ADD_PARENT_ARTIFACT
}

function isArtifactCatalogSection(section: string): boolean {
  return section.startsWith('Artifacts')
}

function isSubmodalCatalogSection(section: string): boolean {
  return isArtifactCatalogSection(section) || section === 'Reporting'
}

const VIEW_CATALOG: { section: string; items: ViewCatalogItem[] }[] = [
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
              { id: 'google_calendar', type: 'google_calendar' as const, visible: true, color: 'green' },
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

function buildChannelViewDef(channel: Channel): ViewDef {
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
function ensureUniqueViewIdentity(view: ViewDef, existingViews: ViewDef[]): ViewDef {
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

interface ViewSwitcherProps {
  views: ViewDef[]
  activeViewId: string | null
  onSelectView: (viewId: string) => void
  onAddView?: (view: ViewDef) => void
  /** When set with ≥2 views, tabs reorder via drag (same affordance as list column headers). */
  /** `movedViewId` is the dragged tab, so the container can reconcile pin flags against the drop zone. */
  onReorderViews?: (nextViews: ViewDef[], movedViewId?: string) => void
  rightSlot?: React.ReactNode
  /** When false, reporting views are greyed out in the add-view catalog. */
  hasCampaign?: boolean
  /** When false, contacts + reporting views are hidden from add catalog. */
  canAccessEditorViews?: boolean
  /** Right-click a view tab: opens customize UI as a dropdown below that tab (`anchorEl`). */
  onTabContextCustomize?: (viewId: string, anchorEl: HTMLElement) => void
  /** Right-click a view tab: opens the quick context menu (pin/unpin, customize) at the pointer. Takes precedence over `onTabContextCustomize`. */
  onTabContextMenu?: (viewId: string, point: { x: number; y: number }, anchorEl: HTMLElement) => void
}

/** Tab strip: type default glass + tint, or palette glass+text when user set `icon_color` (matches Add view / IconPicker badges). */
function viewTabGlyphAppearance(view: ViewDef): {
  iconName: string
  textColor: string
  glassClass: string
} {
  const meta = VIEW_META[view.type] ?? VIEW_META.list!
  const iconName = view.icon ?? meta!.defaultIcon
  const palette = view.icon_color ? getIconColor(view.icon_color) : null
  const textColor = palette?.textColor ?? meta!.textClass
  const paletteGlass = palette?.glassClass
  const glassClass = paletteGlass != null && paletteGlass !== '' ? paletteGlass : meta!.glassClass
  return { iconName, textColor, glassClass }
}

function ViewTabGlyph({
  glassClass,
  iconName,
  textColor,
  pinned,
}: {
  glassClass: string
  iconName: string
  textColor: string
  pinned: boolean
}) {
  return (
    <span
      className={cn(
        'relative flex h-5 w-5 shrink-0 items-center justify-center rounded-md',
        glassClass,
      )}
    >
      {pinned ? (
        <span
          className="surface-bg pointer-events-none absolute -left-1.5 -top-1.5 z-[1] flex h-3.5 w-3.5 items-center justify-center rounded-full"
          aria-hidden
        >
          <Pin
            className="h-2 w-2 shrink-0 rotate-45 text-[var(--color-muted-foreground)]"
            strokeWidth={2.5}
          />
        </span>
      ) : null}
      <LucideIcon name={iconName} className={cn('h-3 w-3', textColor)} />
    </span>
  )
}

function StaticViewTab({
  view,
  selected,
  onSelect,
  onContextCustomize,
  onContextMenu,
}: {
  view: ViewDef
  selected: boolean
  onSelect: () => void
  onContextCustomize?: (anchorEl: HTMLElement) => void
  onContextMenu?: (point: { x: number; y: number }, anchorEl: HTMLElement) => void
}) {
  const { iconName, textColor, glassClass } = viewTabGlyphAppearance(view)
  return (
    <button
      type="button"
      onClick={onSelect}
      onContextMenu={(e) => {
        if (!onContextMenu && !onContextCustomize) return
        e.preventDefault()
        if (onContextMenu) onContextMenu({ x: e.clientX, y: e.clientY }, e.currentTarget as HTMLElement)
        else onContextCustomize?.(e.currentTarget as HTMLElement)
      }}
      className={`relative flex min-w-0 shrink-0 items-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition-colors hover:bg-[var(--color-hover-subtle)] ${
        selected
          ? 'text-[var(--foreground)]'
          : 'text-[var(--color-muted-foreground)] hover:text-[var(--foreground)]'
      }`}
    >
      <ViewTabGlyph
        glassClass={glassClass}
        iconName={iconName}
        textColor={textColor}
        pinned={view.pinned_to_start ?? false}
      />
      <span className="max-w-[140px] truncate" title={view.name}>{view.name}</span>
      {selected && (
        <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-[var(--foreground)]" />
      )}
    </button>
  )
}

function ViewAddPanel({
  open,
  anchor,
  onClose,
  onPick,
  query,
  onQueryChange,
  hasCampaign,
  canAccessEditorViews,
  hideChannelViews,
}: {
  open: boolean
  anchor: { top: number; left: number } | null
  onClose: () => void
  onPick: (item: ViewAddPanelItem) => void
  query: string
  onQueryChange: (q: string) => void
  hasCampaign: boolean
  canAccessEditorViews: boolean
  hideChannelViews: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    onQueryChange('')
    const id = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(id)
  }, [open, onQueryChange])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q) {
      return VIEW_CATALOG.map(({ section, items }) => ({
        section,
        items: items.filter(
          (it) =>
            (!hideChannelViews || !isChannelViewType(it.type)) &&
            (it.label.toLowerCase().includes(q) ||
              it.description.toLowerCase().includes(q) ||
              it.type.replace('_', ' ').toLowerCase().includes(q)),
        ),
      })).filter((b) => b.items.length > 0)
    }
    const collapsed: { section: string; items: ViewAddPanelItem[] }[] = []
    for (const block of VIEW_CATALOG) {
      if (isSubmodalCatalogSection(block.section)) continue
      const items = hideChannelViews
        ? block.items.filter((item) => !isChannelViewType(item.type))
        : block.items
      if (items.length > 0) collapsed.push({ ...block, items })
    }
    const docsMediaIdx = collapsed.findIndex((b) => b.section === 'Docs & media')
    const reportingSection: { section: string; items: ViewAddPanelItem[] } = {
      section: 'Reporting',
      items: [REPORTING_PARENT_ROW],
    }
    const artifactsSection: { section: string; items: ViewAddPanelItem[] } = {
      section: 'Artifacts',
      items: [ARTIFACT_PARENT_ROW],
    }
    if (docsMediaIdx >= 0) {
      collapsed.splice(docsMediaIdx + 1, 0, reportingSection, artifactsSection)
    } else {
      collapsed.push(reportingSection, artifactsSection)
    }
    return collapsed
  }, [hideChannelViews, query])

  if (!open || !anchor || typeof document === 'undefined') return null

  const panelWidth = Math.min(VIEW_ADD_PANEL_WIDTH_PX, window.innerWidth - 16)

  return createPortal(
    <div
      data-view-add-panel
      className="dropdown-menu-solid fixed z-[100001] overflow-hidden rounded-xl p-0 shadow-lg"
      style={{ top: anchor.top, left: anchor.left, width: panelWidth }}
      role="dialog"
      aria-label="Add a view"
    >
      <div className="border-b border-[var(--border)] px-2.5 py-2">
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose()
          }}
          placeholder="Search views…"
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--background)] px-2.5 py-1.5 text-xs text-[var(--foreground)] outline-none ring-0 placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-border)]"
        />
      </div>
      <div className="max-h-[min(24rem,70vh)] overflow-y-auto px-2 py-2">
        {filtered.length === 0 ? (
          <p className="px-1 py-3 text-center text-xs text-[var(--color-muted-foreground)]">
            No views match your search
          </p>
        ) : (
          filtered.map((block) => (
            <div key={block.section} className="mb-3 last:mb-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                {block.section}
              </p>
              <div className="mt-1.5 grid grid-cols-1 gap-1 sm:grid-cols-2">
                {block.items.map((item) => {
                  const needsCampaign =
                    !isCatalogParentRow(item) && REPORTING_VIEW_TYPES.has(item.type) && !hasCampaign
                  const requiresEditor =
                    !isCatalogParentRow(item) &&
                    isEditorGatedViewType(item.type) &&
                    !canAccessEditorViews
                  const isDisabled = needsCampaign || requiresEditor
                  const meta = VIEW_META[item.type] ?? VIEW_META.list!
                  return (
                    <button
                      key={item.type}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => {
                        if (isDisabled) return
                        onPick(item)
                        onClose()
                      }}
                      className={cn(
                        'flex w-full min-w-0 items-start gap-2 rounded-lg px-2 py-2 text-left transition-colors',
                        isDisabled
                          ? 'cursor-not-allowed opacity-50'
                          : 'hover:bg-[var(--color-hover-subtle)]',
                      )}
                    >
                      <span
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${meta.glassClass}`}
                      >
                        <LucideIcon name={item.icon} className={`h-4 w-4 ${meta.textClass}`} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-1">
                          <span className="text-xs font-medium text-[var(--foreground)]">
                            {item.label}
                          </span>
                          {needsCampaign && (
                            <span className="shrink-0 text-[9px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                              Requires campaign
                            </span>
                          )}
                          {requiresEditor && (
                            <span className="shrink-0 text-[9px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                              Editor+
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-[10px] leading-snug text-[var(--color-muted-foreground)]">
                          {item.description}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>,
    document.body,
  )
}

export function ViewSwitcher({
  views,
  activeViewId,
  onSelectView,
  onAddView,
  onReorderViews,
  rightSlot,
  hasCampaign = false,
  canAccessEditorViews = true,
  onTabContextCustomize,
  onTabContextMenu,
}: ViewSwitcherProps) {
  const { isAccountContextReady, isPersonalAccountContext } = useAccountContextGate()
  const hideChannelViews = !isAccountContextReady || isPersonalAccountContext
  const visibleViews = useMemo(
    () => views.filter((view) => !hideChannelViews || !isChannelViewType(view.type)),
    [hideChannelViews, views],
  )
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [addSearchQuery, setAddSearchQuery] = useState('')
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [overSide, setOverSide] = useState<'left' | 'right'>('right')
  const [channelPickerOpen, setChannelPickerOpen] = useState(false)
  const [templateParent, setTemplateParent] = useState<AddViewTemplateParent | null>(null)
  const [addPanelAnchor, setAddPanelAnchor] = useState<{ top: number; left: number } | null>(null)
  const addButtonRef = useRef<HTMLButtonElement | null>(null)
  const onAddViewRef = useRef(onAddView)
  onAddViewRef.current = onAddView
  const addViewCatalogOpenNonce = useSpacesStore((s) => s.addViewCatalogOpenNonce)
  const tabsScrollRef = useRef<HTMLDivElement | null>(null)
  const [tabStripFade, setTabStripFade] = useState({ left: false, right: false })

  const updateTabStripFade = useCallback(() => {
    const el = tabsScrollRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    const epsilon = 2
    const maxScroll = Math.max(0, scrollWidth - clientWidth)
    const canScroll = maxScroll > epsilon
    setTabStripFade({
      left: canScroll && scrollLeft > epsilon,
      right: canScroll && scrollLeft < maxScroll - epsilon,
    })
  }, [])

  useLayoutEffect(() => {
    updateTabStripFade()
  }, [visibleViews, activeViewId, updateTabStripFade])

  useLayoutEffect(() => {
    if (!addMenuOpen) {
      setAddPanelAnchor(null)
      return
    }
    const el = addButtonRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const panelWidth = Math.min(VIEW_ADD_PANEL_WIDTH_PX, window.innerWidth - 16)
    const margin = 8
    let left = rect.left
    if (left + panelWidth + margin > window.innerWidth) {
      left = Math.max(margin, window.innerWidth - panelWidth - margin)
    }
    setAddPanelAnchor({ top: rect.bottom + 4, left })
  }, [addMenuOpen, visibleViews.length])

  useEffect(() => {
    const el = tabsScrollRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      updateTabStripFade()
    })
    ro.observe(el)
    el.addEventListener('scroll', updateTabStripFade, { passive: true })
    return () => {
      ro.disconnect()
      el.removeEventListener('scroll', updateTabStripFade)
    }
  }, [updateTabStripFade])

  const tabStripMaskStyle = useMemo(() => viewTabStripMaskStyle(tabStripFade), [tabStripFade])

  const templateModalSections = useMemo((): { section: string; items: ViewCatalogItem[] }[] => {
    if (templateParent === 'reporting') {
      const block = VIEW_CATALOG.find((s) => s.section === 'Reporting')
      if (!block) return []
      return [
        {
          ...block,
          items: block.items.filter((item) => !hideChannelViews || !isChannelViewType(item.type)),
        },
      ]
    }
    if (templateParent === 'artifact') {
      return VIEW_CATALOG.filter((s) => isArtifactCatalogSection(s.section))
    }
    return []
  }, [hideChannelViews, templateParent])

  useEffect(() => {
    if (!addMenuOpen) return
    function onDocPointerDown(e: MouseEvent) {
      const t = e.target
      if (!(t instanceof Node)) return
      if (addButtonRef.current?.contains(t)) return
      if (t instanceof Element && t.closest('[data-view-add-panel]')) return
      setAddMenuOpen(false)
    }
    document.addEventListener('mousedown', onDocPointerDown)
    return () => document.removeEventListener('mousedown', onDocPointerDown)
  }, [addMenuOpen])

  useEffect(() => {
    if (addViewCatalogOpenNonce === 0) return
    if (!onAddViewRef.current) return
    setAddMenuOpen(true)
  }, [addViewCatalogOpenNonce])

  const reorderable = Boolean(onReorderViews && visibleViews.length > 1)

  function resetDragState() {
    setDragId(null)
    setOverId(null)
  }

  function handleDragStart(e: React.DragEvent, viewId: string) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', viewId)
    setDragId(viewId)
  }

  function handleDragOverTab(e: React.DragEvent, viewId: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (!dragId || viewId === dragId) {
      setOverId(null)
      return
    }
    setOverId(viewId)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const midX = rect.left + rect.width / 2
    setOverSide(e.clientX < midX ? 'left' : 'right')
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    if (!onReorderViews || !dragId || !overId || dragId === overId) {
      resetDragState()
      return
    }
    const ids = visibleViews.map((v) => v.id)
    const without = ids.filter((id) => id !== dragId)
    const targetIdx = without.indexOf(overId)
    if (targetIdx === -1) {
      resetDragState()
      return
    }
    const insertAt = overSide === 'right' ? targetIdx + 1 : targetIdx
    without.splice(insertAt, 0, dragId)
    const byId = new Map(views.map((v) => [v.id, v]))
    const nextViews = without.map((id) => byId.get(id)!).filter(Boolean) as ViewDef[]
    if (nextViews.length !== visibleViews.length) {
      resetDragState()
      return
    }
    const hiddenViews = views.filter((view) => hideChannelViews && isChannelViewType(view.type))
    onReorderViews([...nextViews, ...hiddenViews], dragId)
    resetDragState()
  }

  function handlePickCatalogView(item: ViewCatalogItem) {
    const existingTaskView = findReusableTaskView(item.type, views)
    if (existingTaskView) {
      onSelectView(existingTaskView.id)
      return
    }
    onAddView?.(ensureUniqueViewIdentity(buildNewViewDef(item), views))
  }

  return (
    <div
      className="flex w-full min-w-0 items-center gap-1 border-b border-[var(--border)] px-4"
      onDragOver={reorderable ? (e) => e.preventDefault() : undefined}
    >
      <div
        ref={tabsScrollRef}
        className="scrollbar-thin flex min-h-0 min-w-0 flex-1 items-center gap-1 overflow-x-auto overflow-y-hidden overscroll-x-contain"
        style={tabStripMaskStyle}
        onDragOver={
          reorderable
            ? (e) => {
                e.preventDefault()
              }
            : undefined
        }
        onDrop={
          reorderable
            ? (e) => {
                e.preventDefault()
                e.stopPropagation()
                resetDragState()
              }
            : undefined
        }
      >
        {reorderable
          ? visibleViews.map((view) => {
              const isOver = overId === view.id && dragId != null && dragId !== view.id
              const { iconName, textColor, glassClass } = viewTabGlyphAppearance(view)
              const selected = view.id === activeViewId
              return (
                <div key={view.id} className="relative shrink-0">
                  {isOver && overSide === 'left' && (
                    <div
                      className="pointer-events-none absolute -left-1.5 bottom-0 top-0 z-10 w-[2px]"
                      style={DROP_LINE_STYLE}
                      aria-hidden
                    />
                  )}
                  <button
                    type="button"
                    draggable
                    onDragStart={(e) => handleDragStart(e, view.id)}
                    onDragOver={(e) => handleDragOverTab(e, view.id)}
                    onDrop={handleDrop}
                    onDragEnd={resetDragState}
                    onClick={() => onSelectView(view.id)}
                    onContextMenu={(e) => {
                      if (!onTabContextMenu && !onTabContextCustomize) return
                      e.preventDefault()
                      if (onTabContextMenu)
                        onTabContextMenu(
                          view.id,
                          { x: e.clientX, y: e.clientY },
                          e.currentTarget as HTMLElement,
                        )
                      else onTabContextCustomize?.(view.id, e.currentTarget as HTMLElement)
                    }}
                    className={cn(
                      'relative flex min-w-0 cursor-grab select-none items-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition-colors active:cursor-grabbing',
                      'hover:bg-[var(--color-hover-subtle)]',
                      selected
                        ? 'text-[var(--foreground)]'
                        : 'text-[var(--color-muted-foreground)] hover:text-[var(--foreground)]',
                      dragId === view.id && 'opacity-40',
                    )}
                  >
                    <ViewTabGlyph
                      glassClass={glassClass}
                      iconName={iconName}
                      textColor={textColor}
                      pinned={view.pinned_to_start ?? false}
                    />
                    <span className="max-w-[140px] truncate" title={view.name}>{view.name}</span>
                    {selected && (
                      <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-[var(--foreground)]" />
                    )}
                  </button>
                  {isOver && overSide === 'right' && (
                    <div
                      className="pointer-events-none absolute -right-1.5 bottom-0 top-0 z-10 w-[2px]"
                      style={DROP_LINE_STYLE}
                      aria-hidden
                    />
                  )}
                </div>
              )
            })
          : visibleViews.map((view) => (
              <StaticViewTab
                key={view.id}
                view={view}
                selected={view.id === activeViewId}
                onSelect={() => onSelectView(view.id)}
                onContextCustomize={
                  onTabContextCustomize
                    ? (anchorEl) => onTabContextCustomize(view.id, anchorEl)
                    : undefined
                }
                onContextMenu={
                  onTabContextMenu
                    ? (point, anchorEl) => onTabContextMenu(view.id, point, anchorEl)
                    : undefined
                }
              />
            ))}

        {onAddView ? (
          <>
            {visibleViews.length > 0 ? (
              <div
                className="bg-[var(--border)]/80 mx-0.5 h-5 w-px shrink-0 self-center"
                aria-hidden
              />
            ) : null}
            <div
              className="relative shrink-0"
              onDragOver={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              onDrop={(e) => {
                e.preventDefault()
                e.stopPropagation()
                resetDragState()
              }}
            >
              <button
                ref={addButtonRef}
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  setAddMenuOpen((o) => !o)
                }}
                className="flex items-center rounded-md px-1.5 py-1.5 text-xs font-medium text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
                title="Add view"
              >
                + View
              </button>
            </div>
          </>
        ) : null}
      </div>

      <ViewAddPanel
        open={addMenuOpen}
        anchor={addPanelAnchor}
        onClose={() => setAddMenuOpen(false)}
        onPick={(item) => {
          if (isCatalogParentRow(item)) {
            setTemplateParent(item.type === VIEW_ADD_PARENT_REPORTING ? 'reporting' : 'artifact')
            return
          }
          if (hideChannelViews && isChannelViewType(item.type)) return
          if (item.type === 'channel') {
            setChannelPickerOpen(true)
            return
          }
          handlePickCatalogView(item)
        }}
        query={addSearchQuery}
        onQueryChange={setAddSearchQuery}
        hasCampaign={hasCampaign}
        canAccessEditorViews={canAccessEditorViews}
        hideChannelViews={hideChannelViews}
      />

      {!hideChannelViews ? (
        <ChannelPickerModal
          open={channelPickerOpen}
          onOpenChange={setChannelPickerOpen}
          mode="single"
          title="Add channel view"
          description="Choose the channel to pin as its own space tab."
          selectedChannelIds={views
            .map((view) => view.channel_config?.channel_id)
            .filter((id): id is string => Boolean(id))}
          onSelectChannel={(channel) => {
            if (views.some((view) => view.channel_config?.channel_id === channel.id)) return
            onAddView?.(buildChannelViewDef(channel))
          }}
        />
      ) : null}

      <AddViewTemplateModal
        open={templateParent !== null}
        parent={templateParent}
        sections={templateModalSections}
        onClose={() => {
          setTemplateParent(null)
          setAddMenuOpen(false)
        }}
        onPick={(row) => {
          handlePickCatalogView(row)
        }}
        hasCampaign={hasCampaign}
        canAccessEditorViews={canAccessEditorViews}
      />

      {rightSlot && <div className="ml-auto flex shrink-0 items-center gap-1">{rightSlot}</div>}
    </div>
  )
}
