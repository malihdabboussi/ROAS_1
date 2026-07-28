import { describe, expect, it } from 'vitest'
import type { FathomSourceAction } from '../providers/fathom-meeting-source'
import { resolveMeetingActionAssignees } from './meeting-assignee-identity'

const action = (overrides: Partial<FathomSourceAction>): FathomSourceAction => ({
  sourceKey: 'fathom:recording:action:0',
  sourceText: 'Send the recap',
  assigneeName: null,
  assigneeEmail: null,
  recordingTimestamp: null,
  recordingPlaybackUrl: null,
  completed: false,
  userGenerated: false,
  raw: {},
  ...overrides,
})

describe('resolveMeetingActionAssignees', () => {
  it('uses the canonical full profile name when Fathom supplies only a first name', () => {
    const actions = [action({ assigneeName: 'Dylan' })]
    const resolved = resolveMeetingActionAssignees(actions, [
      {
        type: 'user',
        id: 'user-1',
        name: 'Dylan Vanas',
        email: 'dylan@example.com',
      },
    ])

    expect(resolved.get(actions[0]!.sourceKey)).toEqual({
      type: 'user',
      id: 'user-1',
      name: 'Dylan Vanas',
      email: 'dylan@example.com',
    })
  })

  it('prefers an exact email match over the provider display name', () => {
    const actions = [action({ assigneeName: 'Dylan', assigneeEmail: 'alex@example.com' })]
    const resolved = resolveMeetingActionAssignees(actions, [
      { type: 'user', id: 'user-1', name: 'Dylan Vanas', email: 'dylan@example.com' },
      { type: 'contact', id: 'contact-1', name: 'Alex Smith', email: 'alex@example.com' },
    ])

    expect(resolved.get(actions[0]!.sourceKey)?.name).toBe('Alex Smith')
  })

  it('does not guess when a first name matches multiple people', () => {
    const actions = [action({ assigneeName: 'Alex' })]
    const resolved = resolveMeetingActionAssignees(actions, [
      { type: 'user', id: 'user-1', name: 'Alex Smith', email: 'alex.s@example.com' },
      { type: 'contact', id: 'contact-1', name: 'Alex Jones', email: 'alex.j@example.com' },
    ])

    expect(resolved.get(actions[0]!.sourceKey)).toBeNull()
  })
})
