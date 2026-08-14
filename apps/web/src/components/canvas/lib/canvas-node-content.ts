import type {
  CampaignBlueprintContent,
  PersistedWhiteboardNodeData,
} from '../types/whiteboard.types'

export function buildUpdatedCanvasContent(
  current: PersistedWhiteboardNodeData | undefined,
  patch: Partial<PersistedWhiteboardNodeData>,
): CampaignBlueprintContent {
  return {
    title: patch.title ?? current?.title ?? '',
    text: patch.text ?? current?.text ?? '',
    ...(current?.semantic_type ? { semantic_type: current.semantic_type } : {}),
    ...(current?.blueprint_id ? { blueprint_id: current.blueprint_id } : {}),
    ...(current?.stage_key ? { stage_key: current.stage_key } : {}),
    ...(typeof current?.stage_order === 'number' ? { stage_order: current.stage_order } : {}),
    ...((patch.status ?? current?.status) ? { status: patch.status ?? current?.status } : {}),
    ...(current?.source ? { source: current.source } : {}),
    ...(current?.placeholder ? { placeholder: current.placeholder } : {}),
  }
}
