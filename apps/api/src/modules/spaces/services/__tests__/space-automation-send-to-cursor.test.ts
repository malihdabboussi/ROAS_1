import { describe, expect, it, vi } from 'vitest'
import { SpaceAutomationService } from '../space-automation.service'
import { automationsRepoFromRepo } from './space-automation-test-utils'

function supabaseWithPauseAndRunLog() {
  const runStateInsert = vi.fn().mockResolvedValue({})
  const runsInsert = vi.fn().mockResolvedValue({})
  const spaceItemsUpdate = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnThis(),
  })

  return {
    from: vi.fn((table: string) => {
      if (table === 'space_automation_run_state') {
        return { insert: runStateInsert }
      }
      if (table === 'space_automation_runs') {
        return { insert: runsInsert }
      }
      if (table === 'space_items') {
        return { update: spaceItemsUpdate }
      }
      return {}
    }),
    runStateInsert,
    spaceItemsUpdate,
  }
}

describe('SpaceAutomationService send_to_cursor', () => {
  const cursorApi = {
    getActiveConnection: vi.fn().mockResolvedValue({
      integrationRowId: 'conn-1',
      apiKey: 'cursor-key',
      metadata: {},
    }),
    launchAgent: vi.fn().mockResolvedValue({
      agent: { id: 'agent-1', url: 'https://cursor.com/agents?id=1' },
      run: { id: 'run-1' },
    }),
  }

  const creditsService = {
    assertHasAvailableCredits: vi.fn().mockResolvedValue({ totalAvailable: 100 }),
  }

  function buildService(repo: Record<string, unknown>, withCursor = true) {
    return new SpaceAutomationService(
      repo as never,
      automationsRepoFromRepo(repo) as never,
      { get: vi.fn() } as never,
      {} as never,
      undefined,
      undefined,
      creditsService as never,
      undefined,
      undefined,
      undefined,
      withCursor ? (cursorApi as never) : undefined,
    )
  }

  it('launches Cursor agent and pauses when completed_status is set', async () => {
    vi.clearAllMocks()
    const item = {
      id: 'item-1',
      title: 'Fix login bug',
      status: 'ready_for_dev',
      custom_data: {},
    }
    const repo = {
      findSpaceById: vi.fn().mockResolvedValue({
        id: 'space-1',
        title: 'Dev',
        schema: {
          automations: [
            {
              id: 'automation-1',
              name: 'Bug to PR',
              enabled: true,
              trigger: { type: 'status_change', to: 'ready_for_dev' },
              actions: [
                {
                  type: 'send_to_cursor',
                  repo_url: 'https://github.com/org/repo',
                  base_branch: 'main',
                  prompt_template: '{{item.title}}',
                  completed_status: 'in_review',
                },
              ],
            },
          ],
        },
      }),
      findItemById: vi.fn().mockResolvedValue(item),
      findSubtasksByParentId: vi.fn().mockResolvedValue([]),
      findActivityByItemId: vi.fn().mockResolvedValue([]),
    }
    const supabase = supabaseWithPauseAndRunLog()
    const service = buildService(repo)

    await service.evaluate({ type: 'status_change', from: 'todo', to: 'ready_for_dev' } as never, {
      supabase: supabase as never,
      userId: 'user-1',
      orgId: null,
      spaceId: 'space-1',
      itemId: 'item-1',
      depth: 0,
    })

    expect(cursorApi.getActiveConnection).toHaveBeenCalled()
    expect(cursorApi.launchAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        repoUrl: 'https://github.com/org/repo',
        startingRef: 'main',
        autoCreatePR: true,
      }),
    )
    expect(supabase.runStateInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'paused',
        item_id: 'item-1',
        automation_id: 'automation-1',
        next_action_index: 1,
      }),
    )
    expect(supabase.spaceItemsUpdate).toHaveBeenCalled()
  })

  it('records error when CursorApiService is not configured', async () => {
    vi.clearAllMocks()
    const item = { id: 'item-1', title: 'Task', status: 'ready_for_dev', custom_data: {} }
    const repo = {
      findSpaceById: vi.fn().mockResolvedValue({
        schema: {
          automations: [
            {
              id: 'automation-1',
              name: 'Bug to PR',
              enabled: true,
              trigger: { type: 'status_change', to: 'ready_for_dev' },
              actions: [
                {
                  type: 'send_to_cursor',
                  repo_url: 'https://github.com/org/repo',
                  base_branch: 'main',
                  prompt_template: 'Fix it',
                },
              ],
            },
          ],
        },
      }),
      findItemById: vi.fn().mockResolvedValue(item),
      findSubtasksByParentId: vi.fn().mockResolvedValue([]),
      findActivityByItemId: vi.fn().mockResolvedValue([]),
      createActivity: vi.fn().mockResolvedValue({}),
    }
    const runsInsert = vi.fn().mockResolvedValue({})
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'space_automation_runs') return { insert: runsInsert }
        return {}
      }),
    }
    const service = buildService(repo, false)

    await service.evaluate({ type: 'status_change', from: 'todo', to: 'ready_for_dev' } as never, {
      supabase: supabase as never,
      userId: 'user-1',
      orgId: null,
      spaceId: 'space-1',
      itemId: 'item-1',
      depth: 0,
    })

    const payload = runsInsert.mock.calls[0]?.[0]
    expect(JSON.stringify(payload?.actions_executed)).toContain('CursorApiService not configured')
  })
})
