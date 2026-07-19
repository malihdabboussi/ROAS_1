import { describe, expect, it, vi } from 'vitest'
import { PageGraderClientImportService } from '../page-grader-client-import.service'

function createQuery(options: { maybeSingle?: unknown; single?: unknown } = {}) {
  const query: Record<string, unknown> = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    contains: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    insert: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data: options.maybeSingle ?? null, error: null })),
    single: vi.fn(async () => ({ data: options.single ?? null, error: null })),
  }
  return query
}

const christianPackage = {
  envelope: {
    page_grader_client_id: 'pg-client-christian',
    unique_client_id: 'christian-osgood',
    exported_at: '2026-07-17T20:00:00.000Z',
    package_version: '1',
  },
  client: {
    id: 'pg-client-christian',
    unique_client_id: 'christian-osgood',
    name: 'Christian Osgood',
  },
  client_campaigns: [{ id: 'pg-campaign-1', name: 'Multi-Family Strategy' }],
  client_strategies: [{ id: 'strategy-1', title: 'Multi-family strategy', content: 'Strategy' }],
  source_items: [{ id: 'source-1', title: 'Sales call', content: 'Owns multi-family assets.' }],
  legacy_local_only: {
    intel_notes: [{ id: 'memory-1', title: 'Positioning', content: 'Investor audience.' }],
  },
}

describe('PageGraderClientImportService', () => {
  it('plans the Christian Osgood import without writing when dryRun is true', async () => {
    const importJobs = { enqueueCampaignFileImport: vi.fn() }
    const service = new PageGraderClientImportService(importJobs as never)
    const campaignQuery = createQuery({ maybeSingle: null })
    const supabase = { from: vi.fn(() => campaignQuery) }

    const result = await service.importPackage(
      supabase as never,
      'user-1',
      { package: christianPackage, dryRun: true, campaignHint: 'multi-family strategy' },
      { userId: 'user-1', orgId: 'org-1' } as never,
    )

    expect(result).toMatchObject({
      success: true,
      dryRun: true,
      client: {
        name: 'Christian Osgood',
        pageGraderClientId: 'pg-client-christian',
        uniqueClientId: 'christian-osgood',
      },
      campaign: { action: 'create', name: 'Multi-Family Strategy' },
      space: { action: 'create', title: 'Multi-Family Strategy' },
      brainImport: { action: 'queue', sourceItems: 1, legacyIntelNotes: 1 },
    })
    expect(importJobs.enqueueCampaignFileImport).not.toHaveBeenCalled()
  })

  it('creates a campaign and space, then queues one campaign brain import', async () => {
    const campaignQuery = createQuery({
      maybeSingle: null,
      single: { id: 'campaign-1', name: 'Multi-Family Strategy' },
    })
    const brainQuery = createQuery({
      maybeSingle: null,
      single: { id: 'brain-1' },
    })
    const spaceQuery = createQuery({
      single: { id: 'space-1', title: 'Multi-Family Strategy' },
    })
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'campaigns') return campaignQuery
        if (table === 'ns_brains') return brainQuery
        if (table === 'spaces') return spaceQuery
        throw new Error(`Unexpected table ${table}`)
      }),
    }
    const importJobs = {
      enqueueCampaignFileImport: vi.fn(async () => ({
        jobId: 'job-1',
        status: 'queued',
        deduped: false,
      })),
    }
    const service = new PageGraderClientImportService(importJobs as never)

    const result = await service.importPackage(
      supabase as never,
      'user-1',
      { package: christianPackage, campaignHint: 'multi-family strategy' },
      { userId: 'user-1', orgId: 'org-1' } as never,
    )

    expect(campaignQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        org_id: 'org-1',
        name: 'Multi-Family Strategy',
        campaign_type: 'get-more-leads',
      }),
    )
    expect(spaceQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        org_id: 'org-1',
        campaign_id: 'campaign-1',
        title: 'Multi-Family Strategy',
      }),
    )
    expect(importJobs.enqueueCampaignFileImport).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        campaignId: 'campaign-1',
        title: 'Page Grader Client Intel - Christian Osgood',
        sourceType: 'upload',
        domain: 'strategy',
      }),
      'org-1',
    )
    expect(result).toMatchObject({
      success: true,
      campaign: { action: 'create', id: 'campaign-1' },
      space: { action: 'create', id: 'space-1' },
      brainImport: { jobId: 'job-1', status: 'queued' },
    })
  })
})
