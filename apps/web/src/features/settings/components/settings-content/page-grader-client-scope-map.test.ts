import { describe, expect, it } from 'vitest'
import { filterPageGraderClientsByQuery } from './page-grader-client-scope-map'

describe('filterPageGraderClientsByQuery', () => {
  const clients = [
    { id: '1', name: '1DS Collective' },
    { id: '2', name: 'Impact Elite Coaching' },
    { id: '3', name: 'Aligned Legacy' },
  ]

  it('returns all unhidden clients when query is empty', () => {
    expect(filterPageGraderClientsByQuery(clients, '  ').map((row) => row.id)).toEqual([
      '1',
      '3',
      '2',
    ])
  })

  it('hides churned clients until searched or shown', () => {
    const mixed = [
      { id: '1', name: '1DS Collective', status: 'active' },
      { id: '4', name: 'Old Co', status: 'churned_inactive' },
    ]
    expect(filterPageGraderClientsByQuery(mixed, '').map((row) => row.id)).toEqual(['1'])
    expect(filterPageGraderClientsByQuery(mixed, 'old').map((row) => row.id)).toEqual(['4'])
    expect(
      filterPageGraderClientsByQuery(mixed, '', { includeHidden: true }).map((row) => row.id),
    ).toEqual(['1', '4'])
  })

  it('filters by case-insensitive name substring', () => {
    expect(filterPageGraderClientsByQuery(clients, 'impact')).toEqual([
      { id: '2', name: 'Impact Elite Coaching' },
    ])
  })
})
