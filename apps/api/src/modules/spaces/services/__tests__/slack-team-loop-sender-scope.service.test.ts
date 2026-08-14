import { describe, expect, it, vi } from 'vitest'
import { SlackTeamLoopService } from '../slack-team-loop.service'

describe('SlackTeamLoopService sender scope', () => {
  it('analyzes external senders while keeping the Active delivery person allowlist', async () => {
    const owner = {
      id: 'owner-member',
      platform_id: 'U_OWNER',
      display_name: 'Dylan',
      vibey_user_id: 'owner-1',
      relationship_kind: 'internal',
      delivery_mode: 'active',
      person_brain_id: 'owner-brain',
    }
    const bonnie = {
      id: 'bonnie-member',
      platform_id: 'U_BONNIE',
      display_name: 'Bonnie',
      vibey_user_id: null,
      relationship_kind: 'external',
      delivery_mode: 'shadow',
      person_brain_id: 'bonnie-brain',
    }
    const peopleRepo = {
      findOrgSlackIntegration: vi.fn().mockResolvedValue({
        user_id: 'owner-1',
        access_token: 'xoxb-test',
        metadata: { team_id: 'T1' },
      }),
      listPeople: vi.fn().mockResolvedValue([owner, bonnie]),
    }
    const observation = {
      reconcile: vi.fn().mockResolvedValue({
        channelsReconciled: 1,
        historyRequests: 1,
        threadRequests: 0,
        eventsStored: 1,
        duplicatesSkipped: 0,
      }),
      loadPendingEvents: vi.fn().mockResolvedValue({
        cursor: '1721000000.000000',
        events: [
          {
            channel_id: 'C_CLIENT',
            channel_name: 'roas-wholesale-universe_-inc_',
            message_ts: '1721000001.000100',
            thread_ts: null,
            sender_slack_user_id: 'U_BONNIE',
            text: 'How many bookings have we gotten from the webinar replay campaign?',
            is_bot: false,
          },
        ],
      }),
      advanceConsumer: vi.fn(),
    }
    const gemini = {
      callGeminiWithUsage: vi.fn().mockResolvedValue({
        text: JSON.stringify({
          signals: [
            {
              kind: 'unanswered_question',
              target_slack_user_id: 'U_BONNIE',
              target_channel_id: 'C_CLIENT',
              source_message_ts: '1721000001.000100',
              proposed_content: 'Bonnie asked for webinar replay booking performance.',
              rationale: 'The client asked a direct question without a reply.',
              brain_memory: null,
              confidence: 0.98,
            },
            {
              kind: 'brain_memory',
              target_slack_user_id: 'U_BONNIE',
              target_channel_id: 'C_CLIENT',
              source_message_ts: '1721000001.000100',
              proposed_content: 'Bonnie monitors webinar replay bookings.',
              rationale: 'The message indicates an interest.',
              brain_memory: 'Bonnie monitors webinar replay bookings.',
              confidence: 0.9,
            },
          ],
        }),
        usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
        providerCostUsd: 0.001,
      }),
    }
    const signalDelivery = {
      processCoolingActions: vi.fn().mockResolvedValue({ rechecked: 0, resolved: 0, sent: 0 }),
    }
    const signalRouting = {
      route: vi.fn().mockResolvedValue({ proposed: 1, memoriesCompounded: 0 }),
    }
    const service = new SlackTeamLoopService(
      peopleRepo as never,
      { countActionsSince: vi.fn().mockResolvedValue(0) } as never,
      observation as never,
      {} as never,
      gemini as never,
      { resolveSlackSenders: vi.fn() } as never,
      undefined,
      signalDelivery as never,
      signalRouting as never,
    )

    await service.run({
      supabase: {} as never,
      userId: 'owner-1',
      orgId: 'org-1',
      loopKind: 'all',
      deliveryMode: 'active',
      channelIds: ['C_CLIENT'],
      personIds: ['owner-member'],
      lookbackMinutes: 60,
      dailyLimit: 10,
    })

    expect(observation.loadPendingEvents).toHaveBeenCalledWith(
      expect.objectContaining({ senderSlackUserIds: [] }),
    )
    expect(signalDelivery.processCoolingActions).toHaveBeenCalledWith(
      expect.objectContaining({ personIds: ['owner-member'] }),
    )
    expect(signalRouting.route).toHaveBeenCalledWith(
      expect.objectContaining({
        caseSignals: expect.arrayContaining([
          expect.objectContaining({
            kind: 'unanswered_question',
            target_slack_user_id: 'U_BONNIE',
          }),
        ]),
        signals: [expect.objectContaining({ kind: 'unanswered_question' })],
      }),
    )
  })
})
