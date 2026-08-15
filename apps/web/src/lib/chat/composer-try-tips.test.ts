import { describe, expect, it } from 'vitest'
import { COMPOSER_TRY_TIPS, pickComposerTryTip } from './composer-try-tips'

const DAY_MS = 86_400_000

describe('pickComposerTryTip', () => {
  it('returns a rotating catalog tip when none are dismissed', () => {
    const first = pickComposerTryTip([], 0)
    const nextDay = pickComposerTryTip([], DAY_MS)
    expect(first).not.toBeNull()
    expect(COMPOSER_TRY_TIPS.map((item) => item.id)).toContain(first?.id)
    expect(nextDay?.id).not.toBe(first?.id)
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
    expect(
      attachTips.every((tip) => tip.prompt.endsWith(': ') || tip.prompt.endsWith(' ')),
    ).toBe(true)
  })
})
