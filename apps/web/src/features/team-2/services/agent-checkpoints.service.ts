import { backendGet, backendPatch, backendPost } from '@/lib/api/backend-client'

export interface AgentCheckpointSnapshot {
  definitions: Array<{ file_name: string; content: string }>
  skills: Array<{
    skill_key: string
    name: string
    description: string
    markdown_content: string
    is_enabled: boolean
  }>
}

export interface AgentCheckpointListItem {
  id: string
  agent_key: string
  source_conversation_id: string | null
  source_message_id: string | null
  kind: 'auto_turn' | 'restore' | 'baseline'
  summary: string
  summary_edited_at: string | null
  summary_edited_by: string | null
  created_at: string
}

export interface AgentCheckpointDetail extends AgentCheckpointListItem {
  snapshot: AgentCheckpointSnapshot
}

export async function listCheckpoints(agentKey: string): Promise<AgentCheckpointListItem[]> {
  return backendGet<AgentCheckpointListItem[]>(
    `/api/agents/${encodeURIComponent(agentKey)}/checkpoints`,
  )
}

export async function getCheckpoint(
  agentKey: string,
  checkpointId: string,
): Promise<{
  checkpoint: AgentCheckpointDetail
  previous_checkpoint: AgentCheckpointDetail | null
}> {
  return backendGet(`/api/agents/${encodeURIComponent(agentKey)}/checkpoints/${checkpointId}`)
}

export async function updateCheckpointSummary(
  agentKey: string,
  checkpointId: string,
  summary: string,
): Promise<AgentCheckpointListItem> {
  return backendPatch<AgentCheckpointListItem>(
    `/api/agents/${encodeURIComponent(agentKey)}/checkpoints/${checkpointId}`,
    { summary },
  )
}

export async function restoreCheckpoint(
  agentKey: string,
  checkpointId: string,
): Promise<{ ok: boolean; checkpoint_id: string }> {
  return backendPost(
    `/api/agents/${encodeURIComponent(agentKey)}/checkpoints/${checkpointId}/restore`,
    {},
  )
}
