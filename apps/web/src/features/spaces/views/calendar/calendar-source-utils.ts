import type { CalendarConfig, CalendarSourceConfig } from '../../types/space-schema'

export type SpaceCalendarSourceId =
  | 'space_items'
  | 'campaign_social_posts'
  | 'google_calendar'
  | 'outlook'

export const SPACE_CALENDAR_SOURCE_IDS: SpaceCalendarSourceId[] = [
  'space_items',
  'campaign_social_posts',
  'google_calendar',
  'outlook',
]

export const SPACE_CALENDAR_SOURCE_LABELS: Record<SpaceCalendarSourceId, string> = {
  space_items: 'Tasks',
  campaign_social_posts: 'Social content',
  google_calendar: 'Google Calendar',
  outlook: 'Outlook',
}

const DEFAULT_SOURCE_CONFIGS: Record<SpaceCalendarSourceId, CalendarSourceConfig> = {
  space_items: { id: 'space_items', type: 'space_items', visible: true, color: 'blue' },
  campaign_social_posts: {
    id: 'campaign_social_posts',
    type: 'campaign_social_posts',
    visible: true,
    color: 'purple',
  },
  google_calendar: {
    id: 'google_calendar',
    type: 'google_calendar',
    visible: true,
    color: 'green',
  },
  outlook: { id: 'outlook', type: 'outlook', visible: true, color: 'blue' },
}

export function normalizeCalendarSources(config?: CalendarConfig): CalendarSourceConfig[] {
  const configuredById = new Map<string, CalendarSourceConfig>()
  for (const source of config?.sources ?? []) {
    configuredById.set(source.id, source)
  }

  const hasPersistedSources = configuredById.size > 0
  return SPACE_CALENDAR_SOURCE_IDS.map((id) => {
    const fallback = DEFAULT_SOURCE_CONFIGS[id]
    const configured = configuredById.get(id)
    if (configured) return { ...fallback, ...configured, id, type: fallback.type }
    if (!hasPersistedSources && config?.source_mode && (id === 'space_items' || id === 'campaign_social_posts')) {
      return { ...fallback, visible: config.source_mode === id }
    }
    return fallback
  })
}

export function isCalendarSourceVisible(
  config: CalendarConfig | undefined,
  sourceId: SpaceCalendarSourceId,
): boolean {
  return normalizeCalendarSources(config).some((source) => source.id === sourceId && source.visible)
}

export function patchCalendarSourceVisibility(
  config: CalendarConfig,
  sourceId: SpaceCalendarSourceId,
  visible: boolean,
): CalendarConfig {
  const sources = normalizeCalendarSources(config).map((source) =>
    source.id === sourceId ? { ...source, visible } : source,
  )
  return { ...config, sources }
}
