import { describe, expect, it, vi } from 'vitest'
import { CampaignArtifactPresentationsRepository } from '../campaign-artifact-presentations.repository'

describe('CampaignArtifactPresentationsRepository.listPresentations', () => {
  it('uses a light column select for summary lists (no generated_html/slides)', async () => {
    const select = vi.fn().mockReturnThis()
    const eq = vi.fn().mockReturnThis()
    const order = vi.fn().mockResolvedValue({
      data: [{ id: 'p1', name: 'Deck', slides: undefined }],
      error: null,
    })
    const supabase = {
      from: vi.fn().mockReturnValue({ select, eq, order }),
    }

    const repo = new CampaignArtifactPresentationsRepository()
    await repo.listPresentations(supabase as never, 'campaign-1', undefined, { summary: true })

    expect(select).toHaveBeenCalledWith(expect.stringContaining('id, user_id, campaign_id'))
    expect(select.mock.calls[0]?.[0]).not.toContain('generated_html')
    expect(select.mock.calls[0]?.[0]).not.toMatch(/(^|,)\s*slides(\s|,|$)/)
  })

  it('selects * for full list responses', async () => {
    const select = vi.fn().mockReturnThis()
    const eq = vi.fn().mockReturnThis()
    const order = vi.fn().mockResolvedValue({ data: [], error: null })
    const supabase = {
      from: vi.fn().mockReturnValue({ select, eq, order }),
    }

    const repo = new CampaignArtifactPresentationsRepository()
    await repo.listPresentations(supabase as never, 'campaign-1')

    expect(select).toHaveBeenCalledWith('*')
  })
})
