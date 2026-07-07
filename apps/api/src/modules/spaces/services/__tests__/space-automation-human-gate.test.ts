import { describe, expect, it, vi } from 'vitest'
import { SpaceAutomationService } from '../space-automation.service'
import { automationsRepoFromRepo, fakeSupabase } from './space-automation-test-utils'

describe('SpaceAutomationService human_gate', () => {
  it('pauses after human_gate when more steps remain', async () => {
    const db = {
      space_automation_run_state: [] as Record<string, unknown>[],
      space_automation_runs: [] as Record<string, unknown>[],
    }
    const repo = {
      findSpaceById: vi.fn().mockResolvedValue({
        schema: {
          automations: [
            {
              id: 'automation_1',
              name: 'ROAS kit',
              enabled: true,
              is_draft: false,
              trigger: { type: 'task_created' },
              actions: [
                {
                  type: 'human_gate',
                  assignees: [{ type: 'agent', id: 'ads_manager' }],
                  waiting_status: 'in_review',
                  resume_on_status: 'done',
                  reject_on_status: 'needs_revision',
                  message_template: 'Please review',
                },
                { type: 'add_comment', message_template: 'After gate' },
              ],
            },
          ],
        },
      }),
      findItemById: vi.fn().mockResolvedValue({ id: 'item_1', title: 'Task', custom_data: {} }),
      findSubtasksByParentId: vi.fn().mockResolvedValue([]),
      findActivityByItemId: vi.fn().mockResolvedValue([]),
      updateItem: vi.fn().mockResolvedValue({ id: 'item_1', status: 'in_review' }),
      insertActivity: vi.fn().mockResolvedValue(undefined),
      createActivity: vi.fn().mockResolvedValue(undefined),
    }
    const service = new SpaceAutomationService(
      repo as never,
      automationsRepoFromRepo(repo) as never,
      {} as never,
      {} as never,
    )
    const supabase = fakeSupabase(db)

    await service.executeAutomationById(
      'automation_1',
      { type: 'task_created', is_subtask: false },
      {
        supabase,
        userId: 'user_1',
        orgId: null,
        spaceId: 'space_1',
        itemId: 'item_1',
        depth: 0,
      },
    )

    expect(repo.updateItem).toHaveBeenCalledWith(
      expect.anything(),
      'user_1',
      'space_1',
      'item_1',
      expect.objectContaining({
        assignees: [{ type: 'agent', id: 'ads_manager' }],
      }),
      null,
    )
    expect(repo.updateItem).toHaveBeenCalledWith(
      expect.anything(),
      'user_1',
      'space_1',
      'item_1',
      { status: 'in_review' },
      null,
    )
    expect(db.space_automation_run_state).toHaveLength(1)
    expect(db.space_automation_run_state[0]).toMatchObject({
      status: 'paused',
      next_action_index: 1,
      automation_id: 'automation_1',
    })
    expect(db.space_automation_run_state[0]?.run_context).toMatchObject({
      gate_paused_at: expect.any(String),
    })
  })

  it('resumes paused human_gate when task status matches resume_on_status', async () => {
    const runState = {
      id: 'run_state_1',
      status: 'paused',
      automation_id: 'automation_1',
      space_id: 'space_1',
      item_id: 'item_1',
      user_id: 'user_1',
      org_id: null,
      trigger_event: { type: 'external_slack_message_received' },
      next_action_index: 2,
      actions_executed: [{ type: 'human_gate', result: { waiting: true } }],
      run_context: { gate_paused_at: '2026-06-30T10:00:00.000Z' },
    }
    const db = {
      space_automation_run_state: [runState],
      space_automation_runs: [] as Record<string, unknown>[],
    }
    const repo = {
      findSpaceById: vi.fn().mockResolvedValue({
        schema: {
          automations: [
            {
              id: 'automation_1',
              name: 'ROAS kit',
              enabled: true,
              is_draft: false,
              trigger: { type: 'task_created' },
              actions: [
                { type: 'send_to_agent', agent_key: 'ads_manager' },
                {
                  type: 'human_gate',
                  assignees: [{ type: 'human', id: 'user_reviewer' }],
                  waiting_status: 'in_review',
                  resume_on_status: 'done',
                  reject_on_status: 'needs_revision',
                  message_template: 'Review',
                },
                { type: 'add_comment', message_template: 'Design complete' },
              ],
            },
          ],
        },
      }),
      findItemById: vi.fn().mockResolvedValue({ id: 'item_1', title: 'Task', custom_data: {} }),
      findSubtasksByParentId: vi.fn().mockResolvedValue([]),
      findActivityByItemId: vi.fn().mockResolvedValue([]),
      updateItem: vi.fn().mockResolvedValue({ id: 'item_1' }),
      insertActivity: vi.fn().mockResolvedValue(undefined),
      createActivity: vi.fn().mockResolvedValue(undefined),
    }
    const service = new SpaceAutomationService(
      repo as never,
      automationsRepoFromRepo(repo) as never,
      {} as never,
      {} as never,
    )
    const supabase = fakeSupabase(db)

    await service.evaluate(
      { type: 'status_change', from: 'in_review', to: 'done', is_subtask: false },
      {
        supabase,
        userId: 'user_1',
        orgId: null,
        spaceId: 'space_1',
        itemId: 'item_1',
        depth: 0,
      },
    )

    expect(db.space_automation_run_state[0]!.status).toBe('resumed')
  })

  it('resumes reject path with review feedback and goto step index', async () => {
    const runState = {
      id: 'run_state_1',
      status: 'paused',
      automation_id: 'automation_1',
      space_id: 'space_1',
      item_id: 'item_1',
      user_id: 'user_1',
      org_id: null,
      created_at: '2026-06-30T10:00:00.000Z',
      trigger_event: { type: 'task_created' },
      next_action_index: 4,
      actions_executed: [{ type: 'human_gate', result: { waiting: true } }],
      run_context: { gate_paused_at: '2026-06-30T10:00:00.000Z' },
    }
    const db = {
      space_automation_run_state: [runState],
      space_automation_runs: [] as Record<string, unknown>[],
    }
    const executeSpy = vi.fn().mockResolvedValue('item_1')
    const repo = {
      findSpaceById: vi.fn().mockResolvedValue({
        schema: {
          automations: [
            {
              id: 'automation_1',
              name: 'ROAS kit',
              enabled: true,
              is_draft: false,
              trigger: { type: 'task_created' },
              actions: [
                { type: 'create_task', title_template: 'Brief' },
                { type: 'send_to_agent', agent_key: 'ads_manager', prompt_template: 'Concepts' },
                { type: 'send_to_agent', agent_key: 'ads_manager', prompt_template: 'Copy' },
                {
                  type: 'human_gate',
                  assignees: [{ type: 'human', id: 'user_reviewer' }],
                  waiting_status: 'in_review',
                  resume_on_status: 'done',
                  reject_on_status: 'needs_revision',
                  on_reject_goto_step_index: 2,
                  message_template: 'Review',
                },
                { type: 'add_comment', message_template: 'Design complete' },
              ],
            },
          ],
        },
      }),
      findItemById: vi.fn().mockResolvedValue({ id: 'item_1', title: 'Task', custom_data: {} }),
      findSubtasksByParentId: vi.fn().mockResolvedValue([]),
      findActivityByItemId: vi.fn().mockResolvedValue([
        {
          event_type: 'comment',
          created_at: '2026-06-30T10:05:00.000Z',
          payload: { message: 'Tighten the headline' },
        },
      ]),
      updateItem: vi.fn().mockResolvedValue({ id: 'item_1' }),
      insertActivity: vi.fn().mockResolvedValue(undefined),
      createActivity: vi.fn().mockResolvedValue(undefined),
    }
    const service = new SpaceAutomationService(
      repo as never,
      automationsRepoFromRepo(repo) as never,
      {} as never,
      {} as never,
    )
    ;(service as unknown as { executeAutomation: typeof executeSpy }).executeAutomation = executeSpy
    const supabase = fakeSupabase(db)

    await service.evaluate(
      { type: 'status_change', from: 'in_review', to: 'needs_revision', is_subtask: false },
      {
        supabase,
        userId: 'user_1',
        orgId: null,
        spaceId: 'space_1',
        itemId: 'item_1',
        depth: 0,
      },
    )

    expect(db.space_automation_run_state[0]!.status).toBe('resumed')
    expect(executeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'automation_1' }),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      2,
      expect.any(Array),
      expect.objectContaining({ review_feedback: 'Tighten the headline' }),
    )
  })
})
