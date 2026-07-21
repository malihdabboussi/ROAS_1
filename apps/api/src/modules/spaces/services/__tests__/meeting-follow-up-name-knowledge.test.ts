import { describe, expect, it } from 'vitest'
import {
  applyCanonicalNameRewrites,
  ASSIGNEE_REMINDER_CALL_BRIEF_MAX_CHARS,
  boundAssigneeReminderCallBrief,
  buildAssigneeReminderThreadContext,
  buildNameKnowledgePayload,
  findCanonicalName,
  knowledgeNamesMatch,
  rewriteFollowUpTitlesWithKnowledge,
} from '../meeting-follow-up-name-knowledge'

describe('meeting-follow-up-name-knowledge', () => {
  it('matches client names with scope-style rules', () => {
    expect(knowledgeNamesMatch('Asura Group', 'Asura')).toBe(true)
    expect(knowledgeNamesMatch('Trust Advisors', 'Impact')).toBe(false)
  })

  it('finds and rewrites catalog names in follow-up titles', () => {
    const catalog = [
      { canonical: 'Asura Group', source: 'campaign' as const },
      { canonical: 'Kamyla', source: 'slack_person' as const },
    ]
    expect(findCanonicalName('Asura', catalog)?.canonical).toBe('Asura Group')
    expect(applyCanonicalNameRewrites('Brief Asura Group on ads', catalog)).toBe(
      'Brief Asura Group on ads',
    )
    const rewritten = rewriteFollowUpTitlesWithKnowledge(
      [{ id: '1', title: 'Confirm asura group booking' }],
      catalog,
    )
    expect(rewritten[0]?.title).toBe('Confirm Asura Group booking')
  })

  it('builds known_names payload buckets', () => {
    expect(
      buildNameKnowledgePayload([
        { canonical: 'Asura Group', source: 'campaign' },
        { canonical: 'Asura Group', source: 'page_grader_client' },
        { canonical: 'Kamyla', source: 'slack_person' },
      ]),
    ).toEqual({
      campaigns: ['Asura Group'],
      page_grader_clients: ['Asura Group'],
      slack_people: ['Kamyla'],
    })
  })

  it('builds assignee reminder thread context for Pixel replies', () => {
    const text = buildAssigneeReminderThreadContext({
      assigneeName: 'Aaron',
      callTitle: 'Review client accounts',
      callBrief: [
        '*Purpose*',
        'Align on webinar campaign.',
        '',
        '*Key takeaways*',
        '• Adam Lamb webinar request',
      ].join('\n'),
      items: [
        { title: 'Check Adam Lamb prior video ads' },
        { title: 'Confirm Adam Lamb booking calendar' },
      ],
    })
    expect(text).toContain('Assignee: Aaron')
    expect(text).toContain('Call brief:')
    expect(text).toContain('Align on webinar campaign.')
    expect(text).toContain('Adam Lamb webinar request')
    expect(text).toContain('Action items for Aaron:')
    expect(text).toContain('Check Adam Lamb prior video ads')
    expect(text).toContain('[End meeting assignee-reminder context]')
  })

  it('bounds call brief length for Slack agent context', () => {
    const long = 'x'.repeat(ASSIGNEE_REMINDER_CALL_BRIEF_MAX_CHARS + 200)
    const bounded = boundAssigneeReminderCallBrief(long)
    expect(bounded.length).toBeLessThanOrEqual(ASSIGNEE_REMINDER_CALL_BRIEF_MAX_CHARS)
    expect(bounded.endsWith('…')).toBe(true)
  })
})
