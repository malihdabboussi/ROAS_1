import { describe, expect, it } from 'vitest'
import {
  buildMeetingCallIdentity,
  markManualMeetingCallKind,
  MEETING_CALL_KIND_OPTIONS,
  resolveMeetingCallKind,
  shouldReplaceMeetingCallKind,
} from './meeting-call-kind'

describe('meeting call-kind classification', () => {
  const identity = buildMeetingCallIdentity({
    email: 'owner@gmail.com',
    fathomAliases: ['owner@roas.co'],
    fullName: 'Owner Person',
    internalDomains: ['roas.co'],
  })

  it('exposes the complete taxonomy with a Personal user-facing label', () => {
    expect(MEETING_CALL_KIND_OPTIONS).toEqual([
      { id: 'private', label: 'Personal', color: 'emerald' },
      { id: 'team', label: 'Team', color: 'violet' },
      { id: 'executive', label: 'Executive', color: 'amber' },
      { id: 'client', label: 'Client', color: 'cyan' },
      { id: 'partner', label: 'Partner', color: 'blue' },
      { id: 'sales', label: 'Sales', color: 'orange' },
    ])
  })

  it('classifies personal, team, executive, client, partner, and sales meetings', () => {
    const classify = (
      titleHint: string,
      attendees: Array<{ email: string }>,
      recordedByEmail = 'owner@roas.co',
    ) =>
      resolveMeetingCallKind({
        identity,
        recordedByEmail,
        attendees,
        attendeeLabels: attendees.map((attendee) => attendee.email),
        titleHint,
      })

    expect(classify('Personal check-in', [{ email: 'owner@roas.co' }])).toBe('private')
    expect(
      classify('Weekly team sync', [{ email: 'owner@roas.co' }, { email: 'nate@roas.co' }]),
    ).toBe('team')
    expect(classify('Team weekly launch calendar review', [{ email: 'owner@roas.co' }])).toBe(
      'team',
    )
    expect(classify('Define a new role and compensation plan', [{ email: 'owner@roas.co' }])).toBe(
      'private',
    )
    expect(
      classify('Executive leadership review', [
        { email: 'owner@roas.co' },
        { email: 'nate@roas.co' },
      ]),
    ).toBe('executive')
    expect(
      classify('Client campaign review', [
        { email: 'owner@roas.co' },
        { email: 'client@example.com' },
      ]),
    ).toBe('client')
    expect(
      classify('Vendor partnership sync', [
        { email: 'owner@roas.co' },
        { email: 'partner@vendor.com' },
      ]),
    ).toBe('partner')
    expect(
      classify('Sales discovery demo', [{ email: 'owner@roas.co' }, { email: 'buyer@acme.com' }]),
    ).toBe('sales')
  })

  it('reclassifies automatic or unsupported values but preserves valid manual choices', () => {
    expect(shouldReplaceMeetingCallKind({ call_kind: 'scheduled' })).toBe(true)
    expect(
      shouldReplaceMeetingCallKind({
        call_kind: 'team',
        call_kind_source: 'automatic',
      }),
    ).toBe(true)
    expect(
      shouldReplaceMeetingCallKind({
        call_kind: 'client',
        call_kind_source: 'manual',
      }),
    ).toBe(false)
    expect(shouldReplaceMeetingCallKind({ call_kind: 'sales' })).toBe(false)
    expect(markManualMeetingCallKind({ call_kind: 'client', notes: 'Chosen by user' })).toEqual({
      call_kind: 'client',
      call_kind_source: 'manual',
      notes: 'Chosen by user',
    })
    expect(markManualMeetingCallKind({ notes: 'No call kind change' })).toEqual({
      notes: 'No call kind change',
    })
  })

  it('keeps mostly-external client calls client even when the summary discusses sales', () => {
    expect(
      resolveMeetingCallKind({
        identity,
        recordedByEmail: 'owner@roas.co',
        attendees: [
          { email: 'owner@roas.co' },
          { email: 'adam@client.com' },
          { email: 'lucas@client.com' },
        ],
        attendeeLabels: ['Owner Person', 'Adam', 'Lucas'],
        titleHint: 'Adam weekly ROAS and webinar review',
        summary: 'The team reviewed sales attribution and recent closes.',
      }),
    ).toBe('client')
  })

  it('preserves explicit sales and partner meetings from their titles', () => {
    const common = {
      identity,
      recordedByEmail: 'owner@roas.co',
      attendees: [{ email: 'owner@roas.co' }, { email: 'external@example.com' }],
      attendeeLabels: ['Owner Person', 'External Person'],
    }
    expect(resolveMeetingCallKind({ ...common, titleHint: 'Prospect discovery demo' })).toBe(
      'sales',
    )
    expect(resolveMeetingCallKind({ ...common, titleHint: 'Vendor partnership review' })).toBe(
      'partner',
    )
  })
})
