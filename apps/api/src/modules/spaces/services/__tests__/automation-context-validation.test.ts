import { describe, expect, it } from 'vitest'
import { assertAutomationValidWhenEnabled } from '../space-automation-publishable'

describe('assertAutomationValidWhenEnabled context chain', () => {
  it('rejects send_to_agent on email trigger without a prior create_task', () => {
    expect(() =>
      assertAutomationValidWhenEnabled({
        is_draft: false,
        name: 'Email flow',
        trigger: {
          type: 'external_email_received',
          provider: 'gmail',
          trigger_slug: 'GMAIL_NEW_GMAIL_MESSAGE',
          connected_account_id: 'ca_1',
        },
        actions: [
          {
            type: 'send_to_agent',
            agent_key: 'zara',
            prompt_template: 'Reply',
            continuation: 'after_task_completes',
          },
        ],
      }),
    ).toThrow(/needs task context first/)
  })

  it('allows create_task before send_to_agent on email trigger', () => {
    expect(() =>
      assertAutomationValidWhenEnabled({
        is_draft: false,
        name: 'Email flow',
        trigger: {
          type: 'external_email_received',
          provider: 'gmail',
          trigger_slug: 'GMAIL_NEW_GMAIL_MESSAGE',
          connected_account_id: 'ca_1',
        },
        actions: [
          { type: 'create_task', title_template: '{{trigger.subject}}' },
          {
            type: 'send_to_agent',
            agent_key: 'zara',
            prompt_template: 'Reply',
            continuation: 'after_task_completes',
          },
        ],
      }),
    ).not.toThrow()
  })

  it('allows webhook triggers with itemless-safe actions', () => {
    expect(() =>
      assertAutomationValidWhenEnabled({
        is_draft: false,
        name: 'Webhook flow',
        trigger: {
          type: 'webhook_received',
          webhook_endpoint_id: '9b5f88f7-f572-4ceb-8abe-4ec4476f8b6f',
        },
        actions: [{ type: 'create_task', title_template: '{{trigger.fields.customer_email}}' }],
      }),
    ).not.toThrow()
  })

  it('rejects webhook triggers that need a source task', () => {
    expect(() =>
      assertAutomationValidWhenEnabled({
        is_draft: false,
        name: 'Webhook flow',
        trigger: {
          type: 'webhook_received',
          webhook_endpoint_id: '9b5f88f7-f572-4ceb-8abe-4ec4476f8b6f',
        },
        actions: [{ type: 'add_comment', message_template: 'Needs a task' }],
      }),
    ).toThrow(/not supported for itemless triggers/)
  })
})
