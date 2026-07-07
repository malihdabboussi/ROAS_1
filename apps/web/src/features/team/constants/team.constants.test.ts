import { describe, expect, it } from 'vitest'
import {
  agentModelId,
  agentModelSettings,
  agentPresenceStatusDotClass,
} from './team.constants'

describe('team constants helpers', () => {
  it('resolves agent model ids from config with auto fallback', () => {
    expect(agentModelId({ config: { model_id: 'auto:power' } })).toBe('auto:power')
    expect(agentModelId({ config: { model_id: '' } })).toBe('auto')
    expect(agentModelId({ config: null })).toBe('auto')
  })

  it('normalizes agent model settings without cortex fields', () => {
    expect(
      agentModelSettings({
        config: {
          model_settings: {
            context_window_tokens: 200000,
            reasoning_effort: 'high',
            speed_mode: 'fast',
            cortex_max: true,
          },
        },
      }),
    ).toEqual({
      context_window_tokens: 200000,
      reasoning_effort: 'high',
      speed_mode: 'fast',
    })
  })

  it('maps status dots from active state and status', () => {
    expect(agentPresenceStatusDotClass({ is_active: false, status: 'online' })).toBe(
      'status-dot-glass status-dot-glass-muted',
    )
    expect(agentPresenceStatusDotClass({ is_active: true, status: 'working' })).toBe(
      'status-dot-glass status-dot-glass-blue',
    )
    expect(agentPresenceStatusDotClass({ is_active: true, status: 'online' })).toBe(
      'status-dot-glass status-dot-glass-emerald',
    )
  })
})
