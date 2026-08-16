/**
 * Scenario matrix for Slack Pixel + Service Request client linkage.
 * Uses production-stamped channel→client fixtures observed in roas-production.
 */
import { describe, expect, it } from 'vitest'
import { PLATFORM_TOOLS_DELEGATION_GUIDANCE_BLOCK } from '@vibey/agent-policy'
import {
  clientSearchHintFromSlackChannelName,
  formatSlackAskIdentityContext,
  type SlackAskClientStamp,
} from '../slack-ask-identity-context'
import { parseSlackForwardedMessage } from '../slack-forwarded-message-context'

/** Live stamps from slack_observation_events (page_grader ingest). */
export const LIVE_CHANNEL_STAMPS: Record<string, SlackAskClientStamp> = {
  yasir: {
    channelId: 'C_YASIR',
    channelName: 'roas-yasir-khan-coaching-ltd-955',
    pageGraderClientId: 'b17dcee8-2516-4318-aecc-1f7f449dfb92',
    pageGraderClientName: 'Yasir Khan Coaching LTD',
    roasCampaignId: 'bad92814-a1cb-4b66-ba92-66dd02dc42e1',
    roasCampaignName: 'Yasir Khan Coaching LTD',
  },
  impact: {
    channelId: 'C_IMPACT',
    channelName: 'roas-impact-elite-coaching-820',
    pageGraderClientId: 'b0aecece-758c-4511-8a64-4bb0ad6128a1',
    pageGraderClientName: 'Impact Elite Coaching',
    roasCampaignId: '7b6b3239-7fe2-4158-a047-9d9377a4a865',
    roasCampaignName: 'Impact Elite Coaching',
  },
  christian: {
    channelId: 'C_CHRISTIAN',
    channelName: 'roas-christian-osgood',
    pageGraderClientId: '9e1226dc-d054-4f61-a653-798bcc7cb518',
    pageGraderClientName: 'Christian Osgood / Multifamily Strategy',
    roasCampaignId: 'af082417-8ae9-44d0-b5f5-4f8fd309f04a',
    roasCampaignName: 'Multifamily Strategy',
  },
  sakha: {
    channelId: 'C_SAKHA',
    channelName: 'roas-insurancecreators-nicksakha',
    pageGraderClientId: 'f49751a5-7d3f-44a0-9553-6f22d918c010',
    pageGraderClientName: 'Sakha Media Group - Nick Sakha',
    roasCampaignId: 'a922909b-eff9-4652-854b-789d5e445c1c',
    roasCampaignName: 'Sakha Media Group',
  },
  dunamis: {
    channelId: 'C_DUNAMIS',
    channelName: 'roas-dunamismedia',
    pageGraderClientId: 'ea965a6b-f29c-48f2-bd98-ae7c1eb51316',
    pageGraderClientName: 'Dunamis Media Inc',
    roasCampaignId: 'beded76d-9fef-484c-be17-a36bbe7b7b79',
    roasCampaignName: 'Dunamis Media',
  },
  aboveIt: {
    channelId: 'C_ABOVE',
    channelName: 'roas-above-it-432',
    pageGraderClientId: '1abf51f5-7880-4743-8a0a-f8530391dce6',
    pageGraderClientName: 'Above It',
    roasCampaignId: '4b55f80b-1fd8-4a7d-8b7c-977bd0d14a3c',
    roasCampaignName: 'Above It',
  },
  ones: {
    channelId: 'C_1DS',
    channelName: 'roas-1ds-collective-llc-939',
    pageGraderClientId: 'ca82655a-b360-4ba4-8155-b0b26c2a81a6',
    pageGraderClientName: '1DS Collective LLC',
    roasCampaignId: '71c1141d-ba07-426b-85fe-748269b39cb1',
    roasCampaignName: '1DS Collective',
  },
  wpf: {
    channelId: 'C_WPF',
    channelName: 'roas-leapingstone-wpfholdings',
    pageGraderClientId: '02966a58-96b8-43ae-a9c1-a4bca5142e74',
    pageGraderClientName: 'Wpf holdings pty ltd',
    roasCampaignId: 'abf24112-5d3a-4cf8-a7c2-c71ddcb1e00d',
    roasCampaignName: 'White Picket Fence',
  },
  plumbing: {
    channelId: 'C_PLUMB',
    channelName: 'roas-standardplumbing-jacobreese',
    pageGraderClientId: 'eb03f708-211d-4a76-b91e-c31a0fdd66e0',
    pageGraderClientName: 'Standard Plumbing Supply',
    roasCampaignId: '1a9f63ff-2dfe-4aff-928f-a6da1a8e16d1',
    roasCampaignName: 'Standard Plumbing Supply',
  },
  trade: {
    channelId: 'C_TRADE',
    channelName: 'roas-tradelaunch-justingeorgopoulos',
    pageGraderClientId: '66d8c049-9336-4cad-96e7-bf762b8525db',
    pageGraderClientName: 'Trade Launch',
    roasCampaignId: '3be04545-1762-4e68-a0ed-f55d0e9567ee',
    roasCampaignName: 'Trade Launch',
  },
  kraft: {
    channelId: 'C_KRAFT',
    channelName: 'roas-master-your-kraft-llc-622',
    pageGraderClientId: '0f408eb6-d77a-4e5e-880e-798b9ee0817f',
    pageGraderClientName: 'Master Your Kraft LLC',
    roasCampaignId: '4419edff-8eb0-4794-96fa-9c75ca9606cf',
    roasCampaignName: 'Master Your Kraft LLC',
  },
}

export type PixelScenario = {
  id: string
  title: string
  /** How the user interacts */
  interaction:
    | 'in_client_channel'
    | 'forwarded_from_client_channel'
    | 'internal_ops_channel'
    | 'name_only_unmapped'
    | 'explicit_override'
  stampKey?: keyof typeof LIVE_CHANNEL_STAMPS
  channelNameHint?: string
  userMessage: string
  /** What Pixel must do */
  must: {
    includeClientName?: string
    includeClientId?: string
    includeCampaignName?: string
    forbidAskWhichClient?: boolean
    includeSearchHint?: string
    allowAskWhichClient?: boolean
  }
}

export const PIXEL_SCENARIOS: PixelScenario[] = [
  {
    id: 'S01',
    title: 'Create redesign Service Request in Yasir client channel',
    interaction: 'in_client_channel',
    stampKey: 'yasir',
    userMessage:
      'Need a task to redesign speaklikeaceo.com into the post-webinar campaign page — elevate the 50+ testimonials.',
    must: {
      includeClientName: 'Yasir Khan Coaching LTD',
      includeClientId: 'b17dcee8-2516-4318-aecc-1f7f449dfb92',
      forbidAskWhichClient: true,
    },
  },
  {
    id: 'S02',
    title: 'Forward Yasir message from another channel and ask Pixel to create the task',
    interaction: 'forwarded_from_client_channel',
    stampKey: 'yasir',
    userMessage: 'Create the redesign request from this.',
    must: {
      includeClientName: 'Yasir Khan Coaching LTD',
      forbidAskWhichClient: true,
    },
  },
  {
    id: 'S03',
    title: 'Funnel / landing page fulfillment for Impact Elite',
    interaction: 'in_client_channel',
    stampKey: 'impact',
    userMessage: 'Build a funnel request for the new VSL page and assign it to the portal.',
    must: {
      includeClientName: 'Impact Elite Coaching',
      forbidAskWhichClient: true,
    },
  },
  {
    id: 'S04',
    title: 'Campaign status update — Christian Osgood / Multifamily',
    interaction: 'in_client_channel',
    stampKey: 'christian',
    userMessage: "What's the latest campaign status? Any blockers this week?",
    must: {
      includeClientName: 'Christian Osgood / Multifamily Strategy',
      includeCampaignName: 'Multifamily Strategy',
      forbidAskWhichClient: true,
    },
  },
  {
    id: 'S05',
    title: 'Ask for task / fulfillment updates — Sakha / Insurance Creators',
    interaction: 'in_client_channel',
    stampKey: 'sakha',
    userMessage: 'Any open Service Requests still waiting on design for this client?',
    must: {
      includeClientName: 'Sakha Media Group - Nick Sakha',
      forbidAskWhichClient: true,
    },
  },
  {
    id: 'S06',
    title: 'Create ad creative Service Request — Dunamis',
    interaction: 'in_client_channel',
    stampKey: 'dunamis',
    userMessage: 'Spin up an ads request for 5 new statics for the webinar retargeting set.',
    must: {
      includeClientName: 'Dunamis Media Inc',
      forbidAskWhichClient: true,
    },
  },
  {
    id: 'S07',
    title: 'Check performance / Meta pulse — Above It',
    interaction: 'in_client_channel',
    stampKey: 'aboveIt',
    userMessage: 'How are the Meta ads performing for this client the last 7 days?',
    must: {
      includeClientName: 'Above It',
      forbidAskWhichClient: true,
    },
  },
  {
    id: 'S08',
    title: 'Design request — 1DS Collective',
    interaction: 'in_client_channel',
    stampKey: 'ones',
    userMessage: 'Need a design request for the new offer page hero and mobile layout.',
    must: {
      includeClientName: '1DS Collective LLC',
      forbidAskWhichClient: true,
    },
  },
  {
    id: 'S09',
    title: 'Meeting / call follow-up ask — White Picket Fence',
    interaction: 'in_client_channel',
    stampKey: 'wpf',
    userMessage: 'Draft the post-call recap tasks from yesterday’s strategy call.',
    must: {
      includeClientName: 'Wpf holdings pty ltd',
      includeCampaignName: 'White Picket Fence',
      forbidAskWhichClient: true,
    },
  },
  {
    id: 'S10',
    title: 'Copy request — Standard Plumbing',
    interaction: 'in_client_channel',
    stampKey: 'plumbing',
    userMessage: 'Create a copy request for the new landing page headline options.',
    must: {
      includeClientName: 'Standard Plumbing Supply',
      forbidAskWhichClient: true,
    },
  },
  {
    id: 'S11',
    title: 'Video request — Trade Launch',
    interaction: 'in_client_channel',
    stampKey: 'trade',
    userMessage: 'Log a video request for the webinar replay edit and captions.',
    must: {
      includeClientName: 'Trade Launch',
      forbidAskWhichClient: true,
    },
  },
  {
    id: 'S12',
    title: 'GHL / automation request — Master Your Kraft',
    interaction: 'in_client_channel',
    stampKey: 'kraft',
    userMessage: 'Create a GHL automation request for the post-webinar nurture sequence.',
    must: {
      includeClientName: 'Master Your Kraft LLC',
      forbidAskWhichClient: true,
    },
  },
  {
    id: 'S13',
    title: 'Internal ops channel without client stamp — may need clarification',
    interaction: 'internal_ops_channel',
    channelNameHint: 'ads-launches',
    userMessage: 'Create a Service Request for the new static pack.',
    must: {
      allowAskWhichClient: true,
    },
  },
  {
    id: 'S14',
    title: 'Unmapped channel name only — resolve via search hint, no human ask if unique',
    interaction: 'name_only_unmapped',
    channelNameHint: 'roas-yasir-khan-coaching-ltd-955',
    userMessage: 'Create the funnel redesign request.',
    must: {
      includeSearchHint: 'yasir khan coaching',
      forbidAskWhichClient: true,
    },
  },
  {
    id: 'S15',
    title: 'Explicit different client named while standing in Yasir channel',
    interaction: 'explicit_override',
    stampKey: 'yasir',
    userMessage:
      'Actually this is for Impact Elite Coaching, not Yasir — create the redesign request for Impact Elite.',
    must: {
      // Identity stamp still present (channel truth), but policy allows explicit override
      includeClientName: 'Yasir Khan Coaching LTD',
      forbidAskWhichClient: true,
    },
  },
]

/** Compose the ask-time prompt Pixel would receive for a scenario. */
export function composeScenarioPrompt(scenario: PixelScenario): string {
  const sections: string[] = []

  if (scenario.interaction === 'forwarded_from_client_channel' && scenario.stampKey) {
    const stamp = LIVE_CHANNEL_STAMPS[scenario.stampKey]!
    const forwarded = parseSlackForwardedMessage([
      {
        is_msg_unfurl: true,
        channel_id: stamp.channelId,
        channel_name: stamp.channelName ?? undefined,
        author_name: 'Client Principal',
        text: 'Please redesign this page for the post-webinar campaign.',
        from_url: `https://roas.slack.com/archives/${stamp.channelId}/p1723600000000100`,
        footer: `Posted in #${stamp.channelName}`,
      },
    ])
    if (forwarded) sections.push(forwarded.context)
    sections.push(formatSlackAskIdentityContext(stamp))
  } else if (scenario.stampKey) {
    sections.push(formatSlackAskIdentityContext(LIVE_CHANNEL_STAMPS[scenario.stampKey]!))
  } else if (scenario.channelNameHint) {
    sections.push(
      formatSlackAskIdentityContext({
        channelId: 'C_UNKNOWN',
        channelName: scenario.channelNameHint,
        pageGraderClientId: null,
        pageGraderClientName: null,
        roasCampaignId: null,
        roasCampaignName: null,
      }),
    )
  }

  sections.push(`[You were mentioned with]: ${scenario.userMessage}`)
  return sections.join('\n\n')
}

/** Rule-based evaluator for what Pixel must infer before calling tools. */
export function evaluateScenarioPrompt(scenario: PixelScenario, prompt: string) {
  const failures: string[] = []
  const lower = prompt.toLowerCase()

  if (scenario.must.includeClientName && !prompt.includes(scenario.must.includeClientName)) {
    failures.push(`missing client name "${scenario.must.includeClientName}"`)
  }
  if (scenario.must.includeClientId && !prompt.includes(scenario.must.includeClientId)) {
    failures.push(`missing client id "${scenario.must.includeClientId}"`)
  }
  if (scenario.must.includeCampaignName && !prompt.includes(scenario.must.includeCampaignName)) {
    failures.push(`missing campaign name "${scenario.must.includeCampaignName}"`)
  }
  if (
    scenario.must.includeSearchHint &&
    !lower.includes(scenario.must.includeSearchHint.toLowerCase())
  ) {
    failures.push(`missing search hint "${scenario.must.includeSearchHint}"`)
  }
  if (scenario.must.forbidAskWhichClient) {
    if (
      !prompt.includes('Do not ask which client') &&
      !prompt.includes('do not ask the user which client')
    ) {
      failures.push('identity/policy does not forbid asking which client')
    }
  }
  if (scenario.must.allowAskWhichClient) {
    // Internal ops: no resolved client stamp should be present
    if (prompt.includes('Resolved ROAS Portal client:')) {
      failures.push('internal ops channel unexpectedly resolved a Portal client')
    }
  }

  return { ok: failures.length === 0, failures, prompt }
}

describe('Slack Pixel scenario matrix (channel→client linkage)', () => {
  it('policy forbids asking which client when a client channel uniquely resolves', () => {
    expect(PLATFORM_TOOLS_DELEGATION_GUIDANCE_BLOCK).toContain(
      'do **not** ask the user which client',
    )
    expect(PLATFORM_TOOLS_DELEGATION_GUIDANCE_BLOCK).toContain('Slack channel is a client channel')
  })

  it('produces search hints from ROAS channel naming', () => {
    expect(clientSearchHintFromSlackChannelName('roas-yasir-khan-coaching-ltd-955')).toBe(
      'yasir khan coaching',
    )
    expect(clientSearchHintFromSlackChannelName('roas-1ds-collective-llc-939')).toBe(
      '1ds collective',
    )
  })

  for (const scenario of PIXEL_SCENARIOS) {
    it(`${scenario.id}: ${scenario.title}`, () => {
      const prompt = composeScenarioPrompt(scenario)
      const result = evaluateScenarioPrompt(scenario, prompt)
      expect(result.failures, result.failures.join('; ')).toEqual([])
      expect(result.ok).toBe(true)
      expect(prompt).toContain(scenario.userMessage)
    })
  }
})
