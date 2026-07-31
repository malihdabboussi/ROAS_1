import { describe, expect, it } from 'vitest'
import { resolveRouterPlugins } from './router-config.js'

describe('resolveRouterPlugins', () => {
  it('restricts Auto Beta to the approved pool and favors low-cost candidates', () => {
    expect(
      resolveRouterPlugins('openrouter/auto-beta', ['openai/gpt-5.6-luna', 'z-ai/glm-5.2'], 9),
    ).toEqual([
      {
        id: 'auto-router',
        allowedModels: ['openai/gpt-5.6-luna', 'z-ai/glm-5.2'],
        costQualityTradeoff: 9,
      },
    ])
  })

  it('does not attach Auto Beta routing rules to a fixed model', () => {
    expect(resolveRouterPlugins('openai/gpt-5.6-terra', ['openai/gpt-5.6-luna'], 9)).toBeUndefined()
  })
})
