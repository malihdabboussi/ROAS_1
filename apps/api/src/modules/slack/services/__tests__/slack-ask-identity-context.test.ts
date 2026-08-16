import { describe, expect, it } from 'vitest'
import {
  clientSearchHintFromSlackChannelName,
  formatSlackAskIdentityContext,
} from '../slack-ask-identity-context'

describe('slack-ask-identity-context', () => {
  it('extracts a client search hint from ROAS client channel names', () => {
    expect(clientSearchHintFromSlackChannelName('roas-yasir-khan-coaching-ltd-955')).toBe(
      'yasir khan coaching',
    )
    expect(clientSearchHintFromSlackChannelName('#roas-1ds-collective-llc-939')).toBe(
      '1ds collective',
    )
  })

  it('formats a resolved Portal client stamp that forbids unnecessary ask', () => {
    const text = formatSlackAskIdentityContext({
      channelId: 'C123',
      channelName: 'roas-yasir-khan-coaching-ltd-955',
      pageGraderClientId: 'pg-1',
      pageGraderClientName: 'Yasir Khan Coaching',
      roasCampaignId: 'camp-1',
      roasCampaignName: 'Post-webinar',
    })
    expect(text).toContain('Channel: #roas-yasir-khan-coaching-ltd-955 (C123)')
    expect(text).toContain('Resolved ROAS Portal client: Yasir Khan Coaching (id=pg-1)')
    expect(text).toContain('Do not ask which client')
    expect(text).toContain('Mapped ROAS campaign: Post-webinar (id=camp-1)')
  })

  it('instructs unique list_clients resolution when only the channel name is known', () => {
    const text = formatSlackAskIdentityContext({
      channelId: 'C123',
      channelName: 'roas-yasir-khan-coaching-ltd-955',
      pageGraderClientId: null,
      pageGraderClientName: null,
      roasCampaignId: null,
      roasCampaignName: null,
    })
    expect(text).toContain('Client search hint: yasir khan coaching')
    expect(text).toContain('If exactly one client matches, use it')
  })
})
