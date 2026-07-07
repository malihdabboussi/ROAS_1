import { describe, expect, it } from 'vitest'
import { missionCanRetry } from './use-mission-menu-actions'

describe('missionCanRetry', () => {
  it('allows retry for failed or recoverable mission statuses only', () => {
    expect(missionCanRetry('blocked')).toBe(true)
    expect(missionCanRetry('archived')).toBe(true)
    expect(missionCanRetry('inbox')).toBe(true)
    expect(missionCanRetry('error')).toBe(true)
    expect(missionCanRetry('failed')).toBe(true)
    expect(missionCanRetry('dead_letter')).toBe(true)

    expect(missionCanRetry('backlog')).toBe(false)
    expect(missionCanRetry('planning')).toBe(false)
    expect(missionCanRetry('todo')).toBe(false)
    expect(missionCanRetry('in_progress')).toBe(false)
    expect(missionCanRetry('review')).toBe(false)
    expect(missionCanRetry('done')).toBe(false)
  })
})
