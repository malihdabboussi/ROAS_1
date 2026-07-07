import { describe, expect, it, vi } from 'vitest'
import type { FlowAutomationSummary } from '../../types/flow-automation.types'
import {
  buildFlowChatDragPayload,
  readFlowChatDragPayload,
  VIBEY_FLOW_DRAG_TYPE,
  writeFlowChatDragData,
} from '../flow-chat-drag'

function flow(overrides: Partial<FlowAutomationSummary> = {}): FlowAutomationSummary {
  return {
    id: 'flow-1',
    name: 'Upgrade leads',
    enabled: true,
    trigger: { type: 'task_created' },
    actions: [],
    ...overrides,
  }
}

function transfer() {
  const values = new Map<string, string>()
  return {
    effectAllowed: 'move',
    setData: vi.fn((type: string, value: string) => values.set(type, value)),
    getData: vi.fn((type: string) => values.get(type) ?? ''),
  }
}

describe('flow chat drag contract', () => {
  it('builds a Loop drop payload from a flow and fallback Space', () => {
    expect(buildFlowChatDragPayload(flow(), 'space-1')).toEqual({
      kind: 'flow',
      flowId: 'flow-1',
      flowDefinitionId: null,
      flowInstallationId: null,
      automationId: 'flow-1',
      flowName: 'Upgrade leads',
      spaceId: 'space-1',
      spaceTitle: null,
      campaignId: null,
      campaignName: null,
      installationCount: 1,
    })
  })

  it('builds a Loop drop payload from a reusable flow definition without a Space', () => {
    expect(
      buildFlowChatDragPayload(flow({ flow_definition_id: 'definition-1', installation_count: 2 })),
    ).toEqual({
      kind: 'flow',
      flowId: 'flow-1',
      flowDefinitionId: 'definition-1',
      flowInstallationId: null,
      automationId: 'flow-1',
      flowName: 'Upgrade leads',
      spaceId: null,
      spaceTitle: null,
      campaignId: null,
      campaignName: null,
      installationCount: 2,
    })
  })

  it('writes and reads the flow payload through DataTransfer', () => {
    const dataTransfer = transfer()

    expect(
      writeFlowChatDragData(dataTransfer, flow({ space_id: 'space-2', space_title: 'Pipeline' })),
    ).toBe(true)

    expect(dataTransfer.effectAllowed).toBe('copy')
    expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', 'Flow: Upgrade leads')
    expect(readFlowChatDragPayload(dataTransfer)).toEqual({
      kind: 'flow',
      flowId: 'flow-1',
      flowDefinitionId: null,
      flowInstallationId: null,
      automationId: 'flow-1',
      flowName: 'Upgrade leads',
      spaceId: 'space-2',
      spaceTitle: 'Pipeline',
      campaignId: null,
      campaignName: null,
      installationCount: 1,
    })
  })

  it('rejects malformed or unscoped payloads', () => {
    const dataTransfer = transfer()
    dataTransfer.setData(VIBEY_FLOW_DRAG_TYPE, JSON.stringify({ kind: 'flow', flowId: 'flow-1' }))

    expect(buildFlowChatDragPayload(flow())).toBeNull()
    expect(readFlowChatDragPayload(dataTransfer)).toBeNull()
  })
})
