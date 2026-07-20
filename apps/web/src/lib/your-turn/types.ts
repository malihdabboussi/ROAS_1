export type YourTurnKind = 'mission_subtask' | 'space_item' | 'suggestion' | 'plan_approval'

export interface YourTurnItem {
  kind: YourTurnKind
  id: string
  title: string
  status: string
  assignee_user_id: string | null
  org_id: string | null
  mission_id: string | null
  space_id: string | null
  suggestion_state: 'pending' | 'accepted' | 'dismissed' | null
  due_at: string | null
  source_url: string | null
  preview: string | null
  created_at: string
  updated_at: string | null
}
