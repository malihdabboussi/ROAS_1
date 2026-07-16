import { describe, expect, it } from 'vitest'
import type { Message } from '@/lib/conversations/conversation.types'
import {
  buildSpaceChatTurnData,
  buildSpaceVoiceRunTasks,
  collectVisibleUndoMessageIds,
  findLastEditableUserMessageId,
  filterVisibleSpaceChatMessages,
  filterVoiceDelegationMessages,
} from './space-vibey-chat-messages.logic'

function message(overrides: Partial<Message>): Message {
  return {
    id: 'message-1',
    conversation_id: 'conversation-1',
    role: 'assistant',
    content: null,
    content_blocks: null,
    metadata: {},
    created_at: '2026-06-22T00:00:00.000Z',
    ...overrides,
  }
}

describe('space ROAS chat message logic', () => {
  it('keeps visible messages stable and filters hidden delegation messages', () => {
    const visible = message({ id: 'visible' })
    const unchanged = [visible]

    expect(filterVisibleSpaceChatMessages([])).toEqual([])
    expect(filterVisibleSpaceChatMessages(unchanged)).toBe(unchanged)

    const allMessages = [
      message({ id: 'hidden', metadata: { hidden: true } }),
      message({ id: 'delegated', metadata: { delegation_task: true } }),
      visible,
    ]

    expect(filterVisibleSpaceChatMessages(allMessages)).toEqual([visible])
  })

  it('collects voice delegation messages from the full message stream', () => {
    const delegated = message({
      id: 'delegated',
      metadata: { delegation_task: true, hidden: true },
    })
    const regular = message({ id: 'regular' })

    expect(filterVoiceDelegationMessages([delegated, regular])).toEqual([delegated])
  })

  it('keeps only the last visible undoable assistant message ids', () => {
    const messages = [
      message({ id: 'ignored-user', role: 'user', metadata: { spaces_undoable: true } }),
      message({ id: 'm1', metadata: { spaces_undoable: true } }),
      message({ id: 'm2', metadata: { content_blocks_ordered: [{ name: 'create_task' }] } }),
      message({ id: 'm3', metadata: { content_blocks_ordered: [{ action: 'update_task' }] } }),
      message({ id: 'm4', metadata: { spaces_undoable: true } }),
      message({ id: 'm5', metadata: { spaces_undoable: true } }),
      message({ id: 'm6', metadata: { spaces_undoable: true } }),
    ]

    expect(Array.from(collectVisibleUndoMessageIds(messages))).toEqual([
      'm2',
      'm3',
      'm4',
      'm5',
      'm6',
    ])
  })

  it('groups leading assistant messages and voice-live user messages into chat turns', () => {
    const leading = message({ id: 'leading' })
    const user = message({ id: 'user-1', role: 'user' })
    const assistant = message({ id: 'assistant-1' })
    const voiceLiveUser = message({
      id: 'voice-live-user',
      role: 'user',
      metadata: { source: 'voice_live' },
    })
    const nextUser = message({ id: 'user-2', role: 'user' })
    const nextAssistant = message({ id: 'assistant-2' })

    const result = buildSpaceChatTurnData([
      leading,
      user,
      assistant,
      voiceLiveUser,
      nextUser,
      nextAssistant,
    ])

    expect(result.leadingMessages).toEqual([leading])
    expect(result.turns).toHaveLength(2)
    expect(result.turns[0]?.user).toBe(user)
    expect(result.turns[0]?.responses).toEqual([assistant, voiceLiveUser])
    expect(result.turns[1]?.user).toBe(nextUser)
    expect(result.turns[1]?.responses).toEqual([nextAssistant])
  })

  it('derives voice run tasks from delegation messages and live task state', () => {
    const delegatedRunning = message({
      id: 'message-running',
      content: 'Queued copy task',
      metadata: {
        delegation_id: 'delegation-running',
        voice_task_label: 'Write launch copy',
        voice_task_status: 'running',
      },
    })
    const delegatedDefault = message({
      id: 'message-default',
      content: 'Fallback task label',
      metadata: {
        voice_task_status: 'waiting',
      },
    })
    const liveRunning = {
      delegationId: 'delegation-running',
      messageId: 'message-running',
      task: 'Write launch copy live',
      status: 'completed' as const,
    }
    const liveOnly = {
      delegationId: 'delegation-live-only',
      messageId: 'message-live-only',
      task: 'Research audience',
      status: 'running' as const,
    }

    expect(buildSpaceVoiceRunTasks([delegatedRunning, delegatedDefault], [liveRunning, liveOnly]))
      .toEqual([
        liveRunning,
        {
          delegationId: 'message-default',
          messageId: 'message-default',
          task: 'Fallback task label',
          status: 'completed',
        },
        liveOnly,
      ])
  })

  it('finds the last editable user message only when the conversation is not streaming', () => {
    const messages = [
      message({ id: 'user-1', role: 'user' }),
      message({ id: 'assistant-1', role: 'assistant' }),
      message({ id: 'user-2', role: 'user' }),
      message({ id: 'assistant-2', role: 'assistant' }),
    ]

    expect(findLastEditableUserMessageId(messages, false)).toBe('user-2')
    expect(findLastEditableUserMessageId(messages, true)).toBeNull()
    expect(findLastEditableUserMessageId([message({ id: 'assistant-only' })], false)).toBeNull()
  })
})
