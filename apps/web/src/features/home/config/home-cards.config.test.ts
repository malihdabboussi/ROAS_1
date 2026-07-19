import { describe, expect, it } from 'vitest'
import {
  DEFAULT_HOME_CARD_IDS,
  homeCardGridSize,
  homeLayoutStorageKey,
  parseHomeLayout,
} from './home-cards.config'

describe('home card config', () => {
  it('scopes the local layout cache by user id', () => {
    expect(homeLayoutStorageKey('user-abc')).toBe('vibey-home-layout:user-abc')
  })
  it('keeps agent improvement suggestions out of Home cards', () => {
    expect(DEFAULT_HOME_CARD_IDS).not.toContain('skill_recommendations')
    expect(parseHomeLayout({ cardIds: ['skill_recommendations', 'my_tasks'] }).cardIds).toEqual([
      'my_tasks',
    ])
  })

  it('parses card sizes and defaults missing keys to half', () => {
    const layout = parseHomeLayout({
      cardIds: ['my_tasks', 'approval_queue'],
      cardSizes: { my_tasks: 'full', approval_queue: 'nope', ghost: 'full' },
    })
    expect(layout.cardSizes).toEqual({ my_tasks: 'full' })
    expect(homeCardGridSize(layout, 'my_tasks')).toBe('full')
    expect(homeCardGridSize(layout, 'approval_queue')).toBe('half')
  })

  it('keeps legacy layouts without cardSizes', () => {
    expect(parseHomeLayout({ cardIds: ['my_tasks'] })).toEqual({ cardIds: ['my_tasks'] })
  })
})
