import { describe, expect, it, vi } from 'vitest'
import { buildConversationReferenceLines } from './conversation-reference.util'

describe('buildConversationReferenceLines', () => {
  it('resolves an exact replied-to message without expanding the whole conversation', async () => {
    const repository = {
      findConversationReference: vi.fn(async () => ({
        id: 'conversation-1',
        user_id: 'user-1',
        org_id: null,
        title: 'Client Strategy',
        agent_id: 'pixel',
      })),
      listConversationReferenceMessages: vi.fn(async () => [
        { role: 'assistant', content: 'The exact strategy recommendation.' },
      ]),
    }

    const lines = await buildConversationReferenceLines(
      {} as never,
      [
        {
          id: 'conversation-1',
          label: 'Reply to assistant: The exact strategy recommendation.',
          messageId: 'assistant-1',
        },
      ],
      'user-1',
      null,
      repository as never,
    )

    expect(repository.listConversationReferenceMessages).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        conversationId: 'conversation-1',
        messageId: 'assistant-1',
        limit: 1,
      }),
    )
    expect(lines).toEqual([
      '- [Referenced message] Reply to assistant: The exact strategy recommendation. (conversation_id: conversation-1, message_id: assistant-1) — use this exact message as the reply target:',
      '  assistant: The exact strategy recommendation.',
    ])
  })
})
