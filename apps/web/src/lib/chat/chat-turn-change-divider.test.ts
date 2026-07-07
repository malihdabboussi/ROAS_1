import { describe, expect, it } from 'vitest'
import type { ChatRenderMessage } from './chat-render-message'
import {
  buildChatTurnChangeDividerItems,
  getMessageModelId,
  resolveChatModelLabel,
} from './chat-turn-change-divider'

function userMessage(id: string, metadata: Record<string, unknown> = {}): ChatRenderMessage {
  return {
    id,
    conversation_id: 'conversation-1',
    role: 'user',
    content: 'Hello',
    content_blocks: null,
    metadata,
    model_id: typeof metadata.model_id === 'string' ? metadata.model_id : null,
    created_at: '2026-06-04T10:00:00.000Z',
  }
}

describe('shared chat turn change divider helpers', () => {
  it('reads model ids from message model_id before metadata fallbacks', () => {
    const message = userMessage('user-1', { model_id: 'auto:economy', model: 'auto' })

    expect(getMessageModelId(message)).toBe('auto:economy')
  })

  it('does not show a divider for the first turn', () => {
    const items = buildChatTurnChangeDividerItems({
      previousUserMessage: null,
      userMessage: userMessage('user-1', { model_id: 'auto' }),
    })

    expect(items).toEqual([])
  })

  it('shows a model divider when the model changes between user turns', () => {
    const items = buildChatTurnChangeDividerItems({
      previousUserMessage: userMessage('user-1', { model_id: 'auto' }),
      userMessage: userMessage('user-2', { model_id: 'auto:power' }),
    })

    expect(items).toEqual([{ kind: 'model', label: 'Changed model to Power' }])
  })

  it('ignores agent metadata changes', () => {
    const items = buildChatTurnChangeDividerItems({
      previousUserMessage: userMessage('user-1', { model_id: 'auto', agent_id: 'vibey' }),
      userMessage: userMessage('user-2', { model_id: 'auto', agent_id: 'hr' }),
    })

    expect(items).toEqual([])
  })

  it('uses known concrete model labels when provided', () => {
    expect(
      resolveChatModelLabel('claude-sonnet-4-20250514', [
        { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
      ]),
    ).toBe('Claude Sonnet 4')
  })
})
