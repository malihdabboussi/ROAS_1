import { describe, expect, it } from 'vitest'
import type { Message } from '@/lib/conversations/conversation.types'
import {
  mergeMessagesPreservingOrderedBlocks,
  mergeOrderedContentBlocks,
} from './chat.service'

const clarificationBlock = {
  id: 'clarify-1',
  type: 'clarification',
  status: 'pending',
  title: 'Flow choices',
  questions: [{ id: 'q1', text: 'Which Slack channel?', type: 'single_choice', options: [] }],
}

describe('mergeOrderedContentBlocks', () => {
  it('keeps pending clarification blocks missing from backend payload', () => {
    const merged = mergeOrderedContentBlocks(
      [{ id: 'text-1', type: 'text', content: 'Two questions above.' }, clarificationBlock],
      [{ id: 'text-1', type: 'text', content: 'Two questions above.' }],
    )

    expect(merged).toHaveLength(2)
    expect(merged[1]).toMatchObject({ id: 'clarify-1', type: 'clarification', status: 'pending' })
  })
})

describe('mergeMessagesPreservingOrderedBlocks', () => {
  it('preserves pending clarification blocks after stream refresh even when backend has other blocks', () => {
    const localMessages: Message[] = [
      {
        id: 'assistant-local',
        conversation_id: 'conv-1',
        role: 'assistant',
        content: '',
        content_blocks: null,
        metadata: {
          content_blocks_ordered: [
            { id: 'text-1', type: 'text', content: 'Two questions above.' },
            clarificationBlock,
          ],
        },
        created_at: '2026-06-30T00:00:00.000Z',
      },
    ]
    const backendMessages: Message[] = [
      {
        id: 'assistant-real',
        conversation_id: 'conv-1',
        role: 'assistant',
        content: 'Two questions above.',
        content_blocks: null,
        metadata: {
          content_blocks_ordered: [{ id: 'text-1', type: 'text', content: 'Two questions above.' }],
        },
        created_at: '2026-06-30T00:00:00.000Z',
      },
    ]

    const merged = mergeMessagesPreservingOrderedBlocks(localMessages, backendMessages)
    const blocks = merged[0]?.metadata?.content_blocks_ordered as Array<Record<string, unknown>>

    expect(blocks).toHaveLength(2)
    expect(blocks?.[1]).toMatchObject({ id: 'clarify-1', type: 'clarification', status: 'pending' })
  })
})
