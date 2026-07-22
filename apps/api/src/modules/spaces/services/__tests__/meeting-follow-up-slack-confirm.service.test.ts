import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SupabaseServiceClient } from '@vibey/api-shared'
import { PageGraderApiService } from '../../../integrations/page-grader/services/page-grader-api.service'
import {
  DEFAULT_ADMIN_DM_EMAIL,
  MeetingFollowUpSlackConfirmService,
} from '../meeting-follow-up-slack-confirm.service'

describe('MeetingFollowUpSlackConfirmService', () => {
  const repo = {
    findItemsByIds: vi.fn(),
    findItemById: vi.fn(),
    findSpaceByIdForAccess: vi.fn(),
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
    findPersonByDisplayName: vi.fn().mockResolvedValue(null),
    findShadowAction: vi.fn(),
    createShadowAction: vi.fn().mockResolvedValue({ id: 'shadow-1' }),
    reviewShadowAction: vi.fn(),
    claimShadowActionForSend: vi.fn(),
    markShadowActionSent: vi.fn(),
    markShadowActionFailed: vi.fn(),
    listPeople: vi.fn().mockResolvedValue([]),
    findAssigneeReminderBySlackMessage: vi.fn().mockResolvedValue(null),
  }
  const slackPeople = {
    reviewShadowAction: vi.fn().mockResolvedValue({ action: { id: 'reviewed' } }),
    sendShadowAction: vi.fn().mockResolvedValue({ action: { id: 'sent', status: 'sent' } }),
  }

  let service: MeetingFollowUpSlackConfirmService

  beforeEach(() => {
    vi.clearAllMocks()
    slackTools.sendMessage.mockReset()
    moduleRef.get.mockReturnValue(undefined)
    service = new MeetingFollowUpSlackConfirmService(
      repo as never,
      config as never,
      moduleRef as never,
      slackTools as never,
      userAgentApi as never,
      slackPeopleRepo as never,
      slackPeople as never,
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
    slackTools.sendMessage
      .mockResolvedValueOnce({ success: true, ts: '1710000000.000100' })
      .mockResolvedValueOnce({ success: true, ts: '1710000000.000200' })
    repo.updateItem.mockResolvedValue({})

    const result = await service.requestConfirm({
      supabase: {} as never,
      userId: 'user-1',
      orgId: 'org-1',
      spaceId: 'space-1',
      callItemId: 'call-1',
      callTitle: 'Nate and Dylan ops',
      suggestionIds: ['fu-1', 'fu-2'],
      deliveryMode: 'active',
    })

    expect(userAgentApi.invoke).toHaveBeenCalledWith(
      'user-1',
      '/api/agents/post-call-draft',
      expect.objectContaining({
        body: expect.stringMatching(/"known_names"/),
      }),
      expect.anything(),
    )
    expect(slackTools.findUserByEmail).toHaveBeenCalledWith(expect.anything(), 'user-1', 'org-1', {
      email: DEFAULT_ADMIN_DM_EMAIL,
    })
    expect(slackTools.sendMessage).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      'user-1',
      'org-1',
      expect.objectContaining({
        channel_id: 'D123',
        unfurl_links: false,
        text: expect.stringMatching(
          /Call report[\s\S]*Purpose[\s\S]*Align on urgent[\s\S]*Key takeaways[\s\S]*Operational bandwidth[\s\S]*Proposed action items[\s\S]*Ship AM loop — _owner: Dylan_[\s\S]*Fix reporting SoT — _owner: Nate_/,
        ),
      }),
    )
    expect(slackTools.sendMessage.mock.calls[0][3].text).toContain(
      '<https://fathom.video/calls/753783387|Call report>',
    )
    expect(slackTools.sendMessage.mock.calls[0][3].text).not.toContain('Open Fathom recording')
    expect(slackTools.sendMessage).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      'user-1',
      'org-1',
      expect.objectContaining({
        channel_id: 'D123',
        thread_ts: '1710000000.000100',
        unfurl_links: false,
        text: expect.stringMatching(
          /Proposed shareable recap[\s\S]*Call report[\s\S]*Good connecting today[\s\S]*ship the AM loop/,
        ),
      }),
    )
    expect(slackTools.sendMessage.mock.calls[0][3].text).not.toContain('Proposed shareable recap')
    expect(slackTools.sendMessage.mock.calls[1][3].text).not.toContain('Open the call recording')
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
            draft_message_ts: '1710000000.000200',
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
        actionKind: 'workflow',
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
      assignee_shadow_count: 0,
    })
  })

  it('creates one Shadow message proposal per matched assignee', async () => {
    repo.findItemsByIds.mockResolvedValue([
      {
        id: 'fu-1',
        title: 'Ship AM loop',
        custom_data: { suggested_assignee_name: 'Dylan' },
      },
      {
        id: 'fu-2',
        title: 'Train Betty',
        custom_data: { suggested_assignee_name: 'Nate' },
      },
      {
        id: 'fu-3',
        title: 'Fix reporting SoT',
        custom_data: { suggested_assignee_name: 'Nate' },
      },
    ])
    repo.findItemById = vi.fn().mockResolvedValue({
      id: 'call-1',
      title: 'Nate and Dylan ops',
      custom_data: { fathom_url: 'https://fathom.video/calls/753783387' },
    })
    slackTools.findUserByEmail.mockResolvedValue({ success: true, user: { id: 'U_DYLAN' } })
    slackTools.openDm.mockResolvedValue({ success: true, channel_id: 'D123' })
    slackTools.sendMessage
      .mockResolvedValueOnce({ success: true, ts: '1710000000.000100' })
      .mockResolvedValueOnce({ success: true, ts: '1710000000.000200' })
    repo.updateItem.mockResolvedValue({})

    slackPeopleRepo.findPersonByEmail.mockImplementation(
      async (_sb: unknown, _org: string, email: string) => {
        if (email === DEFAULT_ADMIN_DM_EMAIL) return { id: 'person-dylan-admin' }
        return null
      },
    )
    slackPeopleRepo.findPersonByDisplayName.mockImplementation(
      async (_sb: unknown, _org: string, name: string) => {
        if (name === 'Dylan') {
          return { id: 'person-dylan', relationship_kind: 'internal', delivery_mode: 'shadow' }
        }
        if (name === 'Nate') {
          return { id: 'person-nate', relationship_kind: 'internal', delivery_mode: 'shadow' }
        }
        return null
      },
    )
    slackPeopleRepo.createShadowAction
      .mockResolvedValueOnce({ id: 'shadow-admin' })
      .mockResolvedValueOnce({ id: 'shadow-dylan' })
      .mockResolvedValueOnce({ id: 'shadow-nate' })

    const result = await service.requestConfirm({
      supabase: {} as never,
      userId: 'user-1',
      orgId: 'org-1',
      spaceId: 'space-1',
      callItemId: 'call-1',
      callTitle: 'Nate and Dylan ops',
      suggestionIds: ['fu-1', 'fu-2', 'fu-3'],
    })

    expect(result).toMatchObject({
      assignee_shadow_count: 2,
      assignee_shadow_action_ids: ['shadow-dylan', 'shadow-nate'],
    })
    expect(slackPeopleRepo.createShadowAction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        actionKind: 'message',
        targetMemberId: 'person-dylan',
        proposedContent: expect.stringMatching(
          /Hey — just a follow-up[\s\S]*linked here[\s\S]*Ship AM loop[\s\S]*Feel free to message me/,
        ),
        metadata: expect.objectContaining({
          source: 'meeting_follow_up_assignee_reminder',
          follow_up_ids: ['fu-1'],
          call_title: 'Nate and Dylan ops',
        }),
      }),
    )
    expect(slackPeopleRepo.createShadowAction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        actionKind: 'message',
        targetMemberId: 'person-nate',
        proposedContent: expect.stringMatching(/Train Betty[\s\S]*Fix reporting SoT/),
        metadata: expect.objectContaining({
          follow_up_ids: ['fu-2', 'fu-3'],
        }),
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
            assignee_shadow_action_ids: ['shadow-dylan', 'shadow-nate'],
          }),
        }),
      }),
      'org-1',
    )
  })

  it('runs the complete post-call workflow in Shadow without sending Slack messages', async () => {
    repo.findItemsByIds.mockResolvedValue([
      {
        id: 'fu-1',
        title: 'Send the account update',
        custom_data: { suggested_assignee_name: 'Betty' },
      },
    ])
    repo.findItemById.mockResolvedValue({
      id: 'call-1',
      title: 'Client review',
      custom_data: { fathom_url: 'https://fathom.video/calls/1' },
    })
    repo.updateItem.mockResolvedValue({})
    slackPeopleRepo.findPersonByEmail.mockResolvedValue({ id: 'person-dylan' })
    slackPeopleRepo.findPersonByDisplayName.mockResolvedValue({
      id: 'person-betty',
      relationship_kind: 'internal',
      delivery_mode: 'shadow',
    })
    slackPeopleRepo.createShadowAction
      .mockResolvedValueOnce({ id: 'shadow-recap' })
      .mockResolvedValueOnce({ id: 'shadow-betty' })

    const result = await service.requestConfirm({
      supabase: {} as never,
      userId: 'user-1',
      orgId: 'org-1',
      spaceId: 'space-1',
      callItemId: 'call-1',
      callTitle: 'Client review',
      suggestionIds: ['fu-1'],
      deliveryMode: 'shadow',
    })

    expect(slackTools.findUserByEmail).not.toHaveBeenCalled()
    expect(slackTools.openDm).not.toHaveBeenCalled()
    expect(slackTools.sendMessage).not.toHaveBeenCalled()
    expect(slackPeople.reviewShadowAction).not.toHaveBeenCalled()
    expect(slackPeople.sendShadowAction).not.toHaveBeenCalled()
    expect(result).toMatchObject({
      delivery_mode: 'shadow',
      assignee_shadow_action_ids: ['shadow-betty'],
      assignee_sent_action_ids: [],
    })
    expect(repo.updateItem).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      'space-1',
      'call-1',
      expect.objectContaining({
        custom_data: expect.objectContaining({
          slack_follow_up_confirm: expect.objectContaining({
            status: 'shadow',
            delivery_mode: 'shadow',
            shadow_action_id: 'shadow-recap',
            assignee_shadow_action_ids: ['shadow-betty'],
          }),
        }),
      }),
      'org-1',
    )
  })

  it('sends the same stored account-manager drafts when the flow is Active', async () => {
    repo.findItemsByIds.mockResolvedValue([
      {
        id: 'fu-1',
        title: 'Send the account update',
        custom_data: { suggested_assignee_name: 'Betty' },
      },
    ])
    repo.findItemById.mockResolvedValue({ id: 'call-1', title: 'Client review', custom_data: {} })
    repo.updateItem.mockResolvedValue({})
    slackTools.findUserByEmail.mockResolvedValue({ success: true, user: { id: 'U_DYLAN' } })
    slackTools.openDm.mockResolvedValue({ success: true, channel_id: 'D123' })
    slackTools.sendMessage
      .mockResolvedValueOnce({ success: true, ts: '1710000000.000100' })
      .mockResolvedValueOnce({ success: true, ts: '1710000000.000200' })
    slackPeopleRepo.findPersonByEmail.mockResolvedValue({ id: 'person-dylan' })
    slackPeopleRepo.findPersonByDisplayName.mockResolvedValue({
      id: 'person-betty',
      relationship_kind: 'internal',
      delivery_mode: 'active',
    })
    slackPeopleRepo.createShadowAction
      .mockResolvedValueOnce({ id: 'shadow-recap' })
      .mockResolvedValueOnce({ id: 'shadow-betty' })

    const result = await service.requestConfirm({
      supabase: {} as never,
      userId: 'user-1',
      orgId: 'org-1',
      spaceId: 'space-1',
      callItemId: 'call-1',
      callTitle: 'Client review',
      suggestionIds: ['fu-1'],
      deliveryMode: 'active',
    })

    expect(slackPeople.reviewShadowAction).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      'org-1',
      'shadow-betty',
      'approved',
    )
    expect(slackPeople.sendShadowAction).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      'org-1',
      'shadow-betty',
    )
    expect(result).toMatchObject({
      delivery_mode: 'active',
      assignee_sent_action_ids: ['shadow-betty'],
    })
  })

  it('keeps the account-manager draft reviewable when the flow is Active but the person is Shadow', async () => {
    repo.findItemsByIds.mockResolvedValue([
      {
        id: 'fu-1',
        title: 'Send the account update',
        custom_data: { suggested_assignee_name: 'Betty' },
      },
    ])
    repo.findItemById.mockResolvedValue({ id: 'call-1', title: 'Client review', custom_data: {} })
    repo.updateItem.mockResolvedValue({})
    slackTools.findUserByEmail.mockResolvedValue({ success: true, user: { id: 'U_DYLAN' } })
    slackTools.openDm.mockResolvedValue({ success: true, channel_id: 'D123' })
    slackTools.sendMessage
      .mockResolvedValueOnce({ success: true, ts: '1710000000.000100' })
      .mockResolvedValueOnce({ success: true, ts: '1710000000.000200' })
    slackPeopleRepo.findPersonByEmail.mockResolvedValue({ id: 'person-dylan' })
    slackPeopleRepo.findPersonByDisplayName.mockResolvedValue({
      id: 'person-betty',
      relationship_kind: 'internal',
      delivery_mode: 'shadow',
    })
    slackPeopleRepo.createShadowAction
      .mockResolvedValueOnce({ id: 'shadow-recap' })
      .mockResolvedValueOnce({ id: 'shadow-betty' })

    const result = await service.requestConfirm({
      supabase: {} as never,
      userId: 'user-1',
      orgId: 'org-1',
      spaceId: 'space-1',
      callItemId: 'call-1',
      callTitle: 'Client review',
      suggestionIds: ['fu-1'],
      deliveryMode: 'active',
    })

    expect(slackPeople.reviewShadowAction).not.toHaveBeenCalled()
    expect(slackPeople.sendShadowAction).not.toHaveBeenCalled()
    expect(result).toMatchObject({
      delivery_mode: 'active',
      assignee_shadow_action_ids: ['shadow-betty'],
      assignee_sent_action_ids: [],
    })
  })

  it('skips unmatched assignees and delivery_mode off without failing the review DM', async () => {
    repo.findItemsByIds.mockResolvedValue([
      {
        id: 'fu-1',
        title: 'Ghost task',
        custom_data: { suggested_assignee_name: 'Nobody' },
      },
      {
        id: 'fu-2',
        title: 'Off task',
        custom_data: { suggested_assignee_name: 'Camilla' },
      },
    ])
    repo.findItemById = vi.fn().mockResolvedValue({
      id: 'call-1',
      title: 'Ops',
      custom_data: {},
    })
    slackTools.findUserByEmail.mockResolvedValue({ success: true, user: { id: 'U_DYLAN' } })
    slackTools.openDm.mockResolvedValue({ success: true, channel_id: 'D123' })
    slackTools.sendMessage
      .mockResolvedValueOnce({ success: true, ts: '1710000000.000100' })
      .mockResolvedValueOnce({ success: true, ts: '1710000000.000200' })
    repo.updateItem.mockResolvedValue({})
    slackPeopleRepo.findPersonByEmail.mockResolvedValue({ id: 'person-admin' })
    slackPeopleRepo.findPersonByDisplayName.mockImplementation(
      async (_sb: unknown, _org: string, name: string) => {
        if (name === 'Camilla') {
          return { id: 'person-camilla', relationship_kind: 'team', delivery_mode: 'off' }
        }
        return null
      },
    )
    slackPeopleRepo.createShadowAction.mockResolvedValue({ id: 'shadow-admin' })

    const result = await service.requestConfirm({
      supabase: {} as never,
      userId: 'user-1',
      orgId: 'org-1',
      spaceId: 'space-1',
      callItemId: 'call-1',
      callTitle: 'Ops',
      suggestionIds: ['fu-1', 'fu-2'],
    })

    expect(result.assignee_shadow_count).toBe(0)
    expect(slackPeopleRepo.createShadowAction).toHaveBeenCalledTimes(1)
    expect(slackPeopleRepo.createShadowAction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ actionKind: 'workflow' }),
    )
  })

  it('still drafts a post-call recap when there are no suggestion ids', async () => {
    repo.findItemById.mockResolvedValue({ id: 'call-1', title: 'Empty', custom_data: {} })
    slackTools.findUserByEmail.mockResolvedValue({ success: true, user: { id: 'U_DYLAN' } })
    slackTools.openDm.mockResolvedValue({ success: true, channel_id: 'D123' })
    slackTools.sendMessage
      .mockResolvedValueOnce({ success: true, ts: '1710000000.000100' })
      .mockResolvedValueOnce({ success: true, ts: '1710000000.000200' })
    repo.updateItem.mockResolvedValue({})

    const result = await service.requestConfirm({
      supabase: {} as never,
      userId: 'user-1',
      orgId: 'org-1',
      spaceId: 'space-1',
      callItemId: 'call-1',
      callTitle: 'Empty',
      suggestionIds: [],
      deliveryMode: 'active',
    })
    expect(result).toMatchObject({ suggestion_count: 0, channel_id: 'D123' })
    expect(userAgentApi.invoke).toHaveBeenCalled()
    expect(slackTools.sendMessage).toHaveBeenCalledTimes(2)
    expect(slackTools.sendMessage).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      'user-1',
      'org-1',
      expect.objectContaining({ text: expect.stringContaining('No action items proposed') }),
    )
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
      expect.objectContaining({
        actionId: 'shadow-1',
        slackTs: '1710000001.000100',
        slackChannelId: 'D123',
      }),
    )
  })

  it('delegates a confirmed fulfillment item to its independently resolved Page Grader client', async () => {
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
            draft_message: 'Approved recap',
          },
        },
      },
      error: null,
    })
    const serviceSupabase = { from: vi.fn(() => query) }
    const pageGrader = {
      listClients: vi.fn().mockResolvedValue({
        clients: [
          { id: 'pg-christian', name: 'Multifamily Strategy - Christian Osgood', status: 'active' },
          { id: 'pg-adam', name: 'Adam Lamb', status: 'active' },
        ],
        client_scope_map: {
          'pg-adam': { campaign_id: 'campaign-adam', space_id: 'space-1' },
        },
      }),
      listAssignees: vi.fn().mockResolvedValue({
        assignees: [{ id: 'pg-nefi', name: 'Nefi Blanco', email: 'nefi@example.com' }],
      }),
      sendWork: vi.fn().mockResolvedValue({
        success: true,
        results: [
          {
            space_item_id: 'fu-1',
            status: 'created',
            work_id: 'work-1',
            work_url: 'https://portal.roas.io/launcher?task=work-1',
            clickup_task_id: 'cu-1',
            clickup_task_url: 'https://app.clickup.com/t/cu-1',
          },
        ],
      }),
    }
    moduleRef.get.mockImplementation((token: unknown) => {
      if (token === SupabaseServiceClient) return { client: serviceSupabase }
      if (token === PageGraderApiService) return pageGrader
      return undefined
    })
    repo.findSpaceByIdForAccess.mockResolvedValue({ id: 'space-1', campaign_id: 'campaign-adam' })
    repo.findItemById.mockResolvedValue({ id: 'call-1', title: 'Internal account review' })
    repo.findItemsByIds.mockResolvedValue([
      {
        id: 'fu-1',
        title: 'Reformat Christian webinar page and move timer down',
        custom_data: { suggested_assignee_name: 'Nefi Blanco' },
      },
    ])
    repo.updateItem.mockResolvedValue({})
    slackTools.sendMessage.mockResolvedValue({ success: true, ts: '1710000001.000100' })

    await expect(
      service.handleReactionAdded({
        channelId: 'D123',
        messageTs: '1710000000.000100',
        reaction: 'white_check_mark',
        slackUserId: 'U_DYLAN',
      }),
    ).resolves.toBe(true)

    expect(pageGrader.sendWork).toHaveBeenCalledWith(
      serviceSupabase,
      'user-1',
      expect.objectContaining({
        client_id: 'pg-christian',
        space_item_ids: ['fu-1'],
        task_type: 'funnel',
        task_subtype: 'Webinar Registration Funnel',
        assignee: expect.objectContaining({ page_grader_user_id: 'pg-nefi' }),
      }),
      'org-1',
    )
    expect(repo.updateItem).toHaveBeenCalledWith(
      serviceSupabase,
      'user-1',
      'space-1',
      'fu-1',
      expect.objectContaining({
        custom_data: expect.objectContaining({
          action_ledger: expect.objectContaining({
            status: 'delegated',
            page_grader: expect.objectContaining({
              client_id: 'pg-christian',
              work_id: 'work-1',
              clickup_task_id: 'cu-1',
            }),
          }),
        }),
      }),
      'org-1',
    )
  })

  it('builds assignee-reminder thread context from a sent Shadow', async () => {
    slackPeopleRepo.findAssigneeReminderBySlackMessage.mockResolvedValue({
      id: 'shadow-aaron',
      metadata: {
        source: 'meeting_follow_up_assignee_reminder',
        space_id: 'space-1',
        call_item_id: 'call-1',
        follow_up_ids: ['fu-1', 'fu-2'],
        assignee_name: 'Aaron',
        call_title: 'Review client accounts',
      },
    })
    repo.findItemById.mockResolvedValue({
      id: 'call-1',
      title: 'Review client accounts',
      custom_data: {
        summary: [
          'Meeting Purpose',
          '',
          'Align on Adam Lamb webinar campaign.',
          '',
          'Key Takeaways',
          '',
          '- Adam asked for webinar creative support',
          '',
          'Topics',
          '',
          'Long topic dump that should not appear',
        ].join('\n'),
      },
    })
    repo.findItemsByIds.mockResolvedValue([
      { id: 'fu-1', title: 'Check Adam Lamb prior video ads' },
      { id: 'fu-2', title: 'Confirm Adam Lamb booking calendar' },
    ])
    moduleRef.get.mockReturnValue({ client: {} })

    const prefix = await service.resolveAssigneeReminderThreadPrefix({
      channelId: 'D999',
      threadTs: '1710000099.000100',
    })

    expect(slackPeopleRepo.findAssigneeReminderBySlackMessage).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ channelId: 'D999', messageTs: '1710000099.000100' }),
    )
    expect(repo.findItemById).toHaveBeenCalledWith(expect.anything(), 'space-1', 'call-1')
    expect(prefix).toContain('Assignee: Aaron')
    expect(prefix).toContain('Call brief:')
    expect(prefix).toContain('Align on Adam Lamb webinar campaign.')
    expect(prefix).toContain('Adam asked for webinar creative support')
    expect(prefix).not.toContain('Long topic dump that should not appear')
    expect(prefix).toContain('Check Adam Lamb prior video ads')
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

  it('converts markdown timestamp links to a leading clickable timestamp', () => {
    expect(
      service.markdownLinksToSlack(
        '- [Workflow:](https://fathom.video/share/x?timestamp=932.0) Ship it',
      ),
    ).toBe('- <https://fathom.video/share/x?timestamp=932.0|15:32> Workflow Ship it')
    expect(
      service.markdownLinksToSlack(
        '• [Webinar Funnel Overhaul: redesign](https://fathom.video/share/x?timestamp=1872.0)',
      ),
    ).toBe(
      '• <https://fathom.video/share/x?timestamp=1872.0|31:12> Webinar Funnel Overhaul: redesign',
    )
  })
})
