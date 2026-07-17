import { backendPost } from '@/lib/api/backend-client'

interface CompleteHumanSubtaskInput {
  summary: string
  files?: Array<{
    url: string
    name: string
    size?: number
    mime_type?: string
    path?: string
  }>
  links?: Array<{ url: string; label?: string }>
}

export async function completeHumanSubtask(
  missionId: string,
  subtaskId: string,
  input: CompleteHumanSubtaskInput,
): Promise<{ ok: true; deliverable_id: string | null }> {
  return backendPost(`/api/missions/${missionId}/subtasks/${subtaskId}/complete-human`, input)
}
