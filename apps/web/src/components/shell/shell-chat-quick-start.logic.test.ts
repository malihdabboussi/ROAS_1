import { describe, expect, it } from 'vitest'
import {
  buildShellQuickStartSendContext,
  shellQuickStartMatchesComposer,
} from './shell-chat-quick-start.logic'
import { SHELL_EMPTY_CHAT_CAPABILITIES } from './shell-empty-chat-prompts.config'

const imageQuickStart = SHELL_EMPTY_CHAT_CAPABILITIES.find((item) => item.id === 'image')!

describe('shell chat quick-start lifecycle', () => {
  it('keeps routing active while the user completes the seeded request', () => {
    expect(
      shellQuickStartMatchesComposer(imageQuickStart, 'Generate an image of a new product'),
    ).toBe(true)
  })

  it('clears routing when the seeded intent is replaced or emptied', () => {
    expect(shellQuickStartMatchesComposer(imageQuickStart, 'Write an email instead')).toBe(false)
    expect(shellQuickStartMatchesComposer(imageQuickStart, '')).toBe(false)
  })

  it('adds the selected workflow contract only to matching sends', () => {
    expect(
      buildShellQuickStartSendContext(imageQuickStart, 'Generate an image of a new product'),
    ).toContain('generate_image')
    expect(
      buildShellQuickStartSendContext(imageQuickStart, 'Write an email instead'),
    ).toBeUndefined()
    expect(
      buildShellQuickStartSendContext(null, 'Generate an image of a new product'),
    ).toBeUndefined()
  })
})
