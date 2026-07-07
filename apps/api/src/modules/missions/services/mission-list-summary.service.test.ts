import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { MissionListSummaryService } from './mission-list-summary.service'

function createSupabase(rows: unknown[] | null, error: unknown = null) {
  const terminal = {
    in: vi.fn().mockResolvedValue({ data: rows, error }),
  }
  const query = {
    select: vi.fn(() => terminal),
  }
  const supabase = {
    from: vi.fn(() => query),
  }

  return { supabase: supabase as unknown as SupabaseClient, query, terminal }
}

describe('MissionListSummaryService', () => {
  it('adds subtask counts and merged assigned agent keys to missions', async () => {
    const { supabase, query, terminal } = createSupabase([
      { mission_id: 'mission-1', status: 'done', assigned_agent_key: 'agent-a' },
      { mission_id: 'mission-1', status: 'pending', assigned_agent_key: 'agent-b' },
      { mission_id: 'mission-2', status: 'done', assigned_agent_key: null },
    ])
    const service = new MissionListSummaryService()

    await expect(
      service.appendSubtaskSummaries(supabase, [
        { id: 'mission-1', assigned_agent_key: 'agent-a' },
        { id: 'mission-2', assigned_agent_key: 'agent-c' },
      ]),
    ).resolves.toEqual([
      {
        id: 'mission-1',
        assigned_agent_key: 'agent-a',
        subtask_total: 2,
        subtask_done: 1,
        subtask_agent_keys: ['agent-a', 'agent-b'],
      },
      {
        id: 'mission-2',
        assigned_agent_key: 'agent-c',
        subtask_total: 1,
        subtask_done: 1,
        subtask_agent_keys: ['agent-c'],
      },
    ])

    expect((supabase as any).from).toHaveBeenCalledWith('mission_subtasks')
    expect(query.select).toHaveBeenCalledWith('mission_id, status, assigned_agent_key')
    expect(terminal.in).toHaveBeenCalledWith('mission_id', ['mission-1', 'mission-2'])
  })

  it('keeps current zero-summary behavior when the subtask query returns no data', async () => {
    const { supabase } = createSupabase(null, { message: 'database unavailable' })
    const service = new MissionListSummaryService()

    await expect(
      service.appendSubtaskSummaries(supabase, [{ id: 'mission-1', assigned_agent_key: null }]),
    ).resolves.toEqual([
      {
        id: 'mission-1',
        assigned_agent_key: null,
        subtask_total: 0,
        subtask_done: 0,
        subtask_agent_keys: [],
      },
    ])
  })
})
