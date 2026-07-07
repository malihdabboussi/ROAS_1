import { describe, expect, it } from 'vitest'
import { DEFAULT_HOME_CARD_IDS, parseHomeLayout } from './home-cards.config'

describe('home card config', () => {
  it('keeps agent improvement suggestions out of Home cards', () => {
    expect(DEFAULT_HOME_CARD_IDS).not.toContain('skill_recommendations')
    expect(parseHomeLayout({ cardIds: ['skill_recommendations', 'my_tasks'] }).cardIds).toEqual([
      'my_tasks',
    ])
  })
})
