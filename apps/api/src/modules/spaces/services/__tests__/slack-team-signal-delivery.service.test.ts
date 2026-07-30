import { describe, expect, it, vi } from 'vitest'
import { SlackTeamSignalDeliveryService } from '../slack-team-signal-delivery.service'

const coolingAction = {
  id: 'proposal-1',
  target_member_id: 'member-1',
  action_kind: 'message',
  proposed_content: 'A client question still needs your attention.',
  metadata: {
    lifecycle_state: 'cooling',
    eligible_at: '2026-07-29T17:00:00.000Z',
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
  it('sends a due unresolved alert to an Active internal person after refreshing its source', async () => {
    const people = {
      reviewShadowAction: vi.fn().mockResolvedValue({ ...coolingAction, status: 'approved' }),
      claimShadowActionForSend: vi.fn().mockResolvedValue({ ...coolingAction, status: 'sending' }),
      markShadowActionSent: vi.fn().mockResolvedValue({ ...coolingAction, status: 'sent' }),
      markShadowActionFailed: vi.fn(),
    }
    const loops = {
      listCoolingActions: vi.fn().mockResolvedValue([coolingAction]),
      updateActionMetadata: vi.fn(),
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

    expect(resolution.refresh).toHaveBeenCalledWith(expect.anything(), 'org-1', 'proposal-1')
    expect(slackTools.sendMessage).toHaveBeenCalledWith(expect.anything(), 'owner-1', 'org-1', {
      channel_id: 'D1',
      text: coolingAction.proposed_content,
    })
    expect(people.markShadowActionSent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        actionId: 'proposal-1',
        slackChannelId: 'D1',
        metadata: expect.objectContaining({ lifecycle_state: 'sent' }),
      }),
    )
    expect(result).toEqual({ rechecked: 1, resolved: 0, sent: 1 })
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
    expect(result).toEqual({ rechecked: 1, resolved: 1, sent: 0 })
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
