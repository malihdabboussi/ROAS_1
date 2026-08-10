import { describe, expect, it } from 'vitest'
import {
  DEFAULT_AGENT_AVATAR_URL,
  DEFAULT_AGENT_DISPLAY_NAME,
  normalizeDefaultAgentIdentity,
} from './default-agent-identity'

const base = {
  agent_key: 'vibey' as string | null,
  display_name: 'Vibey',
  avatar_url: 'https://cdn.example.com/human.png' as string | null,
}

describe('normalizeDefaultAgentIdentity', () => {
  it('renames the seeded default agent to Pixel with the lamp avatar', () => {
    const result = normalizeDefaultAgentIdentity({ ...base, display_name: 'Vibey' })
    expect(result.display_name).toBe(DEFAULT_AGENT_DISPLAY_NAME)
    expect(result.avatar_url).toBe(DEFAULT_AGENT_AVATAR_URL)
  })

  it('also normalizes the legacy ROAS default name', () => {
    const result = normalizeDefaultAgentIdentity({ ...base, display_name: 'ROAS' })
    expect(result.display_name).toBe(DEFAULT_AGENT_DISPLAY_NAME)
    expect(result.avatar_url).toBe(DEFAULT_AGENT_AVATAR_URL)
  })

  it('also normalizes seeded names with a role suffix', () => {
    const result = normalizeDefaultAgentIdentity({ ...base, display_name: 'Vibey · CEO' })
    expect(result.display_name).toBe(DEFAULT_AGENT_DISPLAY_NAME)
    expect(result.avatar_url).toBe(DEFAULT_AGENT_AVATAR_URL)
  })

  it('respects orgs that customized the agent name', () => {
    const result = normalizeDefaultAgentIdentity({ ...base, display_name: 'Nova' })
    expect(result.display_name).toBe('Nova')
    expect(result.avatar_url).toBe(base.avatar_url)
  })

  it('leaves non-default agents untouched', () => {
    const result = normalizeDefaultAgentIdentity({
      ...base,
      agent_key: 'loop',
      display_name: 'Vibey',
    })
    expect(result.display_name).toBe('Vibey')
    expect(result.avatar_url).toBe(base.avatar_url)
  })
})
