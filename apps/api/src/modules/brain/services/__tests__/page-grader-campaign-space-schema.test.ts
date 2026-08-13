import { describe, expect, it } from 'vitest'
import {
  buildPageGraderCampaignSpaceSchema,
  mergePageGraderCampaignSpaceSchema,
  resolvePageGraderCampaignMeta,
} from '../page-grader-campaign-space-schema'
import {
  computePageGraderCampaignSpaceHash,
  isEligiblePageGraderCampaign,
} from '../page-grader-campaign-space-sync'

describe('Page Grader campaign Space schema', () => {
  it('maps an explicitly linked Meta campaign and account', () => {
    const meta = resolvePageGraderCampaignMeta('pg-campaign-1', {
      connected: true,
      recommended_ad_account_id: 'act-fallback',
      accounts: [
        {
          account_db_id: 'account-db-1',
          ad_account_id: 'act-123',
          name: 'Christian Ads',
          active: true,
        },
      ],
      campaigns: [
        {
          page_grader_campaign_id: 'pg-campaign-1',
          account_db_id: 'account-db-1',
          meta_campaign_id: 'meta-456',
          meta_campaign_name: 'Weekly Webinar',
        },
      ],
      provenance: { generated_at: '2026-07-22T10:00:00.000Z' },
    })

    expect(meta.account).toMatchObject({ ad_account_id: 'act-123' })
    expect(meta.campaign).toMatchObject({ meta_campaign_id: 'meta-456' })
  })

  it('keeps operator-added fields and views when source metadata refreshes', () => {
    const canonical = buildPageGraderCampaignSpaceSchema({
      clientId: 'client-1',
      campaign: { id: 'pg-campaign-1', name: 'Weekly Webinar', status: 'active' },
      meta: resolvePageGraderCampaignMeta('pg-campaign-1'),
      syncedAt: '2026-07-22T10:00:00.000Z',
    })
    const merged = mergePageGraderCampaignSpaceSchema(
      {
        fields: [{ id: 'custom-owner', name: 'Campaign Owner', type: 'text' }],
        views: [{ id: 'team-board', name: 'Team Board', type: 'kanban' }],
        custom_data: { operator_note: 'Keep this' },
      },
      canonical,
    )

    expect(merged.fields).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'custom-owner' })]),
    )
    expect(merged.views).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'team-board' })]),
    )
    expect(merged.custom_data).toMatchObject({
      operator_note: 'Keep this',
      page_grader_campaign_id: 'pg-campaign-1',
    })
  })

  it('ignores volatile Meta timestamps but changes when a mapping changes', () => {
    const base = {
      campaigns: [{ id: 'pg-campaign-1', name: 'Weekly Webinar' }],
      metaContext: {
        connected: true,
        accounts: [{ ad_account_id: 'act-1', active: true, last_synced_at: 'first' }],
        campaigns: [
          {
            page_grader_campaign_id: 'pg-campaign-1',
            meta_campaign_id: 'meta-1',
            updated_at: 'first',
          },
        ],
        provenance: { generated_at: 'first' },
      },
    }
    const first = computePageGraderCampaignSpaceHash(base)
    const timestampOnly = computePageGraderCampaignSpaceHash({
      ...base,
      metaContext: {
        ...base.metaContext,
        accounts: [{ ...base.metaContext.accounts[0], last_synced_at: 'second' }],
        campaigns: [{ ...base.metaContext.campaigns[0], updated_at: 'second' }],
        provenance: { generated_at: 'second' },
      },
    })
    const changedMapping = computePageGraderCampaignSpaceHash({
      ...base,
      metaContext: {
        ...base.metaContext,
        campaigns: [{ ...base.metaContext.campaigns[0], meta_campaign_id: 'meta-2' }],
      },
    })

    expect(timestampOnly).toBe(first)
    expect(changedMapping).not.toBe(first)
  })

  it('mirrors Page Grader visibility by excluding soft-deleted and archived campaigns', () => {
    expect(isEligiblePageGraderCampaign({ id: 'active', status: 'active' })).toBe(true)
    expect(
      isEligiblePageGraderCampaign({
        id: 'deleted',
        status: 'active',
        deleted_at: '2026-07-22T00:00:00.000Z',
      }),
    ).toBe(false)
    expect(isEligiblePageGraderCampaign({ id: 'archived', status: 'archived' })).toBe(false)
  })
})
