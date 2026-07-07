import { backendDelete, backendGet, backendPatch, backendPost } from '@/lib/api/backend-client'

export type WorkflowNodeType =
  | 'funnel'
  | 'sequence'
  | 'presentation'
  | 'offer'
  | 'ad_campaign'
  | 'avatar'
  | 'social_post'
export type WorkflowEdgeType =
  | 'funnel_conversion_to_sequence'
  | 'sequence_complete_to_sequence'
  | 'funnel_to_presentation'

export type WorkflowEdgeStatus = 'draft' | 'valid' | 'invalid' | 'active' | 'paused'

export type WorkflowValidationError = {
  code: string
  message: string
  meta?: Record<string, unknown>
}

export type WorkflowNode = {
  type: WorkflowNodeType
  id: string
  label: string
  meta?: Record<string, unknown>
}

export type WorkflowEdge = {
  id: string
  from_type: WorkflowNodeType
  from_id: string
  to_type: WorkflowNodeType
  to_id: string
  edge_type: WorkflowEdgeType
  status: WorkflowEdgeStatus
  validation_errors: WorkflowValidationError[]
  config: Record<string, unknown>
}

export type WorkflowGraph = {
  workflow_id: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  layout: Record<string, unknown>
  conversion_points: unknown[]
}

export type WorkflowDeleteMode = 'keep_unsent' | 'remove_unsent'

export async function fetchWorkflowGraph(campaignId: string): Promise<WorkflowGraph> {
  return backendGet<WorkflowGraph>(`/api/campaigns/${campaignId}/workflow`)
}

export async function createWorkflowEdge(
  campaignId: string,
  input: {
    from_type: WorkflowNodeType
    from_id: string
    to_type: WorkflowNodeType
    to_id: string
    edge_type: WorkflowEdgeType
    config?: Record<string, unknown>
  },
): Promise<WorkflowEdge> {
  return backendPost<WorkflowEdge>(`/api/campaigns/${campaignId}/workflow/edges`, input)
}

export async function updateWorkflowEdge(
  campaignId: string,
  edgeId: string,
  input: { config?: Record<string, unknown>; status?: WorkflowEdgeStatus },
): Promise<WorkflowEdge> {
  return backendPatch<WorkflowEdge>(`/api/campaigns/${campaignId}/workflow/edges/${edgeId}`, input)
}

export async function deleteWorkflowEdge(
  campaignId: string,
  edgeId: string,
  deleteMode: WorkflowDeleteMode,
): Promise<{ success: true }> {
  await backendDelete(
    `/api/campaigns/${campaignId}/workflow/edges/${edgeId}?delete_mode=${deleteMode}`,
  )
  return { success: true }
}
