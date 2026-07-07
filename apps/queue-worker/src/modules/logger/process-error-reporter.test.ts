import { describe, expect, it } from 'vitest'
import { buildQueueWorkerProcessErrorReport } from './process-error-reporter'

describe('buildQueueWorkerProcessErrorReport', () => {
  it('formats fatal process errors for app_errors', () => {
    const error = new Error('queue boom')
    const report = buildQueueWorkerProcessErrorReport('QUEUE_WORKER_UNCAUGHT_EXCEPTION', error, {
      process_event: 'uncaughtException',
    })

    expect(report).toEqual(
      expect.objectContaining({
        app: 'queue-worker',
        severity: 'critical',
        feature: 'process',
        error_code: 'QUEUE_WORKER_UNCAUGHT_EXCEPTION',
        message: 'queue boom',
        stack: expect.stringContaining('queue boom'),
        category: 'worker_process',
        context: expect.objectContaining({
          process_event: 'uncaughtException',
          pid: process.pid,
        }),
      }),
    )
  })
})
