import { describe, expect, it } from 'vitest'
import { formatMeetingHostLabel, hostSelectOptions } from './HostCell'

describe('formatMeetingHostLabel', () => {
  it('marks the current user as Mine', () => {
    expect(
      formatMeetingHostLabel({
        value: 'Dylan',
        spaceItem: { custom_data: { host_email: 'dylan@roas.co' } } as never,
        currentUserId: 'user-1',
        roster: [{ kind: 'human', user_id: 'user-1', email: 'dylan@roas.co' } as never],
      }),
    ).toBe('Dylan (Mine)')
  })

  it('leaves someone else unlabeled', () => {
    expect(
      formatMeetingHostLabel({
        value: 'Nate',
        spaceItem: { custom_data: { host_email: 'nate@roas.co' } } as never,
        currentUserId: 'user-1',
        roster: [{ kind: 'human', user_id: 'user-1', email: 'dylan@roas.co' } as never],
      }),
    ).toBe('Nate')
  })
})

describe('hostSelectOptions', () => {
  it('lists roster humans and keeps the current host if they are missing', () => {
    expect(
      hostSelectOptions({
        roster: [
          { kind: 'human', display_name: 'Nate Tilley' } as never,
          { kind: 'agent', display_name: 'Vibey' } as never,
          { kind: 'human', display_name: '  ' } as never,
        ],
        currentLabel: 'Dylan Vanas (Mine)',
      }),
    ).toEqual([
      { id: 'Dylan Vanas', label: 'Dylan Vanas' },
      { id: 'Nate Tilley', label: 'Nate Tilley' },
    ])
  })
})
