import { describe, expect, it, vi } from 'vitest'
import type { ErrorReporter } from '../services/error-reporter.service'
import { markAppErrorReported, reportAppError } from './report-app-error'

describe('reportAppError', () => {
  it('calls errorReporter.report and marks error as reported', () => {
    const report = vi.fn()
    const errorReporter = { report } as unknown as ErrorReporter
    const err = new Error('upstream failed')

    reportAppError(
      errorReporter,
      {
        app: 'api',
        category: 'integration',
        feature: 'integrations/scrapecreators',
        error_code: 'network_failed',
        message: 'upstream failed',
      },
      err,
    )

    expect(report).toHaveBeenCalledOnce()
    expect((err as { __appErrorReported?: boolean }).__appErrorReported).toBe(true)
  })

  it('reports without marking when error is omitted', () => {
    const report = vi.fn()
    const errorReporter = { report } as unknown as ErrorReporter

    reportAppError(errorReporter, {
      app: 'api',
      feature: 'brain/import_jobs',
      error_code: 'cycle_failed',
      message: 'cycle failed',
    })

    expect(report).toHaveBeenCalledOnce()
  })
})

describe('markAppErrorReported', () => {
  it('sets __appErrorReported on Error instances only', () => {
    const err = new Error('x')
    markAppErrorReported(err)
    expect((err as { __appErrorReported?: boolean }).__appErrorReported).toBe(true)
    markAppErrorReported('not an error')
  })
})
