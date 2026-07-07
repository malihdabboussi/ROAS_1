import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MachineWakeAttemptsService } from '../machine-wake-attempts.service'

function makeRepository() {
  return {
    createWakeAttempt: vi.fn(),
    updateWakeAttempt: vi.fn(),
  }
}

describe('MachineWakeAttemptsService', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-17T07:00:00.000Z'))
  })

  it('creates a running wake attempt with the initial profile lookup phase', async () => {
    const repository = makeRepository()
    repository.createWakeAttempt.mockResolvedValue({ id: 'wake-1', errorMessage: null })
    const supabase = {}
    const service = new MachineWakeAttemptsService(repository as never)
    const input = {
      userId: 'user-1',
      machineId: 'machine-1',
      flyApp: 'vibey-runtimes',
      requestedBy: 'ensure_running',
      metadata: { source: 'test' },
    }

    await expect(service.start(supabase as never, input)).resolves.toBe('wake-1')

    expect(repository.createWakeAttempt).toHaveBeenCalledWith(supabase, input)
  })

  it('records terminal wake failures with a bounded error message', async () => {
    const repository = makeRepository()
    repository.updateWakeAttempt.mockResolvedValue(null)
    const supabase = {}
    const service = new MachineWakeAttemptsService(repository as never)

    await service.fail(supabase as never, 'wake-1', {
      phase: 'ready_probe',
      status: 'failed_terminal',
      failureCode: 'runtime_incompatible',
      errorMessage: 'x'.repeat(1200),
      metadata: { status: 404 },
    })

    expect(repository.updateWakeAttempt).toHaveBeenCalledWith(supabase, 'wake-1', {
      status: 'failed_terminal',
      phase: 'ready_probe',
      failure_code: 'runtime_incompatible',
      error_message: 'x'.repeat(1000),
      completed_at: '2026-06-17T07:00:00.000Z',
      metadata: { status: 404 },
    })
  })
})
