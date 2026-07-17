import { describe, expect, it } from 'vitest'
import { MissionStateRepository } from '../persistence/mission-state.repository'

describe('MissionStateRepository mission aggregate', () => {
  const computeAggregate = (rows: Array<{ id: string; status: string; depends_on: string[] }>) =>
    (MissionStateRepository.prototype as any).computeMissionAggregateFromSubtasks.call({}, rows)

  it('prioritizes an active human gate over dependency-blocked pending work', () => {
    expect(
      computeAggregate([
        { id: 'strategy', status: 'done', depends_on: [] },
        { id: 'gate-1', status: 'awaiting_human', depends_on: ['strategy'] },
        { id: 'market-research', status: 'pending', depends_on: ['gate-1'] },
      ]),
    ).toEqual({
      nextStatus: 'awaiting_human',
      enqueueReview: false,
      progressNotes: 'Waiting for your approval — review is required before work continues',
    })
  })

  it('keeps actively executing work above a simultaneous human gate', () => {
    expect(
      computeAggregate([
        { id: 'gate-1', status: 'awaiting_human', depends_on: [] },
        { id: 'research', status: 'in_progress', depends_on: [] },
      ]),
    ).toEqual({ nextStatus: 'in_progress', enqueueReview: false })
  })
})
