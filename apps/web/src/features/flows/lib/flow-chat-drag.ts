import type { FlowAutomationSummary } from '../types/flow-automation.types'

export const VIBEY_FLOW_DRAG_TYPE = 'application/x-vibey-flow'

export type FlowChatDragPayload = {
  kind: 'flow'
  flowId: string
  flowDefinitionId: string | null
  flowInstallationId: string | null
  automationId: string | null
  flowName: string
  spaceId: string | null
  spaceTitle: string | null
  campaignId: string | null
  campaignName: string | null
  installationCount: number
}

type DataTransferWriter = Pick<DataTransfer, 'setData'> & { effectAllowed: string }
type DataTransferReader = Pick<DataTransfer, 'getData'>

export function buildFlowChatDragPayload(
  flow: FlowAutomationSummary,
  fallbackSpaceId?: string | null,
): FlowChatDragPayload | null {
  const spaceId = flow.space_id ?? fallbackSpaceId ?? null
  const flowDefinitionId = flow.flow_definition_id ?? null
  if (!spaceId && !flowDefinitionId) return null

  return {
    kind: 'flow',
    flowId: flow.id,
    flowDefinitionId,
    flowInstallationId: flow.flow_installation_id ?? null,
    automationId: flow.automation_id ?? flow.id,
    flowName: flow.name,
    spaceId,
    spaceTitle: flow.space_title ?? null,
    campaignId: flow.campaign_id ?? null,
    campaignName: flow.campaign_name ?? null,
    installationCount: flow.installation_count ?? flow.installations?.length ?? 1,
  }
}

export function isFlowChatDrag(types: readonly string[]): boolean {
  return types.includes(VIBEY_FLOW_DRAG_TYPE)
}

export function writeFlowChatDragData(
  dataTransfer: DataTransferWriter,
  flow: FlowAutomationSummary,
  fallbackSpaceId?: string | null,
): boolean {
  const payload = buildFlowChatDragPayload(flow, fallbackSpaceId)
  if (!payload) return false

  dataTransfer.setData(VIBEY_FLOW_DRAG_TYPE, JSON.stringify(payload))
  dataTransfer.setData('text/plain', `Flow: ${payload.flowName}`)
  dataTransfer.effectAllowed = 'copy'
  return true
}

export function readFlowChatDragPayload(
  dataTransfer: DataTransferReader,
): FlowChatDragPayload | null {
  const raw = dataTransfer.getData(VIBEY_FLOW_DRAG_TYPE)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<FlowChatDragPayload>
    if (
      parsed.kind !== 'flow' ||
      typeof parsed.flowId !== 'string' ||
      typeof parsed.flowName !== 'string' ||
      parsed.flowId.length === 0 ||
      parsed.flowName.length === 0
    ) {
      return null
    }

    return {
      kind: 'flow',
      flowId: parsed.flowId,
      flowDefinitionId:
        typeof parsed.flowDefinitionId === 'string' && parsed.flowDefinitionId.length > 0
          ? parsed.flowDefinitionId
          : null,
      flowInstallationId:
        typeof parsed.flowInstallationId === 'string' && parsed.flowInstallationId.length > 0
          ? parsed.flowInstallationId
          : null,
      automationId:
        typeof parsed.automationId === 'string' && parsed.automationId.length > 0
          ? parsed.automationId
          : null,
      flowName: parsed.flowName,
      spaceId:
        typeof parsed.spaceId === 'string' && parsed.spaceId.length > 0 ? parsed.spaceId : null,
      spaceTitle: typeof parsed.spaceTitle === 'string' ? parsed.spaceTitle : null,
      campaignId: typeof parsed.campaignId === 'string' ? parsed.campaignId : null,
      campaignName: typeof parsed.campaignName === 'string' ? parsed.campaignName : null,
      installationCount:
        typeof parsed.installationCount === 'number' && Number.isFinite(parsed.installationCount)
          ? parsed.installationCount
          : 1,
    }
  } catch {
    return null
  }
}
