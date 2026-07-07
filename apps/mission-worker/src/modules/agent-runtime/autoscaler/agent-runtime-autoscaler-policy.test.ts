import { describe, expect, it } from 'vitest'
import {
  createInitialAutoscalerState,
  decideAgentRuntimeReplicaTarget,
} from './agent-runtime-autoscaler-policy'
import type {
  AgentRuntimeAutoscalerRuntimeConfig,
  AgentRuntimeAutoscalerState,
  QueuePressureSnapshot,
} from './agent-runtime-autoscaler.types'

const config: Pick<
  AgentRuntimeAutoscalerRuntimeConfig,
  | 'minReplicas'
  | 'maxReplicas'
  | 'scaleUpWaitMs'
  | 'scaleUpConsecutiveSamples'
  | 'scaleUpCooldownMs'
  | 'scaleDownIdleMs'
  | 'scaleDownCooldownMs'
> = {
  minReplicas: 2,
  maxReplicas: 4,
  scaleUpWaitMs: 10000,
  scaleUpConsecutiveSamples: 2,
  scaleUpCooldownMs: 120000,
  scaleDownIdleMs: 900000,
  scaleDownCooldownMs: 900000,
}

function snapshot(overrides: Partial<QueuePressureSnapshot> = {}): QueuePressureSnapshot {
  return {
    waiting: 0,
    prioritized: 0,
    delayed: 0,
    active: 0,
    oldestWaitingMs: 0,
    sampledAtMs: 1_000_000,
    ...overrides,
  }
}

function state(overrides: Partial<AgentRuntimeAutoscalerState> = {}): AgentRuntimeAutoscalerState {
  return {
    ...createInitialAutoscalerState(),
    ...overrides,
  }
}

describe('decideAgentRuntimeReplicaTarget', () => {
  it('raises replicas to the configured minimum', () => {
    const decision = decideAgentRuntimeReplicaTarget({
      config,
      currentReplicas: 1,
      snapshot: snapshot(),
      state: state(),
    })

    expect(decision.action).toBe('scale_up')
    expect(decision.targetReplicas).toBe(2)
  })

  it('waits for two sustained over-threshold samples before scaling up', () => {
    const first = decideAgentRuntimeReplicaTarget({
      config,
      currentReplicas: 2,
      snapshot: snapshot({ waiting: 1, oldestWaitingMs: 11000 }),
      state: state(),
    })

    expect(first.action).toBe('none')
    expect(first.nextState.consecutiveScaleUpSamples).toBe(1)

    const second = decideAgentRuntimeReplicaTarget({
      config,
      currentReplicas: 2,
      snapshot: snapshot({ waiting: 1, oldestWaitingMs: 12000 }),
      state: first.nextState,
    })

    expect(second.action).toBe('scale_up')
    expect(second.targetReplicas).toBe(3)
    expect(second.nextState.consecutiveScaleUpSamples).toBe(0)
  })

  it('does not scale above the configured maximum', () => {
    const decision = decideAgentRuntimeReplicaTarget({
      config,
      currentReplicas: 4,
      snapshot: snapshot({ waiting: 3, oldestWaitingMs: 30000 }),
      state: state({ consecutiveScaleUpSamples: 1 }),
    })

    expect(decision.action).toBe('none')
    expect(decision.targetReplicas).toBe(4)
  })

  it('honors the scale-up cooldown', () => {
    const decision = decideAgentRuntimeReplicaTarget({
      config,
      currentReplicas: 2,
      snapshot: snapshot({ waiting: 1, oldestWaitingMs: 20000 }),
      state: state({
        consecutiveScaleUpSamples: 1,
        lastScaleAtMs: 990000,
      }),
    })

    expect(decision.action).toBe('none')
    expect(decision.reason).toBe('scale-up cooldown active')
  })

  it('scales down after the queue has been idle for the configured window', () => {
    const decision = decideAgentRuntimeReplicaTarget({
      config,
      currentReplicas: 3,
      snapshot: snapshot(),
      state: state({
        idleSinceMs: 100000,
      }),
    })

    expect(decision.action).toBe('scale_down')
    expect(decision.targetReplicas).toBe(2)
  })

  it('does not scale below the configured minimum', () => {
    const decision = decideAgentRuntimeReplicaTarget({
      config,
      currentReplicas: 2,
      snapshot: snapshot(),
      state: state({
        idleSinceMs: 100000,
      }),
    })

    expect(decision.action).toBe('none')
    expect(decision.targetReplicas).toBe(2)
  })
})
