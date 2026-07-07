import type { YourTurnItem } from '@/features/spaces/services/your-turn.service'

/** Normalize approval/suggestion rows for the home task host. */
export function normalizeYourTurnItemForHomeOpen(item: YourTurnItem): YourTurnItem {
  if (item.kind === 'suggestion' && item.space_id) {
    return { ...item, kind: 'space_item' }
  }
  return item
}

export function minimalSpaceYourTurnItem(
  spaceId: string,
  itemId: string,
  title: string,
  orgId: string | null,
): YourTurnItem {
  const now = new Date().toISOString()
  return {
    kind: 'space_item',
    id: itemId,
    title,
    status: '',
    assignee_user_id: null,
    org_id: orgId,
    mission_id: null,
    space_id: spaceId,
    suggestion_state: null,
    due_at: null,
    source_url: null,
    preview: null,
    created_at: now,
    updated_at: now,
  }
}

export function minimalMissionSubtaskYourTurnItem(
  missionId: string,
  subtaskId: string,
  title: string,
  orgId: string | null,
): YourTurnItem {
  const now = new Date().toISOString()
  return {
    kind: 'mission_subtask',
    id: subtaskId,
    title,
    status: 'awaiting_human',
    assignee_user_id: null,
    org_id: orgId,
    mission_id: missionId,
    space_id: null,
    suggestion_state: null,
    due_at: null,
    source_url: null,
    preview: null,
    created_at: now,
    updated_at: now,
  }
}
