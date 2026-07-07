import { backendDelete, backendGet, backendPatch } from '@/lib/api/backend-client'

export {
  createWorkflowEdge,
  deleteWorkflowEdge,
  fetchWorkflowGraph,
  updateWorkflowEdge,
} from '@/lib/workflows/workflow-api'
export type {
  WorkflowDeleteMode,
  WorkflowEdge,
  WorkflowEdgeStatus,
  WorkflowEdgeType,
  WorkflowGraph,
  WorkflowNode,
  WorkflowNodeType,
  WorkflowValidationError,
} from '@/lib/workflows/workflow-api'

export async function saveWorkflowLayout(
  campaignId: string,
  input: { workflow_id: string; layout: unknown },
): Promise<Record<string, unknown>> {
  return backendPatch<Record<string, unknown>>(
    `/api/campaigns/${campaignId}/workflow/layout`,
    input,
  )
}

// ============================================================================
// Funnel conversion points (explicit page-level conversion markers)
// ============================================================================

export type FunnelConversionPoint = {
  id: string
  funnel_id: string
  funnel_page_id: string
  kind: 'email_capture'
  config: Record<string, unknown>
  created_at: string
  updated_at: string
}

export async function fetchFunnelConversionPoints(
  funnelId: string,
): Promise<FunnelConversionPoint[]> {
  return backendGet<FunnelConversionPoint[]>(`/api/funnels/${funnelId}/conversion-points`)
}

export async function upsertEmailCaptureConversionPoint(
  funnelId: string,
  input: { funnel_page_id: string; config?: Record<string, unknown> },
): Promise<FunnelConversionPoint> {
  return backendPatch<FunnelConversionPoint>(
    `/api/funnels/${funnelId}/conversion-points/email-capture`,
    input,
  )
}

export async function deleteEmailCaptureConversionPoint(
  funnelId: string,
  funnelPageId: string,
): Promise<{ success: true }> {
  await backendDelete(`/api/funnels/${funnelId}/conversion-points/email-capture/${funnelPageId}`)
  return { success: true }
}
