import { Test } from '@nestjs/testing'
import { ThrottlerGuard } from '@nestjs/throttler'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorReporter, SupabaseJwtVerifierService } from '@vibey/api-shared'
import { ClientErrorsController } from './controllers/client-errors.controller'

describe('ClientErrorsController', () => {
  const report = vi.fn()
  const verify = vi.fn().mockResolvedValue({ sub: 'user-abc', email: '', payload: {} })

  beforeEach(() => {
    report.mockClear()
    verify.mockClear()
  })

  it('persists client error via ErrorReporter when JWT verifies', async () => {
    const mod = await Test.createTestingModule({
      controllers: [ClientErrorsController],
      providers: [
        { provide: ErrorReporter, useValue: { report } },
        { provide: SupabaseJwtVerifierService, useValue: { verify } },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile()

    const controller = mod.get(ClientErrorsController)
    await controller.reportClientError(
      {
        feature: 'ui/drive',
        message: 'load failed',
        severity: 'error',
        trace_id: '11111111-1111-4111-8111-111111111111',
        message_id: '22222222-2222-4222-8222-222222222222',
        request_id: 'request-1',
        run_id: 'run-1',
        conversation_id: '33333333-3333-4333-8333-333333333333',
        context: { hint: 'folder' },
      },
      'Bearer valid-token',
    )

    expect(report).toHaveBeenCalledWith(
      expect.objectContaining({
        app: 'web',
        category: 'ui',
        feature: 'ui/drive',
        message: 'load failed',
        user_id: 'user-abc',
        trace_id: '11111111-1111-4111-8111-111111111111',
        message_id: '22222222-2222-4222-8222-222222222222',
        request_id: 'request-1',
        run_id: 'run-1',
        conversation_id: '33333333-3333-4333-8333-333333333333',
      }),
    )
  })

  it('reports without user_id when JWT invalid', async () => {
    verify.mockRejectedValueOnce(new Error('invalid'))
    const mod = await Test.createTestingModule({
      controllers: [ClientErrorsController],
      providers: [
        { provide: ErrorReporter, useValue: { report } },
        { provide: SupabaseJwtVerifierService, useValue: { verify } },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile()

    const controller = mod.get(ClientErrorsController)
    await controller.reportClientError(
      { feature: 'ui/shared', message: 'render failed' },
      'Bearer bad',
    )

    expect(report).toHaveBeenCalledWith(
      expect.objectContaining({
        app: 'web',
        feature: 'ui/shared',
        user_id: undefined,
      }),
    )
  })

  it('defaults app to web and accepts funnels app errors', async () => {
    const mod = await Test.createTestingModule({
      controllers: [ClientErrorsController],
      providers: [
        { provide: ErrorReporter, useValue: { report } },
        { provide: SupabaseJwtVerifierService, useValue: { verify } },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile()

    const controller = mod.get(ClientErrorsController)

    await controller.reportClientError(
      { feature: 'ui/shared', message: 'render failed' },
      undefined,
    )
    await controller.reportClientError(
      {
        app: 'funnels',
        feature: 'funnels_browser_runtime',
        message: 'lead failed',
        stack: 'Error: lead failed\n    at submit (apps/funnels/src/components/Funnel.tsx:12:8)',
        source_context: {
          source_file: 'apps/funnels/src/components/Funnel.tsx',
          source_line: 12,
        },
      },
      undefined,
    )

    expect(report).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        app: 'web',
        feature: 'ui/shared',
      }),
    )
    expect(report).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        app: 'funnels',
        feature: 'funnels_browser_runtime',
        stack: expect.stringContaining('apps/funnels/src/components/Funnel.tsx'),
        source_context: {
          source_file: 'apps/funnels/src/components/Funnel.tsx',
          source_line: 12,
        },
      }),
    )
  })
})
