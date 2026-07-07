import { describe, expect, it } from 'vitest'
import type { ChatRenderMessage } from '@/lib/chat/chat-render-message'
import type { MessageContentBlock } from '@/lib/chat/message-content-blocks'
import { findActivePlan } from './PlanStickyTracker'

function assistantMessage(
  id: string,
  blocks: MessageContentBlock[] = [],
): ChatRenderMessage {
  return {
    id,
    conversation_id: 'conversation-1',
    role: 'assistant',
    content: null,
    content_blocks: null,
    metadata: { content_blocks_ordered: blocks },
    created_at: '2026-06-04T10:00:00.000Z',
  }
}

function activePlanBlock(
  planId: string,
  itemStatuses: Array<'pending' | 'in_progress' | 'completed'>,
): MessageContentBlock {
  return {
    id: `block-${planId}`,
    type: 'chat_plan',
    plan_id: planId,
    title: `Plan ${planId}`,
    plan_status: 'active',
    items: itemStatuses.map((status, index) => ({
      id: `${planId}-item-${index}`,
      title: `Step ${index}`,
      status,
    })),
    version: 1,
  }
}

describe('PlanStickyTracker active plan selection', () => {
  it('selects the latest active assistant plan and counts completed items', () => {
    const activePlan = findActivePlan([
      assistantMessage('assistant-1', [activePlanBlock('old', ['completed'])]),
      assistantMessage('assistant-2', [
        activePlanBlock('new', ['completed', 'in_progress', 'pending']),
      ]),
    ])

    expect(activePlan).toEqual({
      planId: 'new',
      title: 'Plan new',
      completed: 1,
      total: 3,
    })
  })

  it('ignores completed plans', () => {
    const completedPlan = {
      ...activePlanBlock('done', ['completed']),
      plan_status: 'completed' as const,
    }

    expect(findActivePlan([assistantMessage('assistant-1', [completedPlan])])).toBeNull()
  })
})
