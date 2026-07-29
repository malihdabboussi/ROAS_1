export type HomeCardId =
  | 'favorite_spaces'
  | 'favorite_conversations'
  | 'favorite_campaigns'
  | 'my_tasks'
  | 'approval_queue'
  | 'notification_feed'
  | 'org_pulse'
  | 'recent_conversations'
  | 'recent_communications'
  | 'completed_automations'
  | 'agenda'
  | 'inbox_feed'
  | 'chat_composer'

/** Grid footprint in the 2-column Home dashboard. */
export type HomeCardGridSize = 'half' | 'full'
/** Vertical footprint in the Home dashboard. */
export type HomeCardGridRows = 1 | 2 | 3

export interface HomeLayoutState {
  version: 3
  cardIds: HomeCardId[]
  /** Optional per-card width. Missing keys default to `half`. */
  cardSizes?: Partial<Record<HomeCardId, HomeCardGridSize>>
  /** Optional per-card height. Missing keys use the card definition default. */
  cardRows?: Partial<Record<HomeCardId, HomeCardGridRows>>
}

export interface HomeCardDefinition {
  id: HomeCardId
  title: string
  description: string
  /** Default vertical footprint when the user has not customized the card. */
  defaultRows?: HomeCardGridRows
  /** When true, card is only offered in org account context */
  orgOnly?: boolean
}
