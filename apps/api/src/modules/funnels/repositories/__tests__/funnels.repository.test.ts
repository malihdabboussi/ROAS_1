import { describe, expect, it, vi } from 'vitest'
import { FunnelsRepository } from '../funnels.repository'

describe('FunnelsRepository.findByCampaignId', () => {
  it('omits path/source_mode from page summary select (older DBs lack those cols)', async () => {
    const select = vi.fn().mockReturnThis()
    const eq = vi.fn().mockReturnThis()
    const neq = vi.fn().mockReturnThis()
    const is = vi.fn().mockReturnThis()
    const order = vi.fn().mockResolvedValue({ data: [], error: null })
    const supabase = {
      from: vi.fn().mockReturnValue({ select, eq, neq, is, order }),
    }

    const repo = new FunnelsRepository()
    await repo.findByCampaignId(supabase as never, 'campaign-1', null, undefined, {
      summary: true,
    })

    const selectArg = String(select.mock.calls[0]?.[0] ?? '')
    expect(selectArg).toContain('pages:funnel_pages!funnel_id(')
    expect(selectArg).not.toContain('source_mode')
    expect(selectArg).not.toMatch(/page_type,\s*path,/)
    expect(selectArg).not.toContain('generated_html')
  })
})
