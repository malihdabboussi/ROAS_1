import { describe, expect, it } from 'vitest'
import { cloneFlowBuilderActions, deleteFlowBuilderAction } from './flow-builder-step-actions.utils'

describe('flow-builder-step-actions.utils', () => {
  it('deletes an action by index', () => {
    expect(
      deleteFlowBuilderAction(
        [
          { type: 'add_comment', message_template: 'a' },
          { type: 'add_comment', message_template: 'b' },
        ],
        0,
      ),
    ).toHaveLength(1)
  })

  it('clones this step and all below', () => {
    const next = cloneFlowBuilderActions({
      actions: [
        { type: 'add_comment', message_template: 'a' },
        { type: 'send_to_agent', agent_key: 'vibey', prompt_template: 'b' },
      ],
      sourceActionIndex: 0,
      mode: 'this_and_below',
      insertAfterActionIndex: 1,
    })
    expect(next).toHaveLength(4)
  })
})
