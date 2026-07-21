import { describe, expect, it, vi } from 'vitest'
import { isWithinSlackTeamLoopQuietHours, SlackTeamLoopService } from '../slack-team-loop.service'

describe('SlackTeamLoopService', () => {
  it('handles quiet-hour windows that cross midnight', () => {
    expect(
      isWithinSlackTeamLoopQuietHours(new Date('2026-07-21T06:30:00.000Z'), {
        start: '22:00',
        end: '07:00',
        timezone: 'America/Los_Angeles',
      }),
    ).toBe(true)
    expect(
      isWithinSlackTeamLoopQuietHours(new Date('2026-07-21T19:00:00.000Z'), {
        start: '22:00',
        end: '07:00',
        timezone: 'America/Los_Angeles',
      }),
    ).toBe(false)
  })

  it('creates reviewable Shadow proposals with source evidence', async () => {
    const slackPeople = {
      findOrgSlackIntegration: vi.fn().mockResolvedValue({
        user_id: 'owner-1',
        access_token: 'xoxb-test',
        metadata: {},
      }),
      listPeople: vi.fn().mockResolvedValue([
        {
          id: '3f046d1a-4e0e-4ccc-9ea7-b8c07ab25b43',
          platform_id: 'U1',
          display_name: 'Avery',
          relationship_kind: 'internal',
          delivery_mode: 'shadow',
          person_brain_id: 'brain-1',
        },
      ]),
      countLoopActionsSince: vi.fn().mockResolvedValue(0),
      hasLoopEvidenceFingerprint: vi.fn().mockResolvedValue(false),
      createShadowAction: vi.fn().mockResolvedValue({ id: 'proposal-1' }),
      insertSlackPersonMemory: vi.fn(),
    }
    const slackApi = {
      listConversations: vi
        .fn()
        .mockResolvedValue([{ id: 'C1', name: 'client-alpha', is_member: true }]),
      getChannelHistorySince: vi
        .fn()
        .mockResolvedValue([
          { ts: '1721000000.000100', user: 'U1', text: 'Can somebody confirm the launch date?' },
        ]),
    }
    const openRouter = {
      createChatCompletion: vi.fn().mockResolvedValue({
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  signals: [
                    {
                      kind: 'unanswered_question',
                      target_slack_user_id: 'U1',
                      target_channel_id: 'C1',
                      source_message_ts: '1721000000.000100',
                      proposed_content: 'I can confirm the launch date once the owner responds.',
                      rationale: 'A direct launch-date question has no answer yet.',
                      brain_memory: null,
                      confidence: 0.93,
                    },
                  ],
                }),
              },
            },
          ],
        },
      }),
    }
    const slackTools = { sendMessage: vi.fn() }
    const service = new SlackTeamLoopService(
      slackPeople as never,
      {
        countActionsSince: slackPeople.countLoopActionsSince,
        hasEvidenceFingerprint: slackPeople.hasLoopEvidenceFingerprint,
        insertPersonMemory: slackPeople.insertSlackPersonMemory,
      } as never,
      slackApi as never,
      slackTools as never,
      openRouter as never,
    )

    const result = await service.run({
      supabase: {} as never,
      userId: 'owner-1',
      orgId: 'org-1',
      loopKind: 'unanswered_questions',
      deliveryMode: 'shadow',
      channelIds: ['C1'],
      personIds: [],
      lookbackMinutes: 60,
      dailyLimit: 10,
    })

    expect(slackPeople.createShadowAction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        actionKind: 'message',
        targetMemberId: '3f046d1a-4e0e-4ccc-9ea7-b8c07ab25b43',
        sourceChannelId: 'C1',
        sourceMessageTs: '1721000000.000100',
        workflowKey: 'slack_team:unanswered_questions',
      }),
    )
    expect(slackTools.sendMessage).not.toHaveBeenCalled()
    expect(result).toMatchObject({ channels_observed: 1, messages_observed: 1, proposed: 1 })
  })

  it('writes Person Brain memories in Active mode without messaging Slack', async () => {
    const slackPeople = {
      findOrgSlackIntegration: vi.fn().mockResolvedValue({
        user_id: 'owner-1',
        access_token: 'xoxb-test',
        metadata: {},
      }),
      listPeople: vi.fn().mockResolvedValue([
        {
          id: '3f046d1a-4e0e-4ccc-9ea7-b8c07ab25b43',
          platform_id: 'U1',
          display_name: 'Avery',
          relationship_kind: 'internal',
          delivery_mode: 'active',
          person_brain_id: 'brain-1',
        },
      ]),
      countLoopActionsSince: vi.fn().mockResolvedValue(0),
      hasLoopEvidenceFingerprint: vi.fn().mockResolvedValue(false),
      createShadowAction: vi.fn(),
      insertSlackPersonMemory: vi.fn().mockResolvedValue({ id: 'memory-1', created: true }),
    }
    const slackApi = {
      listConversations: vi.fn().mockResolvedValue([{ id: 'C1', name: 'ops', is_member: true }]),
      getChannelHistorySince: vi
        .fn()
        .mockResolvedValue([
          { ts: '1721000000.000100', user: 'U1', text: 'I own the weekly reporting review.' },
        ]),
    }
    const openRouter = {
      createChatCompletion: vi.fn().mockResolvedValue({
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  signals: [
                    {
                      kind: 'brain_memory',
                      target_slack_user_id: 'U1',
                      target_channel_id: 'C1',
                      source_message_ts: '1721000000.000100',
                      proposed_content: 'Avery owns the weekly reporting review.',
                      rationale: 'Avery explicitly stated ownership.',
                      brain_memory: 'Avery owns the weekly reporting review.',
                      confidence: 0.97,
                    },
                  ],
                }),
              },
            },
          ],
        },
      }),
    }
    const slackTools = { sendMessage: vi.fn() }
    const service = new SlackTeamLoopService(
      slackPeople as never,
      {
        countActionsSince: slackPeople.countLoopActionsSince,
        hasEvidenceFingerprint: slackPeople.hasLoopEvidenceFingerprint,
        insertPersonMemory: slackPeople.insertSlackPersonMemory,
      } as never,
      slackApi as never,
      slackTools as never,
      openRouter as never,
    )

    const result = await service.run({
      supabase: {} as never,
      userId: 'owner-1',
      orgId: 'org-1',
      loopKind: 'brain_compounding',
      deliveryMode: 'active',
      channelIds: ['C1'],
      personIds: [],
      lookbackMinutes: 60,
      dailyLimit: 10,
    })

    expect(slackPeople.insertSlackPersonMemory).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ brainId: 'brain-1', sourceChannelId: 'C1' }),
    )
    expect(slackTools.sendMessage).not.toHaveBeenCalled()
    expect(result.memories_compounded).toBe(1)
  })

  it('records an Active unanswered-question action as sent', async () => {
    const slackPeople = {
      findOrgSlackIntegration: vi.fn().mockResolvedValue({
        user_id: 'owner-1',
        access_token: 'xoxb-test',
        metadata: {},
      }),
      listPeople: vi.fn().mockResolvedValue([
        {
          id: '3f046d1a-4e0e-4ccc-9ea7-b8c07ab25b43',
          platform_id: 'U1',
          display_name: 'Avery',
          relationship_kind: 'internal',
          delivery_mode: 'active',
          person_brain_id: 'brain-1',
        },
      ]),
      countLoopActionsSince: vi.fn().mockResolvedValue(0),
      hasLoopEvidenceFingerprint: vi.fn().mockResolvedValue(false),
      createShadowAction: vi.fn().mockResolvedValue({
        id: 'proposal-1',
        metadata: { delivery_mode: 'active' },
      }),
      reviewShadowAction: vi.fn().mockResolvedValue({ id: 'proposal-1', status: 'approved' }),
      claimShadowActionForSend: vi.fn().mockResolvedValue({ id: 'proposal-1', status: 'sending' }),
      markShadowActionSent: vi.fn().mockResolvedValue({ id: 'proposal-1', status: 'sent' }),
      markShadowActionFailed: vi.fn(),
      insertSlackPersonMemory: vi.fn(),
    }
    const slackApi = {
      listConversations: vi.fn().mockResolvedValue([{ id: 'C1', name: 'ops', is_member: true }]),
      getChannelHistorySince: vi
        .fn()
        .mockResolvedValue([
          { ts: '1721000000.000100', user: 'U1', text: 'Can someone confirm the launch date?' },
        ]),
    }
    const openRouter = {
      createChatCompletion: vi.fn().mockResolvedValue({
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  signals: [
                    {
                      kind: 'unanswered_question',
                      target_slack_user_id: 'U1',
                      target_channel_id: 'C1',
                      source_message_ts: '1721000000.000100',
                      proposed_content: 'I can help get the launch date confirmed.',
                      rationale: 'A direct question is unanswered.',
                      brain_memory: null,
                      confidence: 0.95,
                    },
                  ],
                }),
              },
            },
          ],
        },
      }),
    }
    const slackTools = {
      openDm: vi.fn().mockResolvedValue({ channel_id: 'D1' }),
      sendMessage: vi.fn().mockResolvedValue({ success: true, ts: '1721000100.000200' }),
    }
    const service = new SlackTeamLoopService(
      slackPeople as never,
      {
        countActionsSince: slackPeople.countLoopActionsSince,
        hasEvidenceFingerprint: slackPeople.hasLoopEvidenceFingerprint,
        insertPersonMemory: slackPeople.insertSlackPersonMemory,
      } as never,
      slackApi as never,
      slackTools as never,
      openRouter as never,
    )

    const result = await service.run({
      supabase: {} as never,
      userId: 'owner-1',
      orgId: 'org-1',
      loopKind: 'unanswered_questions',
      deliveryMode: 'active',
      channelIds: ['C1'],
      personIds: [],
      lookbackMinutes: 60,
      dailyLimit: 10,
    })

    expect(slackPeople.reviewShadowAction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ actionId: 'proposal-1', status: 'approved' }),
    )
    expect(slackPeople.claimShadowActionForSend).toHaveBeenCalled()
    expect(slackPeople.markShadowActionSent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ actionId: 'proposal-1', slackTs: '1721000100.000200' }),
    )
    expect(result).toMatchObject({ proposed: 1, sent: 1 })
  })
})
