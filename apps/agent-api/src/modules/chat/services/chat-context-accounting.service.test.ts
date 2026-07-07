import { describe, expect, it } from 'vitest'
import { ChatContextAccountingService } from './chat-context-accounting.service'

describe('ChatContextAccountingService', () => {
  it('builds an early estimated breakdown from assembled gateway context', () => {
    const service = new ChatContextAccountingService({} as never)

    const breakdown = service.buildEstimatedContextBreakdown({
      instructions: 'SYSTEM: follow the workspace instructions.',
      inputMessages: [
        {
          type: 'message',
          role: 'user',
          content: '[CONTEXT]\nBrain context\n\nLatest user request',
        },
      ],
      contextWindowTokens: 128_000,
      modelId: 'anthropic/claude-opus-4.6',
      skillCatalog: {
        source: 'vibey_db',
        entries: [
          {
            id: 'skill-1',
            skill_key: 'research',
            name: 'Research',
            description: 'Collect current evidence before answering.',
          },
        ],
      },
      extraSlices: [
        {
          id: 'brain',
          label: 'Brain',
          tokens: 12,
          entries: [{ id: 'brain_context', label: 'Brain context', tokens: 12 }],
        },
        {
          id: 'tools',
          label: 'Tools',
          tokens: 8,
          entries: [{ id: 'enabled_toolkits', label: 'Enabled toolkits', tokens: 8 }],
        },
      ],
    })

    expect(breakdown).toMatchObject({
      version: 1,
      source: 'estimate',
      modelId: 'anthropic/claude-opus-4.6',
      contextWindow: 128_000,
    })
    expect(breakdown?.slices.map((slice) => slice.id)).toEqual(
      expect.arrayContaining(['system', 'skills', 'brain', 'tools', 'conversation']),
    )
    expect(breakdown?.totalTokens).toBe(
      breakdown?.slices.reduce((sum, slice) => sum + slice.tokens, 0),
    )
  })
})
