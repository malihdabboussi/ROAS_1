import { describe, expect, it } from 'vitest'
import {
  extractFirstName,
  findAgentForWebinarRole,
  formatAgentNameRole,
} from './webinar-fulfillment-team'

describe('webinar-fulfillment-team helpers', () => {
  it('formats Name · Role without double-dotting', () => {
    expect(formatAgentNameRole('Reed', 'Agency Strategist')).toBe('Reed · Agency Strategist')
    expect(formatAgentNameRole('Reed · Agency Strategist', 'Agency Strategist')).toBe(
      'Reed · Agency Strategist',
    )
  })

  it('extracts first name before role separator', () => {
    expect(extractFirstName('Nate · Agency Strategist')).toBe('Nate')
    expect(extractFirstName('Ivy')).toBe('Ivy')
  })

  it('finds agents by alias or role title', () => {
    const byAlias = findAgentForWebinarRole(
      [{ agent_key: 'nate', name: 'Nate', role: 'Agency Strategist' }],
      'strategist',
      'Agency Strategist',
    )
    expect(byAlias?.agent_key).toBe('nate')

    const byRole = findAgentForWebinarRole(
      [{ agent_key: 'custom_1', name: 'Sam', role: 'Senior Conversion Copywriter' }],
      'copywriter',
      'Senior Conversion Copywriter',
    )
    expect(byRole?.agent_key).toBe('custom_1')
  })
})
