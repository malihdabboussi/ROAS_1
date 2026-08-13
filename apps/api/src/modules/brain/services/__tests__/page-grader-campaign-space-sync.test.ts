import { describe, expect, it, vi } from 'vitest'
import { syncPageGraderCampaignSpaces } from '../page-grader-campaign-space-sync'

function createSupabase(items: Array<Record<string, unknown>>) {
  const deleteIn = vi.fn().mockResolvedValue({ error: null })
  const spaces = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          contains: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'stale-space-1',
                schema: {
                  custom_data: {
                    space_role: 'client_campaign',
                    page_grader_campaign_id: 'deleted-campaign-1',
                  },
                },
              },
            ],
            error: null,
          }),
        })),
      })),
    })),
    delete: vi.fn(() => ({ in: deleteIn })),
  }
  const spaceItems = {
    select: vi.fn(() => ({
      in: vi.fn().mockResolvedValue({ data: items, error: null }),
    })),
  }
  return {
    supabase: {
      from: vi.fn((table: string) => (table === 'spaces' ? spaces : spaceItems)),
    },
    deleteIn,
  }
}

describe('Page Grader campaign Space retirement', () => {
  it('deletes an ineligible Space when it contains only the generated brief', async () => {
    const { supabase, deleteIn } = createSupabase([
      {
        space_id: 'stale-space-1',
        custom_data: { source_type: 'campaign_brief' },
      },
    ])

    const result = await syncPageGraderCampaignSpaces(supabase as never, {
      userId: 'user-1',
      orgId: 'org-1',
      roasCampaignId: 'campaign-1',
      clientName: 'Client',
      pageGraderClientId: 'client-1',
      campaigns: [
        {
          id: 'deleted-campaign-1',
          name: 'Deleted campaign',
          deleted_at: '2026-07-22T00:00:00.000Z',
        },
      ],
    })

    expect(deleteIn).toHaveBeenCalledWith('id', ['stale-space-1'])
    expect(result.retired).toEqual({ deleted: 1, retained_with_user_content: 0 })
  })

  it('retains an ineligible Space once an operator has added content', async () => {
    const { supabase, deleteIn } = createSupabase([
      { space_id: 'stale-space-1', custom_data: { source_type: 'campaign_brief' } },
      { space_id: 'stale-space-1', custom_data: { source_type: 'operator_doc' } },
    ])

    const result = await syncPageGraderCampaignSpaces(supabase as never, {
      userId: 'user-1',
      orgId: 'org-1',
      roasCampaignId: 'campaign-1',
      clientName: 'Client',
      pageGraderClientId: 'client-1',
      campaigns: [{ id: 'deleted-campaign-1', status: 'archived' }],
    })

    expect(deleteIn).not.toHaveBeenCalled()
    expect(result.retired).toEqual({ deleted: 0, retained_with_user_content: 1 })
  })
})
