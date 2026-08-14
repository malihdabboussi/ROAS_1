import { randomUUID } from 'node:crypto'

type BlueprintEntry = {
  title: string
  stage_key: string
  resource_type?: string
  resource_id?: string
  url?: string
  label?: string
  asset_type?: string
  brief?: string
  suggested_action?: string
}

export type BlueprintStage = { key: string; label: string }

export type BlueprintConnection = {
  source_stage_key: string
  target_stage_key: string
  label?: string
}

const FRAME_WIDTH = 320
const FRAME_HEIGHT = 620
const FRAME_GAP = 80

function validateStages(stages: BlueprintStage[]) {
  if (stages.length < 2 || stages.length > 20) {
    throw new Error('A campaign blueprint requires between 2 and 20 chat-derived stages.')
  }
  const keys = new Set<string>()
  for (const stage of stages) {
    if (!stage.key?.trim() || !stage.label?.trim()) {
      throw new Error('Every campaign blueprint stage requires a key and label.')
    }
    if (keys.has(stage.key)) throw new Error(`Duplicate campaign blueprint stage: ${stage.key}`)
    keys.add(stage.key)
  }
}

export function buildCampaignBlueprintOperations(input: {
  blueprintId: string
  campaignLabel: string
  stages: BlueprintStage[]
  connections?: BlueprintConnection[]
  assets: BlueprintEntry[]
  gaps: BlueprintEntry[]
  createId?: () => string
  originX?: number
  originY?: number
}) {
  const createId = input.createId ?? randomUUID
  validateStages(input.stages)
  const stages = input.stages
  const stageIds = new Map<string, string>()
  const operations: Array<Record<string, unknown>> = []
  const nextItemY = new Map<string, number>()

  stages.forEach((stage, stageOrder) => {
    const id = createId()
    stageIds.set(stage.key, id)
    operations.push({
      op: 'create_item',
      item: {
        id,
        kind: 'frame',
        position_x: (input.originX ?? 120) + stageOrder * (FRAME_WIDTH + FRAME_GAP),
        position_y: input.originY ?? 120,
        width: FRAME_WIDTH,
        height: FRAME_HEIGHT,
        z_index: stageOrder,
        content: {
          title: stage.label,
          text: '',
          semantic_type: 'campaign_stage',
          blueprint_id: input.blueprintId,
          campaign_label: input.campaignLabel,
          stage_key: stage.key,
          stage_order: stageOrder,
          status: 'planned',
        },
      },
    })
  })

  const addEntry = (entry: BlueprintEntry, isGap: boolean) => {
    const parentId = stageIds.get(entry.stage_key)
    if (!parentId) throw new Error(`Unknown campaign blueprint stage: ${entry.stage_key}`)
    const isUrl = !isGap && Boolean(entry.url)
    const height = isUrl ? 300 : 132
    const positionY = nextItemY.get(entry.stage_key) ?? 76
    nextItemY.set(entry.stage_key, positionY + height + 20)
    operations.push({
      op: 'create_item',
      item: {
        id: createId(),
        kind: entry.resource_id ? 'resource_card' : 'card',
        parent_id: parentId,
        position_x: 24,
        position_y: positionY,
        width: 272,
        height,
        z_index: stages.length + operations.length,
        content: {
          title: entry.title,
          text: entry.brief ?? entry.label ?? '',
          semantic_type: isGap ? 'asset_placeholder' : isUrl ? 'external_url' : 'existing_asset',
          blueprint_id: input.blueprintId,
          campaign_label: input.campaignLabel,
          stage_key: entry.stage_key,
          status: isGap ? 'missing' : 'ready',
          ...(isUrl ? { source: { kind: 'url', url: entry.url, label: entry.label } } : {}),
          ...(isGap
            ? {
                placeholder: {
                  asset_type: entry.asset_type,
                  brief: entry.brief,
                  suggested_action: entry.suggested_action,
                },
              }
            : {}),
        },
        ...(entry.resource_type ? { resource_type: entry.resource_type } : {}),
        ...(entry.resource_id ? { resource_id: entry.resource_id } : {}),
      },
    })
  }

  input.assets.forEach((entry) => addEntry(entry, false))
  input.gaps.forEach((entry) => addEntry(entry, true))

  const connections =
    input.connections ??
    stages.slice(0, -1).map((stage, index) => ({
      source_stage_key: stage.key,
      target_stage_key: stages[index + 1]!.key,
      label: 'Customer journey',
    }))
  connections.forEach((connection) => {
    const sourceId = stageIds.get(connection.source_stage_key)
    const targetId = stageIds.get(connection.target_stage_key)
    if (!sourceId || !targetId) {
      throw new Error(
        `Unknown campaign blueprint connection: ${connection.source_stage_key} → ${connection.target_stage_key}`,
      )
    }
    operations.push({
      op: 'create_connector',
      connector: {
        id: createId(),
        source_item_id: sourceId,
        target_item_id: targetId,
        label: connection.label ?? 'Customer journey',
        style: { stroke: '#8b5cf6', stroke_width: 2, end_arrow: true },
      },
    })
  })

  if (operations.length > 100) throw new Error('A campaign blueprint cannot exceed 100 operations.')
  return operations
}
