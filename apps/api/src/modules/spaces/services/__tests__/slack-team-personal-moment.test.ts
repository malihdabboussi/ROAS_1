import { describe, expect, it, vi } from 'vitest'
import {
  composePersonalMomentMessage,
  filterBrainDetailsFromSlackCopy,
  personalMomentDateKey,
  personalMomentDedupeKey,
  pickPersonalMomentHistoricalConnection,
  validatePersonalMomentEvidence,
} from '../slack-team-personal-moment'
import { SlackTeamSignalDeliveryService } from '../slack-team-signal-delivery.service'

const dylan = {
  display_name: 'Dylan Vanas',
  relationship_kind: 'internal',
}
const viktor = {
  display_name: 'Viktor',
  relationship_kind: 'internal',
}
const external = {
  display_name: 'Casey Client',
  relationship_kind: 'external',
}

const peopleBySlackId = new Map([
  ['U_DYLAN', dylan],
  ['U_VIKTOR', viktor],
  ['U_CASEY', external],
])

describe('validatePersonalMomentEvidence', () => {
  it('accepts multiple explicit birthday messages as one personal_moment', () => {
    const result = validatePersonalMomentEvidence({
      signal: {
        kind: 'personal_moment',
        target_slack_user_id: 'U_DYLAN',
        target_channel_id: 'C_HELLO',
        source_message_ts: '100.1',
        proposed_content:
          'The #hello-everyone thread is a pretty good reflection of the culture you built.',
        rationale: 'Multiple birthday wishes.',
        confidence: 0.91,
        moment_event_type: 'birthday',
        evidence_message_tss: ['100.1', '100.2', '100.3'],
      },
      messages: [
        {
          channel_id: 'C_HELLO',
          channel_name: 'hello-everyone',
          ts: '100.1',
          user: 'U_VIKTOR',
          text: 'Happy birthday Dylan! 🎉',
        },
        {
          channel_id: 'C_HELLO',
          channel_name: 'hello-everyone',
          ts: '100.2',
          user: 'U2',
          text: 'Happy birthday <@U_DYLAN> — have an amazing day',
        },
        {
          channel_id: 'C_HELLO',
          channel_name: 'hello-everyone',
          ts: '100.3',
          user: 'U3',
          text: 'HBD Dylan!!',
        },
      ],
      subjectNames: ['Dylan Vanas', 'Dylan'],
      peopleBySlackId,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.eventType).toBe('birthday')
    expect(result.evidence).toHaveLength(3)
  })

  it('rejects one vague have-a-great-day message', () => {
    const result = validatePersonalMomentEvidence({
      signal: {
        kind: 'personal_moment',
        target_slack_user_id: 'U_DYLAN',
        target_channel_id: 'C1',
        source_message_ts: '1.1',
        proposed_content: 'Have a great day',
        rationale: 'Nice note',
        confidence: 0.9,
        moment_event_type: 'birthday',
      },
      messages: [
        {
          channel_id: 'C1',
          channel_name: 'general',
          ts: '1.1',
          user: 'U_VIKTOR',
          text: 'Have a great day Dylan',
        },
      ],
      subjectNames: ['Dylan'],
      peopleBySlackId,
    })
    expect(result.ok).toBe(false)
  })

  it('suppresses conflicting event evidence', () => {
    const result = validatePersonalMomentEvidence({
      signal: {
        kind: 'personal_moment',
        target_slack_user_id: 'U_DYLAN',
        target_channel_id: 'C1',
        source_message_ts: '1.1',
        proposed_content: 'confused',
        rationale: 'conflict',
        confidence: 0.9,
        moment_event_type: 'birthday',
      },
      messages: [
        {
          channel_id: 'C1',
          channel_name: 'general',
          ts: '1.1',
          user: 'U2',
          text: 'Happy birthday Dylan',
        },
        {
          channel_id: 'C1',
          channel_name: 'general',
          ts: '1.2',
          user: 'U3',
          text: 'Happy work anniversary Dylan',
        },
      ],
      subjectNames: ['Dylan'],
      peopleBySlackId,
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('conflicting_event_types')
  })

  it('never validates personal moments for external people', () => {
    const result = validatePersonalMomentEvidence({
      signal: {
        kind: 'personal_moment',
        target_slack_user_id: 'U_CASEY',
        target_channel_id: 'C1',
        source_message_ts: '1.1',
        proposed_content: 'Happy birthday Casey',
        rationale: 'wishes',
        confidence: 0.95,
        moment_event_type: 'birthday',
      },
      messages: [
        {
          channel_id: 'C1',
          channel_name: 'clients',
          ts: '1.1',
          user: 'U_VIKTOR',
          text: 'Happy birthday Casey!',
        },
      ],
      subjectNames: ['Casey Client', 'Casey'],
      peopleBySlackId,
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('subject_not_internal')
  })
})

describe('personalMoment dedupe + history', () => {
  it('dedupes by recipient, event type, and date', () => {
    const dateKey = personalMomentDateKey(new Date('2026-08-06T18:00:00.000Z'))
    const first = personalMomentDedupeKey({
      orgId: 'org-1',
      subjectSlackUserId: 'U_DYLAN',
      eventType: 'birthday',
      dateKey,
    })
    const second = personalMomentDedupeKey({
      orgId: 'org-1',
      subjectSlackUserId: 'U_DYLAN',
      eventType: 'birthday',
      dateKey,
    })
    const otherDay = personalMomentDedupeKey({
      orgId: 'org-1',
      subjectSlackUserId: 'U_DYLAN',
      eventType: 'birthday',
      dateKey: '2026-08-07',
    })
    expect(first).toBe(second)
    expect(first).not.toBe(otherDay)
  })

  it('includes historical Slack context only when clearly relevant', () => {
    const picked = pickPersonalMomentHistoricalConnection([
      {
        text: 'Remember that old Dylan ad everyone loved? Still holds up.',
        score: 0.9,
        source: 'archive',
      },
      {
        text: 'Lunch menu for Friday',
        score: 0.4,
        source: 'recent_slack',
      },
    ])
    expect(picked?.text).toMatch(/old Dylan ad/i)

    const weak = pickPersonalMomentHistoricalConnection([
      { text: 'Random standup note', score: 0.5, source: 'archive' },
      { text: 'Another weak note about something', score: 0.48, source: 'archive' },
    ])
    expect(weak).toBeNull()
  })

  it('never keeps private Brain phrasing in Slack copy', () => {
    const cleaned = filterBrainDetailsFromSlackCopy(
      'Happy note. Private 1:1 notes said Dylan was stressed. Enjoy the day.',
    )
    expect(cleaned.toLowerCase()).not.toContain('private')
    expect(cleaned.toLowerCase()).not.toContain('1:1 notes')
  })
})

describe('composePersonalMomentMessage', () => {
  it('writes a standalone teammate note, not an EOD numbered list', () => {
    const text = composePersonalMomentMessage({
      recipientName: 'Dylan Vanas',
      eventType: 'birthday',
      channelName: 'hello-everyone',
      finding: 'The #hello-everyone thread is a pretty good reflection of the culture you built.',
      historicalConnection: 'The older ad everyone resurfaced still holds up, too.',
    })
    expect(text).toContain('Happy birthday, Dylan')
    expect(text).toContain('older ad')
    expect(text).not.toMatch(/^\d+\./m)
    expect(text).not.toContain('Here is what stood out today')
    expect(text).not.toContain('Want me to take the first pass on any of these?')
  })
})

describe('SlackTeamSignalDeliveryService personal_moment', () => {
  const momentAction = {
    id: 'moment-1',
    target_member_id: 'member-1',
    action_kind: 'message',
    proposed_content: 'composed',
    metadata: {
      lifecycle_state: 'cooling',
      eligible_at: '2026-08-06T17:00:00.000Z',
      signal_kind: 'personal_moment',
      moment_event_type: 'birthday',
      signal_finding:
        'The #hello-everyone thread is a pretty good reflection of the culture you built.',
      personal_moment_historical_connection:
        'The older ad everyone resurfaced still holds up, too.',
      source_channel_name: 'hello-everyone',
      personal_moment_evidence: [{ channel_id: 'C1', ts: '1.1', text: 'Happy birthday Dylan' }],
    },
  }

  const activeInternalPerson = {
    id: 'member-1',
    platform_id: 'U_DYLAN',
    display_name: 'Dylan',
    relationship_kind: 'internal',
    delivery_mode: 'active',
  }

  it('quiet hours prevent sending personal moments', async () => {
    const people = {
      reviewShadowAction: vi.fn(),
      claimShadowActionForSend: vi.fn(),
      markShadowActionSent: vi.fn(),
      markShadowActionFailed: vi.fn(),
    }
    const loops = {
      listCoolingActions: vi.fn().mockResolvedValue([momentAction]),
      updateActionMetadata: vi.fn(),
      findRecentDigestRoot: vi.fn(),
    }
    const slackTools = {
      openDm: vi.fn(),
      sendMessage: vi.fn(),
    }
    const service = new SlackTeamSignalDeliveryService(
      people as never,
      loops as never,
      slackTools as never,
      { refresh: vi.fn() } as never,
    )

    const result = await service.processCoolingActions({
      supabase: {} as never,
      userId: 'owner-1',
      orgId: 'org-1',
      workflowKey: 'slack_team:all',
      deliveryMode: 'active',
      personIds: ['member-1'],
      quietHoursActive: true,
      people: [activeInternalPerson] as never,
      now: new Date('2026-08-06T17:10:00.000Z'),
    })

    expect(slackTools.sendMessage).not.toHaveBeenCalled()
    expect(loops.updateActionMetadata).toHaveBeenCalled()
    expect(result.sent).toBe(0)
  })

  it('shadow mode creates a reviewable proposal without sending', async () => {
    const people = {
      reviewShadowAction: vi.fn(),
      claimShadowActionForSend: vi.fn(),
      markShadowActionSent: vi.fn(),
      markShadowActionFailed: vi.fn(),
    }
    const loops = {
      listCoolingActions: vi.fn().mockResolvedValue([momentAction]),
      updateActionMetadata: vi.fn(),
      findRecentDigestRoot: vi.fn(),
    }
    const slackTools = {
      openDm: vi.fn(),
      sendMessage: vi.fn(),
    }
    const service = new SlackTeamSignalDeliveryService(
      people as never,
      loops as never,
      slackTools as never,
      { refresh: vi.fn() } as never,
    )

    await service.processCoolingActions({
      supabase: {} as never,
      userId: 'owner-1',
      orgId: 'org-1',
      workflowKey: 'slack_team:all',
      deliveryMode: 'shadow',
      personIds: ['member-1'],
      quietHoursActive: false,
      people: [activeInternalPerson] as never,
      now: new Date('2026-08-06T17:10:00.000Z'),
    })

    expect(slackTools.sendMessage).not.toHaveBeenCalled()
    expect(loops.updateActionMetadata).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        metadata: expect.objectContaining({
          lifecycle_state: 'ready_for_review',
          personal_moment_shadow_only: true,
        }),
      }),
    )
  })

  it('active mode sends one standalone personal-moment message', async () => {
    const people = {
      reviewShadowAction: vi.fn().mockResolvedValue({ ...momentAction, status: 'approved' }),
      claimShadowActionForSend: vi.fn().mockResolvedValue({ ...momentAction, status: 'sending' }),
      markShadowActionSent: vi.fn().mockResolvedValue({ ...momentAction, status: 'sent' }),
      markShadowActionFailed: vi.fn(),
    }
    const loops = {
      listCoolingActions: vi.fn().mockResolvedValue([momentAction]),
      updateActionMetadata: vi.fn(),
      findRecentDigestRoot: vi.fn().mockResolvedValue({ threadTs: '999.1' }),
    }
    const slackTools = {
      openDm: vi.fn().mockResolvedValue({ channel_id: 'D1' }),
      sendMessage: vi.fn().mockResolvedValue({ ts: '500.1' }),
    }
    const service = new SlackTeamSignalDeliveryService(
      people as never,
      loops as never,
      slackTools as never,
      { refresh: vi.fn() } as never,
    )

    const result = await service.processCoolingActions({
      supabase: {} as never,
      userId: 'owner-1',
      orgId: 'org-1',
      workflowKey: 'slack_team:all',
      deliveryMode: 'active',
      personIds: ['member-1'],
      quietHoursActive: false,
      people: [activeInternalPerson] as never,
      now: new Date('2026-08-06T17:10:00.000Z'),
    })

    expect(result.sent).toBe(1)
    const sentText = String(slackTools.sendMessage.mock.calls[0]?.[3]?.text ?? '')
    expect(sentText).toContain('Happy birthday, Dylan')
    expect(sentText).not.toMatch(/^\d+\./m)
    expect(sentText).not.toContain('Here is what stood out today')
    // Standalone: ignore existing digest root thread.
    expect(slackTools.sendMessage.mock.calls[0]?.[3]).not.toHaveProperty('thread_ts')
    expect(people.markShadowActionSent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        metadata: expect.objectContaining({
          delivery_style: 'personal_moment',
          digest_thread_ts: '500.1',
        }),
      }),
    )
  })

  it('does not send the same personal moment twice once fingerprint exists at propose-time', () => {
    const key = personalMomentDedupeKey({
      orgId: 'org-1',
      subjectSlackUserId: 'U_DYLAN',
      eventType: 'birthday',
      dateKey: '2026-08-06',
    })
    expect(key).toHaveLength(64)
  })
})
