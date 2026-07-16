import { describe, expect, it } from 'vitest'
import { globalChatSeedMatchesPanel } from './global-chat-seed-match'

describe('globalChatSeedMatchesPanel', () => {
  it('matches a space-targeted seed to the same panel space', () => {
    expect(
      globalChatSeedMatchesPanel(
        { content: 'hi', workContext: { surface: 'spaces', spaceId: 'space-1' } },
        'space-1',
      ),
    ).toBe(true)
  })

  it('rejects a space-targeted seed on a different panel space', () => {
    expect(
      globalChatSeedMatchesPanel(
        { content: 'hi', workContext: { surface: 'spaces', spaceId: 'space-1' } },
        'space-2',
      ),
    ).toBe(false)
  })

  it('matches a general seed only on the general panel', () => {
    expect(
      globalChatSeedMatchesPanel({ content: 'hi', workContext: { surface: 'general' } }, undefined),
    ).toBe(true)
    expect(
      globalChatSeedMatchesPanel({ content: 'hi', workContext: { surface: 'general' } }, 'space-1'),
    ).toBe(false)
  })

  it('matches a team Ops Desk seed on the general (no-space) panel', () => {
    expect(
      globalChatSeedMatchesPanel({ content: 'hi', workContext: { surface: 'team' } }, undefined),
    ).toBe(true)
    expect(
      globalChatSeedMatchesPanel({ content: 'hi', workContext: { surface: 'team' } }, 'space-1'),
    ).toBe(false)
  })
})