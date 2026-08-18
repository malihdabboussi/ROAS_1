import { describe, expect, it } from 'vitest'
import {
  compareGeneralFirst,
  isGeneralLabel,
  qualifyGeneralLocation,
  sortGeneralFirst,
} from './conversation-scope-sort'

describe('conversation-scope-sort', () => {
  it('treats General as a pinned label regardless of casing', () => {
    expect(isGeneralLabel('General')).toBe(true)
    expect(isGeneralLabel('  GENERAL  ')).toBe(true)
    expect(isGeneralLabel('Roadmap')).toBe(false)
  })

  it('sorts General first and the rest alphabetically', () => {
    expect(sortGeneralFirst(['Webinar', 'General', 'alpha'], (value) => value)).toEqual([
      'General',
      'alpha',
      'Webinar',
    ])
    expect(compareGeneralFirst('General', 'Andy')).toBeLessThan(0)
  })

  it('qualifies a General leaf with its parent location', () => {
    expect(qualifyGeneralLocation({ leafName: 'General', parentName: 'Yasir Khan' })).toBe(
      'Yasir Khan General',
    )
    expect(qualifyGeneralLocation({ leafName: 'Roadmap', parentName: 'Yasir Khan' })).toBe(
      'Roadmap',
    )
    expect(qualifyGeneralLocation({ leafName: 'General', parentName: 'General' })).toBe('General')
    expect(
      qualifyGeneralLocation({
        leafName: 'General',
        parentName: 'General',
        ancestors: ['Master Your Kraft'],
      }),
    ).toBe('Master Your Kraft General')
    expect(
      qualifyGeneralLocation({
        leafName: 'General',
        ancestors: ['General', 'Client Spaces', 'Master Your Kraft'],
      }),
    ).toBe('Master Your Kraft General')
  })
})
