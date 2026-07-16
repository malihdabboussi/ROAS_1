import { describe, expect, it } from 'vitest'
import { buildCeoCallIdentity, resolveCeoCallKind } from '../fathom-call-kind'

describe('fathom-call-kind', () => {
  const identity = buildCeoCallIdentity({
    email: 'test@gmail.com',
    fathomAliases: ['dylan@dylanvanas.com'],
    fullName: 'test',
  })

  it('builds identity from email + fathom aliases', () => {
    expect(identity.emails).toEqual(expect.arrayContaining(['test@gmail.com', 'dylan@dylanvanas.com']))
    expect(identity.nameTokens).toEqual(expect.arrayContaining(['dylan', 'dylan vanas']))
  })

  it('marks personal when owner recorded the call', () => {
    expect(
      resolveCeoCallKind({
        identity,
        recordedByEmail: 'dylan@dylanvanas.com',
        attendees: [],
        attendeeLabels: [],
      }),
    ).toBe('personal')
  })

  it('marks personal when owner is an attendee by email or name', () => {
    expect(
      resolveCeoCallKind({
        identity,
        recordedByEmail: 'nate@roas.co',
        attendees: [{ name: 'Dylan Vanas', email: 'dylan@dylanvanas.com' }],
        attendeeLabels: ['Dylan Vanas', 'Nate Tilley'],
      }),
    ).toBe('personal')
    expect(
      resolveCeoCallKind({
        identity,
        recordedByEmail: 'nate@roas.co',
        attendees: [],
        attendeeLabels: ['Dylan Vanas', 'Nate Tilley'],
      }),
    ).toBe('personal')
  })

  it('marks team when owner was not on the call', () => {
    expect(
      resolveCeoCallKind({
        identity,
        recordedByEmail: 'nate@roas.co',
        attendees: [{ name: 'Nate Tilley', email: 'nate@roas.co' }],
        attendeeLabels: ['Nate Tilley', 'Filmar'],
      }),
    ).toBe('team')
  })
})
