import { BadRequestException } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorReporter } from '@vibey/api-shared'
import { InternalOpenClawObservabilityController } from './internal-openclaw-observability.controller'

describe('InternalOpenClawObservabilityController', () => {
  const report = vi.fn()

  beforeEach(() => {
    report.mockClear()
  })

  it('persists OpenClaw runtime errors through ErrorReporter', () => {
    const controller = new InternalOpenClawObservabilityController({
      report,
    } as unknown as ErrorReporter)

    controller.reportOpenClawError({
      severity: 'critical',
      feature: 'openclaw_process',
      error_code: 'OPENCLAW_UNCAUGHT_EXCEPTION',
      message: 'boom',
      stack: 'Error: boom\n    at main (apps/openclaw/src/index.ts:10:4)',
      request_id: 'request-1',
      run_id: 'run-1',
      route: '/v1/responses',
      context: { source: 'test' },
    })

    expect(report).toHaveBeenCalledWith(
      expect.objectContaining({
        app: 'openclaw',
        category: 'runtime',
        severity: 'critical',
        feature: 'openclaw_process',
        error_code: 'OPENCLAW_UNCAUGHT_EXCEPTION',
        message: 'boom',
        request_id: 'request-1',
        run_id: 'run-1',
        route: '/v1/responses',
        context: expect.objectContaining({
          source: 'test',
          reporter: 'openclaw_internal_observability',
        }),
      }),
    )
  })

  it('rejects invalid payloads', () => {
    const controller = new InternalOpenClawObservabilityController({
      report,
    } as unknown as ErrorReporter)

    expect(() => controller.reportOpenClawError({ feature: 'openclaw' })).toThrow(
      BadRequestException,
    )
    expect(report).not.toHaveBeenCalled()
  })
})
