import { describe, expect, it, vi } from 'vitest'
import { PageGraderBrainImportService } from '../page-grader-brain-import.service'

describe('PageGraderBrainImportService', () => {
  it('pulls a Page Grader client package and imports it into ROAS', async () => {
    const pageGrader = {
      getClientBrainPackage: vi.fn().mockResolvedValue({
        envelope: { page_grader_client_id: '11111111-1111-1111-1111-111111111111' },
        client: { name: 'Christian Osgood' },
      }),
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
        campaign: { id: 'campaign-1', name: 'Multi-Family Strategy' },
        brainImport: { jobId: 'job-1', status: 'queued' },
      }),
    }
    const service = new PageGraderBrainImportService(
      pageGrader as never,
      vault as never,
      clientImport as never,
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
    )
    expect(result).toMatchObject({
      success: true,
      campaign: { id: 'campaign-1' },
      brainImport: { jobId: 'job-1' },
    })
  })
})
