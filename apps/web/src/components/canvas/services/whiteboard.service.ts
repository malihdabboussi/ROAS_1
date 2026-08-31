import { backendGet, backendPost } from '@/lib/api/backend-client'
import type {
  ApplyCanvasOperationsResult,
  CampaignWhiteboard,
  CampaignWhiteboardListResponse,
  CampaignWhiteboardResponse,
  CanvasOperation,
} from '../types/whiteboard.types'

export function listCampaignWhiteboards(
  campaignId: string,
): Promise<CampaignWhiteboardListResponse> {
  return backendGet(`/api/canvas/campaigns/${campaignId}/whiteboards`)
}

export function createCampaignWhiteboard(
  campaignId: string,
  title: string,
): Promise<{ board: CampaignWhiteboard }> {
  return backendPost(`/api/canvas/campaigns/${campaignId}/whiteboards`, { title })
}

export function fetchCampaignWhiteboard(
  campaignId: string,
  boardId: string,
): Promise<CampaignWhiteboardResponse> {
  return backendGet(`/api/canvas/campaigns/${campaignId}/whiteboards/${boardId}`)
}

export function applyCampaignCanvasOperations(
  campaignId: string,
  boardId: string,
  baseRevision: number,
  operations: CanvasOperation[],
): Promise<ApplyCanvasOperationsResult> {
  return backendPost(`/api/canvas/campaigns/${campaignId}/whiteboards/${boardId}/operations`, {
    base_revision: baseRevision,
    idempotency_key: crypto.randomUUID(),
    operations,
  })
}

export function undoCampaignCanvasOperation(
  campaignId: string,
  boardId: string,
  operationId: string,
): Promise<ApplyCanvasOperationsResult> {
  return backendPost(`/api/canvas/campaigns/${campaignId}/whiteboards/${boardId}/undo`, {
    operation_id: operationId,
  })
}
