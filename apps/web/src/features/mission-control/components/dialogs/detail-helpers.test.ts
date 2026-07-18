import { describe, expect, it } from 'vitest'
import {
  formatAgentShortName,
  formatSubtaskStatusLabel,
  resolveSubtaskIssueDetail,
  subtaskStatusBadgeTone,
} from './detail-helpers'

describe('mission detail helpers', () => {
  it('shortens Name · Role for compact chips', () => {
    expect(formatAgentShortName('Atlas · Brain Scholar & Knowledge Curator')).toBe('Atlas')
    expect(formatAgentShortName('Reed · Agency Strategist')).toBe('Reed')
    expect(formatAgentShortName('nate')).toBe('nate')
  })

  it('labels subtask statuses for the list', () => {
    expect(formatSubtaskStatusLabel('blocked')).toBe('Blocked')
    expect(formatSubtaskStatusLabel('pending', { dependencyBlocked: true })).toBe('Waiting')
    expect(formatSubtaskStatusLabel('in_progress')).toBe('Working')
  })

  it('maps subtask status to badge-glass tones', () => {
    expect(subtaskStatusBadgeTone('done')).toBe('badge-glass-green')
    expect(subtaskStatusBadgeTone('in_progress')).toBe('badge-glass-yellow')
    expect(subtaskStatusBadgeTone('pending', { awaitingHuman: true })).toBe('badge-glass-orange')
    expect(subtaskStatusBadgeTone('pending', { dependencyBlocked: true })).toBe(
      'badge-glass-yellow',
    )
  })

  it('resolves hover issue detail from output then mission notes', () => {
    expect(
      resolveSubtaskIssueDetail(
        {
          feedback: 'Ran into a small issue, trying again now',
          output: { _internal_error: 'Agent gateway error (404): Not Found' },
        },
        { progressNotes: 'other' },
      ),
    ).toBe('Agent gateway error (404): Not Found')
    expect(
      resolveSubtaskIssueDetail(
        { feedback: 'Ran into a small issue, trying again now', output: {} },
        {
          progressNotes:
            'Subtask triage failed: Agent request failed (404): {"message":"Agent gateway error (404): Not Found"}',
        },
      ),
    ).toMatch(/Agent request failed \(404\)/)
  })
})
