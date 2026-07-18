import { describe, expect, it } from 'vitest'
import { isFullShellConversation } from './shell-chat-breadcrumb'

describe('isFullShellConversation', () => {
  it('treats a Home conversation as full chat', () => {
    expect(
      isFullShellConversation({
        pathname: '/home',
        hasConversationParam: true,
        spaceWorkOpen: true,
        chatDrawerOpen: false,
      }),
    ).toBe(true)
  })

  it('treats a Space chat as full only when the work area is hidden', () => {
    expect(
      isFullShellConversation({
        pathname: '/spaces',
        hasConversationParam: false,
        spaceWorkOpen: false,
        chatDrawerOpen: true,
      }),
    ).toBe(true)
    expect(
      isFullShellConversation({
        pathname: '/spaces',
        hasConversationParam: false,
        spaceWorkOpen: true,
        chatDrawerOpen: true,
      }),
    ).toBe(false)
  })
})
