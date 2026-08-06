import { describe, expect, it } from 'vitest'
import {
  digestEvidenceItemsFromActions,
  formatTeamIntelligenceDigestEvidence,
} from '../slack-digest-reply-context'

describe('slack-digest-reply-context', () => {
  it('formats source evidence so digest follow-ups can answer concrete facts', () => {
    const items = digestEvidenceItemsFromActions([
      {
        proposed_content: 'MYK had their strongest webinar yet.',
        metadata: {
          signal_kind: 'team_win',
          signal_finding: 'MYK had their strongest webinar yet.',
          source_channel_name: 'client-wins-roas',
          source_message_text:
            'Just jumped off from a great call with MYK. We just had the most successful webinar since we started with almost 3x ROAS.',
        },
      },
      {
        proposed_content: 'MYK had their strongest webinar yet.',
        metadata: {
          signal_kind: 'team_win',
          signal_finding: 'MYK had their strongest webinar yet.',
          source_channel_name: 'client-wins-roas',
          source_message_text:
            'Just jumped off from a great call with MYK. We just had the most successful webinar since we started with almost 3x ROAS.',
        },
      },
    ])

    expect(items).toHaveLength(1)
    const formatted = formatTeamIntelligenceDigestEvidence(items)
    expect(formatted).toContain('[Team Intelligence source evidence]')
    expect(formatted).toContain('#client-wins-roas (team_win)')
    expect(formatted).toContain('almost 3x ROAS')
    expect(formatted).toContain('Prefer concrete dates')
  })
})
