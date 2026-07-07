import { describe, expect, it, vi } from 'vitest'
import { SpaceAutomationTemplatesRepository } from '../space-automation-templates.repository'

function readChain(result: unknown) {
  const resolved = Promise.resolve(result)
  const api: Record<string, unknown> = {
    select: vi.fn(() => api),
    eq: vi.fn(() => api),
    order: vi.fn(() => api),
    maybeSingle: vi.fn(async () => result),
    update: vi.fn(() => api),
    then: resolved.then.bind(resolved),
  }
  return api
}

describe('SpaceAutomationTemplatesRepository', () => {
  it('lists active templates ordered by sort_order and title', async () => {
    const rows = [{ template_key: 'a', title: 'A' }]
    const chain = readChain({ data: rows, error: null })
    const supabase = { from: vi.fn(() => chain) }
    const repo = new SpaceAutomationTemplatesRepository()

    const result = await repo.listActive(supabase as never)

    expect(result).toEqual(rows)
    expect(supabase.from).toHaveBeenCalledWith('space_automation_templates')
    expect(chain.eq).toHaveBeenCalledWith('is_active', true)
  })

  it('finds an active template by key including body', async () => {
    const row = { template_key: 'weekly-digest', body: { name: 'Weekly' } }
    const chain = readChain({ data: row, error: null })
    const supabase = { from: vi.fn(() => chain) }
    const repo = new SpaceAutomationTemplatesRepository()

    const result = await repo.findActiveByKey(supabase as never, 'weekly-digest')

    expect(result).toEqual(row)
    expect(chain.eq).toHaveBeenCalledWith('template_key', 'weekly-digest')
    expect(chain.eq).toHaveBeenCalledWith('is_active', true)
  })

  it('increments install_count for a template key', async () => {
    const readChainApi = readChain({ data: { install_count: 2 }, error: null })
    const writeChainApi = readChain({ data: null, error: null })
    const supabase = {
      from: vi.fn((table: string) => {
        if (table !== 'space_automation_templates') return readChainApi
        return readChainApi
      }),
    }
    let call = 0
    supabase.from = vi.fn(() => {
      call += 1
      return call === 1 ? readChainApi : writeChainApi
    })
    const repo = new SpaceAutomationTemplatesRepository()

    await repo.incrementInstallCount(supabase as never, 'weekly-digest')

    expect(writeChainApi.update).toHaveBeenCalledWith({ install_count: 3 })
  })
})
