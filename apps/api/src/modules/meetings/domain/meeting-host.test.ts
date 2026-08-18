import { describe, expect, it } from 'vitest'
import { meetingHostCustomData, resolveMeetingHost, shouldStampMeetingHost } from './meeting-host'

describe('resolveMeetingHost', () => {
  it('prefers the calendar organizer over the Fathom recorder', () => {
    expect(
      resolveMeetingHost({
        organizer: { email: 'dylan@roas.co', name: 'Dylan' },
        recordedBy: { email: 'nate@roas.co', name: 'Nate' },
      }),
    ).toEqual({ email: 'dylan@roas.co', name: 'Dylan' })
  })

  it('falls back to the Fathom recorder when no organizer is present', () => {
    expect(
      resolveMeetingHost({
        recordedBy: { email: 'nate@roas.co', name: 'Nate' },
      }),
    ).toEqual({ email: 'nate@roas.co', name: 'Nate' })
  })

  it('uses the email as the display name when the name is missing', () => {
    expect(resolveMeetingHost({ organizer: { email: 'host@roas.co' } })).toEqual({
      email: 'host@roas.co',
      name: 'host@roas.co',
    })
  })

  it('ignores organizer rows without an email', () => {
    expect(resolveMeetingHost({ organizer: { name: 'Dylan' } })).toBeNull()
  })
})

describe('shouldStampMeetingHost', () => {
  it('stamps only when host and host_email are both empty', () => {
    expect(shouldStampMeetingHost({})).toBe(true)
    expect(shouldStampMeetingHost({ host: 'Dylan' })).toBe(false)
    expect(shouldStampMeetingHost({ host_email: 'dylan@roas.co' })).toBe(false)
  })
})

describe('meetingHostCustomData', () => {
  it('returns empty fields when no host was resolved', () => {
    expect(meetingHostCustomData(null)).toEqual({})
  })
})
