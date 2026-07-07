import { describe, expect, it } from 'vitest'
import type { A2ATurn, IntegrationRepairAction, MessageContentBlock } from './message-content-blocks'

const toolBlock = {
  type: 'tool',
  id: 'tool-1',
  name: 'web_search',
  label: 'Researching',
  state: 'active',
  startedAt: 123,
  progress: [{ id: 'p1', detail: 'query ready', timestamp: 124 }],
} satisfies Extract<MessageContentBlock, { type: 'tool' }>

const agentTurn = {
  from: 'atlas',
  fromName: 'Atlas',
  content: 'I found the signal.',
  turnIndex: 1,
  turnType: 'message',
  timestamp: 456,
} satisfies A2ATurn

const repairAction = {
  type: 'reconnect',
  label: 'Reconnect Google',
  provider: 'google',
  connectionId: 'conn-1',
} satisfies IntegrationRepairAction

describe('message content block contracts', () => {
  it('preserves tool block progress shape', () => {
    expect(toolBlock.progress?.[0]?.detail).toBe('query ready')
  })

  it('preserves agent turn shape', () => {
    expect(agentTurn.turnType).toBe('message')
  })

  it('preserves integration repair action shape', () => {
    expect(repairAction.type).toBe('reconnect')
  })
})
