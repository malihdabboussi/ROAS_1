import { describe, expect, it, vi } from 'vitest'
import { PageGraderBrainImportService } from '../page-grader-brain-import.service'

describe('PageGraderBrainImportService', () => {
  it('pulls a Page Grader client package, imports it, and persists the client scope map', async () => {
    const pageGrader = {
      getClientBrainPackage: vi.fn().mockResolvedValue({
        envelope: { page_grader_client_id: '11111111-1111-1111-1111-111111111111' },
        client: { name: 'Christian Osgood' },
      }),
      getClientMetaContext: vi.fn().mockResolvedValue({ connected: false }),
    }
    const vault = {
      getSecret: vi.fn(async (_u: string, _p: string, label: string) => {
        if (label === 'base_url') return 'https://example.supabase.co/functions/v1/roas-api'
        if (label === 'api_key') return 'test-key'
        return null
      }),
    }
    const clientImport = {
      importPackage: vi.fn().mockResolvedValue({
        success: true,
        dryRun: false,
        campaign: { action: 'create', id: 'campaign-1', name: 'Multi-Family Strategy' },
        space: { action: 'create', id: 'space-1', title: 'Multi-Family Strategy' },
        brainImport: { jobId: 'job-1', status: 'queued' },
        campaignSpaceHash: 'campaign-space-hash-1',
      }),
    }
    const api = {
      mergeClientScopeEntry: vi.fn().mockResolvedValue({ client_scope_map: {} }),
    }
    const service = new PageGraderBrainImportService(
      pageGrader as never,
      vault as never,
      clientImport as never,
      api as never,
    )

    const result = await service.importClientBrain(
      {} as never,
      'user-1',
      {
        client_id: '11111111-1111-1111-1111-111111111111',
        campaignHint: 'multi-family strategy',
      },
      'org-1',
    )

    expect(pageGrader.getClientBrainPackage).toHaveBeenCalledWith(
      'https://example.supabase.co/functions/v1/roas-api',
      'test-key',
      '11111111-1111-1111-1111-111111111111',
    )
    expect(clientImport.importPackage).toHaveBeenCalledWith(
      {},
      'user-1',
      expect.objectContaining({
        campaignHint: 'multi-family strategy',
        package: expect.objectContaining({
          client: { name: 'Christian Osgood' },
        }),
      }),
      { userId: 'user-1', orgId: 'org-1' },
      {},
    )
    expect(api.mergeClientScopeEntry).toHaveBeenCalledWith('user-1', {
      clientId: '11111111-1111-1111-1111-111111111111',
      campaignId: 'campaign-1',
      campaignName: 'Multi-Family Strategy',
      spaceId: 'space-1',
      spaceTitle: 'Multi-Family Strategy',
      contentHash: null,
      campaignSpaceHash: 'campaign-space-hash-1',
      lastSyncStatus: 'queued',
      lastSyncedAt: expect.any(String),
    })
    expect(result).toMatchObject({
      success: true,
      campaign: { id: 'campaign-1' },
      brainImport: { jobId: 'job-1' },
    })
  })

  it('skips scope-map persistence on dryRun', async () => {
    const pageGrader = {
      getClientBrainPackage: vi.fn().mockResolvedValue({
        envelope: { page_grader_client_id: '11111111-1111-1111-1111-111111111111' },
        client: { name: '1DS Collective' },
      }),
      getClientMetaContext: vi.fn().mockResolvedValue({ connected: false }),
    }
    const vault = {
      getSecret: vi.fn(async () => 'secret'),
    }
    const clientImport = {
      importPackage: vi.fn().mockResolvedValue({
        success: true,
        dryRun: true,
        campaign: { action: 'create', id: null, name: '1DS Collective' },
      }),
    }
    const api = {
      mergeClientScopeEntry: vi.fn(),
    }
    const service = new PageGraderBrainImportService(
      pageGrader as never,
      vault as never,
      clientImport as never,
      api as never,
    )

    await service.importClientBrain(
      {} as never,
      'user-1',
      {
        client_id: '11111111-1111-1111-1111-111111111111',
        dryRun: true,
        campaignName: '1DS Collective',
      },
      null,
    )

    expect(api.mergeClientScopeEntry).not.toHaveBeenCalled()
  })
})
