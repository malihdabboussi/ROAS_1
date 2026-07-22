import { describe, expect, it, vi } from 'vitest'
import { isWithinSlackTeamLoopQuietHours, SlackTeamLoopService } from '../slack-team-loop.service'

const geminiAnalysis = (signals: Record<string, unknown>[]) => ({
  text: JSON.stringify({ signals }),
  usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
  providerCostUsd: 0.001,
})

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

  it('continues creating Shadow proposals during quiet hours', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-21T06:30:00.000Z'))
    const slackPeople = {
      findOrgSlackIntegration: vi.fn().mockResolvedValue({
        user_id: 'owner-1',
        access_token: 'xoxb-test',
        metadata: { team_id: 'T1' },
      }),
      listPeople: vi.fn().mockResolvedValue([]),
      createShadowAction: vi.fn(),
    }
    const observation = {
      reconcile: vi.fn().mockResolvedValue({
        channelsReconciled: 1,
        historyRequests: 1,
        threadRequests: 0,
        eventsStored: 0,
        duplicatesSkipped: 0,
      }),
      loadPendingEvents: vi.fn().mockResolvedValue({ cursor: null, events: [] }),
      advanceConsumer: vi.fn(),
    }
    const service = new SlackTeamLoopService(
      slackPeople as never,
      {} as never,
      observation as never,
      {} as never,
      {} as never,
    )

    const result = await service.run({
      supabase: {} as never,
      userId: 'owner-1',
      orgId: 'org-1',
      loopKind: 'all',
      deliveryMode: 'shadow',
      channelIds: [],
      personIds: [],
      lookbackMinutes: 30,
      dailyLimit: 10,
      quietHours: { start: '22:00', end: '07:00', timezone: 'America/Los_Angeles' },
    })

    expect(observation.reconcile).toHaveBeenCalledTimes(1)
    expect(result).toMatchObject({ messages_observed: 0, quiet_hours_active: true })
    vi.useRealTimers()
  })

  it('blocks Active mode until both channel and person allowlists are explicit', async () => {
    const peopleRepo = { findOrgSlackIntegration: vi.fn() }
    const service = new SlackTeamLoopService(
      peopleRepo as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    )

    const result = await service.run({
      supabase: {} as never,
      userId: 'owner-1',
      orgId: 'org-1',
      loopKind: 'all',
      deliveryMode: 'active',
      channelIds: [],
      personIds: [],
      lookbackMinutes: 30,
      dailyLimit: 10,
    })

    expect(result).toEqual({ skipped: true, skipped_reason: 'active_allowlist_required' })
    expect(peopleRepo.findOrgSlackIntegration).not.toHaveBeenCalled()
  })

  it('does not create an unanswered-question proposal when its Slack thread has a human reply', async () => {
    const slackPeople = {
      findOrgSlackIntegration: vi.fn().mockResolvedValue({
        user_id: 'owner-1',
        access_token: 'xoxb-test',
        metadata: { team_id: 'T1' },
      }),
      listPeople: vi.fn().mockResolvedValue([
        {
          id: 'member-1',
          platform_id: 'U1',
          display_name: 'Avery',
          relationship_kind: 'internal',
          delivery_mode: 'shadow',
          person_brain_id: null,
        },
        {
          id: 'member-2',
          platform_id: 'U2',
          display_name: 'Blake',
          relationship_kind: 'internal',
          delivery_mode: 'shadow',
          person_brain_id: null,
        },
      ]),
      createShadowAction: vi.fn(),
    }
    const observation = {
      reconcile: vi.fn().mockResolvedValue({
        channelsReconciled: 1,
        historyRequests: 1,
        threadRequests: 1,
        eventsStored: 0,
        duplicatesSkipped: 2,
      }),
      loadPendingEvents: vi.fn().mockResolvedValue({
        cursor: null,
        events: [
          {
            channel_id: 'C1',
            channel_name: 'ops',
            message_ts: '1721000000.000100',
            thread_ts: null,
            sender_slack_user_id: 'U1',
            text: 'Can somebody confirm the launch date?',
            is_bot: false,
          },
          {
            channel_id: 'C1',
            channel_name: 'ops',
            message_ts: '1721000001.000100',
            thread_ts: '1721000000.000100',
            sender_slack_user_id: 'U2',
            text: 'Confirmed for Friday.',
            is_bot: false,
          },
        ],
      }),
      advanceConsumer: vi.fn(),
    }
    const gemini = {
      callGeminiWithUsage: vi.fn().mockResolvedValue(
        geminiAnalysis([
          {
            kind: 'unanswered_question',
            target_slack_user_id: 'U1',
            target_channel_id: 'C1',
            source_message_ts: '1721000000.000100',
            proposed_content: 'I can get this answered.',
            rationale: 'The question appears unanswered.',
            brain_memory: null,
            confidence: 0.95,
          },
        ]),
      ),
    }
    const service = new SlackTeamLoopService(
      slackPeople as never,
      {
        countActionsSince: vi.fn().mockResolvedValue(0),
        hasEvidenceFingerprint: vi.fn().mockResolvedValue(false),
      } as never,
      observation as never,
      {} as never,
      gemini as never,
    )

    const result = await service.run({
      supabase: {} as never,
      userId: 'owner-1',
      orgId: 'org-1',
      loopKind: 'all',
      deliveryMode: 'shadow',
      channelIds: [],
      personIds: [],
      lookbackMinutes: 30,
      dailyLimit: 10,
    })

    expect(slackPeople.createShadowAction).not.toHaveBeenCalled()
    expect(result).toMatchObject({
      signals_detected: 1,
      signals_suppressed_by_thread: 1,
      proposed: 0,
    })
  })

  it('creates reviewable Shadow proposals with source evidence', async () => {
    const slackPeople = {
      findOrgSlackIntegration: vi.fn().mockResolvedValue({
        user_id: 'owner-1',
        access_token: 'xoxb-test',
        metadata: { team_id: 'T1' },
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
    const observation = {
      reconcile: vi.fn().mockResolvedValue({
        channelsListed: 1,
        channelsReconciled: 1,
        historyRequests: 1,
        threadRequests: 0,
        eventsStored: 1,
        duplicatesSkipped: 0,
      }),
      loadPendingEvents: vi.fn().mockResolvedValue({
        cursor: null,
        events: [
          {
            channel_id: 'C1',
            channel_name: 'client-alpha',
            message_ts: '1721000000.000100',
            thread_ts: null,
            sender_slack_user_id: 'U1',
            text: 'Can somebody confirm the launch date?',
            is_bot: false,
          },
        ],
      }),
      advanceConsumer: vi.fn().mockResolvedValue(undefined),
    }
    const gemini = {
      callGeminiWithUsage: vi.fn().mockResolvedValue(
        geminiAnalysis([
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
        ]),
      ),
    }
    const slackTools = { sendMessage: vi.fn() }
    const service = new SlackTeamLoopService(
      slackPeople as never,
      {
        countActionsSince: slackPeople.countLoopActionsSince,
        hasEvidenceFingerprint: slackPeople.hasLoopEvidenceFingerprint,
        insertPersonMemory: slackPeople.insertSlackPersonMemory,
      } as never,
      observation as never,
      slackTools as never,
      gemini as never,
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
    expect(observation.reconcile).toHaveBeenCalledTimes(1)
    expect(observation.loadPendingEvents).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 250 }),
    )
    const completionInput = openRouter.createChatCompletion.mock.calls[0]?.[0]
    const signalsSchema = completionInput?.body?.response_format?.json_schema?.schema?.properties
      ?.signals as Record<string, unknown> | undefined
    expect(signalsSchema).not.toHaveProperty('maxItems')
    expect(result).toMatchObject({ channels_observed: 1, messages_observed: 1, proposed: 1 })
  })

  it('writes Person Brain memories in Active mode without messaging Slack', async () => {
    const slackPeople = {
      findOrgSlackIntegration: vi.fn().mockResolvedValue({
        user_id: 'owner-1',
        access_token: 'xoxb-test',
        metadata: { team_id: 'T1' },
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
    const observation = {
      reconcile: vi.fn().mockResolvedValue({ channelsReconciled: 1 }),
      loadPendingEvents: vi.fn().mockResolvedValue({
        cursor: null,
        events: [
          {
            channel_id: 'C1',
            channel_name: 'ops',
            message_ts: '1721000000.000100',
            thread_ts: null,
            sender_slack_user_id: 'U1',
            text: 'I own the weekly reporting review.',
            is_bot: false,
          },
        ],
      }),
      advanceConsumer: vi.fn().mockResolvedValue(undefined),
    }
    const gemini = {
      callGeminiWithUsage: vi.fn().mockResolvedValue(
        geminiAnalysis([
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
        ]),
      ),
    }
    const slackTools = { sendMessage: vi.fn() }
    const service = new SlackTeamLoopService(
      slackPeople as never,
      {
        countActionsSince: slackPeople.countLoopActionsSince,
        hasEvidenceFingerprint: slackPeople.hasLoopEvidenceFingerprint,
        insertPersonMemory: slackPeople.insertSlackPersonMemory,
      } as never,
      observation as never,
      slackTools as never,
      gemini as never,
    )

    const result = await service.run({
      supabase: {} as never,
      userId: 'owner-1',
      orgId: 'org-1',
      loopKind: 'brain_compounding',
      deliveryMode: 'active',
      channelIds: ['C1'],
      personIds: ['3f046d1a-4e0e-4ccc-9ea7-b8c07ab25b43'],
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
        metadata: { team_id: 'T1' },
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
    const observation = {
      reconcile: vi.fn().mockResolvedValue({ channelsReconciled: 1 }),
      loadPendingEvents: vi.fn().mockResolvedValue({
        cursor: null,
        events: [
          {
            channel_id: 'C1',
            channel_name: 'ops',
            message_ts: '1721000000.000100',
            thread_ts: null,
            sender_slack_user_id: 'U1',
            text: 'Can someone confirm the launch date?',
            is_bot: false,
          },
        ],
      }),
      advanceConsumer: vi.fn().mockResolvedValue(undefined),
    }
    const gemini = {
      callGeminiWithUsage: vi.fn().mockResolvedValue(
        geminiAnalysis([
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
        ]),
      ),
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
      observation as never,
      slackTools as never,
      gemini as never,
    )

    const result = await service.run({
      supabase: {} as never,
      userId: 'owner-1',
      orgId: 'org-1',
      loopKind: 'unanswered_questions',
      deliveryMode: 'active',
      channelIds: ['C1'],
      personIds: ['3f046d1a-4e0e-4ccc-9ea7-b8c07ab25b43'],
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
