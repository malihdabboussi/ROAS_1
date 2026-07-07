import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('EmailOrchestratorService', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('lists provider capabilities from the admin client', async () => {
    const rows = [{ provider: 'vibey', is_bullmq_provider: true }]
    const query = {
      select: vi.fn().mockResolvedValue({ data: rows, error: null }),
    }
    const admin = {}
    const repository = {
      getAdminClient: vi.fn().mockReturnValue(admin),
      table: vi.fn().mockReturnValue(query),
    }
    const { EmailOrchestratorService } = await import('./email-orchestrator.service')
    const { EmailActiveCampaignService } = await import('./email-active-campaign.service')
    const { EmailProviderDirectoryService } = await import('./email-provider-directory.service')
    const activeCampaign = new EmailActiveCampaignService(repository as never)
    const providerDirectory = new EmailProviderDirectoryService(repository as never)
    const service = new EmailOrchestratorService(
      repository as never,
      activeCampaign,
      providerDirectory,
    )

    await expect(service.getProviderCapabilities()).resolves.toEqual(rows)
    expect(repository.getAdminClient).toHaveBeenCalled()
    expect(repository.table).toHaveBeenCalledWith(admin, 'email_provider_capabilities')
  })
})
