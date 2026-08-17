import { describe, expect, it } from 'vitest'
import {
  COMPOSER_TRY_TIPS,
  composerTryTipRotationSeed,
  pickComposerTryTip,
} from './composer-try-tips'

describe('pickComposerTryTip', () => {
  it('rotates through the remaining catalog by index', () => {
    const first = pickComposerTryTip([], 0)
    const next = pickComposerTryTip([], 1)
    expect(first).not.toBeNull()
    expect(COMPOSER_TRY_TIPS.map((item) => item.id)).toContain(first?.id)
    expect(next?.id).not.toBe(first?.id)
    expect(pickComposerTryTip([], COMPOSER_TRY_TIPS.length)?.id).toBe(first?.id)
  })

  it('skips dismissed tips and hides the banner when all are dismissed', () => {
    const first = COMPOSER_TRY_TIPS[0]
    expect(first).toBeDefined()
    expect(pickComposerTryTip([first!.id], 0)?.id).not.toBe(first!.id)
    expect(pickComposerTryTip(COMPOSER_TRY_TIPS.map((tip) => tip.id))).toBeNull()
  })

  it('keeps attach prompts incomplete so Try can open a new task without sending', () => {
    const attachTips = COMPOSER_TRY_TIPS.filter((tip) => tip.seedMode === 'attach')
    expect(attachTips.length).toBeGreaterThan(0)
    expect(attachTips.every((tip) => tip.prompt.endsWith(': ') || tip.prompt.endsWith(' '))).toBe(
      true,
    )
  })

  it('covers multiple distinct tip concepts', () => {
    expect(COMPOSER_TRY_TIPS.length).toBeGreaterThanOrEqual(10)
    expect(new Set(COMPOSER_TRY_TIPS.map((tip) => tip.id)).size).toBe(COMPOSER_TRY_TIPS.length)
  })
})

describe('composerTryTipRotationSeed', () => {
  it('stays stable for the same conversation and differs across chats', () => {
    expect(composerTryTipRotationSeed('conversation-a')).toBe(
      composerTryTipRotationSeed('conversation-a'),
    )
    expect(composerTryTipRotationSeed('conversation-a')).not.toBe(
      composerTryTipRotationSeed('conversation-b'),
    )
    expect(composerTryTipRotationSeed(null)).toBe(0)
  })
})
