import { describe, expect, it } from 'vitest'
import type { BrainScopeNavOption } from '../hooks/use-brain-scope-nav-options'
import { resolveBrainScopeRuntimeState } from './brain-scope-runtime'

function scope(overrides: Partial<BrainScopeNavOption>): BrainScopeNavOption {
  return {
    id: 'user',
    label: 'User Brain',
    agentId: null,
    brainId: null,
    scopeType: 'user',
    ...overrides,
  }
}

describe('brain scope runtime readiness', () => {
  it('keeps unresolved Company Cortex from enabling unscoped graph, queue, health, or realtime work', () => {
    const company = scope({
      id: 'company',
      label: 'Company Cortex',
      scopeType: 'company',
      brainId: null,
    })

    const state = resolveBrainScopeRuntimeState({
      scopeOptions: [scope({}), company],
      selectedScopeId: 'company',
      selectedScope: company,
      scopeOptionsResolved: false,
      scopesLoading: true,
    })

    expect(state.ready).toBe(false)
    expect(state.requiresBrainId).toBe(true)
    expect(state.graphBrainId).toBeUndefined()
    expect(state.queueBrainId).toBeUndefined()
    expect(state.queueCampaignId).toBeUndefined()
    expect(state.queueTargetBrain).toBeUndefined()
    expect(state.queueEnabled).toBe(false)
    expect(state.realtimeEnabled).toBe(false)
    expect(state.healthRealtimeEnabled).toBe(false)
  })

  it('uses the resolved Company Cortex brain id for graph, queue, health, and realtime work', () => {
    const company = scope({
      id: 'company',
      label: 'Company Cortex',
      scopeType: 'company',
      brainId: 'company-brain-1',
    })

    const state = resolveBrainScopeRuntimeState({
      scopeOptions: [scope({}), company],
      selectedScopeId: 'company',
      selectedScope: company,
      scopeOptionsResolved: true,
      scopesLoading: false,
    })

    expect(state.ready).toBe(true)
    expect(state.graphBrainId).toBe('company-brain-1')
    expect(state.queueBrainId).toBe('company-brain-1')
    expect(state.queueCampaignId).toBeUndefined()
    expect(state.queueTargetBrain).toBeUndefined()
    expect(state.queueEnabled).toBe(true)
    expect(state.realtimeEnabled).toBe(true)
    expect(state.healthRealtimeEnabled).toBe(true)
  })

  it('uses the resolved user brain id for the user brain queue', () => {
    const user = scope({ id: 'user', scopeType: 'user', brainId: 'user-brain-1' })

    const state = resolveBrainScopeRuntimeState({
      scopeOptions: [user],
      selectedScopeId: 'user',
      selectedScope: user,
      scopeOptionsResolved: true,
      scopesLoading: false,
    })

    expect(state.ready).toBe(true)
    expect(state.graphBrainId).toBe('user-brain-1')
    expect(state.queueBrainId).toBe('user-brain-1')
    expect(state.queueTargetBrain).toBeUndefined()
    expect(state.queueEnabled).toBe(true)
    expect(state.healthRealtimeEnabled).toBe(true)
  })

  it('requires and uses the explicit brain id for a managed Person Brain', () => {
    const person = scope({
      id: 'person:brain-bryce',
      label: 'Bryce Person Brain',
      scopeType: 'person',
      brainId: 'brain-bryce',
    })

    const state = resolveBrainScopeRuntimeState({
      scopeOptions: [person],
      selectedScopeId: person.id,
      selectedScope: person,
      scopeOptionsResolved: true,
      scopesLoading: false,
    })

    expect(state.ready).toBe(true)
    expect(state.requiresBrainId).toBe(true)
    expect(state.graphBrainId).toBe('brain-bryce')
    expect(state.queueBrainId).toBe('brain-bryce')
    expect(state.queueTargetBrain).toBeUndefined()
  })

  it('keeps user scope usable after scope nav resolves even without a browser-resolved brain id', () => {
    const user = scope({ id: 'user', scopeType: 'user', brainId: null })

    const state = resolveBrainScopeRuntimeState({
      scopeOptions: [user],
      selectedScopeId: 'user',
      selectedScope: user,
      scopeOptionsResolved: true,
      scopesLoading: false,
    })

    expect(state.ready).toBe(true)
    expect(state.graphBrainId).toBeUndefined()
    expect(state.queueBrainId).toBeUndefined()
    expect(state.queueTargetBrain).toBe('user')
    expect(state.queueEnabled).toBe(true)
    expect(state.healthRealtimeEnabled).toBe(true)
  })
})
