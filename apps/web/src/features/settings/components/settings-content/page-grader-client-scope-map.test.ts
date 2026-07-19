import { describe, expect, it } from 'vitest'
import { filterPageGraderClientsByQuery } from './page-grader-client-scope-map'

describe('filterPageGraderClientsByQuery', () => {
  const clients = [
    { id: '1', name: '1DS Collective' },
    { id: '2', name: 'Impact Elite Coaching' },
    { id: '3', name: 'Aligned Legacy' },
  ]

  it('returns all clients when query is empty', () => {
    expect(filterPageGraderClientsByQuery(clients, '  ')).toEqual(clients)
  })

  it('filters by case-insensitive name substring', () => {
    expect(filterPageGraderClientsByQuery(clients, 'impact')).toEqual([
      { id: '2', name: 'Impact Elite Coaching' },
    ])
  })
})
