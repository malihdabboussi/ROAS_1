import { describe, expect, it } from 'vitest'
import {
  actionItemLabel,
  enrichSuggestedFollowUp,
  extractDueDateFromText,
  followUpOwnerTagLabel,
  inferFollowUpPriority,
  isInternalAssigneeEmail,
  matchAttendeeTagOption,
  matchFathomActionItem,
  normalizeFollowUpDueDateIso,
} from '../fathom-follow-up-enrichment'

describe('fathom-follow-up-enrichment', () => {
  it('treats roas.co and dylanvanas.com as internal assignee domains', () => {
    expect(isInternalAssigneeEmail('bryce@roas.co')).toBe(true)
    expect(isInternalAssigneeEmail('dylan@dylanvanas.com')).toBe(true)
    expect(isInternalAssigneeEmail('nate@blackswanltd.com')).toBe(false)
  })

  it('normalizes due dates and infers priority from urgency language', () => {
    expect(normalizeFollowUpDueDateIso('2026-07-20')).toMatch(/^2026-07-20/)
    expect(normalizeFollowUpDueDateIso('not a date')).toBeNull()
    expect(
      inferFollowUpPriority({ title: 'Send deck ASAP', explicit: 'medium' }),
    ).toBe('urgent')
    expect(inferFollowUpPriority({ title: 'Nice to have cleanup', explicit: null })).toBe('low')
  })

  it('enriches from matched Fathom action items', () => {
    const enriched = enrichSuggestedFollowUp({
      title: 'Check HubSpot short-link analytics; share findings w/ Nate',
      priority: 'medium',
      actionItems: [
        {
          description: 'Check HubSpot short-link analytics; share findings w/ Nate',
          deadline: '2026-08-20T17:00:00.000Z',
          assignee: { name: 'Bryce Knutson', email: 'bryce@roas.co' },
        },
      ],
    })
    expect(enriched.due_date).toBe('2026-08-20T17:00:00.000Z')
    expect(enriched.assignee_email).toBe('bryce@roas.co')
    expect(enriched.assignee_name).toBe('Bryce Knutson')
    expect(enriched.priority).toBe('medium')
  })

  it('matches action items by overlapping title words', () => {
    const match = matchFathomActionItem('Investigate HubSpot UTM loss findings Bryce', [
      {
        description: 'Investigate HubSpot link-scrubbing/UTM loss; share findings w/ Bryce',
      },
      { description: 'Unrelated cooking tip' },
    ])
    expect(actionItemLabel(match ?? {})).toMatch(/HubSpot/)
  })

  it('extracts due dates from action-item titles when Fathom omits deadline', () => {
    const now = new Date('2026-07-15T12:00:00.000Z')
    expect(extractDueDateFromText('Decide go/no-go on Wed Jul 22 live webinar', now)).toBe(
      '2026-07-22T17:00:00.000Z',
    )
    expect(extractDueDateFromText('Ship FIFA content Jul 15; send to Owen', now)).toBe(
      '2026-07-15T17:00:00.000Z',
    )
  })

  it('matches and labels owner tags from the Attendees option pool', () => {
    const options = [
      { id: 'att_dylan', label: 'Dylan Vanas' },
      { id: 'att_nate', label: 'Nate Tilley' },
      { id: 'att_bryce', label: 'Bryce Knutson' },
    ]
    expect(
      matchAttendeeTagOption(options, { name: 'Nate Tilley', email: 'nate@example.com' }),
    ).toBe('att_nate')
    expect(matchAttendeeTagOption(options, { name: null, email: 'bryce@roas.co' })).toBe(
      'att_bryce',
    )
    expect(matchAttendeeTagOption(options, { name: 'Nate', email: null })).toBe('att_nate')
    expect(followUpOwnerTagLabel({ name: 'Filmar', email: null })).toBe('Filmar')
    expect(followUpOwnerTagLabel({ name: null, email: 'dylan@dylanvanas.com' })).toBe('Dylan')
  })
})
