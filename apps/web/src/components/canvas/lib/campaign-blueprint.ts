import type {
  CampaignBlueprintContent,
  CampaignBlueprintPlaceholder,
  CampaignBlueprintSource,
  CanvasOperation,
} from '../types/whiteboard.types'

export interface CampaignBlueprintAsset {
  id: string
  title: string
  stageKey: string
  resourceType?: string
  resourceId?: string
  source?: CampaignBlueprintSource
}

export interface CampaignBlueprintGap {
  id: string
  title: string
  stageKey: string
  placeholder: CampaignBlueprintPlaceholder
}

export interface CampaignBlueprintStage {
  key: string
  label: string
}

export interface CampaignBlueprintInput {
  blueprintId: string
  stages: CampaignBlueprintStage[]
  assets: CampaignBlueprintAsset[]
  gaps: CampaignBlueprintGap[]
  idFactory?: () => string
}

const FRAME_WIDTH = 320
const FRAME_HEIGHT = 620
const FRAME_GAP = 80
const FRAME_X = 120
const FRAME_Y = 120
const CARD_X_OFFSET = 24
const CARD_Y_OFFSET = 76
const CARD_HEIGHT = 132
const CARD_GAP = 20

function stageContent(
  blueprintId: string,
  stage: CampaignBlueprintStage,
  stageOrder: number,
): CampaignBlueprintContent {
  return {
    title: stage.label,
    text: '',
    semantic_type: 'campaign_stage',
    blueprint_id: blueprintId,
    stage_key: stage.key,
    stage_order: stageOrder,
    status: 'planned',
  }
}

export function buildCampaignBlueprintOperations(input: CampaignBlueprintInput): CanvasOperation[] {
  const operations: CanvasOperation[] = []
  const stageIds = new Map<string, string>()
  const createId = input.idFactory ?? (() => crypto.randomUUID())

  input.stages.forEach((stage, stageOrder) => {
    const stageId = createId()
    stageIds.set(stage.key, stageId)
    operations.push({
      op: 'create_item',
      item: {
        id: stageId,
        kind: 'frame',
        position_x: FRAME_X + stageOrder * (FRAME_WIDTH + FRAME_GAP),
        position_y: FRAME_Y,
        width: FRAME_WIDTH,
        height: FRAME_HEIGHT,
        content: stageContent(input.blueprintId, stage, stageOrder),
      },
    })
  })

  const nextCardYByStage = new Map<string, number>()
  const addCard = (
    id: string,
    stageKey: string,
    content: CampaignBlueprintContent,
    resource?: { type?: string; id?: string },
  ) => {
    const stageId = stageIds.get(stageKey)
    if (!stageId) throw new Error(`Unknown campaign blueprint stage: ${stageKey}`)
    const height = content.semantic_type === 'external_url' ? 300 : CARD_HEIGHT
    const positionY = nextCardYByStage.get(stageKey) ?? CARD_Y_OFFSET
    nextCardYByStage.set(stageKey, positionY + height + CARD_GAP)
    operations.push({
      op: 'create_item',
      item: {
        id,
        kind: resource?.id ? 'resource_card' : 'card',
        parent_id: stageId,
        position_x: CARD_X_OFFSET,
        position_y: positionY,
        width: FRAME_WIDTH - CARD_X_OFFSET * 2,
        height,
        content,
        ...(resource?.type ? { resource_type: resource.type } : {}),
        ...(resource?.id ? { resource_id: resource.id } : {}),
      },
    })
  }

  input.assets.forEach((asset) => {
    addCard(
      asset.id,
      asset.stageKey,
      {
        title: asset.title,
        text: asset.source?.label ?? '',
        semantic_type: asset.source?.kind === 'url' ? 'external_url' : 'existing_asset',
        blueprint_id: input.blueprintId,
        stage_key: asset.stageKey,
        status: 'ready',
        source: asset.source,
      },
      { type: asset.resourceType, id: asset.resourceId },
    )
  })

  input.gaps.forEach((gap) => {
    addCard(gap.id, gap.stageKey, {
      title: gap.title,
      text: gap.placeholder.brief,
      semantic_type: 'asset_placeholder',
      blueprint_id: input.blueprintId,
      stage_key: gap.stageKey,
      status: 'missing',
      placeholder: gap.placeholder,
    })
  })

  input.stages.slice(0, -1).forEach((stage, index) => {
    const nextStage = input.stages[index + 1]
    if (!nextStage) return
    operations.push({
      op: 'create_connector',
      connector: {
        id: createId(),
        source_item_id: stageIds.get(stage.key),
        target_item_id: stageIds.get(nextStage.key),
        label: 'Customer journey',
      },
    })
  })

  return operations
}
