import type { YourTurnItem } from '@/lib/your-turn/types'
import type { TaskRollupItem } from './tasks-api'

export function taskRollupToYourTurnItem(item: TaskRollupItem): YourTurnItem {
  return {
    kind: 'space_item',
    id: item.id,
    title: item.title,
    status: item.status,
    assignee_user_id: item.assignee_user_id,
    org_id: item.org_id ?? null,
    mission_id: item.linked_mission_id ?? null,
    space_id: item.space_id,
    suggestion_state: null,
    due_at: item.due_at,
    source_url: item.source_url,
    preview: item.description ?? null,
    created_at: item.created_at,
    updated_at: item.updated_at,
  }
}
