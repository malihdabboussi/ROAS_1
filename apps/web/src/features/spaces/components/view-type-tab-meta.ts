import type { ViewDef } from '../types/space-schema'

/** Pseudo-types for Add-view parent rows (Reporting / Artifact) — not real `ViewDef['type']`. */
export const VIEW_ADD_PARENT_REPORTING = '__reporting_parent__' as const
export const VIEW_ADD_PARENT_ARTIFACT = '__artifact_parent__' as const

export const VIEW_META: Record<
  string,
  { defaultIcon: string; glassClass: string; textClass: string }
> = {
  list: {
    defaultIcon: 'list',
    glassClass: 'badge-glass-blue',
    textClass: 'text-blue-600 dark:text-blue-400',
  },
  table: {
    defaultIcon: 'table-2',
    glassClass: 'badge-glass-muted',
    textClass: 'text-slate-600 dark:text-slate-400',
  },
  kanban: {
    defaultIcon: 'columns-2',
    glassClass: 'badge-glass-purple',
    textClass: 'text-[rgb(var(--vibe-purple-light))]',
  },
  calendar: {
    defaultIcon: 'calendar-days',
    glassClass: 'badge-glass-blue',
    textClass: 'text-blue-600 dark:text-blue-400',
  },
  missions: {
    defaultIcon: 'rocket',
    glassClass: 'badge-glass-orange',
    textClass: 'text-orange-600 dark:text-orange-400',
  },
  instagram_research: {
    defaultIcon: 'telescope',
    glassClass: 'badge-glass-red',
    textClass: 'text-red-600 dark:text-red-400',
  },
  tiktok_research: {
    defaultIcon: 'telescope',
    glassClass: 'badge-glass-muted',
    textClass: 'text-slate-600 dark:text-slate-300',
  },
  youtube_research: {
    defaultIcon: 'play',
    glassClass: 'badge-glass-red',
    textClass: 'text-red-600 dark:text-red-500',
  },
  twitter_research: {
    defaultIcon: 'twitter',
    glassClass: 'badge-glass-blue',
    textClass: 'text-blue-600 dark:text-blue-400',
  },
  all_social_research: {
    defaultIcon: 'layers',
    glassClass: 'badge-glass-purple',
    textClass: 'text-[rgb(var(--vibe-purple-light))]',
  },
  ads_research: {
    defaultIcon: 'megaphone',
    glassClass: 'badge-glass-orange',
    textClass: 'text-orange-600 dark:text-orange-400',
  },
  all_artifacts: {
    defaultIcon: 'layers',
    glassClass: 'badge-glass-blue',
    textClass: 'text-blue-600 dark:text-blue-400',
  },
  contacts: {
    defaultIcon: 'contact',
    glassClass: 'badge-glass-cyan',
    textClass: 'text-cyan-600 dark:text-cyan-400',
  },
  docs: {
    defaultIcon: 'file-text',
    glassClass: 'badge-glass-blue',
    textClass: 'text-blue-600 dark:text-blue-400',
  },
  channels: {
    defaultIcon: 'messages-square',
    glassClass: 'badge-glass-purple',
    textClass: 'text-[rgb(var(--vibe-purple-light))]',
  },
  channel: {
    defaultIcon: 'hash',
    glassClass: 'badge-glass-blue',
    textClass: 'text-blue-600 dark:text-blue-400',
  },
  media: {
    defaultIcon: 'images',
    glassClass: 'badge-glass-green',
    textClass: 'text-emerald-600 dark:text-emerald-400',
  },
  funnels: {
    defaultIcon: 'git-branch',
    glassClass: 'badge-glass-blue',
    textClass: 'text-blue-600 dark:text-blue-400',
  },
  forms: {
    defaultIcon: 'clipboard-list',
    glassClass: 'badge-glass-purple',
    textClass: 'text-[rgb(var(--vibe-purple-light))]',
  },
  emails: {
    defaultIcon: 'mail',
    glassClass: 'badge-glass-green',
    textClass: 'text-emerald-600 dark:text-emerald-400',
  },
  form_responses: {
    defaultIcon: 'inbox',
    glassClass: 'badge-glass-blue',
    textClass: 'text-blue-600 dark:text-blue-400',
  },
  offers: {
    defaultIcon: 'package',
    glassClass: 'badge-glass-green',
    textClass: 'text-emerald-600 dark:text-emerald-400',
  },
  ads: {
    defaultIcon: 'megaphone',
    glassClass: 'badge-glass-orange',
    textClass: 'text-orange-600 dark:text-orange-400',
  },
  ad_campaigns: {
    defaultIcon: 'target',
    glassClass: 'badge-glass-red',
    textClass: 'text-red-600 dark:text-red-400',
  },
  sequences: {
    defaultIcon: 'mail',
    glassClass: 'badge-glass-green',
    textClass: 'text-emerald-600 dark:text-emerald-400',
  },
  presentations: {
    defaultIcon: 'presentation',
    glassClass: 'badge-glass-purple',
    textClass: 'text-[rgb(var(--vibe-purple-light))]',
  },
  avatars: {
    defaultIcon: 'user',
    glassClass: 'badge-glass-cyan',
    textClass: 'text-cyan-600 dark:text-cyan-400',
  },
  social_posts: {
    defaultIcon: 'share-2',
    glassClass: 'badge-glass-red',
    textClass: 'text-red-600 dark:text-red-400',
  },
  websites: {
    defaultIcon: 'globe',
    glassClass: 'badge-glass-blue',
    textClass: 'text-blue-600 dark:text-blue-400',
  },
  campaign_overview: {
    defaultIcon: 'layout-dashboard',
    glassClass: 'badge-glass-purple',
    textClass: 'text-[rgb(var(--vibe-purple-light))]',
  },
  social_reporting: {
    defaultIcon: 'share-2',
    glassClass: 'badge-glass-red',
    textClass: 'text-red-600 dark:text-red-400',
  },
  funnel_analytics: {
    defaultIcon: 'filter',
    glassClass: 'badge-glass-blue',
    textClass: 'text-blue-600 dark:text-blue-400',
  },
  email_analytics: {
    defaultIcon: 'mail',
    glassClass: 'badge-glass-green',
    textClass: 'text-emerald-600 dark:text-emerald-400',
  },
  ads_performance: {
    defaultIcon: 'megaphone',
    glassClass: 'badge-glass-orange',
    textClass: 'text-orange-600 dark:text-orange-400',
  },
  finance_overview: {
    defaultIcon: 'wallet',
    glassClass: 'badge-glass-green',
    textClass: 'text-emerald-600 dark:text-emerald-400',
  },
  [VIEW_ADD_PARENT_REPORTING]: {
    defaultIcon: 'bar-chart-3',
    glassClass: 'badge-glass-purple',
    textClass: 'text-[rgb(var(--vibe-purple-light))]',
  },
  [VIEW_ADD_PARENT_ARTIFACT]: {
    defaultIcon: 'layers',
    glassClass: 'badge-glass-blue',
    textClass: 'text-blue-600 dark:text-blue-400',
  },
}

/** Default tab icon/classes per view type — used in tabs and CustomizeViewPanel fallback icon name. */
export function getViewTypeTabMeta(viewType: ViewDef['type']) {
  return VIEW_META[viewType] ?? VIEW_META.list!
}
