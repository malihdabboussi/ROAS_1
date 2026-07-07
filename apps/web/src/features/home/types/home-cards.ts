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

export interface HomeLayoutState {
  cardIds: HomeCardId[]
}

export interface HomeCardDefinition {
  id: HomeCardId
  title: string
  description: string
  /** When true, card is only offered in org account context */
  orgOnly?: boolean
}
