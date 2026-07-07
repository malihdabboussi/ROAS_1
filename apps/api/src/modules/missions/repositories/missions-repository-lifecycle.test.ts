import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { MissionsRepository } from './missions.repository'

type QueryResult = {
  data?: unknown
  error?: { message: string } | null
}

function createQuery(result: QueryResult = { data: null, error: null }) {
  const resolved = Promise.resolve(result)
  const query: Record<string, any> = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    like: vi.fn(() => query),
    update: vi.fn(() => query),
    maybeSingle: vi.fn().mockResolvedValue(result),
  }
  query.then = resolved.then.bind(resolved)
  return query
}

function createSupabase(tableResults: Record<string, QueryResult> = {}) {
  const queries: Record<string, Record<string, any>> = {}
  const supabase = {
    from: vi.fn((table: string) => {
      const query = createQuery(tableResults[table] ?? { data: null, error: null })
      queries[table] = query
      return query
    }),
  } as unknown as SupabaseClient
  return { supabase, queries }
}

describe('MissionsRepository lifecycle helpers', () => {
  it('loads create-time space and campaign ownership rows', async () => {
    const repository = new MissionsRepository()
    const { supabase, queries } = createSupabase({
      spaces: { data: { id: 'space-1', campaign_id: 'campaign-1' }, error: null },
      campaigns: { data: { user_id: 'owner-1' }, error: null },
    })

    await expect(repository.findMissionSpaceForCreate(supabase, 'space-1')).resolves.toEqual({
      id: 'space-1',
      campaign_id: 'campaign-1',
    })
    await expect(repository.findCampaignOwnerForCreate(supabase, 'campaign-1')).resolves.toEqual({
      user_id: 'owner-1',
    })

    expect(queries.spaces.select).toHaveBeenCalledWith('id, campaign_id')
    expect(queries.spaces.eq).toHaveBeenCalledWith('id', 'space-1')
    expect(queries.campaigns.select).toHaveBeenCalledWith('user_id')
    expect(queries.campaigns.eq).toHaveBeenCalledWith('id', 'campaign-1')
  })

  it('touches profile interaction without requiring update results', async () => {
    const repository = new MissionsRepository()
    const { supabase, queries } = createSupabase({
      profiles: { data: null, error: null },
    })

    await repository.touchProfileLastInteraction(
      supabase,
      'user-1',
      '2026-06-17T08:00:00.000Z',
    )

    expect(queries.profiles.update).toHaveBeenCalledWith({
      last_interaction_at: '2026-06-17T08:00:00.000Z',
    })
    expect(queries.profiles.eq).toHaveBeenCalledWith('id', 'user-1')
  })

  it('reschedules only the pending execution outbox row for the subtask', async () => {
    const repository = new MissionsRepository()
    const { supabase, queries } = createSupabase({
      mission_outbox: { data: null, error: null },
    })

    await repository.reschedulePendingSubtaskExecutionOutbox(
      supabase,
      'mission-1',
      'subtask-1',
      '2026-06-17T08:00:00.000Z',
    )

    expect(queries.mission_outbox.update).toHaveBeenCalledWith({
      next_attempt_at: '2026-06-17T08:00:00.000Z',
    })
    expect(queries.mission_outbox.eq).toHaveBeenCalledWith('mission_id', 'mission-1')
    expect(queries.mission_outbox.eq).toHaveBeenCalledWith(
      'event_type',
      'mission.subtask.execute.requested',
    )
    expect(queries.mission_outbox.eq).toHaveBeenCalledWith('status', 'pending')
    expect(queries.mission_outbox.like).toHaveBeenCalledWith(
      'dedupe_key',
      '%:subtask:subtask-1:%',
    )
  })
})
