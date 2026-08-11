import { describe, expect, it } from 'vitest'
import { PIXEL_SLACK_VOICE_BLOCK } from './pixel-slack-voice'
import { PLATFORM_TOOLS_CHANNEL_FORMATTING_BLOCK } from './platform-tools-template'

describe('Pixel Slack voice pack', () => {
  it('is shared by the live-reply formatting prompt', () => {
    expect(PLATFORM_TOOLS_CHANNEL_FORMATTING_BLOCK).toContain(PIXEL_SLACK_VOICE_BLOCK)
  })

  it('encodes the Viktor-level evidence and offer constraints', () => {
    expect(PIXEL_SLACK_VOICE_BLOCK).toMatch(/numbers verbatim/i)
    expect(PIXEL_SLACK_VOICE_BLOCK).toMatch(/at most one offer/i)
    expect(PIXEL_SLACK_VOICE_BLOCK).toMatch(/no canned closers/i)
    expect(PIXEL_SLACK_VOICE_BLOCK).toContain('*$12,450 spend*')
  })
})
