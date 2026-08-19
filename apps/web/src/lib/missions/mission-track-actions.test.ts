import { describe, expect, it } from 'vitest'
import {
  canRerunSubtask,
  listMissionTrackActions,
  POST_CALL_STRATEGY_ACTION,
} from './mission-track-actions'

describe('mission-track-actions', () => {
  it('lists post-call only for Client Strategy tracks that have not already extended', () => {
    expect(
      listMissionTrackActions({ input: { playbook_id: 'client-strategy' }, title: 'CS' }, [
        { title: 'Task 2 — Pre-call strategy map' },
      ]).map((action) => action.id),
    ).toEqual([POST_CALL_STRATEGY_ACTION])

    expect(
      listMissionTrackActions({ input: { playbook_id: 'webinar-fulfillment' } }, [
        { title: 'Task 2 — Pre-call strategy map' },
      ]),
    ).toEqual([])

    expect(
      listMissionTrackActions({ title: 'Claude Club Pre-Call Strategy Map', input: {} }, [
        { title: 'Task 4 — Post-call strategy map' },
      ]),
    ).toEqual([])
  })

  it('allows rerun on finished or stuck steps only', () => {
    expect(canRerunSubtask('done')).toBe(true)
    expect(canRerunSubtask('blocked')).toBe(true)
    expect(canRerunSubtask('revision')).toBe(true)
    expect(canRerunSubtask('in_progress')).toBe(false)
    expect(canRerunSubtask('awaiting_human')).toBe(false)
  })
})
