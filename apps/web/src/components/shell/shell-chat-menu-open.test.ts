import { describe, expect, it } from 'vitest'
import { historyConversationOpenPlan } from './shell-chat-menu-open'

const meetingPage = {
  id: '/home/meetings?meeting=evt-1',
  title: 'Strategy call',
  href: '/home/meetings?meeting=evt-1',
  restore: { feature: 'home_meeting' as const, data: { id: 'evt-1' } },
}

describe('historyConversationOpenPlan', () => {
  it('reopens the remembered work page beside chat instead of /home?conv=', () => {
    expect(
      historyConversationOpenPlan({
        conversationId: 'conv-1',
        simpleSidebar: true,
        rememberedPage: meetingPage,
        pathname: '/campaigns',
        hasHomeConvParam: false,
      }),
    ).toEqual({
      href: meetingPage.href,
      openDrawer: true,
      restore: meetingPage.restore,
    })
  })

  it('keeps Simple Recents on full-page chat when no work page is remembered', () => {
    expect(
      historyConversationOpenPlan({
        conversationId: 'conv-1',
        simpleSidebar: true,
        rememberedPage: undefined,
        pathname: '/campaigns',
        hasHomeConvParam: false,
      }),
    ).toEqual({
      href: '/home?conv=conv-1',
      openDrawer: false,
      restore: undefined,
    })
  })
})
