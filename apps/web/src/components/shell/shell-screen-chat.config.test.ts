import { describe, expect, it } from 'vitest'
import { shellChatScreenForPathname } from './shell-screen-chat.config'

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
      key: 'all-tasks',
      label: 'All Tasks',
    })
    expect(shellChatScreenForPathname('/all-tasks')).toEqual({
      key: 'all-tasks',
      label: 'All Tasks',
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
    expect(shellChatScreenForPathname('/launches')).toEqual({
      key: 'launches',
      label: 'Launches',
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
