import { describe, expect, it, vi } from 'vitest'
import { SlackService } from './slack.service'

describe('Slack welcome message', () => {
  it('introduces itself as the workspace bot instead of Vibey', async () => {
    const postBlockMessage = vi.fn().mockResolvedValue(undefined)
    const service = new SlackService(
      {
        openDmChannel: vi.fn().mockResolvedValue('D123'),
        postBlockMessage,
      } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    )

    await (
      service as unknown as { sendWelcomeDm: (token: string, userId: string) => Promise<void> }
    ).sendWelcomeDm('xoxb-test', 'U123')

    expect(postBlockMessage).toHaveBeenCalledWith(
      'xoxb-test',
      'D123',
      expect.stringContaining("Hey, I'm your new bot."),
      expect.arrayContaining([
        expect.objectContaining({
          text: expect.objectContaining({
            text: expect.stringContaining("Hey 👋 I'm your new bot."),
          }),
        }),
      ]),
    )
    expect(JSON.stringify(postBlockMessage.mock.calls)).not.toContain("it's me, *Vibey*")
  })
})
