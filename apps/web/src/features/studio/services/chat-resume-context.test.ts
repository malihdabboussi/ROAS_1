import { describe, expect, it } from 'vitest'
import type { Message } from '../types'
import { buildChatResumeContext } from './chat-resume-context'

function message(input: Partial<Message> & Pick<Message, 'id' | 'role'>): Message {
  return {
    conversation_id: 'conversation-1',
    content: '',
    content_blocks: null,
    metadata: {},
    created_at: '2026-07-28T17:00:00.000Z',
    ...input,
  }
}

describe('buildChatResumeContext', () => {
  it('preserves the exact latest visible task and its attachments', () => {
    const documents = [
      {
        filename: 'page.png',
        type: 'image' as const,
        fileUrl: 'https://example.com/page.png',
        mimeType: 'image/png',
      },
    ]
    const result = buildChatResumeContext([
      message({ id: 'user-1', role: 'user', content: 'Older request' }),
      message({
        id: 'user-2',
        role: 'user',
        content: 'Explain why this well-built page is only converting at 4.5%.',
        metadata: {
          documents,
          highlighted_artifacts: [{ id: 'artifact-1', type: 'page', label: 'VSL page' }],
        },
      }),
      message({
        id: 'assistant-1',
        role: 'assistant',
        content: 'This is not an unfinished page. Which makes the 4.5% more interesting, not less.',
      }),
    ])

    expect(result).toMatchObject({
      documents,
      highlighted_artifacts: [{ id: 'artifact-1', type: 'page', label: 'VSL page' }],
    })
    expect(result?.content).toContain(
      'Explain why this well-built page is only converting at 4.5%.',
    )
    expect(result?.content).toContain(
      'This is not an unfinished page. Which makes the 4.5% more interesting, not less.',
    )
    expect(result?.system_context).toContain('written user request is authoritative')
  })

  it('ignores prior hidden continuation prompts', () => {
    const result = buildChatResumeContext([
      message({ id: 'user-1', role: 'user', content: 'Finish the original task.' }),
      message({
        id: 'hidden-1',
        role: 'user',
        content: 'Generic hidden continuation',
        metadata: { hidden: true },
      }),
      message({ id: 'assistant-1', role: 'assistant', content: '' }),
    ])

    expect(result?.content).toContain('Finish the original task.')
    expect(result?.content).not.toContain('Generic hidden continuation')
  })

  it('returns null when no visible user request exists', () => {
    expect(
      buildChatResumeContext([
        message({ id: 'assistant-1', role: 'assistant', content: 'Orphaned response' }),
      ]),
    ).toBeNull()
  })
})
