import { describe, expect, it, vi } from 'vitest'
import { listAdditionalConversationCampaignIds } from './conversation-extra-campaigns'

describe('listAdditionalConversationCampaignIds', () => {
  it('returns up to two extra campaign ids excluding the primary', async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(async () => ({
              data: [
                { entity_id: 'campaign-1' },
                { entity_id: 'campaign-2' },
                { entity_id: 'campaign-3' },
                { entity_id: 'campaign-4' },
              ],
              error: null,
            })),
          })),
        })),
      })),
    }
    await expect(
      listAdditionalConversationCampaignIds(supabase as never, 'conv-1', 'campaign-1'),
    ).resolves.toEqual(['campaign-2', 'campaign-3'])
  })

  it('returns empty when the table query throws', async () => {
    const supabase = {
      from: vi.fn(() => {
        throw new Error('missing table')
      }),
    }
    await expect(
      listAdditionalConversationCampaignIds(supabase as never, 'conv-1', 'campaign-1'),
    ).resolves.toEqual([])
  })
})
