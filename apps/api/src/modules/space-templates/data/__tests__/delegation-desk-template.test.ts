import { describe, expect, it } from 'vitest'
import { DELEGATION_DESK_TEMPLATES } from '../space-template-catalog-delegation-desk'

describe('Delegation Desk space template', () => {
  it('keeps raw intake private from dispatched work through explicit workflow states', () => {
    const [template] = DELEGATION_DESK_TEMPLATES

    expect(template).toMatchObject({
      slug: 'delegation-desk',
      title: 'Delegation Desk',
      schema: {
        delegation_desk: true,
        fields: expect.arrayContaining([
          expect.objectContaining({
            id: 'status',
            options: expect.arrayContaining([
              expect.objectContaining({ id: 'inbox' }),
              expect.objectContaining({ id: 'ready_review' }),
              expect.objectContaining({ id: 'dispatched' }),
            ]),
          }),
          expect.objectContaining({
            id: 'dispatch_mode',
            options: expect.arrayContaining([
              expect.objectContaining({ id: 'batch' }),
              expect.objectContaining({ id: 'review' }),
              expect.objectContaining({ id: 'urgent' }),
            ]),
          }),
        ]),
      },
    })
  })

  it('hands only new top-level inbox items to Pixel for consolidation', () => {
    const [template] = DELEGATION_DESK_TEMPLATES
    const [automation] = template?.automations ?? []

    expect(automation).toMatchObject({
      name: 'Process delegation intake',
      trigger: { type: 'task_created', in_status: 'inbox', is_subtask: false },
      actions: [
        expect.objectContaining({
          type: 'send_to_agent',
          agent_key: 'vibey',
          output_type: 'none',
        }),
      ],
    })
    expect(JSON.stringify(automation)).toMatch(/delegation packet/i)
    expect(JSON.stringify(automation)).toMatch(/do not assign raw intake/i)
  })
})
