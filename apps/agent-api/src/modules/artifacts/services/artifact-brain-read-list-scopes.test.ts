import { describe, expect, it, vi } from 'vitest'
import { ArtifactBrainReadActionsService } from './artifact-brain-read-actions.service'

describe('ArtifactBrainReadActionsService.listBrainScopes', () => {
  it('returns scope, campaign_id, and campaign_brains with current campaign highlight', async () => {
    const service = new ArtifactBrainReadActionsService(
      {
        listBrainScopes: vi.fn(async () => ({
          data: [
            {
              id: 'user-brain',
              name: 'Default',
              is_default: true,
              agent_id: null,
              scope: 'user',
              campaign_id: null,
            },
            {
              id: 'impact-brain',
              name: 'Impact',
              is_default: false,
              agent_id: null,
              scope: 'campaign',
              campaign_id: 'impact-campaign',
            },
            {
              id: 'nate-brain',
              name: 'Nate',
              is_default: false,
              agent_id: 'nate',
              scope: 'agent',
              campaign_id: null,
            },
          ],
          error: null,
        })),
      } as any,
      {} as any,
    )

    const result = (await service.listBrainScopes(
      {
        resolveUserId: () => 'user-1',
        serviceClient: {},
        resolveCampaignId: vi.fn(async () => 'impact-campaign'),
      },
      {},
      'agent:nate:user-1:conv-1',
    )) as Record<string, unknown>

    expect(result.success).toBe(true)
    expect(result.current_campaign_id).toBe('impact-campaign')
    expect(result.current_campaign_brain).toEqual(
      expect.objectContaining({
        brain_id: 'impact-brain',
        campaign_id: 'impact-campaign',
        scope: 'campaign',
      }),
    )
    expect(result.campaign_brains).toEqual([
      expect.objectContaining({ brain_id: 'impact-brain', campaign_id: 'impact-campaign' }),
    ])
    expect(String(result.note)).toContain('search_campaign_brain')
  })
})
