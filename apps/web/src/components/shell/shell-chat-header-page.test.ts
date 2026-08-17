import { describe, expect, it } from 'vitest'
import { isFullHomeConversation, resolveWorkAreaRestoreHref } from './shell-chat-header-page'

describe('shell-chat-header-page', () => {
  it('treats /home?conv= as a full-page conversation', () => {
    expect(isFullHomeConversation('/home', 'conversation-1')).toBe(true)
    expect(isFullHomeConversation('/home', null)).toBe(false)
    expect(isFullHomeConversation('/home/meetings', 'conversation-1')).toBe(false)
  })

  it('restores the last non-chat work page', () => {
    expect(
      resolveWorkAreaRestoreHref([
        { href: '/home?conv=conversation-1' },
        { href: '/home/meetings' },
        { href: '/brain' },
      ]),
    ).toBe('/home/meetings')
  })

  it('falls back to Meetings when only chat surfaces are remembered', () => {
    expect(resolveWorkAreaRestoreHref([{ href: '/home?conv=conversation-1' }])).toBe(
      '/home/meetings',
    )
  })
})
