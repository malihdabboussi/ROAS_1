import { describe, expect, it, vi } from 'vitest'
import { SlackTeamSignalDeliveryService } from '../slack-team-signal-delivery.service'
import { composeDigestMessage, composeThreadFollowUp } from '../slack-team-signal-message'

const coolingAction = {
  id: 'proposal-1',
  target_member_id: 'member-1',
  action_kind: 'message',
  proposed_content: 'A client question still needs your attention.',
  metadata: {
    lifecycle_state: 'cooling',
    eligible_at: '2026-07-29T17:00:00.000Z',
    signal_kind: 'unanswered_question',
    subject_display_name: 'Casey Client',
    source_channel_name: 'client-alpha',
  },
}

const coolingActionTwo = {
  id: 'proposal-2',
  target_member_id: 'member-1',
  action_kind: 'message',
  proposed_content: 'Who owns the follow-up on assets?',
  metadata: {
    lifecycle_state: 'cooling',
    eligible_at: '2026-07-29T17:00:00.000Z',
    signal_kind: 'unanswered_question',
    subject_display_name: 'Yasir Khan',
    source_channel_name: 'roas-yasir-khan-coaching-ltd-955',
  },
}

const activeInternalPerson = {
  id: 'member-1',
  platform_id: 'U1',
  display_name: 'Dylan',
  relationship_kind: 'internal',
  delivery_mode: 'active',
}

describe('SlackTeamSignalDeliveryService', () => {
  it('delivers contextual briefing signals without treating replies as resolution', async () => {
    const update = {
      ...coolingAction,
      metadata: {
        ...coolingAction.metadata,
        signal_kind: 'team_win',
        signal_finding: 'The Shawn webinar crossed $150K and set a new client milestone.',
      },
    }
    const people = {
      reviewShadowAction: vi.fn().mockResolvedValue({ ...update, status: 'approved' }),
      claimShadowActionForSend: vi.fn().mockResolvedValue({ ...update, status: 'sending' }),
      markShadowActionSent: vi.fn().mockResolvedValue({ ...update, status: 'sent' }),
      markShadowActionFailed: vi.fn(),
    }
    const loops = {
      listCoolingActions: vi.fn().mockResolvedValue([update]),
      updateActionMetadata: vi.fn(),
      findRecentDigestRoot: vi.fn().mockResolvedValue(null),
    }
    const slackTools = {
      openDm: vi.fn().mockResolvedValue({ channel_id: 'D1' }),
      sendMessage: vi.fn().mockResolvedValue({ ts: '201.1' }),
    }
    const resolution = { refresh: vi.fn() }
    const service = new SlackTeamSignalDeliveryService(
      people as never,
      loops as never,
      slackTools as never,
      resolution as never,
    )

    await service.processCoolingActions({
      supabase: {} as never,
      userId: 'owner-1',
      orgId: 'org-1',
      workflowKey: 'slack_team:all',
      deliveryMode: 'shadow',
      personIds: [],
      quietHoursActive: false,
      people: [activeInternalPerson] as never,
      now: new Date('2026-07-29T17:31:00.000Z'),
    })

    expect(resolution.refresh).not.toHaveBeenCalled()
    const sentText = String(slackTools.sendMessage.mock.calls[0]?.[3]?.text ?? '')
    expect(sentText).toMatch(/Shawn webinar crossed \$150K/i)
    expect(sentText).toContain('Win')
    expect(sentText).not.toContain('still need eyes')
    expect(sentText).not.toContain('Want a reply drafted')
  })

  it('sends a compiled contextual digest instead of the raw proposed_content', async () => {
    const people = {
      reviewShadowAction: vi.fn().mockResolvedValue({ ...coolingAction, status: 'approved' }),
      claimShadowActionForSend: vi.fn().mockResolvedValue({ ...coolingAction, status: 'sending' }),
      markShadowActionSent: vi.fn().mockResolvedValue({ ...coolingAction, status: 'sent' }),
      markShadowActionFailed: vi.fn(),
    }
    const loops = {
      listCoolingActions: vi.fn().mockResolvedValue([coolingAction]),
      updateActionMetadata: vi.fn(),
      findRecentDigestRoot: vi.fn().mockResolvedValue(null),
    }
    const slackTools = {
      openDm: vi.fn().mockResolvedValue({ channel_id: 'D1' }),
      sendMessage: vi.fn().mockResolvedValue({ ts: '200.1' }),
    }
    const resolution = {
      refresh: vi.fn().mockResolvedValue({
        action: coolingAction,
        resolution: {
          resolved: false,
          source_available: true,
          reason: 'No later human reply was found in the source thread.',
          checked_at: '2026-07-29T17:31:00.000Z',
          reply_count: 0,
          reaction_count: 0,
        },
      }),
    }
    const service = new SlackTeamSignalDeliveryService(
      people as never,
      loops as never,
      slackTools as never,
      resolution as never,
    )

    const result = await service.processCoolingActions({
      supabase: {} as never,
      userId: 'owner-1',
      orgId: 'org-1',
      workflowKey: 'slack_team:all',
      deliveryMode: 'shadow',
      personIds: [],
      quietHoursActive: false,
      people: [activeInternalPerson] as never,
      now: new Date('2026-07-29T17:31:00.000Z'),
    })

    const expected = composeDigestMessage(
      [
        {
          subjectName: 'Casey Client',
          channelName: 'client-alpha',
          kind: 'unanswered_question',
          finding: coolingAction.proposed_content,
        },
      ],
      { recipientName: 'Dylan', now: new Date('2026-07-29T17:31:00.000Z') },
    )
    expect(resolution.refresh).toHaveBeenCalledWith(expect.anything(), 'org-1', 'proposal-1')
    expect(slackTools.sendMessage).toHaveBeenCalledWith(expect.anything(), 'owner-1', 'org-1', {
      channel_id: 'D1',
      text: expected,
    })
    expect(expected).toContain('*Casey Client in #client-alpha*')
    expect(expected).toContain('Asked:')
    expect(expected).not.toContain('Pixel will not message the external person')
    expect(people.markShadowActionSent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        actionId: 'proposal-1',
        slackChannelId: 'D1',
        metadata: expect.objectContaining({
          lifecycle_state: 'sent',
          digest_is_root: true,
          digest_thread_ts: '200.1',
          delivery_style: 'compiled_digest',
        }),
      }),
    )
    expect(result).toEqual(expect.objectContaining({ rechecked: 1, resolved: 0, sent: 1 }))
    expect(result.delivery_outcomes).toEqual([
      expect.objectContaining({ can_send: true, reason: 'allowed' }),
    ])
  })

  it('batches multiple due alerts into one compiled digest for the same recipient', async () => {
    const people = {
      reviewShadowAction: vi.fn().mockResolvedValue({ status: 'approved' }),
      claimShadowActionForSend: vi.fn().mockResolvedValue({ status: 'sending' }),
      markShadowActionSent: vi.fn().mockResolvedValue({ status: 'sent' }),
      markShadowActionFailed: vi.fn(),
    }
    const loops = {
      listCoolingActions: vi.fn().mockResolvedValue([coolingAction, coolingActionTwo]),
      updateActionMetadata: vi.fn(),
      findRecentDigestRoot: vi.fn().mockResolvedValue(null),
    }
    const slackTools = {
      openDm: vi.fn().mockResolvedValue({ channel_id: 'D1' }),
      sendMessage: vi.fn().mockResolvedValue({ ts: '300.1' }),
    }
    const resolution = {
      refresh: vi
        .fn()
        .mockResolvedValueOnce({
          action: coolingAction,
          resolution: {
            resolved: false,
            source_available: true,
            reason: 'open',
            checked_at: '2026-07-29T17:31:00.000Z',
            reply_count: 0,
            reaction_count: 0,
          },
        })
        .mockResolvedValueOnce({
          action: coolingActionTwo,
          resolution: {
            resolved: false,
            source_available: true,
            reason: 'open',
            checked_at: '2026-07-29T17:31:00.000Z',
            reply_count: 0,
            reaction_count: 0,
          },
        }),
    }
    const service = new SlackTeamSignalDeliveryService(
      people as never,
      loops as never,
      slackTools as never,
      resolution as never,
    )

    const result = await service.processCoolingActions({
      supabase: {} as never,
      userId: 'owner-1',
      orgId: 'org-1',
      workflowKey: 'slack_team:all',
      deliveryMode: 'shadow',
      personIds: [],
      quietHoursActive: false,
      people: [activeInternalPerson] as never,
      now: new Date('2026-07-29T17:31:00.000Z'),
    })

    expect(slackTools.sendMessage).toHaveBeenCalledTimes(1)
    const sentText = String(slackTools.sendMessage.mock.calls[0]?.[3]?.text ?? '')
    expect(sentText).toMatch(/^(Hey|Morning) Dylan/)
    expect(sentText).toContain('1. *Casey Client in #client-alpha*')
    expect(sentText).toContain('2. *Yasir Khan in #')
    expect(sentText).toContain('Asked:')
    expect(sentText).not.toContain('Yasir Khan — unanswered question in #')
    expect(sentText).not.toContain('had a question in #')
    expect(people.markShadowActionSent).toHaveBeenCalledTimes(2)
    expect(result).toEqual(expect.objectContaining({ rechecked: 2, resolved: 0, sent: 2 }))
  })

  it('posts follow-ups into the open digest thread instead of a new top-level chat', async () => {
    const people = {
      reviewShadowAction: vi.fn().mockResolvedValue({ status: 'approved' }),
      claimShadowActionForSend: vi.fn().mockResolvedValue({ status: 'sending' }),
      markShadowActionSent: vi.fn().mockResolvedValue({ status: 'sent' }),
      markShadowActionFailed: vi.fn(),
    }
    const loops = {
      listCoolingActions: vi.fn().mockResolvedValue([coolingAction]),
      updateActionMetadata: vi.fn(),
      findRecentDigestRoot: vi.fn().mockResolvedValue({
        channelId: 'D1',
        threadTs: '100.1',
      }),
    }
    const slackTools = {
      openDm: vi.fn().mockResolvedValue({ channel_id: 'D1' }),
      sendMessage: vi.fn().mockResolvedValue({ ts: '100.2' }),
    }
    const resolution = {
      refresh: vi.fn().mockResolvedValue({
        action: coolingAction,
        resolution: {
          resolved: false,
          source_available: true,
          reason: 'open',
          checked_at: '2026-07-29T17:31:00.000Z',
          reply_count: 0,
          reaction_count: 0,
        },
      }),
    }
    const service = new SlackTeamSignalDeliveryService(
      people as never,
      loops as never,
      slackTools as never,
      resolution as never,
    )

    await service.processCoolingActions({
      supabase: {} as never,
      userId: 'owner-1',
      orgId: 'org-1',
      workflowKey: 'slack_team:all',
      deliveryMode: 'shadow',
      personIds: [],
      quietHoursActive: false,
      people: [activeInternalPerson] as never,
      now: new Date('2026-07-29T17:31:00.000Z'),
    })

    const expected = composeThreadFollowUp(
      [
        {
          subjectName: 'Casey Client',
          channelName: 'client-alpha',
          kind: 'unanswered_question',
          finding: coolingAction.proposed_content,
        },
      ],
      { recipientName: 'Dylan' },
    )
    expect(slackTools.sendMessage).toHaveBeenCalledWith(expect.anything(), 'owner-1', 'org-1', {
      channel_id: 'D1',
      text: expected,
      thread_ts: '100.1',
    })
    expect(people.markShadowActionSent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        metadata: expect.objectContaining({
          digest_is_root: false,
          digest_thread_ts: '100.1',
          delivery_style: 'thread_follow_up',
        }),
      }),
    )
  })

  it('dismisses a due alert when a refreshed thread shows it was resolved', async () => {
    const people = {
      reviewShadowAction: vi.fn().mockResolvedValue({ ...coolingAction, status: 'dismissed' }),
      claimShadowActionForSend: vi.fn(),
      markShadowActionSent: vi.fn(),
    }
    const loops = {
      listCoolingActions: vi.fn().mockResolvedValue([coolingAction]),
      updateActionMetadata: vi.fn().mockResolvedValue(coolingAction),
      findRecentDigestRoot: vi.fn(),
    }
    const slackTools = { openDm: vi.fn(), sendMessage: vi.fn() }
    const resolution = {
      refresh: vi.fn().mockResolvedValue({
        action: coolingAction,
        resolution: {
          resolved: true,
          source_available: true,
          reason: 'A later human reply was found.',
          checked_at: '2026-07-29T17:31:00.000Z',
          reply_count: 1,
          reaction_count: 0,
        },
      }),
    }
    const service = new SlackTeamSignalDeliveryService(
      people as never,
      loops as never,
      slackTools as never,
      resolution as never,
    )

    const result = await service.processCoolingActions({
      supabase: {} as never,
      userId: 'owner-1',
      orgId: 'org-1',
      workflowKey: 'slack_team:all',
      deliveryMode: 'shadow',
      personIds: [],
      quietHoursActive: false,
      people: [activeInternalPerson] as never,
      now: new Date('2026-07-29T17:31:00.000Z'),
    })

    expect(people.reviewShadowAction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ actionId: 'proposal-1', status: 'dismissed' }),
    )
    expect(slackTools.sendMessage).not.toHaveBeenCalled()
    expect(result).toEqual(expect.objectContaining({ rechecked: 1, resolved: 1, sent: 0 }))
    expect(result.delivery_outcomes).toEqual([
      expect.objectContaining({ can_send: false, reason: 'resolved_before_delivery' }),
    ])
  })

  it('keeps an alert reviewable when its Slack source cannot be verified', async () => {
    const people = {
      reviewShadowAction: vi.fn(),
      claimShadowActionForSend: vi.fn(),
      markShadowActionSent: vi.fn(),
    }
    const loops = {
      listCoolingActions: vi.fn().mockResolvedValue([coolingAction]),
      updateActionMetadata: vi.fn().mockResolvedValue(coolingAction),
      findRecentDigestRoot: vi.fn(),
    }
    const slackTools = { openDm: vi.fn(), sendMessage: vi.fn() }
    const resolution = {
      refresh: vi.fn().mockResolvedValue({
        action: coolingAction,
        resolution: {
          resolved: false,
          source_available: false,
          reason: 'Source thread is unavailable.',
          checked_at: '2026-07-29T17:31:00.000Z',
          reply_count: 0,
          reaction_count: 0,
        },
      }),
    }
    const service = new SlackTeamSignalDeliveryService(
      people as never,
      loops as never,
      slackTools as never,
      resolution as never,
    )

    await service.processCoolingActions({
      supabase: {} as never,
      userId: 'owner-1',
      orgId: 'org-1',
      workflowKey: 'slack_team:all',
      deliveryMode: 'shadow',
      personIds: [],
      quietHoursActive: false,
      people: [activeInternalPerson] as never,
      now: new Date('2026-07-29T17:31:00.000Z'),
    })

    expect(loops.updateActionMetadata).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        metadata: expect.objectContaining({
          lifecycle_state: 'ready_for_review',
          recheck_reason: 'Source thread is unavailable.',
        }),
      }),
    )
    expect(people.reviewShadowAction).not.toHaveBeenCalled()
    expect(slackTools.sendMessage).not.toHaveBeenCalled()
  })
})
