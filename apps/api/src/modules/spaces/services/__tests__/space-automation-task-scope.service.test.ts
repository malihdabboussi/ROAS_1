import { describe, expect, it, vi } from 'vitest'
import { SpaceAutomationService } from '../space-automation.service'
import { automationsRepoFromRepo } from './space-automation-test-utils'

function supabaseWithRunLog() {
  return {
    from: vi.fn((table: string) => {
      if (table === 'space_automation_runs') return { insert: vi.fn().mockResolvedValue({}) }
      return {}
    }),
  }
}

function buildRepo(opts: { triggerScope?: 'tasks' | 'subtasks' | 'all' }) {
  const trigger: Record<string, unknown> = { type: 'task_created' }
  if (opts.triggerScope) trigger.task_scope = opts.triggerScope
  return {
    findSpaceById: vi.fn().mockResolvedValue({
      schema: {
        automations: [
          {
            id: 'automation_1',
            name: 'Task created scope test',
            enabled: true,
            trigger,
            actions: [{ type: 'add_comment', message_template: 'Hi {{task.title}}' }],
          },
        ],
      },
    }),
    findItemById: vi.fn().mockResolvedValue({ id: 'item_1', title: 'Task' }),
    findSubtasksByParentId: vi.fn().mockResolvedValue([]),
    findActivityByItemId: vi.fn().mockResolvedValue([]),
    createActivity: vi.fn().mockResolvedValue({}),
  }
}

function automationCommentCount(repo: ReturnType<typeof buildRepo>) {
  return repo.createActivity.mock.calls.filter(
    ([, payload]) => (payload as { event_type?: string }).event_type === 'automation_comment',
  ).length
}

describe('SpaceAutomationService task_scope filter', () => {
  it('matches "tasks" scope only when event is not a subtask', async () => {
    const repo = buildRepo({ triggerScope: 'tasks' })
    const service = new SpaceAutomationService(
      repo as never,
      automationsRepoFromRepo(repo) as never,
      {} as never,
      {} as never,
    )

    await service.evaluate({ type: 'task_created', is_subtask: false } as never, {
      supabase: supabaseWithRunLog() as never,
      userId: 'user_1',
      orgId: null,
      spaceId: 'space_1',
      itemId: 'item_1',
      depth: 0,
    })
    expect(automationCommentCount(repo)).toBe(1)

    repo.createActivity.mockClear()
    await service.evaluate({ type: 'task_created', is_subtask: true } as never, {
      supabase: supabaseWithRunLog() as never,
      userId: 'user_1',
      orgId: null,
      spaceId: 'space_1',
      itemId: 'item_2',
      depth: 0,
    })
    expect(automationCommentCount(repo)).toBe(0)
  })

  it('matches "subtasks" scope only when event is a subtask', async () => {
    const repo = buildRepo({ triggerScope: 'subtasks' })
    const service = new SpaceAutomationService(
      repo as never,
      automationsRepoFromRepo(repo) as never,
      {} as never,
      {} as never,
    )

    await service.evaluate({ type: 'task_created', is_subtask: false } as never, {
      supabase: supabaseWithRunLog() as never,
      userId: 'user_1',
      orgId: null,
      spaceId: 'space_1',
      itemId: 'item_1',
      depth: 0,
    })
    expect(automationCommentCount(repo)).toBe(0)

    await service.evaluate({ type: 'task_created', is_subtask: true } as never, {
      supabase: supabaseWithRunLog() as never,
      userId: 'user_1',
      orgId: null,
      spaceId: 'space_1',
      itemId: 'item_2',
      depth: 0,
    })
    expect(automationCommentCount(repo)).toBe(1)
  })

  it('matches both when scope is unset (backward compatible)', async () => {
    const repo = buildRepo({})
    const service = new SpaceAutomationService(
      repo as never,
      automationsRepoFromRepo(repo) as never,
      {} as never,
      {} as never,
    )

    await service.evaluate({ type: 'task_created', is_subtask: false } as never, {
      supabase: supabaseWithRunLog() as never,
      userId: 'user_1',
      orgId: null,
      spaceId: 'space_1',
      itemId: 'item_1',
      depth: 0,
    })
    await service.evaluate({ type: 'task_created', is_subtask: true } as never, {
      supabase: supabaseWithRunLog() as never,
      userId: 'user_1',
      orgId: null,
      spaceId: 'space_1',
      itemId: 'item_2',
      depth: 0,
    })
    expect(automationCommentCount(repo)).toBe(2)
  })
})
