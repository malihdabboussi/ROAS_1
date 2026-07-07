import { backendDelete, backendGet, backendPatch, backendPost } from '@/lib/api/backend-client'

export type StrategyNodeType = 'sticky_note' | 'text_block' | 'group_box' | 'milestone'

export type StrategyNode = {
  id: string
  user_id: string
  campaign_id: string
  node_type: StrategyNodeType
  text: string
  color: string
  artifact_hint: string | null
  linked_artifact_id: string | null
  linked_artifact_type: string | null
  position_x: number
  position_y: number
  created_at: string
  updated_at: string
}

export async function fetchStrategyNodes(campaignId: string): Promise<StrategyNode[]> {
  return backendGet<StrategyNode[]>(`/api/campaigns/${campaignId}/strategy-nodes`)
}

export async function createStrategyNode(
  campaignId: string,
  input: {
    node_type: StrategyNodeType
    text: string
    color?: string
    artifact_hint?: string
    position_x: number
    position_y: number
  },
): Promise<StrategyNode> {
  return backendPost<StrategyNode>(`/api/campaigns/${campaignId}/strategy-nodes`, input)
}

export async function updateStrategyNode(
  campaignId: string,
  nodeId: string,
  input: {
    text?: string
    color?: string
    artifact_hint?: string
    linked_artifact_id?: string | null
    linked_artifact_type?: string | null
    position_x?: number
    position_y?: number
  },
): Promise<StrategyNode> {
  return backendPatch<StrategyNode>(`/api/campaigns/${campaignId}/strategy-nodes/${nodeId}`, input)
}

export async function deleteStrategyNode(campaignId: string, nodeId: string): Promise<void> {
  await backendDelete(`/api/campaigns/${campaignId}/strategy-nodes/${nodeId}`)
}
