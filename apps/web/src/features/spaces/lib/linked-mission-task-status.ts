import { completeHumanMissionSubtask } from '@/lib/missions/missions-api'
import type { SpaceItem } from '../types'

type CompleteHumanStep = typeof completeHumanMissionSubtask

export async function syncLinkedMissionStepForTaskStatus(
  item: SpaceItem,
  nextStatus: string,
  completeHumanStep: CompleteHumanStep = completeHumanMissionSubtask,
): Promise<'not_linked' | 'agent_managed' | 'human_completed'> {
  if (!item.linked_mission_subtask_id || !item.linked_mission_id) return 'not_linked'
  if (item.assignee_type === 'agent') return 'agent_managed'
  if (item.assignee_type !== 'human' || nextStatus !== 'done') return 'not_linked'

  await completeHumanStep(
    item.linked_mission_id,
    item.linked_mission_subtask_id,
    'Completed from the linked Space Task.',
  )
  return 'human_completed'
}

export async function canUpdateLinkedMissionTaskStatus(
  item: SpaceItem,
  nextStatus: string,
  onAgentManaged: () => void,
): Promise<boolean> {
  const result = await syncLinkedMissionStepForTaskStatus(item, nextStatus)
  if (result !== 'agent_managed') return true
  onAgentManaged()
  return false
}
