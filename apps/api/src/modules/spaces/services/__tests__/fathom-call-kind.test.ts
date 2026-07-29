import { describe, expect, it } from 'vitest'
import { buildCeoCallIdentity, resolveCeoCallKind } from '../fathom-call-kind'

describe('fathom-call-kind', () => {
  const identity = buildCeoCallIdentity({
    email: 'test@gmail.com',
    fathomAliases: ['dylan@dylanvanas.com'],
    fullName: 'test',
  })

  it('builds identity from email + fathom aliases', () => {
    expect(identity.emails).toEqual(
      expect.arrayContaining(['test@gmail.com', 'dylan@dylanvanas.com']),
    )
    expect(identity.nameTokens).toEqual(expect.arrayContaining(['dylan', 'dylan vanas']))
    expect(identity.internalDomains).toEqual(expect.arrayContaining(['dylanvanas.com', 'roas.co']))
    expect(identity.internalDomains).not.toContain('gmail.com')
  })

  it('marks private when owner recorded a solo call', () => {
    expect(
      resolveCeoCallKind({
        identity,
        recordedByEmail: 'dylan@dylanvanas.com',
        attendees: [],
        attendeeLabels: [],
      }),
    ).toBe('private')
  })

  it('does not collapse owner-attended team calls into private', () => {
    expect(
      resolveCeoCallKind({
        identity,
        recordedByEmail: 'nate@roas.co',
        attendees: [{ name: 'Dylan Vanas', email: 'dylan@dylanvanas.com' }],
        attendeeLabels: ['Dylan Vanas', 'Nate Tilley'],
      }),
    ).toBe('team')
    expect(
      resolveCeoCallKind({
        identity,
        recordedByEmail: 'nate@roas.co',
        attendees: [],
        attendeeLabels: ['Dylan Vanas', 'Nate Tilley'],
      }),
    ).toBe('team')
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

  it('marks sales when title signals sales and attendees are mostly external', () => {
    expect(
      resolveCeoCallKind({
        identity,
        recordedByEmail: 'nate@roas.co',
        attendees: [
          { name: 'Nate Tilley', email: 'nate@roas.co' },
          { name: 'Prospect', email: 'buyer@acme.com' },
        ],
        attendeeLabels: ['Nate Tilley', 'Prospect'],
        titleHint: 'Sales discovery demo — Acme',
      }),
    ).toBe('sales')
  })

  it('marks partner when an external call has partnership language', () => {
    expect(
      resolveCeoCallKind({
        identity,
        recordedByEmail: 'nate@roas.co',
        attendees: [
          { name: 'Nate Tilley', email: 'nate@roas.co' },
          { name: 'Partner', email: 'partner@vendor.com' },
          { name: 'Other', email: 'other@vendor.com' },
        ],
        attendeeLabels: ['Nate', 'Partner', 'Other'],
        titleHint: 'Vendor partnership sync',
      }),
    ).toBe('partner')
  })

  it('marks client when the owner attends an external client call', () => {
    expect(
      resolveCeoCallKind({
        identity,
        recordedByEmail: 'dylan@dylanvanas.com',
        attendees: [
          { name: 'Dylan Vanas', email: 'dylan@dylanvanas.com' },
          { name: 'Client', email: 'client@gmail.com' },
        ],
        attendeeLabels: ['Dylan Vanas', 'Client'],
        titleHint: 'Impact Elite client campaign review',
      }),
    ).toBe('client')
  })

  it('marks executive from leadership language on non-owner calls', () => {
    expect(
      resolveCeoCallKind({
        identity,
        recordedByEmail: 'nate@roas.co',
        attendees: [
          { name: 'Nate Tilley', email: 'nate@roas.co' },
          { name: 'Bryce', email: 'bryce@roas.co' },
        ],
        attendeeLabels: ['Nate Tilley', 'Bryce'],
        titleHint: 'Executive leadership offsite prep',
      }),
    ).toBe('executive')
  })
})
