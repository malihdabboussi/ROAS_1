import { describe, expect, it } from 'vitest'
import { buildContactConversationChatDragPayload } from '../contact-conversation-drag'

describe('buildContactConversationChatDragPayload', () => {
  it('builds the artifact drag payload for a conversation', () => {
    expect(
      buildContactConversationChatDragPayload({ id: 'conv-1', title: 'Telegram Chat' }),
    ).toEqual({ id: 'conv-1', type: 'contact-conversation', label: 'Telegram Chat' })
  })

  it('falls back to a generic label when the title is empty', () => {
    expect(buildContactConversationChatDragPayload({ id: 'conv-1', title: null }).label).toBe(
      'Customer conversation',
    )
    expect(buildContactConversationChatDragPayload({ id: 'conv-1', title: '  ' }).label).toBe(
      'Customer conversation',
    )
  })
})
