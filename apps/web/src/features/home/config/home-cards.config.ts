import type {
  HomeCardDefinition,
  HomeCardGridSize,
  HomeCardId,
  HomeLayoutState,
} from '../types/home-cards'

export const HOME_LAYOUT_STORAGE_KEY = 'vibey-home-layout'

export const DEFAULT_HOME_CARD_IDS: HomeCardId[] = [
  'favorite_spaces',
  'favorite_conversations',
  'favorite_campaigns',
  'my_tasks',
  'approval_queue',
  'notification_feed',
]

export const DEFAULT_HOME_LAYOUT: HomeLayoutState = {
  cardIds: [...DEFAULT_HOME_CARD_IDS],
}

export const HOME_CARD_DEFINITIONS: HomeCardDefinition[] = [
  {
    id: 'favorite_spaces',
    title: 'Favorite spaces',
    description: 'Pinned spaces you open most often',
  },
  {
    id: 'favorite_conversations',
    title: 'Favorite conversations',
    description: 'Pinned agent chats',
  },
  {
    id: 'favorite_campaigns',
    title: 'Favorite campaigns',
    description: 'Starred campaigns and projects',
  },
  {
    id: 'my_tasks',
    title: 'My tasks',
    description: 'Tasks and subtasks assigned to you',
  },
  {
    id: 'approval_queue',
    title: 'Mission Approval queue',
    description: 'Mission plans and suggestions waiting for your decision',
  },
  {
    id: 'notification_feed',
    title: 'Notification feed',
    description: 'Agent updates, awareness, and workspace notifications',
  },
  {
    id: 'org_pulse',
    title: 'Org pulse',
    description: 'Workspace activity at a glance',
    orgOnly: true,
  },
  {
    id: 'recent_communications',
    title: 'Recent messages',
    description: 'Latest updates from channels and DMs',
    orgOnly: true,
  },
  {
    id: 'recent_conversations',
    title: 'Recent conversations',
    description: 'Latest agent chats across your workspace',
  },
  {
    id: 'completed_automations',
    title: 'Completed automations',
    description: 'Recently finished space automations',
  },
  {
    id: 'agenda',
    title: 'Agenda',
    description: 'Upcoming calendar events',
  },
]

export function homeCardDefinition(id: HomeCardId): HomeCardDefinition {
  return HOME_CARD_DEFINITIONS.find((c) => c.id === id)!
}

export function homeCardGridSize(layout: HomeLayoutState, id: HomeCardId): HomeCardGridSize {
  return layout.cardSizes?.[id] === 'full' ? 'full' : 'half'
}

function parseCardSizes(
  raw: unknown,
  cardIds: HomeCardId[],
): Partial<Record<HomeCardId, HomeCardGridSize>> | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const allowed = new Set(cardIds)
  const out: Partial<Record<HomeCardId, HomeCardGridSize>> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!allowed.has(key as HomeCardId)) continue
    if (value === 'half' || value === 'full') {
      out[key as HomeCardId] = value
    }
  }
  return Object.keys(out).length > 0 ? out : undefined
}

export function parseHomeLayout(raw: unknown): HomeLayoutState {
  if (!raw || typeof raw !== 'object')
    return { ...DEFAULT_HOME_LAYOUT, cardIds: [...DEFAULT_HOME_CARD_IDS] }
  const o = raw as Record<string, unknown>
  const ids = o.cardIds
  if (!Array.isArray(ids)) return { ...DEFAULT_HOME_LAYOUT, cardIds: [...DEFAULT_HOME_CARD_IDS] }
  const valid = new Set(HOME_CARD_DEFINITIONS.map((c) => c.id))
  const cardIds = ids.filter(
    (id): id is HomeCardId => typeof id === 'string' && valid.has(id as HomeCardId),
  )
  if (cardIds.length === 0) return { ...DEFAULT_HOME_LAYOUT, cardIds: [...DEFAULT_HOME_CARD_IDS] }
  const cardSizes = parseCardSizes(o.cardSizes, cardIds)
  return cardSizes ? { cardIds, cardSizes } : { cardIds }
}
