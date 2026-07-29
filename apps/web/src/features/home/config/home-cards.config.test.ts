import { describe, expect, it } from 'vitest'
import {
  DEFAULT_HOME_CARD_IDS,
  HOME_LAYOUT_VERSION,
  homeCardGridRows,
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
      'agenda',
      'inbox_feed',
    ])
  })

  it('parses card sizes and defaults missing keys to half', () => {
    const layout = parseHomeLayout({
      version: HOME_LAYOUT_VERSION,
      cardIds: ['my_tasks', 'approval_queue'],
      cardSizes: { my_tasks: 'full', approval_queue: 'nope', ghost: 'full' },
    })
    expect(layout.cardSizes).toEqual({ my_tasks: 'full' })
    expect(homeCardGridSize(layout, 'my_tasks')).toBe('full')
    expect(homeCardGridSize(layout, 'approval_queue')).toBe('half')
  })

  it('defaults Inbox to two rows and preserves explicit vertical card sizes', () => {
    const layout = parseHomeLayout({
      version: HOME_LAYOUT_VERSION,
      cardIds: ['inbox_feed', 'agenda'],
      cardRows: { inbox_feed: 3, agenda: 2, ghost: 3 },
    })
    expect(layout.cardRows).toEqual({ inbox_feed: 3, agenda: 2 })
    expect(homeCardGridRows(layout, 'inbox_feed')).toBe(3)
    expect(homeCardGridRows(layout, 'agenda')).toBe(2)
    expect(homeCardGridRows({ ...layout, cardRows: undefined }, 'inbox_feed')).toBe(2)
    expect(homeCardGridRows({ ...layout, cardRows: undefined }, 'agenda')).toBe(1)
  })

  it('migrates version two layouts without losing card order or widths', () => {
    expect(
      parseHomeLayout({
        version: 2,
        cardIds: ['my_tasks', 'inbox_feed'],
        cardSizes: { my_tasks: 'full' },
      }),
    ).toEqual({
      version: HOME_LAYOUT_VERSION,
      cardIds: ['my_tasks', 'inbox_feed'],
      cardSizes: { my_tasks: 'full' },
    })
  })

  it('re-seeds unversioned layouts to the Agenda and Inbox default', () => {
    expect(parseHomeLayout({ cardIds: ['my_tasks'] })).toEqual({
      version: HOME_LAYOUT_VERSION,
      cardIds: ['agenda', 'inbox_feed'],
      cardSizes: { agenda: 'full', inbox_feed: 'full' },
      cardRows: { inbox_feed: 2 },
    })
  })
})
