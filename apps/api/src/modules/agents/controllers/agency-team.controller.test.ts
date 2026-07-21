import { describe, expect, it, vi } from 'vitest'
import { AgencyTeamController } from './agency-team.controller'

describe('AgencyTeamController', () => {
  it('ensures the agency team before an Ads Research chat starts', async () => {
    const ensureTeam = vi.fn().mockResolvedValue({ ok: true, agents: [] })
    const controller = new AgencyTeamController({ ensureTeam } as never)
    const supabase = {} as never
    const user = { id: 'user-1' }
    const scope = { userId: 'user-1', orgId: 'org-1', orgRole: 'creator' }

    await expect(
      controller.ensureAgencyTeam(user, supabase, { campaign_id: 'campaign-1' }, scope),
    ).resolves.toEqual({ ok: true, agents: [] })
    expect(ensureTeam).toHaveBeenCalledWith(supabase, 'user-1', {
      orgId: 'org-1',
      campaignId: 'campaign-1',
    })
  })
})
