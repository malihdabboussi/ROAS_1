import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_ADMIN_DM_EMAIL,
  MeetingFollowUpSlackConfirmService,
} from '../meeting-follow-up-slack-confirm.service'

describe('MeetingFollowUpSlackConfirmService', () => {
  const repo = {
    findItemsByIds: vi.fn(),
    updateItem: vi.fn(),
  }
  const config = {
    get: vi.fn((key: string) => {
      if (key === 'APP_URL') return 'https://app.roas.io'
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

  let service: MeetingFollowUpSlackConfirmService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new MeetingFollowUpSlackConfirmService(
      repo as never,
      config as never,
      moduleRef as never,
      slackTools as never,
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
      orgId: null,
      spaceId: 'space-1',
      callItemId: 'call-1',
      callTitle: 'Nate and Dylan ops',
      suggestionIds: ['fu-1', 'fu-2'],
    })

    expect(slackTools.findUserByEmail).toHaveBeenCalledWith(expect.anything(), 'user-1', null, {
      email: DEFAULT_ADMIN_DM_EMAIL,
    })
    expect(slackTools.sendMessage).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      null,
      expect.objectContaining({
        channel_id: 'D123',
        text: expect.stringMatching(
          /Summary:.*Align on urgent[\s\S]*Open Fathom recording[\s\S]*Ship AM loop — _owner: Dylan_[\s\S]*Fix reporting SoT — _owner: Nate_/,
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
      null,
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
})
