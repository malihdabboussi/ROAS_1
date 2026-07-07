import { describe, expect, it } from 'vitest'
import {
  buildAgentAccessSummary,
  buildDisabledNativeActions,
  buildEnabledToolkits,
} from './agent-access-summary'
import type { ResolvedAgentPolicy } from './agent-policy.types'

const brainActions = ['search_user_brain', 'save_user_memory']
const campaignActions = ['get_campaign', 'list_campaigns']

describe('agent access summary', () => {
  for (const hasOwnAgentBrain of [false, true]) {
    for (const hasUserBrain of [false, true]) {
      for (const hasCampaignContext of [false, true]) {
        it(`summarizes own=${hasOwnAgentBrain} user=${hasUserBrain} campaign=${hasCampaignContext}`, () => {
          const summary = buildAgentAccessSummary({
            agentKey: 'zara',
            hasOwnAgentBrain,
            hasUserBrain,
            hasCampaignContext,
            deniedBrainActions: !hasUserBrain ? brainActions : undefined,
            deniedCampaignActions: !hasCampaignContext ? campaignActions : undefined,
          })

          expect(summary).toContain('ACCESS POLICY for zara:')
          expect(summary).toContain('You CAN read:')
          expect(summary).toContain('You CANNOT read:')
          expect(summary.includes('Your own agent brain')).toBe(hasOwnAgentBrain)
          expect(summary.includes("The user's personal brain. Do NOT call")).toBe(!hasUserBrain)
          expect(summary.includes('Campaign context. Do NOT call')).toBe(!hasCampaignContext)
        })
      }
    }
  }

  it('builds disabled native actions from access booleans', () => {
    expect(
      buildDisabledNativeActions({
        hasUserBrain: false,
        hasCampaignContext: true,
        personalBrainActions: brainActions,
        campaignContextActions: campaignActions,
      }),
    ).toEqual(brainActions)
  })

  it('builds enabled toolkits from effective policy grants and overrides', () => {
    const policy: ResolvedAgentPolicy = {
      agentKey: 'zara',
      teamId: 'team-1',
      teamName: 'Team',
      grants: [
        { kind: 'integration', id: 'gmail' },
        { kind: 'integration', id: 'slack' },
      ],
      overrides: {
        allow_extra: [{ kind: 'integration', id: 'notion' }],
        deny: [{ kind: 'integration', id: 'slack' }],
      },
      effective: new Set(),
    }

    expect(buildEnabledToolkits(policy)).toEqual(['gmail', 'notion'])
  })
})
