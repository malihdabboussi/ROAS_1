import { describe, expect, it } from 'vitest'
import { DELEGATION_DESK_TEMPLATES } from '../space-template-catalog-delegation-desk'

describe('Delegation Desk space template', () => {
  it('keeps captured work in a private holding tank until it is ready to delegate', () => {
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
              expect.objectContaining({ id: 'inbox', label: 'Holding tank' }),
              expect.objectContaining({ id: 'ready_review', label: 'Ready to delegate' }),
              expect.objectContaining({ id: 'dispatched', label: 'Delegated' }),
              expect.objectContaining({ id: 'done', label: 'Done' }),
            ]),
          }),
          expect.objectContaining({
            id: 'intake_type',
            options: expect.arrayContaining([
              expect.objectContaining({ id: 'work_item', label: 'Work item' }),
              expect.objectContaining({ id: 'work_group', label: 'Work group' }),
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

  it('hands only new top-level holding-tank items to Delegator for planning', () => {
    const [template] = DELEGATION_DESK_TEMPLATES
    const [automation] = template?.automations ?? []

    expect(automation).toMatchObject({
      name: 'Process delegation intake',
      trigger: { type: 'task_created', in_status: 'inbox', is_subtask: false },
      actions: [
        expect.objectContaining({
          type: 'send_to_agent',
          agent_key: 'delegator',
          output_type: 'none',
        }),
      ],
    })
    expect(JSON.stringify(automation)).toMatch(/work items/i)
    expect(JSON.stringify(automation)).toMatch(/do not assign raw intake/i)
  })
})
