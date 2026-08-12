import { backendGet, backendPost } from '@/lib/api/backend-client'
import type {
  ApplyCanvasOperationsResult,
  CampaignWhiteboardResponse,
  CanvasOperation,
} from '../types/whiteboard.types'

export function fetchCampaignWhiteboard(campaignId: string): Promise<CampaignWhiteboardResponse> {
  return backendGet(`/api/canvas/campaigns/${campaignId}/whiteboard`)
}

export function applyCampaignCanvasOperations(
  campaignId: string,
  baseRevision: number,
  operations: CanvasOperation[],
): Promise<ApplyCanvasOperationsResult> {
  return backendPost(`/api/canvas/campaigns/${campaignId}/whiteboard/operations`, {
    base_revision: baseRevision,
    idempotency_key: crypto.randomUUID(),
    operations,
  })
}

export function undoCampaignCanvasOperation(
  campaignId: string,
  operationId: string,
): Promise<ApplyCanvasOperationsResult> {
  return backendPost(`/api/canvas/campaigns/${campaignId}/whiteboard/undo`, {
    operation_id: operationId,
  })
}
