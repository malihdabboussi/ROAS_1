import { describe, expect, it } from 'vitest'
import {
  resolveScreenChatNavigation,
  SHELL_SCREEN_CHAT_MESSAGES,
  shellChatScreenForPathname,
} from './shell-screen-chat.config'

describe('shellChatScreenForPathname', () => {
  it('maps left-sidebar screens to stable keys and labels', () => {
    expect(shellChatScreenForPathname('/home/inbox')).toEqual({
      key: 'home:inbox',
      label: 'Inbox',
    })
    expect(shellChatScreenForPathname('/home/meetings')).toEqual({
      key: 'home:meetings',
      label: 'Meetings',
    })
    expect(shellChatScreenForPathname('/home/my-tasks')).toEqual({
      key: 'home:my-tasks',
      label: 'My Tasks',
    })
    expect(shellChatScreenForPathname('/home/delegation-desk')).toEqual({
      key: 'home:delegation-desk',
      label: 'Delegation Desk',
    })
    expect(shellChatScreenForPathname('/clients/client-1')).toEqual({
      key: 'clients',
      label: 'Clients',
    })
    expect(shellChatScreenForPathname('/client-campaigns/campaign-1')).toEqual({
      key: 'client-campaigns',
      label: 'Client Campaigns',
    })
    expect(shellChatScreenForPathname('/brain')).toEqual({ key: 'brain', label: 'Brain' })
    expect(shellChatScreenForPathname('/team/people')).toEqual({ key: 'team', label: 'Team' })
    expect(shellChatScreenForPathname('/programs/program-1')).toEqual({
      key: 'programs',
      label: 'Programs',
    })
  })

  it('keeps space, campaign, and channel routes out of the screen map — they own their chat scope', () => {
    expect(shellChatScreenForPathname('/spaces/space-1')).toBeNull()
    expect(shellChatScreenForPathname('/campaigns/campaign-1')).toBeNull()
    expect(shellChatScreenForPathname('/home/channels/channel-1')).toBeNull()
  })

  it('treats the full-page Home chat and unknown routes as unscoped', () => {
    expect(shellChatScreenForPathname('/home')).toBeNull()
    expect(shellChatScreenForPathname('/home/unknown-surface')).toBeNull()
    expect(shellChatScreenForPathname('/settings')).toBeNull()
  })
})

describe('resolveScreenChatNavigation', () => {
  const screen = { key: 'home:inbox', label: 'Inbox' }

  it('keeps the open chat and offers the screen’s last chat when they differ', () => {
    expect(
      resolveScreenChatNavigation({
        screen,
        chatPaneOpen: true,
        openConversationId: 'conv-current',
        lastScreenConversationId: 'conv-inbox',
      }),
    ).toEqual({ type: 'keep-and-prompt', conversationId: 'conv-inbox' })
  })

  it('shows no prompt when the open chat already belongs to the screen', () => {
    expect(
      resolveScreenChatNavigation({
        screen,
        chatPaneOpen: true,
        openConversationId: 'conv-inbox',
        lastScreenConversationId: 'conv-inbox',
      }),
    ).toEqual({ type: 'none' })
  })

  it('shows no prompt when the screen has no prior chat', () => {
    expect(
      resolveScreenChatNavigation({
        screen,
        chatPaneOpen: true,
        openConversationId: 'conv-current',
        lastScreenConversationId: null,
      }),
    ).toEqual({ type: 'none' })
  })

  it('starts a fresh screen-scoped chat when no conversation is open in the pane', () => {
    expect(
      resolveScreenChatNavigation({
        screen,
        chatPaneOpen: true,
        openConversationId: null,
        lastScreenConversationId: 'conv-inbox',
      }),
    ).toEqual({ type: 'fresh-chat' })
  })

  it('does nothing when the chat pane is closed or the route is unscoped', () => {
    expect(
      resolveScreenChatNavigation({
        screen,
        chatPaneOpen: false,
        openConversationId: 'conv-current',
        lastScreenConversationId: 'conv-inbox',
      }),
    ).toEqual({ type: 'none' })
    expect(
      resolveScreenChatNavigation({
        screen: null,
        chatPaneOpen: true,
        openConversationId: 'conv-current',
        lastScreenConversationId: null,
      }),
    ).toEqual({ type: 'none' })
  })
})

describe('SHELL_SCREEN_CHAT_MESSAGES', () => {
  it('names the target screen in the switch prompt', () => {
    expect(SHELL_SCREEN_CHAT_MESSAGES.switchPrompt('Inbox')).toBe('Switch to your last Inbox chat?')
  })
})
