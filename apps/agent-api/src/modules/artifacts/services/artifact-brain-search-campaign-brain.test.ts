import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ArtifactBrainSearchActionsService } from './artifact-brain-search-actions.service'

describe('ArtifactBrainSearchActionsService.searchCampaignBrain', () => {
  const service = new ArtifactBrainSearchActionsService()

  let brainRetrievalSearch: ReturnType<typeof vi.fn>
  let nsBrainsMaybeSingle: ReturnType<typeof vi.fn>
  let campaignsMaybeSingle: ReturnType<typeof vi.fn>
  let target: Record<string, any>

  beforeEach(() => {
    brainRetrievalSearch = vi.fn(async () => ({
      success: true,
      count: 1,
      results: [{ content: 'Impact offer is $997 coaching', scores: { final: 0.9 } }],
      context_sufficient: true,
      missing: [],
      suggested_next_queries: [],
    }))
    nsBrainsMaybeSingle = vi.fn()
    campaignsMaybeSingle = vi.fn(async () => ({ data: { id: 'campaign-1' }, error: null }))

    const from = vi.fn((table: string) => {
      if (table === 'ns_brains') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: nsBrainsMaybeSingle,
            })),
          })),
        }
      }
      if (table === 'campaigns') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: campaignsMaybeSingle,
              })),
            })),
          })),
        }
      }
      throw new Error(`unexpected table ${table}`)
    })

    target = {
      resolveUserId: vi.fn(() => 'user-1'),
      resolveOrgId: vi.fn(() => null),
      resolveCampaignId: vi.fn(async () => 'campaign-1'),
      getUserClient: vi.fn(async () => ({ kind: 'user-client' })),
      serviceClient: { from },
      brainRetrievalService: { search: brainRetrievalSearch },
    }
  })

  it('resolves campaign brain by campaign_id and searches memory lane', async () => {
    nsBrainsMaybeSingle.mockResolvedValue({ data: { id: 'brain-campaign-1' }, error: null })

    const result = (await service.searchCampaignBrain(
      target,
      { query: 'offer pricing ICP', campaign_id: 'campaign-1', limit: 12 },
      'agent:nate:conv-1',
    )) as Record<string, unknown>

    expect(result).toMatchObject({
      success: true,
      brain_id: 'brain-campaign-1',
      campaign_id: 'campaign-1',
      family: 'campaign',
      count: 1,
    })
    expect(brainRetrievalSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        family: 'user',
        brainId: 'brain-campaign-1',
        query: 'offer pricing ICP',
        userId: 'user-1',
        limit: 12,
        requiredAccess: 'query',
      }),
    )
  })

  it('accepts an explicit campaign brain_id', async () => {
    nsBrainsMaybeSingle.mockResolvedValue({
      data: {
        id: 'brain-campaign-1',
        campaign_id: 'campaign-1',
        scope: 'campaign',
        owner_id: 'user-1',
        org_id: null,
      },
      error: null,
    })

    const result = (await service.searchCampaignBrain(
      target,
      { query: 'onboarding form competitors', brain_id: 'brain-campaign-1' },
      'agent:nate:conv-1',
    )) as Record<string, unknown>

    expect(result).toMatchObject({
      success: true,
      brain_id: 'brain-campaign-1',
      campaign_id: 'campaign-1',
      family: 'campaign',
    })
  })

  it('rejects non-campaign brain_id', async () => {
    nsBrainsMaybeSingle.mockResolvedValue({
      data: {
        id: 'brain-agent-1',
        campaign_id: null,
        scope: 'agent',
        owner_id: 'user-1',
        org_id: null,
      },
      error: null,
    })

    const result = (await service.searchCampaignBrain(
      target,
      { query: 'anything here', brain_id: 'brain-agent-1' },
      'agent:nate:conv-1',
    )) as Record<string, unknown>

    expect(result.success).toBe(false)
    expect(String(result.error)).toContain('campaign brain')
    expect(brainRetrievalSearch).not.toHaveBeenCalled()
  })

  it('errors when campaign has no brain', async () => {
    nsBrainsMaybeSingle.mockResolvedValue({ data: null, error: null })

    const result = (await service.searchCampaignBrain(
      target,
      { query: 'offer pricing ICP', campaign_id: 'campaign-1' },
      'agent:nate:conv-1',
    )) as Record<string, unknown>

    expect(result).toMatchObject({
      success: false,
      error: expect.stringContaining('No campaign brain found'),
    })
  })

  it('rejects General campaign as search_campaign_brain target', async () => {
    campaignsMaybeSingle.mockResolvedValue({
      data: {
        id: 'general-campaign',
        name: 'General',
        config: { system_kind: 'general' },
      },
      error: null,
    })

    const result = (await service.searchCampaignBrain(
      target,
      { query: 'offer pricing ICP', campaign_id: 'general-campaign' },
      'agent:nate:conv-1',
    )) as Record<string, unknown>

    expect(result.success).toBe(false)
    expect(String(result.error)).toContain('General campaign')
    expect(brainRetrievalSearch).not.toHaveBeenCalled()
  })
})
