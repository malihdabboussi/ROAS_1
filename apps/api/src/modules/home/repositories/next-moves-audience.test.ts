import { describe, expect, it } from 'vitest'
import {
  buildNextMoveViewer,
  didViewerAttendMeeting,
  isNextMoveForViewer,
  mergeMeetingAudienceData,
} from './next-moves-audience'

const dylan = buildNextMoveViewer({
  userId: 'user-dylan',
  email: 'dylan@dylanvanas.com',
  fullName: 'Dylan Vanas',
  teammates: [
    { email: 'nate@roas.co', fullName: 'Nate' },
    { email: 'adam@roas.co', fullName: 'Adam' },
  ],
})

describe('isNextMoveForViewer', () => {
  it('keeps follow-ups assigned to the signed-in user even if they missed the call', () => {
    expect(
      isNextMoveForViewer(
        {
          assignee_type: 'human',
          assignee_id: 'user-dylan',
          custom_data: {},
        },
        { participant_emails: ['nate@roas.co'] },
        dylan,
      ),
    ).toBe(true)
  })

  it('keeps unassigned follow-ups from meetings the user attended', () => {
    expect(
      isNextMoveForViewer(
        { custom_data: {} },
        {
          participant_emails: ['dylan@dylanvanas.com', 'client@example.com'],
          attendees: ['Dylan Vanas', 'Client'],
        },
        dylan,
      ),
    ).toBe(true)
  })

  it('keeps client-named follow-ups from meetings the user attended', () => {
    expect(
      isNextMoveForViewer(
        {
          custom_data: { suggested_assignee_name: 'Yasser Khan' },
        },
        { participant_emails: ['dylan@dylanvanas.com', 'yasser@example.com'] },
        dylan,
      ),
    ).toBe(true)
  })

  it('drops other teammates’ follow-ups from meetings the user did not attend', () => {
    expect(
      isNextMoveForViewer(
        {
          title: 'Send the latest Master Your Craft webinar deck',
          custom_data: {
            suggested_assignee_name: 'Nate',
            suggested_assignee_email: 'nate@roas.co',
          },
        },
        {
          attendees: ['Nate', 'Adam'],
          participant_emails: ['nate@roas.co', 'adam@roas.co'],
        },
        dylan,
      ),
    ).toBe(false)
  })

  it('drops follow-ups named for a teammate even when the user attended', () => {
    expect(
      isNextMoveForViewer(
        {
          custom_data: { suggested_assignee_name: 'Nate' },
        },
        { participant_emails: ['dylan@dylanvanas.com', 'nate@roas.co'] },
        dylan,
      ),
    ).toBe(false)
  })

  it('drops follow-ups assigned to a teammate even when the user attended', () => {
    expect(
      isNextMoveForViewer(
        {
          assignee_type: 'human',
          assignee_id: 'user-nate',
          custom_data: { suggested_assignee_email: 'nate@roas.co' },
        },
        { participant_emails: ['dylan@dylanvanas.com', 'nate@roas.co'] },
        dylan,
      ),
    ).toBe(false)
  })

  it('matches a suggested assignee email to the signed-in user', () => {
    expect(
      isNextMoveForViewer(
        {
          custom_data: { suggested_assignee_email: 'Dylan@dylanvanas.com' },
        },
        { participant_emails: [] },
        dylan,
      ),
    ).toBe(true)
  })
})

describe('didViewerAttendMeeting', () => {
  it('matches calendar invitee objects and participant emails', () => {
    expect(
      didViewerAttendMeeting(
        {
          calendar_invitees: [{ email: 'dylan@dylanvanas.com', name: 'Dylan Vanas' }],
        },
        dylan,
      ),
    ).toBe(true)
  })

  it('matches Fathom attendee tag ids and recorded_by email', () => {
    expect(
      didViewerAttendMeeting(
        {
          attendees: ['att_dylan_vanas', 'att_client'],
          external_automation: { recorded_by_email: 'nate@roas.co' },
        },
        dylan,
      ),
    ).toBe(true)
    expect(
      didViewerAttendMeeting(
        {
          attendees: ['att_nate', 'att_adam'],
          external_automation: { recorded_by_email: 'nate@roas.co' },
        },
        dylan,
      ),
    ).toBe(false)
  })

  it('does not treat a team share list or org membership as attendance', () => {
    expect(
      didViewerAttendMeeting(
        {
          attendees: ['Nate', 'Adam'],
          participant_emails: ['nate@roas.co'],
          shared_with: [{ email: 'dylan@dylanvanas.com', name: 'Dylan Vanas' }],
        },
        dylan,
      ),
    ).toBe(false)
  })

  it('ignores opaque attendee option uuids', () => {
    expect(
      didViewerAttendMeeting({ attendees: ['2f1c8a10-7b3e-4c11-9d22-abcdeffedcba'] }, dylan),
    ).toBe(false)
  })

  it('uses merged recording participant emails', () => {
    expect(
      didViewerAttendMeeting(
        mergeMeetingAudienceData({ attendees: ['att_nate'] }, ['dylan@dylanvanas.com']),
        dylan,
      ),
    ).toBe(true)
  })
})
