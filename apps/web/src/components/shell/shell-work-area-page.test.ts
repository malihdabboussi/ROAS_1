import { describe, expect, it } from 'vitest'
import {
  rememberWorkAreaPage,
  resolveWorkAreaPageForConversationChange,
  sanitizeLastWorkAreaPageByConversation,
  workAreaHrefsMatch,
} from './shell-work-area-page'

const meetingPage = {
  id: '/home/meetings?meeting=evt-1',
  title: 'Strategy call',
  href: '/home/meetings?meeting=evt-1&space=space-1',
  restore: { feature: 'home_meeting', data: { id: 'evt-1' } },
}

describe('shell-work-area-page', () => {
  it('stamps and restores the last work page per conversation', () => {
    const map = rememberWorkAreaPage({}, 'conv-1', meetingPage)
    expect(map['conv-1']).toMatchObject({
      href: meetingPage.href,
      conversationId: 'conv-1',
      restore: meetingPage.restore,
    })
    expect(
      resolveWorkAreaPageForConversationChange({
        artifactPinned: false,
        nextConversationId: 'conv-1',
        lastWorkAreaPageByConversation: map,
      })?.href,
    ).toBe(meetingPage.href)
    expect(
      resolveWorkAreaPageForConversationChange({
        artifactPinned: true,
        nextConversationId: 'conv-1',
        lastWorkAreaPageByConversation: map,
      }),
    ).toBeNull()
  })

  it('hydrates persisted conversation work pages and drops junk', () => {
    const hydrated = sanitizeLastWorkAreaPageByConversation({
      'conv-1': meetingPage,
      bad: { title: 'Nope' },
      '': meetingPage,
    })
    expect(Object.keys(hydrated)).toEqual(['conv-1'])
    expect(hydrated['conv-1']?.conversationId).toBe('conv-1')
  })

  it('treats equivalent meeting hrefs as the same surface', () => {
    expect(
      workAreaHrefsMatch(
        '/home/meetings?space=space-1&meeting=evt-1',
        '/home/meetings?meeting=evt-1&space=space-1',
      ),
    ).toBe(true)
    expect(workAreaHrefsMatch('/home/meetings?meeting=evt-1', '/home/meetings?meeting=evt-2')).toBe(
      false,
    )
  })
})
