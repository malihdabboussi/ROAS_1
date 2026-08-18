import { describe, expect, it } from 'vitest'
import { buildConversationHistoryContext } from './chat-session-history.context'

describe('buildConversationHistoryContext', () => {
  it('keeps recent turns and attached documents instead of oldest filler', () => {
    const bulky = (tag: string, size: number) => `${tag} ${'x'.repeat(size)}`
    const history: Record<string, unknown>[] = [
      { role: 'user', content: bulky('UNIQUE_OLD_MARKER', 8_000) },
      { role: 'assistant', content: bulky('OLD_ASSISTANT', 2_500) },
      { role: 'user', content: bulky('MID1', 8_000) },
      { role: 'assistant', content: bulky('MID1A', 2_500) },
      { role: 'user', content: bulky('MID2', 8_000) },
      { role: 'assistant', content: bulky('MID2A', 2_500) },
      { role: 'user', content: bulky('MID3', 8_000) },
      { role: 'assistant', content: bulky('MID3A', 2_500) },
      {
        role: 'user',
        content: 'Here is the 1DS game plan',
        metadata: {
          documents: [
            {
              filename: 'AOS - 90-Day Offer.md',
              type: 'text',
              text: 'AuthorityOS 90-day offer for 1DS Collective. John is the partner.',
            },
          ],
        },
      },
      {
        role: 'assistant',
        content: 'The game plan is ready. AuthorityOS covers the 90-day offer stack.',
        metadata: {
          content_blocks_ordered: [
            { type: 'artifact_preview', name: 'AuthorityOS The Game Plan' },
          ],
          tool_steps: [{ status: 'completed', label: 'Writing the game plan' }],
        },
      },
      { role: 'user', content: 'Can you give me a message I can send to John explaining all this?' },
    ]

    const dump = buildConversationHistoryContext(history)

    expect(dump).toContain('[CONVERSATION_HISTORY]')
    expect(dump).toContain('Treat them as your own prior')
    expect(dump).toContain('Here is the 1DS game plan')
    expect(dump).toContain('AOS - 90-Day Offer.md')
    expect(dump).toContain('John is the partner')
    expect(dump).toContain('AuthorityOS The Game Plan')
    expect(dump).toContain('Writing the game plan')
    expect(dump).not.toContain('Can you give me a message I can send to John')
    expect(dump).not.toContain('UNIQUE_OLD_MARKER')
  })

  it('uses content_blocks when assistant content is empty', () => {
    const dump = buildConversationHistoryContext([
      { role: 'user', content: 'Draft the deck' },
      {
        role: 'assistant',
        content: '',
        content_blocks: [{ type: 'text', content: 'Deck draft for 1DS is attached.' }],
      },
      { role: 'user', content: 'Send that to John' },
    ])

    expect(dump).toContain('Deck draft for 1DS is attached.')
    expect(dump).not.toContain('Send that to John')
  })

  it('returns empty when there is no prior assistant or user turn', () => {
    expect(buildConversationHistoryContext([{ role: 'user', content: 'First question' }])).toBe('')
    expect(buildConversationHistoryContext([])).toBe('')
  })
})
