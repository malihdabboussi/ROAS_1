import { describe, expect, it } from 'vitest'
import { flowNeedsAttention } from '../flow-needs-attention'

describe('flowNeedsAttention', () => {
  it('returns true when required flow fields are incomplete', () => {
    expect(
      flowNeedsAttention({
        name: 'Untitled',
        trigger: { type: 'task_created' },
        actions: [{ type: 'choose_action' }],
      }),
    ).toBe(true)
  })

  it('returns false when the flow passes local publish checks', () => {
    expect(
      flowNeedsAttention({
        name: 'Welcome lead',
        trigger: { type: 'task_created' },
        actions: [{ type: 'add_comment', message_template: 'Hi' }],
      }),
    ).toBe(false)
  })
})
