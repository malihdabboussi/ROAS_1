import { randomUUID } from 'node:crypto'

export const CAMPAIGN_BLUEPRINT_TYPES = [
  'webinar',
  'vsl_call_booking',
  'free_skool_community',
] as const

export type CampaignBlueprintType = (typeof CAMPAIGN_BLUEPRINT_TYPES)[number]

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

type BlueprintStage = { key: string; label: string }

const STAGES: Record<CampaignBlueprintType, BlueprintStage[]> = {
  webinar: [
    { key: 'traffic', label: 'Traffic' },
    { key: 'registration', label: 'Registration' },
    { key: 'confirmation', label: 'Confirmation' },
    { key: 'reminder', label: 'Reminder sequence' },
    { key: 'webinar', label: 'Webinar' },
    { key: 'offer', label: 'Post-webinar offer' },
    { key: 'follow_up', label: 'Post-webinar sequence' },
    { key: 'retargeting', label: 'Retargeting' },
  ],
  vsl_call_booking: [
    { key: 'traffic', label: 'Traffic' },
    { key: 'vsl', label: 'VSL landing page' },
    { key: 'booking', label: 'Call booking' },
    { key: 'confirmation', label: 'Confirmation' },
    { key: 'nurture', label: 'Pre-call nurture' },
    { key: 'sales_call', label: 'Sales call' },
    { key: 'follow_up', label: 'Follow-up' },
  ],
  free_skool_community: [
    { key: 'traffic', label: 'Traffic' },
    { key: 'opt_in', label: 'Community opt-in' },
    { key: 'confirmation', label: 'Confirmation' },
    { key: 'onboarding', label: 'Onboarding' },
    { key: 'community', label: 'Skool community' },
    { key: 'activation', label: 'Activation' },
    { key: 'conversion', label: 'Offer conversion' },
  ],
}

const FRAME_WIDTH = 320
const FRAME_HEIGHT = 620
const FRAME_GAP = 80

export function isCampaignBlueprintType(value: unknown): value is CampaignBlueprintType {
  return CAMPAIGN_BLUEPRINT_TYPES.includes(value as CampaignBlueprintType)
}

export function buildCampaignBlueprintOperations(input: {
  blueprintId: string
  campaignType: CampaignBlueprintType
  assets: BlueprintEntry[]
  gaps: BlueprintEntry[]
  createId?: () => string
  originX?: number
  originY?: number
}) {
  const createId = input.createId ?? randomUUID
  const stages = STAGES[input.campaignType]
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
          campaign_type: input.campaignType,
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
          campaign_type: input.campaignType,
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

  stages.slice(0, -1).forEach((stage, index) => {
    const nextStage = stages[index + 1]!
    operations.push({
      op: 'create_connector',
      connector: {
        id: createId(),
        source_item_id: stageIds.get(stage.key),
        target_item_id: stageIds.get(nextStage.key),
        label: 'Customer journey',
        style: { stroke: '#8b5cf6', stroke_width: 2, end_arrow: true },
      },
    })
  })

  if (operations.length > 100) throw new Error('A campaign blueprint cannot exceed 100 operations.')
  return operations
}
