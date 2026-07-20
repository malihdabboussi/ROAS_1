import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_ADMIN_DM_EMAIL,
  MeetingFollowUpSlackConfirmService,
} from '../meeting-follow-up-slack-confirm.service'

describe('MeetingFollowUpSlackConfirmService', () => {
  const repo = {
    findItemsByIds: vi.fn(),
    findItemById: vi.fn(),
    updateItem: vi.fn(),
  }
  const config = {
    get: vi.fn((key: string) => {
      if (key === 'APP_URL') return 'https://app.roas.io'
      if (key === 'INTERNAL_API_TOKEN') return 'test-internal-token'
      return undefined
    }),
  }
  const moduleRef = {
    get: vi.fn(),
  }
  const slackTools = {
    findUserByEmail: vi.fn(),
    openDm: vi.fn(),
    sendMessage: vi.fn(),
  }
  const userAgentApi = {
    invoke: vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        draft: {
          message: 'Good connecting today.\n\n*Next steps*\n• *Dylan* — ship the AM loop',
          rationale: 'Keeps the agreed owner visible.',
          context_sources: ['meeting summary', 'follow-up records'],
        },
      }),
    }),
  }
  const slackPeopleRepo = {
    findPersonByEmail: vi.fn().mockResolvedValue({ id: 'person-dylan' }),
    findShadowAction: vi.fn(),
    createShadowAction: vi.fn().mockResolvedValue({ id: 'shadow-1' }),
    reviewShadowAction: vi.fn(),
    claimShadowActionForSend: vi.fn(),
    markShadowActionSent: vi.fn(),
    markShadowActionFailed: vi.fn(),
  }

  let service: MeetingFollowUpSlackConfirmService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new MeetingFollowUpSlackConfirmService(
      repo as never,
      config as never,
      moduleRef as never,
      slackTools as never,
      userAgentApi as never,
      slackPeopleRepo as never,
    )
  })

  it('resolves suggestion ids from the latest agent_suggest_tasks step', () => {
    const ids = service.resolveSuggestionIds({}, [
      { type: 'send_to_agent' },
      { type: 'agent_suggest_tasks', suggestion_ids: ['a', 'b'] },
      { type: 'change_status' },
    ])
    expect(ids).toEqual(['a', 'b'])
  })

  it('DMs the admin email with follow-ups and stores pending confirm payload', async () => {
    repo.findItemsByIds.mockResolvedValue([
      {
        id: 'fu-1',
        title: 'Ship AM loop',
        custom_data: { suggested_assignee_name: 'Dylan' },
      },
      {
        id: 'fu-2',
        title: 'Fix reporting SoT',
        custom_data: { suggested_assignee_name: 'Nate' },
      },
    ])
    repo.findItemById = vi.fn().mockResolvedValue({
      id: 'call-1',
      title: 'Nate and Dylan ops',
      description:
        'Meeting Purpose\n\nAlign on urgent operational challenges and define immediate priorities.\n\nKey Takeaways\n\n- Operational bandwidth',
      custom_data: {
        fathom_url: 'https://fathom.video/calls/753783387',
      },
    })
    slackTools.findUserByEmail.mockResolvedValue({ success: true, user: { id: 'U_DYLAN' } })
    slackTools.openDm.mockResolvedValue({ success: true, channel_id: 'D123' })
    slackTools.sendMessage.mockResolvedValue({ success: true, ts: '1710000000.000100' })
    repo.updateItem.mockResolvedValue({})

    const result = await service.requestConfirm({
      supabase: {} as never,
      userId: 'user-1',
      orgId: 'org-1',
      spaceId: 'space-1',
      callItemId: 'call-1',
      callTitle: 'Nate and Dylan ops',
      suggestionIds: ['fu-1', 'fu-2'],
    })

    expect(slackTools.findUserByEmail).toHaveBeenCalledWith(expect.anything(), 'user-1', 'org-1', {
      email: DEFAULT_ADMIN_DM_EMAIL,
    })
    expect(slackTools.sendMessage).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      'org-1',
      expect.objectContaining({
        channel_id: 'D123',
        text: expect.stringMatching(
          /Purpose[\s\S]*Align on urgent[\s\S]*Key takeaways[\s\S]*Operational bandwidth[\s\S]*Open Fathom recording[\s\S]*Proposed action items[\s\S]*Ship AM loop — _owner: Dylan_[\s\S]*Fix reporting SoT — _owner: Nate_/,
        ),
      }),
    )
    expect(repo.updateItem).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      'space-1',
      'call-1',
      expect.objectContaining({
        custom_data: expect.objectContaining({
          slack_follow_up_confirm: expect.objectContaining({
            status: 'pending',
            channel_id: 'D123',
            message_ts: '1710000000.000100',
            space_item_ids: ['fu-1', 'fu-2'],
            confirm_reaction: 'white_check_mark',
            dm_email: DEFAULT_ADMIN_DM_EMAIL,
          }),
        }),
      }),
      'org-1',
    )
    expect(slackPeopleRepo.createShadowAction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        targetMemberId: 'person-dylan',
        proposedContent: 'Good connecting today.\n\n*Next steps*\n• *Dylan* — ship the AM loop',
      }),
    )
    expect(userAgentApi.invoke).toHaveBeenCalledWith(
      'user-1',
      '/api/agents/post-call-draft',
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-Internal-Token': 'test-internal-token' }),
      }),
      expect.anything(),
    )
    expect(result).toMatchObject({
      channel_id: 'D123',
      message_ts: '1710000000.000100',
      suggestion_count: 2,
    })
  })

  it('skips when there are no suggestion ids', async () => {
    const result = await service.requestConfirm({
      supabase: {} as never,
      userId: 'user-1',
      orgId: null,
      spaceId: 'space-1',
      callItemId: 'call-1',
      callTitle: 'Empty',
      suggestionIds: [],
    })
    expect(result).toEqual({ skipped: true, reason: 'no_follow_ups' })
    expect(slackTools.sendMessage).not.toHaveBeenCalled()
  })

  it('uses a Slack thread reply to replace the pending client-facing Shadow draft', async () => {
    const query: Record<string, ReturnType<typeof vi.fn>> = {}
    query.select = vi.fn(() => query)
    query.eq = vi.fn(() => query)
    query.limit = vi.fn(() => query)
    query.maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'call-1',
        space_id: 'space-1',
        user_id: 'user-1',
        org_id: 'org-1',
        custom_data: {
          slack_follow_up_confirm: {
            status: 'pending',
            channel_id: 'D123',
            message_ts: '1710000000.000100',
            space_id: 'space-1',
            space_item_ids: ['fu-1'],
            confirm_reaction: 'white_check_mark',
            dm_email: DEFAULT_ADMIN_DM_EMAIL,
            requested_at: '2026-07-20T00:00:00.000Z',
            draft_message: 'Original client draft',
            shadow_action_id: 'shadow-1',
          },
        },
      },
      error: null,
    })
    moduleRef.get.mockReturnValue({ client: { from: vi.fn(() => query) } })
    repo.findItemById.mockResolvedValue({ id: 'call-1', title: 'Client call' })
    repo.findItemsByIds.mockResolvedValue([{ id: 'fu-1', title: 'Send follow-up' }])
    repo.updateItem.mockResolvedValue({})
    slackPeopleRepo.findShadowAction.mockResolvedValue({
      id: 'shadow-1',
      target_member_id: 'person-dylan',
      metadata: { source: 'meeting_follow_up' },
    })
    slackPeopleRepo.createShadowAction.mockResolvedValue({ id: 'shadow-2' })
    slackPeopleRepo.reviewShadowAction.mockResolvedValue({ id: 'shadow-1' })
    slackTools.sendMessage.mockResolvedValue({ success: true, ts: '1710000002.000100' })

    await expect(
      service.handleThreadReply({
        channelId: 'D123',
        threadTs: '1710000000.000100',
        text: 'Make it warmer and remove the deadline.',
        slackUserId: 'U_DYLAN',
      }),
    ).resolves.toBe(true)

    expect(userAgentApi.invoke).toHaveBeenCalledWith(
      'user-1',
      '/api/agents/post-call-draft',
      expect.objectContaining({
        body: expect.stringContaining('Make it warmer and remove the deadline.'),
      }),
      expect.anything(),
    )
    expect(slackPeopleRepo.createShadowAction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        targetMemberId: 'person-dylan',
        metadata: expect.objectContaining({ supersedes_shadow_action_id: 'shadow-1' }),
      }),
    )
    expect(repo.updateItem).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      'space-1',
      'call-1',
      expect.objectContaining({
        custom_data: expect.objectContaining({
          slack_follow_up_confirm: expect.objectContaining({
            shadow_action_id: 'shadow-2',
            revision_count: 1,
          }),
        }),
      }),
      'org-1',
    )
  })

  it('confirms follow-ups inside ROAS and replies in the Slack thread', async () => {
    const query: Record<string, ReturnType<typeof vi.fn>> = {}
    query.select = vi.fn(() => query)
    query.eq = vi.fn(() => query)
    query.limit = vi.fn(() => query)
    query.maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'call-1',
        space_id: 'space-1',
        user_id: 'user-1',
        org_id: 'org-1',
        custom_data: {
          slack_follow_up_confirm: {
            status: 'pending',
            channel_id: 'D123',
            message_ts: '1710000000.000100',
            space_id: 'space-1',
            space_item_ids: ['fu-1'],
            confirm_reaction: 'white_check_mark',
            dm_email: DEFAULT_ADMIN_DM_EMAIL,
            requested_at: '2026-07-20T00:00:00.000Z',
            draft_message: 'Good connecting today.\n\n*Next steps*\n• *Dylan* — ship the AM loop',
            draft_rationale: 'Keeps the agreed owner visible.',
            draft_context_sources: ['meeting summary', 'follow-up records'],
            agent_key: 'vibey',
            skill_key: 'post-call-delivery',
            shadow_action_id: 'shadow-1',
          },
        },
      },
      error: null,
    })
    const serviceSupabase = { from: vi.fn(() => query) }
    moduleRef.get.mockReturnValue({ client: serviceSupabase })
    repo.updateItem.mockResolvedValue({})
    repo.findItemById.mockResolvedValue({
      id: 'call-1',
      title: 'Nate and Dylan ops',
      description: 'Align on urgent operational challenges.',
      custom_data: { fathom_url: 'https://fathom.video/calls/753783387' },
    })
    repo.findItemsByIds.mockResolvedValue([
      {
        id: 'fu-1',
        title: 'Ship AM loop',
        custom_data: { suggested_assignee_name: 'Dylan' },
      },
    ])
    // Call org can be null while Slack lives on an org-scoped agent channel.
    serviceSupabase.from = vi.fn((table: string) => {
      if (table === 'agent_channels') {
        const channelQuery: Record<string, ReturnType<typeof vi.fn>> = {}
        channelQuery.select = vi.fn(() => channelQuery)
        channelQuery.eq = vi.fn(() => channelQuery)
        channelQuery.order = vi.fn(() => channelQuery)
        channelQuery.limit = vi.fn(() => channelQuery)
        channelQuery.maybeSingle = vi.fn().mockResolvedValue({
          data: { org_id: 'slack-org-1' },
          error: null,
        })
        return channelQuery
      }
      return query
    })
    slackTools.sendMessage.mockResolvedValue({ success: true, ts: '1710000001.000100' })
    slackPeopleRepo.reviewShadowAction.mockResolvedValue({
      id: 'shadow-1',
      metadata: { source: 'meeting_follow_up' },
    })
    slackPeopleRepo.claimShadowActionForSend.mockResolvedValue({
      id: 'shadow-1',
      metadata: { source: 'meeting_follow_up' },
    })
    slackPeopleRepo.markShadowActionSent.mockResolvedValue({ id: 'shadow-1' })

    await expect(
      service.handleReactionAdded({
        channelId: 'D123',
        messageTs: '1710000000.000100',
        reaction: 'white_check_mark',
        slackUserId: 'U_DYLAN',
      }),
    ).resolves.toBe(true)

    expect(repo.updateItem).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      'space-1',
      'call-1',
      expect.objectContaining({
        custom_data: expect.objectContaining({
          slack_follow_up_confirm: expect.objectContaining({ status: 'approved' }),
        }),
      }),
      'org-1',
    )
    expect(slackTools.sendMessage).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      'org-1',
      expect.objectContaining({
        channel_id: 'D123',
        thread_ts: '1710000000.000100',
        text: 'Good connecting today.\n\n*Next steps*\n• *Dylan* — ship the AM loop',
      }),
    )
    expect(slackPeopleRepo.markShadowActionSent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ actionId: 'shadow-1', slackTs: '1710000001.000100' }),
    )
  })

  it('builds a shareable purpose + takeaways brief and converts Fathom markdown links', () => {
    const summary = service.briefMeetingSummary({
      custom_data: {
        summary: [
          'Meeting Purpose',
          '',
          'Align on ops.',
          '',
          'Key Takeaways',
          '',
          '- Bandwidth crisis',
          '',
          'Topics',
          '',
          'Operational Crisis & Bandwidth',
          '',
          '  - Problem: long detail that should not appear in Slack brief',
          '',
          'Next Steps',
          '',
          '  - [Nate:](https://fathom.video/share/x?timestamp=1)',
          '      - Train Betty',
        ].join('\n'),
      },
    })

    expect(summary).toContain('*Purpose*')
    expect(summary).toContain('Align on ops.')
    expect(summary).toContain('*Key takeaways*')
    expect(summary).toContain('• Bandwidth crisis')
    expect(summary).toContain('*From the call*')
    expect(summary).toContain("*Nate's action items*")
    expect(summary).toContain('• Train Betty')
    expect(summary).not.toContain('<https://fathom.video/share/x?timestamp=1|Nate>')
    expect(summary).not.toContain('Operational Crisis & Bandwidth')
    expect(summary).not.toContain('long detail that should not appear')
    expect(summary).not.toContain('[Nate:](')
  })

  it('formats owner timestamp links as plain headers instead of hyperlinks', () => {
    const formatted = service.briefMeetingSummary({
      custom_data: {
        summary: [
          'Next Steps',
          '',
          '  - [Nate:](https://fathom.video/share/x?timestamp=1)',
          '      - Train Betty',
          '      - Finalize automation',
          '  - [Dylan:](https://fathom.video/share/x?timestamp=2)',
          '      - Show Aaron reporting tools',
        ].join('\n'),
      },
    })

    expect(formatted).toBe(
      [
        '*From the call*',
        "*Nate's action items*",
        '• Train Betty',
        '• Finalize automation',
        '',
        "*Dylan's action items*",
        '• Show Aaron reporting tools',
      ].join('\n'),
    )
  })

  it('converts markdown timestamp links to Slack mrkdwn', () => {
    expect(
      service.markdownLinksToSlack(
        '- [Workflow:](https://fathom.video/share/x?timestamp=932.0) Ship it',
      ),
    ).toBe('- <https://fathom.video/share/x?timestamp=932.0|Workflow> Ship it')
  })
})
