import { describe, expect, it } from 'vitest'
import {
  checkRuleFieldsComplete,
  isFlowDraftPlaceholder,
  validateTrigger,
} from './automation-publishable'

describe('isFlowDraftPlaceholder', () => {
  it('treats choose_action trigger and empty actions as placeholder', () => {
    expect(isFlowDraftPlaceholder({ type: 'choose_action' }, [])).toBe(true)
    expect(
      isFlowDraftPlaceholder({ type: 'task_created' }, [{ type: 'choose_action' }]),
    ).toBe(true)
    expect(
      isFlowDraftPlaceholder(
        { type: 'task_created' },
        [{ type: 'add_comment', message_template: 'Done' }],
      ),
    ).toBe(false)
  })
})

describe('automation-publishable webhook triggers', () => {
  it('requires a webhook endpoint id before publishing', () => {
    expect(validateTrigger({ type: 'webhook_received' })).toBe('Choose a webhook endpoint')
    expect(
      validateTrigger({
        type: 'webhook_received',
        webhook_endpoint_id: '9b5f88f7-f572-4ceb-8abe-4ec4476f8b6f',
      }),
    ).toBeNull()
  })

  it('allows itemless-safe webhook actions and blocks source-task actions', () => {
    const trigger = {
      type: 'webhook_received',
      webhook_endpoint_id: '9b5f88f7-f572-4ceb-8abe-4ec4476f8b6f',
    }

    expect(
      checkRuleFieldsComplete('Webhook lead', trigger, [
        { type: 'create_task', title_template: '{{trigger.fields.customer_email}}' },
      ]),
    ).toEqual({ ok: true })

    expect(
      checkRuleFieldsComplete('Webhook comment', trigger, [
        { type: 'add_comment', message_template: 'Needs source task' },
      ]),
    ).toEqual({
      ok: false,
      message: 'Action "add_comment" needs a source task',
    })
  })
})
