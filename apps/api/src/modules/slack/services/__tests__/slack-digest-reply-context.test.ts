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

  it('recovers stored personal_moment source evidence for follow-up questions', () => {
    const items = digestEvidenceItemsFromActions([
      {
        proposed_content: 'Happy birthday note',
        metadata: {
          signal_kind: 'personal_moment',
          signal_finding:
            'The #hello-everyone thread is a pretty good reflection of the culture you built.',
          source_channel_name: 'hello-everyone',
          source_message_text: 'Happy birthday Dylan',
          personal_moment_evidence: [
            { text: 'Happy birthday Dylan! 🎉' },
            { text: 'HBD Dylan — the old ad still holds up' },
          ],
        },
      },
    ])
    const formatted = formatTeamIntelligenceDigestEvidence(items)
    expect(items[0]?.sourceText).toContain('Happy birthday Dylan! 🎉')
    expect(items[0]?.sourceText).toContain('old ad still holds up')
    expect(formatted).toContain('(personal_moment)')
  })
})
