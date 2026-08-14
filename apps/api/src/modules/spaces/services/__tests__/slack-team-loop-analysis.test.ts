import { describe, expect, it, vi } from 'vitest'
import {
  analyzeSlackTeamMessages,
  selectSlackTeamBriefingSignals,
  type SlackTeamSignal,
} from '../slack-team-loop-analysis'

const signal = (
  kind: SlackTeamSignal['kind'],
  confidence: number,
  source: string,
): SlackTeamSignal => ({
  kind,
  confidence,
  target_slack_user_id: 'U1',
  target_channel_id: 'C1',
  source_message_ts: source,
  proposed_content: `${kind} finding`,
  rationale: 'Explicit evidence.',
  brain_memory: kind === 'brain_memory' ? `${kind} memory` : null,
})

describe('analyzeSlackTeamMessages', () => {
  it('detects the full case inventory before ranking the delivery briefing', async () => {
    const gemini = {
      callGeminiWithUsage: vi.fn().mockResolvedValue({
        text: JSON.stringify({ signals: [] }),
        usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
        providerCostUsd: 0,
      }),
    }

    await analyzeSlackTeamMessages({
      gemini: gemini as never,
      userId: 'owner-1',
      orgId: 'org-1',
      loopKind: 'all',
      messages: [
        {
          channel_id: 'C1',
          channel_name: 'client-success',
          ts: '1.1',
          thread_ts: null,
          user: 'U1',
          text: 'We crossed $150K and the launch is ready once fulfillment is connected.',
        },
      ],
      people: [],
      maxSignals: 40,
      briefingRecipient: { displayName: 'Dylan', role: 'workspace owner' },
    })

    const prompt = String(gemini.callGeminiWithUsage.mock.calls[0]?.[0] ?? '')
    expect(prompt).toContain('detect every high-confidence operational signal')
    expect(prompt).toContain('Delivery ranking happens after detection')
    expect(prompt).toContain('team_win')
    expect(prompt).toContain('important_update')
    expect(prompt).toContain('decision')
    expect(prompt).toContain('strategic_opportunity')
    expect(prompt).not.toContain('Do not force an unanswered question into the briefing')
    expect(prompt).toContain('Already-handled items are not briefing-worthy')
    expect(prompt).toContain('connect related messages')
    expect(prompt).toContain('business impact')
    expect(prompt).toContain('Dylan (workspace owner)')
    expect(prompt).toContain('Write proposed_content in second person')
    expect(prompt).toContain('you stepped in')
    expect(prompt).toContain('concrete dates, owners, amounts')
    expect(prompt).toContain('personal_moment')
    expect(prompt).toContain('multiple independent human messages')
  })

  it('keeps personal_moment out of the EOD briefing selection path', () => {
    const selected = selectSlackTeamBriefingSignals([
      signal('personal_moment', 0.99, '1'),
      signal('team_win', 0.9, '2'),
      signal('decision', 0.88, '3'),
    ])
    expect(selected.map((item) => item.kind)).toEqual(['decision', 'team_win'])
    expect(selected.some((item) => item.kind === 'personal_moment')).toBe(false)
  })

  it('enforces briefing diversity and caps unanswered questions after model analysis', () => {
    const selected = selectSlackTeamBriefingSignals([
      signal('unanswered_question', 0.99, '1'),
      signal('unanswered_question', 0.98, '2'),
      signal('unanswered_question', 0.97, '3'),
      signal('team_win', 0.9, '4'),
      signal('decision', 0.88, '5'),
      signal('important_update', 0.92, '6'),
      signal('strategic_opportunity', 0.86, '7'),
      signal('client_risk', 0.84, '8'),
    ])

    expect(selected).toHaveLength(5)
    expect(selected.filter((item) => item.kind === 'unanswered_question')).toHaveLength(0)
    expect(selected.map((item) => item.kind)).toEqual([
      'client_risk',
      'decision',
      'strategic_opportunity',
      'team_win',
      'important_update',
    ])
  })

  it('keeps one unanswered question when the briefing has room', () => {
    const selected = selectSlackTeamBriefingSignals([
      signal('unanswered_question', 0.95, '1'),
      signal('unanswered_question', 0.94, '2'),
      signal('team_win', 0.9, '3'),
    ])

    expect(selected.map((item) => item.kind)).toEqual(['team_win', 'unanswered_question'])
  })
})
