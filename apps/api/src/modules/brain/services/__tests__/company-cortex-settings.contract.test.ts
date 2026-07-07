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
      insert(value: Record<string, unknown>) {
        payload = value
        calls.push({ table, action: 'insert', payload })
        return chain
      },
      update(value: Record<string, unknown>) {
        payload = value
        calls.push({ table, action: 'update', payload, filters: [...filters] })
        return chain
      },
      upsert(value: Record<string, unknown>) {
        payload = value
        calls.push({ table, action: 'upsert', payload, filters: [...filters] })
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
        return { data: null, error: null }
      },
      async single() {
        calls.push({ table, action: 'single', payload, filters: [...filters] })
        if (table === 'company_cortex_settings') {
          return {
            data: {
              org_id: 'org-1',
              brain_id: 'company-brain-1',
              enabled: payload?.enabled ?? false,
              schedule: payload?.schedule ?? 'manual_only',
              local_time: payload?.local_time ?? '02:00',
              timezone: payload?.timezone ?? 'UTC',
              lookback_hours: payload?.lookback_hours ?? 24,
              include_sources: payload?.include_sources ?? [],
              min_activity_threshold: payload?.min_activity_threshold ?? 1,
              last_successful_dream_at: null,
            },
            error: null,
          }
        }
        return { data: { id: 'company-brain-1' }, error: null }
      },
    }
    return chain
  }
  return { from: (table: string) => makeChain(table) }
}

async function loadCompanyCortexService() {
  const mod = await import('../company-cortex.service')
  return mod.CompanyCortexService as new (repository: CompanyCortexRepository) => {
    getOrCreateCompanyCortexSettings(input: {
      ownerId: string
      orgId: string | null
    }): Promise<Record<string, unknown>>
    updateCompanyCortexSettings(input: {
      ownerId: string
      orgId: string | null
      enabled?: boolean
      schedule?: string
      localTime?: string
      timezone?: string
      lookbackHours?: number
      minActivityThreshold?: number
    }): Promise<Record<string, unknown>>
  }
}

describe('Company Cortex settings contract', () => {
  it('creates default manual-only settings for the org Company Cortex', async () => {
    const calls: Call[] = []
    const CompanyCortexService = await loadCompanyCortexService()
    const service = new CompanyCortexService(
      new CompanyCortexRepository({ client: makeClient(calls) } as any),
    )

    const settings = await service.getOrCreateCompanyCortexSettings({
      ownerId: 'owner-1',
      orgId: 'org-1',
    })

    expect(settings).toMatchObject({
      org_id: 'org-1',
      brain_id: 'company-brain-1',
      enabled: false,
      schedule: 'manual_only',
      timezone: 'UTC',
      lookback_hours: 24,
    })
    expect(calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'company_cortex_settings',
          action: 'insert',
          payload: expect.objectContaining({
            org_id: 'org-1',
            brain_id: 'company-brain-1',
            enabled: false,
            schedule: 'manual_only',
          }),
        }),
        expect.objectContaining({
          table: 'dream_ops_settings',
          action: 'upsert',
          payload: expect.objectContaining({
            operation_type: 'company_daily_dream',
            subject_kind: 'company_brain',
            subject_key: 'company-brain-1',
            enabled: false,
          }),
        }),
      ]),
    )
  })

  it('updates enabled schedule controls with bounded lookback', async () => {
    const calls: Call[] = []
    const CompanyCortexService = await loadCompanyCortexService()
    const service = new CompanyCortexService(
      new CompanyCortexRepository({ client: makeClient(calls) } as any),
    )

    await service.updateCompanyCortexSettings({
      ownerId: 'owner-1',
      orgId: 'org-1',
      enabled: true,
      schedule: 'daily',
      timezone: 'Asia/Jerusalem',
      lookbackHours: 48,
      minActivityThreshold: 2,
    })

    expect(calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'company_cortex_settings',
          action: 'single',
          payload: expect.objectContaining({
            enabled: true,
            schedule: 'daily',
            timezone: 'Asia/Jerusalem',
            lookback_hours: 48,
            min_activity_threshold: 2,
          }),
          filters: [{ column: 'org_id', value: 'org-1' }],
        }),
        expect.objectContaining({
          table: 'dream_ops_settings',
          action: 'upsert',
          payload: expect.objectContaining({
            operation_type: 'company_daily_dream',
            enabled: true,
            schedule: 'daily',
            timezone: 'Asia/Jerusalem',
          }),
        }),
      ]),
    )
  })

  it('rejects personal-only settings and invalid schedules', async () => {
    const CompanyCortexService = await loadCompanyCortexService()
    const service = new CompanyCortexService(
      new CompanyCortexRepository({ client: makeClient([]) } as any),
    )

    await expect(
      service.getOrCreateCompanyCortexSettings({ ownerId: 'owner-1', orgId: null }),
    ).rejects.toThrow(/org/i)

    await expect(
      service.updateCompanyCortexSettings({
        ownerId: 'owner-1',
        orgId: 'org-1',
        schedule: 'hourly',
      }),
    ).rejects.toThrow(/schedule/i)
  })

  it('normalizes postgres time values with seconds to HH:mm', async () => {
    const calls: Call[] = []
    const CompanyCortexService = await loadCompanyCortexService()
    const service = new CompanyCortexService(
      new CompanyCortexRepository({ client: makeClient(calls) } as any),
    )

    await service.updateCompanyCortexSettings({
      ownerId: 'owner-1',
      orgId: 'org-1',
      localTime: '02:00:00',
    })

    expect(calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'company_cortex_settings',
          action: 'single',
          payload: expect.objectContaining({
            local_time: '02:00',
          }),
        }),
      ]),
    )
  })
})
