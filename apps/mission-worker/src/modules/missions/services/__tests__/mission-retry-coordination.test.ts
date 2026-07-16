import { describe, expect, it } from 'vitest'
import { resolveDirectiveRetryAction } from '../phases/mission-comment-directive.service'
import { shouldSweepReadySubtasksAfterTriage } from '../phases/mission-subtask-triage.service'

describe('mission retry coordination', () => {
  it('does not abort a retry that another recovery path already started', () => {
    expect(resolveDirectiveRetryAction('blocked', 'in_progress')).toBe('already_retried')
    expect(resolveDirectiveRetryAction('blocked', 'pending')).toBe('already_retried')
  })

  it('still aborts and restarts intentional mid-run steering', () => {
    expect(resolveDirectiveRetryAction('in_progress', 'in_progress')).toBe('abort_and_retry')
  })

  it('retries when the blocked snapshot is still current', () => {
    expect(resolveDirectiveRetryAction('blocked', 'blocked')).toBe('retry')
  })

  it('does not create a second execute event after manager retry already enqueued one', () => {
    expect(shouldSweepReadySubtasksAfterTriage('retry')).toBe(false)
    expect(shouldSweepReadySubtasksAfterTriage('reassign')).toBe(false)
    expect(shouldSweepReadySubtasksAfterTriage('cancel')).toBe(true)
    expect(shouldSweepReadySubtasksAfterTriage('replace')).toBe(true)
  })
})
