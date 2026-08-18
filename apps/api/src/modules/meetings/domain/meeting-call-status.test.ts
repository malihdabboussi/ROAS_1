import { describe, expect, it } from 'vitest'
import {
  callStatusWhenInviteMoved,
  callStatusWhenRecordingLands,
  inviteTimesMoved,
  isMeetingCallStatus,
} from './meeting-call-status'

describe('meeting call status', () => {
  it('accepts only Live, Completed, No Show, and Rescheduled', () => {
    expect(isMeetingCallStatus('live')).toBe(true)
    expect(isMeetingCallStatus('completed')).toBe(true)
    expect(isMeetingCallStatus('no_show')).toBe(true)
    expect(isMeetingCallStatus('rescheduled')).toBe(true)
    expect(isMeetingCallStatus('upcoming')).toBe(false)
    expect(isMeetingCallStatus('')).toBe(false)
  })

  it('marks the call completed when a recording lands', () => {
    expect(callStatusWhenRecordingLands()).toBe('completed')
  })

  it('marks a moved invite as rescheduled unless the call already finished or is live', () => {
    expect(callStatusWhenInviteMoved(null)).toBe('rescheduled')
    expect(callStatusWhenInviteMoved('rescheduled')).toBe('rescheduled')
    expect(callStatusWhenInviteMoved('completed')).toBeNull()
    expect(callStatusWhenInviteMoved('no_show')).toBeNull()
    expect(callStatusWhenInviteMoved('live')).toBeNull()
  })

  it('treats a five-minute-plus start shift as a moved invite', () => {
    expect(inviteTimesMoved('2026-08-18T17:00:00.000Z', '2026-08-18T17:04:00.000Z')).toBe(false)
    expect(inviteTimesMoved('2026-08-18T17:00:00.000Z', '2026-08-18T18:00:00.000Z')).toBe(true)
  })
})
