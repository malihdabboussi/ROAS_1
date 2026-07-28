import { describe, expect, it, vi } from 'vitest'
import { SpaceAutomationExternalEventsRepository } from './space-automation-external-events.repository'

describe('SpaceAutomationExternalEventsRepository Fathom claims', () => {
  it('reclaims a failed Fathom event for a durable retry', async () => {
    const failed = {
      id: 'event-1',
      composio_event_id: 'fathom:rec-1',
      status: 'failed',
      attempt_count: 1,
    }
    const retried = { ...failed, status: 'processing', attempt_count: 2 }
    let operation: 'insert' | 'select' | 'update' = 'insert'
    const builder: Record<string, any> = {
      insert: vi.fn(() => {
        operation = 'insert'
        return builder
      }),
      update: vi.fn(() => {
        operation = 'update'
        return builder
      }),
      select: vi.fn(() => {
        if (operation !== 'insert' && operation !== 'update') operation = 'select'
        return builder
      }),
      eq: vi.fn(() => builder),
      in: vi.fn(() => builder),
      single: vi.fn(async () => ({
        data: null,
        error: { code: '23505', message: 'duplicate' },
      })),
      maybeSingle: vi.fn(async () => ({
        data: operation === 'update' ? retried : failed,
        error: null,
      })),
    }
    const supabase = { from: vi.fn(() => builder) }
    const repository = new SpaceAutomationExternalEventsRepository()

    const result = await repository.claimFathomExternalEvent(supabase as never, {
      composio_event_id: 'fathom:rec-1',
      provider: 'fathom',
      trigger_slug: 'FATHOM_RECORDING_READY',
      connected_account_id: 'fathom:user-1',
      payload_summary: {},
      user_id: 'user-1',
    })

    expect(result).toEqual({ claimed: true, row: retried })
    expect(builder.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'processing', attempt_count: 2, error: null }),
    )
  })

  it('does not reclaim a processed Fathom event', async () => {
    const processed = {
      id: 'event-1',
      composio_event_id: 'fathom:rec-1',
      status: 'processed',
      attempt_count: 1,
    }
    let operation: 'insert' | 'select' = 'insert'
    const builder: Record<string, any> = {
      insert: vi.fn(() => {
        operation = 'insert'
        return builder
      }),
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      single: vi.fn(async () => ({
        data: null,
        error: { code: '23505', message: 'duplicate' },
      })),
      maybeSingle: vi.fn(async () => ({ data: processed, error: null })),
    }
    const supabase = { from: vi.fn(() => builder) }
    const repository = new SpaceAutomationExternalEventsRepository()

    const result = await repository.claimFathomExternalEvent(supabase as never, {
      composio_event_id: 'fathom:rec-1',
      provider: 'fathom',
      trigger_slug: 'FATHOM_RECORDING_READY',
      connected_account_id: 'fathom:user-1',
      payload_summary: {},
      user_id: 'user-1',
    })

    expect(operation).toBe('insert')
    expect(result).toEqual({ claimed: false, row: processed })
  })
})
