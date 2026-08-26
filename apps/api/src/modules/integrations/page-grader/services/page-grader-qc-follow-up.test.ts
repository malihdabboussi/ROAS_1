import { describe, expect, it } from 'vitest'
import {
  QC_FOLLOW_UP_COOLDOWN_MS,
  decideQcSlackDelivery,
  fingerprintFindings,
  qcSlackAnchorFromCase,
  uniqueFindingSummaries,
} from './page-grader-qc-follow-up'

const now = new Date('2026-08-17T21:00:00.000Z')

function anchor(overrides: Record<string, unknown> = {}) {
  return {
    slack_channel: 'D123',
    slack_parent_ts: '123.456',
    slack_finding_fingerprint: 'proactive_launch:copywriting is overdue',
    slack_last_follow_up_at: '2026-08-17T12:00:00.000Z',
    snoozed_until: null,
    first_seen_at: '2026-08-16T12:00:00.000Z',
    ...overrides,
  }
}

describe('page-grader QC Slack follow-up', () => {
  it('fingerprints by type and summary, not finding id, and drops duplicate copy', () => {
    expect(
      fingerprintFindings([
        { type: 'proactive_launch', summary: 'Copywriting is overdue' },
        { id: 'new-id', type: 'proactive_launch', summary: 'Copywriting is overdue' },
      ]),
    ).toBe('proactive_launch:copywriting is overdue')
    expect(
      uniqueFindingSummaries([
        { summary: 'Copywriting is overdue' },
        { summary: 'Copywriting is overdue' },
        { summary: 'Funnel Build is overdue' },
      ]),
    ).toEqual(['Copywriting is overdue', 'Funnel Build is overdue'])
  })

  it('posts top-level when there is no stored Slack parent', () => {
    expect(
      decideQcSlackDelivery({
        now,
        fingerprint: 'proactive_launch:copywriting is overdue',
        clientLabel: 'Impact Elite Coaching',
        summaries: ['Copywriting is overdue'],
        anchor: null,
      }),
    ).toEqual({ mode: 'top_level' })
  })

  it('skips Slack while snoozed or inside the follow-up cooldown', () => {
    expect(
      decideQcSlackDelivery({
        now,
        fingerprint: 'proactive_launch:copywriting is overdue',
        clientLabel: 'Impact Elite Coaching',
        summaries: ['Copywriting is overdue'],
        anchor: anchor({ snoozed_until: '2026-08-18T12:00:00.000Z' }),
      }),
    ).toEqual({ mode: 'skip' })
    expect(
      decideQcSlackDelivery({
        now,
        fingerprint: 'proactive_launch:copywriting is overdue',
        clientLabel: 'Impact Elite Coaching',
        summaries: ['Copywriting is overdue'],
        anchor: anchor({ slack_last_follow_up_at: now.toISOString() }),
      }),
    ).toEqual({ mode: 'skip' })
  })

  it('threads a confirmation after cooldown, even when finding ids rotated', () => {
    const cooled = new Date(now.getTime() + QC_FOLLOW_UP_COOLDOWN_MS)
    const unchanged = decideQcSlackDelivery({
      now: cooled,
      fingerprint: 'proactive_launch:copywriting is overdue',
      clientLabel: 'Impact Elite Coaching',
      summaries: ['Copywriting is overdue'],
      anchor: anchor(),
    })
    expect(unchanged.mode).toBe('thread')
    if (unchanged.mode === 'thread') {
      expect(unchanged.text).toContain('Impact Elite Coaching')
      expect(unchanged.text).toContain('finalized')
      expect(unchanged.text).toContain('next daily digest')
    }

    const changed = decideQcSlackDelivery({
      now: cooled,
      fingerprint: 'proactive_launch:funnel build is overdue',
      clientLabel: 'Impact Elite Coaching',
      summaries: ['Funnel Build is overdue'],
      anchor: anchor(),
    })
    expect(changed.mode).toBe('thread')
    if (changed.mode === 'thread') {
      expect(changed.text).toContain('Funnel Build is overdue')
      expect(changed.text).toContain('Reply in this thread')
    }
  })

  it('reads the parent ts from case metadata, not the finding id', () => {
    expect(
      qcSlackAnchorFromCase({
        snoozed_until: null,
        first_seen_at: '2026-08-16T12:00:00.000Z',
        metadata: {
          slack_channel: 'D123',
          slack_parent_ts: '123.456',
          slack_finding_fingerprint: 'x',
        },
      }),
    ).toMatchObject({ slack_channel: 'D123', slack_parent_ts: '123.456' })
    expect(qcSlackAnchorFromCase({ metadata: { slack_parent_ts: '123.456' } })).toBeNull()
  })
})
