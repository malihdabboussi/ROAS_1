import { describe, expect, it } from 'vitest'
import { CompanyCortexRepository } from '../../repositories/company-cortex.repository'

type Call = {
  table: string
  action: string
  payload?: Record<string, unknown>
  filters?: Array<{ column: string; value: unknown }>
}

function makeClient(calls: Call[]) {
  const makeChain = (table: string) => {
    const filters: Array<{ column: string; value: unknown }> = []
    let payload: Record<string, unknown> | undefined
    const chain: Record<string, unknown> = {
      select() {
        return chain
      },
      eq(column: string, value: unknown) {
        filters.push({ column, value })
        return chain
      },
      order() {
        return chain
      },
      update(value: Record<string, unknown>) {
        payload = value
        calls.push({ table, action: 'update', payload, filters: [...filters] })
        return chain
      },
      insert(value: Record<string, unknown>) {
        payload = value
        calls.push({ table, action: 'insert', payload, filters: [...filters] })
        return chain
      },
      async maybeSingle() {
        calls.push({ table, action: 'maybeSingle', filters: [...filters] })
        if (table === 'ns_brains') {
          return {
            data: {
              id: 'company-brain-1',
              owner_id: 'owner-1',
              org_id: 'org-1',
              scope: 'company',
              cortex_max: true,
            },
            error: null,
          }
        }
        return {
          data: {
            id: 'signal-1',
            status: payload?.status ?? 'proposed',
            confidence: 0.8,
            confidence_basis: {},
            evidence_refs: [{ type: 'conversation', id: 'conv-1' }],
            source: 'daily_dream',
            created_at: '2026-06-24T00:00:00.000Z',
          },
          error: null,
        }
      },
      then(resolve: (value: { data: unknown[]; error: null }) => unknown) {
        calls.push({ table, action: 'then', filters: [...filters] })
        return Promise.resolve({
          data: [
            {
              id: 'signal-1',
              signal_type: 'standard',
              truth: 'Keep copy subtle.',
              status: 'proposed',
            },
          ],
          error: null,
        }).then(resolve)
      },
    }
    return chain
  }
  return { from: (table: string) => makeChain(table) }
}

async function loadCompanyCortexService() {
  const mod = await import('../company-cortex.service')
  return mod.CompanyCortexService as new (repository: CompanyCortexRepository) => {
    listCompanyCortexSignals(input: {
      ownerId: string
      orgId: string | null
      status?: string
    }): Promise<Array<Record<string, unknown>>>
    updateCompanyCortexSignalStatus(input: {
      ownerId: string
      orgId: string | null
      signalId: string
      status: string
    }): Promise<Record<string, unknown>>
    reviewCompanyCortexSignal(input: {
      ownerId: string
      orgId: string | null
      signalId: string
      decision?: string
      status?: string
      note?: string
    }): Promise<Record<string, unknown>>
  }
}

describe('Company Cortex signals contract', () => {
  it('lists proposed signals for review', async () => {
    const calls: Call[] = []
    const CompanyCortexService = await loadCompanyCortexService()
    const service = new CompanyCortexService(
      new CompanyCortexRepository({ client: makeClient(calls) } as any),
    )

    const signals = await service.listCompanyCortexSignals({
      ownerId: 'owner-1',
      orgId: 'org-1',
      status: 'proposed',
    })

    expect(signals[0]).toMatchObject({ id: 'signal-1', status: 'proposed' })
    expect(calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'company_cortex_signals',
          action: 'then',
          filters: expect.arrayContaining([
            { column: 'brain_id', value: 'company-brain-1' },
            { column: 'status', value: 'proposed' },
          ]),
        }),
      ]),
    )
  })

  it('approves a proposed signal and enqueues formation', async () => {
    const calls: Call[] = []
    const CompanyCortexService = await loadCompanyCortexService()
    const service = new CompanyCortexService(
      new CompanyCortexRepository({ client: makeClient(calls) } as any),
    )

    await service.reviewCompanyCortexSignal({
      ownerId: 'owner-1',
      orgId: 'org-1',
      signalId: 'signal-1',
      decision: 'approve',
      note: 'Looks durable.',
    })

    expect(calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'company_cortex_signals',
          action: 'maybeSingle',
          filters: expect.arrayContaining([
            { column: 'id', value: 'signal-1' },
            { column: 'brain_id', value: 'company-brain-1' },
            { column: 'org_id', value: 'org-1' },
            { column: 'status', value: 'proposed' },
          ]),
        }),
        expect.objectContaining({
          table: 'company_cortex_signals',
          action: 'update',
          payload: expect.objectContaining({
            status: 'active',
            reviewed_by: 'owner-1',
            review_decision: 'human_approved',
            review_note: 'Looks durable.',
          }),
        }),
        expect.objectContaining({
          table: 'brain_ops_outbox',
          action: 'insert',
          payload: expect.objectContaining({
            event_type: 'company_cortex_formation',
            dedupe_key: 'company-cortex-formation-review-company-brain-1-signal-1',
            payload: { source: 'human_review', signal_ids: ['signal-1'] },
          }),
        }),
      ]),
    )
  })

  it('rejects a proposed signal without enqueueing formation', async () => {
    const calls: Call[] = []
    const CompanyCortexService = await loadCompanyCortexService()
    const service = new CompanyCortexService(
      new CompanyCortexRepository({ client: makeClient(calls) } as any),
    )

    await service.reviewCompanyCortexSignal({
      ownerId: 'owner-1',
      orgId: 'org-1',
      signalId: 'signal-1',
      decision: 'reject',
    })

    expect(calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'company_cortex_signals',
          action: 'update',
          payload: expect.objectContaining({
            status: 'rejected',
            review_decision: 'human_rejected',
          }),
        }),
      ]),
    )
    expect(calls.some((call) => call.table === 'brain_ops_outbox')).toBe(false)
  })

  it('maps legacy active status updates to approval review intent', async () => {
    const calls: Call[] = []
    const CompanyCortexService = await loadCompanyCortexService()
    const service = new CompanyCortexService(
      new CompanyCortexRepository({ client: makeClient(calls) } as any),
    )

    await service.updateCompanyCortexSignalStatus({
      ownerId: 'owner-1',
      orgId: 'org-1',
      signalId: 'signal-1',
      status: 'active',
    })

    expect(calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'company_cortex_signals',
          action: 'update',
          payload: expect.objectContaining({
            status: 'active',
            review_decision: 'human_approved',
          }),
        }),
      ]),
    )
  })
})
