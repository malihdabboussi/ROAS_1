import { describe, expect, it, vi } from 'vitest'
import {
  buildAssigneeActionReminderMessage,
  cleanAssigneeDisplayName,
  createAssigneeReminderShadowActions,
  groupFollowUpsByAssignee,
} from '../meeting-follow-up-assignee-reminders'

describe('meeting-follow-up-assignee-reminders', () => {
  it('groups follow-ups by cleaned assignee name', () => {
    const groups = groupFollowUpsByAssignee([
      {
        id: '1',
        title: 'Ship AM loop',
        custom_data: { suggested_assignee_name: 'Dylan' },
      },
      {
        id: '2',
        title: 'Train Betty',
        custom_data: { suggested_assignee_name: 'Nate' },
      },
      {
        id: '3',
        title: 'Fix reporting',
        custom_data: { suggested_assignee_name: 'Nate' },
      },
      {
        id: '4',
        title: 'Org placeholder',
        custom_data: { suggested_assignee_name: 'Impact Team' },
      },
    ])
    expect(groups).toHaveLength(2)
    expect(groups.find((g) => g.displayName === 'Dylan')?.items).toHaveLength(1)
    expect(groups.find((g) => g.displayName === 'Nate')?.items.map((i) => i.id)).toEqual(['2', '3'])
  })

  it('builds a casual reminder with an inline call link', () => {
    const text = buildAssigneeActionReminderMessage({
      callTitle: 'Review client accounts',
      fathomUrl: 'https://fathom.video/calls/1',
      items: [{ title: 'Brief Betty' }, { title: 'Audit Trust Advisors' }],
    })
    expect(text).toContain(
      'Hey — just a follow-up from the team call earlier today (<https://fathom.video/calls/1|linked here>).',
    )
    expect(text).toContain('These are some of the things that were assigned to you:')
    expect(text).toContain('• Brief Betty')
    expect(text).toContain('• Audit Trust Advisors')
    expect(text).toContain('Feel free to message me if you have questions.')
    expect(text).not.toContain('Call report')
    expect(text).not.toContain('already done')
  })

  it('cleans handle/phone noise from assignee names', () => {
    expect(cleanAssigneeDisplayName('@TheShawnKaplan 615.426.3182')).toBeNull()
    expect(cleanAssigneeDisplayName('Aaron McKeague')).toBe('Aaron McKeague')
    expect(cleanAssigneeDisplayName('Impact Team')).toBeNull()
  })

  it('never creates a proactive post-call proposal for an external person', async () => {
    const createShadowAction = vi.fn()
    const findPersonByDisplayName = vi.fn().mockResolvedValue({
      id: 'external-client',
      relationship_kind: 'external',
      delivery_mode: 'active',
    })

    const ids = await createAssigneeReminderShadowActions({
      supabase: {} as never,
      userId: 'user-1',
      slackOrgId: 'org-1',
      spaceId: 'space-1',
      callItemId: 'call-1',
      callTitle: 'Client call',
      fathomUrl: null,
      followUps: [
        {
          id: 'fu-1',
          title: 'Send the client an update',
          custom_data: { suggested_assignee_name: 'Client Person' },
        },
      ],
      nameKnowledge: [],
      people: {
        createShadowAction,
        findPersonByEmail: vi.fn().mockResolvedValue(null),
        findPersonByDisplayName,
      },
    })

    expect(ids).toEqual([])
    expect(createShadowAction).not.toHaveBeenCalled()
  })
})
