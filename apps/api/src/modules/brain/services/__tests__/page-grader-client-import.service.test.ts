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
    update: vi.fn(() => query),
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
    const packageIngest = { ingestPackage: vi.fn() }
    const service = new PageGraderClientImportService(packageIngest as never)
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
      space: { action: 'create', title: 'General' },
      brainImport: { action: 'deterministic_ingest', sourceItems: 1, legacyIntelNotes: 1 },
    })
    expect(packageIngest.ingestPackage).not.toHaveBeenCalled()
  })

  it('reuses the campaign General Space when Page Grader is already mapped', async () => {
    const packageIngest = { ingestPackage: vi.fn() }
    const service = new PageGraderClientImportService(packageIngest as never)
    const campaignQuery = createQuery({
      maybeSingle: { id: 'campaign-1', name: 'Multi-Family Strategy' },
    })
    const spaceQuery = createQuery({
      maybeSingle: { id: 'space-general', title: 'General' },
    })
    const supabase = {
      from: vi.fn((table: string) => (table === 'spaces' ? spaceQuery : campaignQuery)),
    }

    const result = await service.importPackage(
      supabase as never,
      'user-1',
      { package: christianPackage, dryRun: true },
      { userId: 'user-1', orgId: 'org-1' } as never,
    )

    expect(spaceQuery.contains).toHaveBeenCalledWith('schema', {
      custom_data: { space_role: 'general' },
    })
    expect(result.space).toEqual({ action: 'reuse', id: 'space-general', title: 'General' })
  })

  it('creates a campaign and space, then deterministically ingests the package', async () => {
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
    const itemQuery = createQuery({ maybeSingle: null })
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'campaigns') return campaignQuery
        if (table === 'ns_brains') return brainQuery
        if (table === 'spaces') return spaceQuery
        if (table === 'space_items') return itemQuery
        throw new Error(`Unexpected table ${table}`)
      }),
    }
    const packageIngest = {
      ingestPackage: vi.fn(async () => ({
        brainId: 'brain-1',
        contentHash: 'hash-1',
        memoriesInserted: 2,
        memoriesSkipped: 0,
        evidenceUpserted: 1,
        knowledgeIndexed: 1,
        skippedUnchanged: false,
      })),
    }
    const service = new PageGraderClientImportService(packageIngest as never)

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
        config: expect.objectContaining({
          external_sources: {
            page_grader: expect.objectContaining({
              content_hash: null,
              last_sync_status: 'pending',
            }),
          },
        }),
      }),
    )
    expect(spaceQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        org_id: 'org-1',
        campaign_id: 'campaign-1',
        title: 'General',
        schema: expect.objectContaining({
          version: 1,
          fields: expect.arrayContaining([
            expect.objectContaining({ id: 'title' }),
            expect.objectContaining({ id: 'status' }),
          ]),
          views: expect.arrayContaining([
            expect.objectContaining({ id: 'campaign-overview' }),
            expect.objectContaining({ id: 'missions' }),
          ]),
          custom_data: expect.objectContaining({
            source: 'page_grader',
            space_role: 'general',
          }),
        }),
      }),
    )
    expect(packageIngest.ingestPackage).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        userId: 'user-1',
        orgId: 'org-1',
        campaignId: 'campaign-1',
        spaceId: 'space-1',
        force: false,
      }),
    )
    expect(itemQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        space_id: 'space-1',
        title: 'Campaign Brief',
        custom_data: expect.objectContaining({
          _view_type: 'doc',
          page_grader_campaign_id: 'pg-campaign-1',
        }),
      }),
    )
    expect(result).toMatchObject({
      success: true,
      campaign: { action: 'create', id: 'campaign-1' },
      space: { action: 'create', id: 'space-1' },
      brainImport: { action: 'ingested', status: 'succeeded', memoriesInserted: 2 },
    })
  })

  it('reuses an org-mapped campaign when personal Page Grader sync passes campaignId', async () => {
    const orgCampaign = {
      id: 'org-campaign-1',
      name: 'Multifamily Strategy',
      user_id: 'user-1',
      org_id: 'org-1',
    }
    const campaignQuery = createQuery({ maybeSingle: orgCampaign })
    const spaceQuery = createQuery({
      maybeSingle: { id: 'org-space-1', title: 'General', user_id: 'user-1', org_id: 'org-1' },
      single: { id: 'campaign-space-1', title: 'Multi-Family Strategy' },
    })
    const itemQuery = createQuery({ maybeSingle: null })
    const brainQuery = createQuery({ maybeSingle: { id: 'brain-1' } })
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'campaigns') return campaignQuery
        if (table === 'spaces') return spaceQuery
        if (table === 'space_items') return itemQuery
        if (table === 'ns_brains') return brainQuery
        throw new Error(`Unexpected table ${table}`)
      }),
    }
    const packageIngest = {
      ingestPackage: vi.fn(async () => ({
        brainId: 'brain-1',
        contentHash: 'hash-1',
        memoriesInserted: 0,
        memoriesSkipped: 1,
        evidenceUpserted: 0,
        knowledgeIndexed: 0,
        skippedUnchanged: true,
      })),
    }
    const service = new PageGraderClientImportService(packageIngest as never)

    const result = await service.importPackage(
      supabase as never,
      'user-1',
      {
        package: christianPackage,
        campaignId: 'org-campaign-1',
        spaceId: 'org-space-1',
      },
      // Personal integration sync always passes orgId null.
      { userId: 'user-1', orgId: null } as never,
    )

    expect(campaignQuery.eq).toHaveBeenCalledWith('id', 'org-campaign-1')
    expect(campaignQuery.is).toHaveBeenCalledWith('deleted_at', null)
    expect(campaignQuery.insert).not.toHaveBeenCalled()
    expect(packageIngest.ingestPackage).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        userId: 'user-1',
        orgId: 'org-1',
        campaignId: 'org-campaign-1',
        spaceId: 'org-space-1',
      }),
    )
    expect(result).toMatchObject({
      success: true,
      campaign: { action: 'reuse', id: 'org-campaign-1' },
      space: { action: 'reuse', id: 'org-space-1' },
    })
  })

  it('reconciles campaign Spaces without invoking package ingestion when Brain content matches', async () => {
    const campaignQuery = createQuery({
      maybeSingle: {
        id: 'campaign-1',
        name: 'Multifamily Strategy',
        user_id: 'user-1',
        org_id: 'org-1',
      },
    })
    const spaceQuery = createQuery({
      maybeSingle: { id: 'space-1', title: 'General', user_id: 'user-1', org_id: 'org-1' },
      single: { id: 'campaign-space-1', title: 'Multi-Family Strategy' },
    })
    const itemQuery = createQuery({ maybeSingle: null })
    const brainQuery = createQuery({ maybeSingle: { id: 'brain-1' } })
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'campaigns') return campaignQuery
        if (table === 'spaces') return spaceQuery
        if (table === 'space_items') return itemQuery
        if (table === 'ns_brains') return brainQuery
        throw new Error(`Unexpected table ${table}`)
      }),
    }
    const packageIngest = { ingestPackage: vi.fn() }
    const service = new PageGraderClientImportService(packageIngest as never)

    const result = await service.importPackage(
      supabase as never,
      'user-1',
      { package: christianPackage, campaignId: 'campaign-1', spaceId: 'space-1' },
      { userId: 'user-1', orgId: 'org-1' } as never,
      { skipBrainIngest: true },
    )

    expect(packageIngest.ingestPackage).not.toHaveBeenCalled()
    expect(result.brainImport).toMatchObject({
      action: 'skipped_unchanged',
      status: 'succeeded',
      skippedUnchanged: true,
    })
  })
})
