import { describe, expect, it, vi } from 'vitest'
import { CampaignContextService } from './campaign-context.service'

function makeCampaignRepository(overrides?: Record<string, unknown>) {
  return {
    findCampaignConfig: vi.fn(async () => ({
      data: { config: { agent_settings: {} } },
      error: null,
    })),
    findCampaignContext: vi.fn(async () => ({ name: 'Launch', context: {} })),
    listOffers: vi.fn(async () => []),
    listFunnels: vi.fn(async () => []),
    listLeadMagnets: vi.fn(async () => []),
    listSequences: vi.fn(async () => []),
    listAdCampaigns: vi.fn(async () => []),
    listAvatars: vi.fn(async () => []),
    ...overrides,
  }
}

describe('CampaignContextService', () => {
  it('caches theme summaries until explicitly busted', async () => {
    const repository = makeCampaignRepository()
    const service = new CampaignContextService({ client: {} } as any, repository as any)

    const noneSummary = await service.buildThemeSummary('user-1', 'campaign-1', null)
    expect(noneSummary).toContain('ACTIVE_THEME: none')
    expect(noneSummary).toContain('BRANDING_GATE:')
    expect(noneSummary).toContain('ask the user whether branding exists')
    await expect(service.buildThemeSummary('user-1', 'campaign-1', null)).resolves.toBe(noneSummary)
    expect(repository.findCampaignConfig).toHaveBeenCalledTimes(1)

    service.bustCampaignContextCache({ userId: 'user-1', orgId: null, campaignId: 'campaign-1' })
    await service.buildThemeSummary('user-1', 'campaign-1', null)
    expect(repository.findCampaignConfig).toHaveBeenCalledTimes(2)
  })

  it('builds campaign summaries from repository asset rows', async () => {
    const repository = makeCampaignRepository({
      listOffers: vi.fn(async () => [{ id: 'offer-1', name: 'Offer', processing_status: 'ready' }]),
      listFunnels: vi.fn(async () => [
        { id: 'funnel-1', name: 'Funnel', status: 'published', funnel_type: 'leadgen' },
      ]),
      listLeadMagnets: vi.fn(async () => [{ id: 'deck-1', name: 'Deck', status: 'draft' }]),
      listSequences: vi.fn(async () => [{ id: 'sequence-1', name: 'Sequence', status: 'active' }]),
      listAdCampaigns: vi.fn(async () => [
        {
          id: 'ad-1',
          name: 'Ad Campaign',
          meta_campaign_id: 'meta-campaign',
          meta_ad_account_id: 'account-1',
          meta_page_id: 'page-1',
          metadata: { meta_instagram_user_id: 'ig-1' },
        },
      ]),
      listAvatars: vi.fn(async () => [{ id: 'avatar-1', name: 'Avatar', avatar_type: 'buyer' }]),
    })
    const client = {}
    const service = new CampaignContextService({ client } as any, repository as any)

    const summary = await service.buildCampaignSummary('user-1', 'campaign-1', 'org-1')

    expect(summary).toContain('CAMPAIGN_NAME=Launch')
    expect(summary).toContain('Offer (id: offer-1, status: ready)')
    expect(summary).toContain('Funnel (id: funnel-1, type: leadgen, status: published)')
    expect(summary).toContain('Deck (id: deck-1, status: draft)')
    expect(summary).toContain('Sequence (id: sequence-1, status: active)')
    expect(summary).toContain(
      'Ad Campaign (id: ad-1, meta_defaults: account=account-1, page=page-1, instagram=ig-1, published_campaign=meta-campaign)',
    )
    expect(summary).toContain('Avatar (id: avatar-1, type: buyer)')
    expect(repository.findCampaignContext).toHaveBeenCalledWith(client, {
      userId: 'user-1',
      campaignId: 'campaign-1',
      orgId: 'org-1',
    })
  })

  it('injects only approved Offer and Avatar records and fails closed on unresolved ids', async () => {
    const repository = makeCampaignRepository({
      findCampaignContext: vi.fn(async () => ({
        name: 'Launch',
        context: {
          selected_offer_ids: ['offer-approved', 'offer-missing'],
          selected_avatar_ids: ['avatar-approved'],
        },
      })),
      listOffers: vi.fn(async () => [
        { id: 'offer-approved', name: 'Approved Offer', processing_status: 'ready' },
      ]),
      listAvatars: vi.fn(async () => [
        { id: 'avatar-approved', name: 'Approved Avatar', avatar_type: 'buyer' },
      ]),
    })
    const service = new CampaignContextService({ client: {} } as any, repository as any)

    const summary = await service.buildCampaignSummary('user-1', 'campaign-1', 'org-1')

    expect(summary).toContain('Selected Offers: Approved Offer')
    expect(summary).toContain('approved ids unresolved: offer-missing')
    expect(summary).toContain('Selected Avatars: Approved Avatar')
    expect(repository.listOffers).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ selectedIds: ['offer-approved', 'offer-missing'] }),
    )
    expect(repository.listAvatars).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ selectedIds: ['avatar-approved'] }),
    )
  })
})
