import { describe, expect, it } from 'vitest'
import {
  selectCallerDirectoryIdentity,
  selectDirectoryIdentitiesForTeamPull,
} from './google-workspace-calendar-pull'

describe('selectDirectoryIdentitiesForTeamPull', () => {
  it('keeps the signed-in user when the alphabetical Directory cap would drop them', () => {
    const eligible = [
      { calendar_email: 'aaron@roas.co', vibey_user_id: 'aaron' },
      { calendar_email: 'bryce@roas.co', vibey_user_id: 'bryce' },
      { calendar_email: 'dylan@roas.co', vibey_user_id: 'dylan' },
    ]
    expect(
      selectDirectoryIdentitiesForTeamPull(eligible, 2, 'dylan').pulled.map(
        (row) => row.calendar_email,
      ),
    ).toEqual(['dylan@roas.co', 'aaron@roas.co'])
    expect(
      selectDirectoryIdentitiesForTeamPull(eligible, 2, 'dylan').capped.map(
        (row) => row.calendar_email,
      ),
    ).toEqual(['bryce@roas.co'])
  })
})

describe('selectCallerDirectoryIdentity', () => {
  const nate = {
    calendar_email: 'nate@roas.co',
    match_status: 'confirmed',
    vibey_user_id: 'nate',
    suggested_vibey_user_id: null as string | null,
  }
  const dylan = {
    calendar_email: 'dylan@roas.co',
    match_status: 'confirmed',
    vibey_user_id: 'user-dylan',
    suggested_vibey_user_id: null as string | null,
  }

  it('uses the linked Directory mailbox even when login email is personal Gmail', () => {
    expect(
      selectCallerDirectoryIdentity([nate, dylan], {
        vibeyUserId: 'user-dylan',
        email: 'dylan@dylanvanas.com',
      })?.calendar_email,
    ).toBe('dylan@roas.co')
  })

  it('uses a suggested portal link when the Directory row is still unmatched', () => {
    const unmatchedDylan = {
      calendar_email: 'dylan@roas.co',
      match_status: 'suggested',
      vibey_user_id: null as string | null,
      suggested_vibey_user_id: 'user-dylan',
    }
    expect(
      selectCallerDirectoryIdentity([nate, unmatchedDylan], {
        vibeyUserId: 'user-dylan',
        email: 'dylan@dylanvanas.com',
      })?.calendar_email,
    ).toBe('dylan@roas.co')
  })

  it('does not return a rejected identity', () => {
    expect(
      selectCallerDirectoryIdentity([{ ...dylan, match_status: 'rejected' }], {
        vibeyUserId: 'user-dylan',
        email: 'dylan@roas.co',
      }),
    ).toBeNull()
  })
})
