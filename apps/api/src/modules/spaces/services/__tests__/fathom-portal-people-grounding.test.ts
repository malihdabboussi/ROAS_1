import { describe, expect, it } from 'vitest'
import {
  editDistance,
  groundAssigneeNameOnPortalPeople,
  groundFollowUpTitleOnPortalPeople,
  matchPortalPerson,
} from '../fathom-portal-people-grounding'

describe('fathom-portal-people-grounding', () => {
  const people = [
    { label: 'Anees Ahmad Khan', email: 'anees@example.com', aliases: ['Anees'] },
    { label: 'Nate Tilley', email: 'nate@roas.co', aliases: ['Nate'] },
    { label: 'Dylan Vanas', email: 'dylan@dylanvanas.com', aliases: ['Dylan'] },
  ]

  it('fuzzy-matches Anis → Anees', () => {
    expect(editDistance('anis', 'anees')).toBeLessThanOrEqual(2)
    expect(matchPortalPerson('Anis', people)?.label).toBe('Anees Ahmad Khan')
  })

  it('grounds title owner prefixes on portal people', () => {
    const result = groundFollowUpTitleOnPortalPeople(
      'Anis: rewrite Skool About page for community offer',
      people,
    )
    expect(result.grounded).toBe(true)
    expect(result.title).toBe('Anees Ahmad Khan: rewrite Skool About page for community offer')
  })

  it('grounds assignee names onto portal labels', () => {
    expect(groundAssigneeNameOnPortalPeople('Anis', people)).toBe('Anees Ahmad Khan')
    expect(groundAssigneeNameOnPortalPeople('Nate', people)).toBe('Nate Tilley')
  })

  it('leaves unmatched titles alone', () => {
    const result = groundFollowUpTitleOnPortalPeople('Ship webinar landing page', people)
    expect(result.grounded).toBe(false)
    expect(result.title).toBe('Ship webinar landing page')
  })
})
