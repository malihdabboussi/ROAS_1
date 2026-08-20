import { describe, expect, it, vi } from 'vitest'
import {
  applySlackMentionIdentities,
  expandInboundSlackMentions,
  stripSelfSlackMentions,
} from '../slack-inbound-mention-expansion'

describe('slack inbound mention expansion', () => {
  it('strips only the Pixel bot mention and keeps teammate tags', () => {
    expect(stripSelfSlackMentions('<@UBOT> make this a GHL task for <@UHARRY>', 'UBOT')).toBe(
      'make this a GHL task for <@UHARRY>',
    )
  })

  it('replaces Slack ids with display names and a directory that blocks slash-alias guesses', () => {
    const result = applySlackMentionIdentities('CRM task for <@UHARRY> on Yasir SMS', [
      {
        slackUserId: 'UHARRY',
        displayName: 'Harry M.',
        email: 'harry.m@roas.co',
        linkedRoasName: null,
      },
    ])
    expect(result.text).toBe('CRM task for @Harry M. on Yasir SMS')
    expect(result.directoryBlock).toContain('Harry M. <harry.m@roas.co>')
    expect(result.directoryBlock).toContain('do not guess another person who shares a first name')
  })

  it('loads channel-member email and linked ROAS name for assignee matching', async () => {
    const from = vi.fn((table: string) => {
      if (table === 'channel_members') {
        return {
          select: () => ({
            eq: () => ({
              in: () => ({
                eq: () =>
                  Promise.resolve({
                    data: [
                      {
                        platform_id: 'UHARRY',
                        display_name: 'Harry M.',
                        username: 'harrym',
                        email: 'harry.m@roas.co',
                        vibey_user_id: 'user-harry',
                      },
                    ],
                  }),
              }),
            }),
          }),
        }
      }
      return {
        select: () => ({
          in: () =>
            Promise.resolve({
              data: [{ id: 'user-harry', full_name: 'Harry Morales', email: 'harry.m@roas.co' }],
            }),
        }),
      }
    })
    const result = await expandInboundSlackMentions({
      supabase: { from } as never,
      slackApi: { getUserInfo: vi.fn() },
      orgId: 'org-1',
      ownerUserId: 'owner-1',
      botToken: 'xoxb',
      botUserId: 'UBOT',
      text: '<@UBOT> task for CRM for <@UHARRY>',
    })
    expect(result.text).toBe('task for CRM for @Harry M.')
    expect(result.directoryBlock).toContain('linked ROAS user: Harry Morales')
    expect(result.directoryBlock).not.toContain('Harry/Haroon')
  })
})
