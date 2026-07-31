import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_ALLOWED_MODELS, loadConfig } from './config.js'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('loadConfig', () => {
  it('prefers the interactive workload key and configures the discounted router pool', () => {
    vi.stubEnv('OPENROUTER_INTERACTIVE_API_KEY', 'interactive-key')
    vi.stubEnv('OPENROUTER_API_KEY', 'legacy-key')

    expect(loadConfig()).toMatchObject({
      apiKey: 'interactive-key',
      model: 'openrouter/auto-beta',
      allowedModels: DEFAULT_ALLOWED_MODELS,
      costQualityTradeoff: 9,
    })
  })

  it('accepts a custom comma-separated allowed model pool', () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'legacy-key')
    vi.stubEnv('OPENROUTER_MODEL_SCOUT_ALLOWED_MODELS', 'openai/gpt-5.6-luna,z-ai/glm-5.2')

    expect(loadConfig().allowedModels).toEqual(['openai/gpt-5.6-luna', 'z-ai/glm-5.2'])
  })

  it('requires an OpenRouter credential', () => {
    vi.stubEnv('OPENROUTER_INTERACTIVE_API_KEY', '')
    vi.stubEnv('OPENROUTER_API_KEY', '')

    expect(() => loadConfig()).toThrow('OpenRouter API key is required')
  })
})
