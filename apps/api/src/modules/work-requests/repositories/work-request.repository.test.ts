import { describe, expect, it } from 'vitest'
import { resolveUniqueAssigneeProfileId } from '../services/work-request-assignee'

describe('resolveUniqueAssigneeProfileId', () => {
  const profiles = [
    { id: 'dylan-id', full_name: 'Dylan' },
    { id: 'carol-id', full_name: 'Carol Garcia' },
  ]

  it('matches an exact full name', () => {
    expect(resolveUniqueAssigneeProfileId(profiles, 'Carol Garcia')).toBe('carol-id')
  })

  it('matches a unique email even when the stored name is the email', () => {
    expect(
      resolveUniqueAssigneeProfileId(
        [
          { id: 'rafay-id', full_name: 'Rafay', email: 'rafay@roas.co' },
          { id: 'dylan-id', full_name: 'Dylan' },
        ],
        'rafay@roas.co',
        'rafay@roas.co',
      ),
    ).toBe('rafay-id')
  })

  it('maps an expanded Portal name to a unique single-name ROAS profile', () => {
    expect(resolveUniqueAssigneeProfileId(profiles, 'Dylan Vanas')).toBe('dylan-id')
  })

  it('normalizes capitalization and whitespace', () => {
    expect(resolveUniqueAssigneeProfileId(profiles, '  carol   garcia ')).toBe('carol-id')
  })

  it('does not guess when the first-name match is ambiguous', () => {
    expect(
      resolveUniqueAssigneeProfileId(
        [
          { id: 'dylan-1', full_name: 'Dylan' },
          { id: 'dylan-2', full_name: 'Dylan Smith' },
        ],
        'Dylan Vanas',
      ),
    ).toBeNull()
  })
})
