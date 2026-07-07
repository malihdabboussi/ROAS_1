import { describe, expect, it } from 'vitest'
import { CompanyCortexRepository } from '../../repositories/company-cortex.repository'

type Call = {
  table: string
  action: string
  filters?: Array<{ column: string; value: unknown }>
}

function makeClient(calls: Call[]) {
  const makeChain = (table: string) => {
    const filters: Array<{ column: string; value: unknown }> = []
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
      maybeSingle: async () => {
        calls.push({ table, action: 'maybeSingle', filters: [...filters] })
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
      },
      then(resolve: (value: { data: unknown[]; error: null }) => unknown) {
        calls.push({ table, action: 'then', filters: [...filters] })
        return Promise.resolve({
          data: [
            {
              id: 'object-1',
              object_type: 'standard',
              title: 'Subtle positioning',
              truth: 'Keep customer-facing copy subtle.',
              status: 'active',
              confidence: 0.8,
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
    listCompanyCortexObjects(input: {
      ownerId: string
      orgId: string | null
      brainId?: string | null
    }): Promise<Array<Record<string, unknown>>>
  }
}

describe('Company Cortex objects contract', () => {
  it('lists active objects for the org Company Cortex brain', async () => {
    const calls: Call[] = []
    const CompanyCortexService = await loadCompanyCortexService()
    const service = new CompanyCortexService(
      new CompanyCortexRepository({ client: makeClient(calls) } as any),
    )

    const objects = await service.listCompanyCortexObjects({
      ownerId: 'owner-1',
      orgId: 'org-1',
      brainId: 'company-brain-1',
    })

    expect(objects[0]).toMatchObject({
      id: 'object-1',
      object_type: 'standard',
      title: 'Subtle positioning',
    })
    expect(calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'company_cortex_objects',
          action: 'then',
          filters: expect.arrayContaining([
            { column: 'brain_id', value: 'company-brain-1' },
            { column: 'org_id', value: 'org-1' },
          ]),
        }),
      ]),
    )
  })
})
