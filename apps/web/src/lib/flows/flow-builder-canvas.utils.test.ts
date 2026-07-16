import { describe, expect, it } from 'vitest'
import { buildFlowBuilderCanvasSteps } from './flow-builder-canvas.utils'

describe('buildFlowBuilderCanvasSteps', () => {
  it('maps plan trigger and actions to canvas steps', () => {
    const steps = buildFlowBuilderCanvasSteps({
      plan: {
        name: 'Comment on Task Completed',
        intent: 'When done, comment',
        status: 'validated',
        trigger: {
          id: 'trigger-1',
          kind: 'trigger',
          title: 'Status changed',
          description: 'When a task moves between statuses',
          source: 'premade',
          payload: { type: 'status_change', to: 'done' },
          missing_fields: [],
          compatibility_warnings: [],
        },
        actions: [
          {
            id: 'action-1',
            kind: 'action',
            title: 'Add comment',
            description: 'Adds a comment to the triggering task',
            source: 'premade',
            action_type: 'add_comment',
            payload: { type: 'add_comment', message_template: 'Task completed.' },
            missing_fields: [],
            compatibility_warnings: [],
          },
        ],
        trace_events: [],
        validation_errors: [],
      },
      trigger: { type: 'status_change', to: 'done' },
      actions: [{ type: 'add_comment', message_template: 'Task completed.' }],
      fields: [
        {
          id: 'status',
          name: 'Status',
          type: 'select',
          options: [{ id: 'done', label: 'Completed' }],
        },
      ],
      roster: [],
    })

    expect(steps).toHaveLength(2)
    expect(steps[0]?.label).toBe('Status changed')
    expect(steps[0]?.config).toBe('Changes status from any status to Completed')
    expect(steps[0]?.typeLabel).toBe('Space')
    expect(steps[1]?.label).toBe('Add comment')
    expect(steps[1]?.config).toBe('Adds comment: "Task completed."')
    expect(steps[1]?.typeLabel).toBe('Action')
  })

  it('includes choose_action steps added from the UI', () => {
    const steps = buildFlowBuilderCanvasSteps({
      trigger: { type: 'status_change', to: 'done' },
      actions: [
        { type: 'add_comment', message_template: 'Done' },
        { type: 'choose_action' },
      ],
      fields: [],
      roster: [],
    })

    expect(steps).toHaveLength(3)
    expect(steps[2]?.label).toBe('Choose action')
    expect(steps[2]?.config).toBe('Choose an action…')
  })

  it('uses live action type for visuals after user changes step category', () => {
    const steps = buildFlowBuilderCanvasSteps({
      plan: {
        name: 'Test',
        intent: 'test',
        status: 'validated',
        trigger: {
          id: 'trigger-1',
          kind: 'trigger',
          title: 'Status changed',
          description: 'When status changes',
          source: 'premade',
          payload: { type: 'status_change', to: 'done' },
          missing_fields: [],
          compatibility_warnings: [],
        },
        actions: [
          {
            id: 'action-1',
            kind: 'action',
            title: 'Add comment',
            description: 'Adds a comment',
            source: 'premade',
            action_type: 'add_comment',
            payload: { type: 'add_comment', message_template: 'Hi' },
            missing_fields: [],
            compatibility_warnings: [],
          },
        ],
        trace_events: [],
        validation_errors: [],
      },
      trigger: { type: 'status_change', to: 'done' },
      actions: [{ type: 'send_to_agent', agent_key: 'vibey', prompt_template: 'Do work' }],
      fields: [],
      roster: [
        {
          participant_id: '1',
          kind: 'agent',
          org_id: null,
          user_id: null,
          agent_key: 'vibey',
          display_name: 'ROAS',
          avatar_url: 'https://cdn.example/vibey.png',
          role_label: null,
          specialties: [],
          accepts_assignments: true,
          delegation_notes: null,
          timezone: null,
          working_hours: null,
          out_of_office_until: null,
          current_load: 0,
          is_ready: true,
          agent_level: null,
          org_role: null,
          email: null,
          created_at: '',
          updated_at: null,
        },
      ],
    })

    expect(steps[1]?.label).toBe('Run agent')
    expect(steps[1]?.avatarSrc).toBe('https://cdn.example/vibey.png')
    expect(steps[1]?.typeLabel).toBe('Agent')
  })

  it('renders webhook trigger as step 1', () => {
    const steps = buildFlowBuilderCanvasSteps({
      trigger: { type: 'webhook_received', webhook_endpoint_id: 'endpoint-1' },
      actions: [{ type: 'create_task', title_template: 'Handle webhook' }],
      fields: [],
      roster: [],
    })

    expect(steps[0]?.label).toBe('Webhook received')
    expect(steps[0]?.typeLabel).toBe('Webhook')
    expect(steps[0]?.config).toBe('When webhook endpoint receives a request')
  })

  it('renders an unconfigured trigger placeholder as step 1', () => {
    const steps = buildFlowBuilderCanvasSteps({
      trigger: { type: 'choose_action' },
      actions: [],
      fields: [],
      roster: [],
    })

    expect(steps).toHaveLength(1)
    expect(steps[0]?.isPlaceholder).toBe(true)
    expect(steps[0]?.label).toBe('Select your trigger')
  })

  it('includes connected app logo on fathom trigger steps', () => {
    const steps = buildFlowBuilderCanvasSteps({
      trigger: { type: 'external_fathom_recording_ready' },
      actions: [],
      fields: [],
      roster: [],
    })

    expect(steps[0]?.logoSrc).toBe('/Integrations/Fathom.png')
    expect(steps[0]?.configurationStatus).toBe('needs_configure')
  })

  it('maps loop and branch control steps with consistent step numbers', () => {
    const steps = buildFlowBuilderCanvasSteps({
      trigger: { type: 'task_created', in_status: 'todo' },
      actions: [
        { type: 'add_comment', message_template: 'Start' },
        {
          type: 'flow_loop',
          target_step_index: 0,
          when: 'on_reject',
          max_iterations: 3,
        },
        {
          type: 'flow_branch',
          field_id: 'status',
          operator: 'equals',
          value: 'done',
          then_step_index: 0,
          else_step_index: 1,
        },
      ],
      fields: [],
      roster: [],
    })

    expect(steps[2]?.typeLabel).toBe('Loop')
    expect(steps[2]?.loopTargetStepNumber).toBe(2)
    expect(steps[2]?.config).toContain('Back to step 2')

    expect(steps[3]?.typeLabel).toBe('Branch')
    expect(steps[3]?.branchThenStepNumber).toBe(2)
    expect(steps[3]?.branchElseStepNumber).toBe(3)
  })
})
