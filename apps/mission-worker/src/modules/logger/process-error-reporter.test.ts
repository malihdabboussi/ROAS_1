import { describe, expect, it } from 'vitest'
import { buildMissionWorkerProcessErrorReport } from './process-error-reporter'

describe('buildMissionWorkerProcessErrorReport', () => {
  it('formats fatal process errors for app_errors', () => {
    const error = new Error('mission boom')
    const report = buildMissionWorkerProcessErrorReport(
      'MISSION_WORKER_UNHANDLED_REJECTION',
      error,
      { process_event: 'unhandledRejection' },
    )

    expect(report).toEqual(
      expect.objectContaining({
        app: 'mission-worker',
        severity: 'critical',
        feature: 'process',
        error_code: 'MISSION_WORKER_UNHANDLED_REJECTION',
        message: 'mission boom',
        stack: expect.stringContaining('mission boom'),
        category: 'worker_process',
        context: expect.objectContaining({
          process_event: 'unhandledRejection',
          pid: process.pid,
        }),
      }),
    )
  })
})
