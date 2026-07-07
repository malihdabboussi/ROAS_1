import type {
  AgentRuntimeAutoscalerDecision,
  AgentRuntimeAutoscalerRuntimeConfig,
  AgentRuntimeAutoscalerState,
  QueuePressureSnapshot,
} from './agent-runtime-autoscaler.types'

export interface AgentRuntimeAutoscalerPolicyInput {
  config: Pick<
    AgentRuntimeAutoscalerRuntimeConfig,
    | 'minReplicas'
    | 'maxReplicas'
    | 'scaleUpWaitMs'
    | 'scaleUpConsecutiveSamples'
    | 'scaleUpCooldownMs'
    | 'scaleDownIdleMs'
    | 'scaleDownCooldownMs'
  >
  currentReplicas: number
  snapshot: QueuePressureSnapshot
  state: AgentRuntimeAutoscalerState
}

export function createInitialAutoscalerState(): AgentRuntimeAutoscalerState {
  return {
    consecutiveScaleUpSamples: 0,
    idleSinceMs: null,
    lastScaleAtMs: 0,
  }
}

export function decideAgentRuntimeReplicaTarget(
  input: AgentRuntimeAutoscalerPolicyInput,
): AgentRuntimeAutoscalerDecision {
  const currentReplicas = Math.max(0, Math.floor(input.currentReplicas))
  const minReplicas = Math.max(1, Math.floor(input.config.minReplicas))
  const maxReplicas = Math.max(minReplicas, Math.floor(input.config.maxReplicas))
  const now = input.snapshot.sampledAtMs
  const scaleUpCooldownActive = now - input.state.lastScaleAtMs < input.config.scaleUpCooldownMs
  const scaleDownCooldownActive = now - input.state.lastScaleAtMs < input.config.scaleDownCooldownMs
  const hasReadyBacklog = input.snapshot.waiting + input.snapshot.prioritized > 0
  const oldestWaitingMs = Math.max(0, input.snapshot.oldestWaitingMs)
  const scaleUpSampleHit = hasReadyBacklog && oldestWaitingMs >= input.config.scaleUpWaitMs
  const consecutiveScaleUpSamples = scaleUpSampleHit ? input.state.consecutiveScaleUpSamples + 1 : 0
  const idle = !hasReadyBacklog && input.snapshot.active === 0
  const idleSinceMs = idle ? (input.state.idleSinceMs ?? now) : null
  const idleForMs = idleSinceMs === null ? 0 : now - idleSinceMs
  const stateAfterSample: AgentRuntimeAutoscalerState = {
    consecutiveScaleUpSamples,
    idleSinceMs,
    lastScaleAtMs: input.state.lastScaleAtMs,
  }

  if (currentReplicas < minReplicas) {
    return withScaleState({
      action: 'scale_up',
      targetReplicas: minReplicas,
      reason: `current replicas ${currentReplicas} below minimum ${minReplicas}`,
      nextState: stateAfterSample,
    })
  }

  if (currentReplicas > maxReplicas) {
    return withScaleState({
      action: 'scale_down',
      targetReplicas: maxReplicas,
      reason: `current replicas ${currentReplicas} above maximum ${maxReplicas}`,
      nextState: stateAfterSample,
    })
  }

  if (
    consecutiveScaleUpSamples >= input.config.scaleUpConsecutiveSamples &&
    currentReplicas < maxReplicas
  ) {
    if (scaleUpCooldownActive) {
      return {
        action: 'none',
        targetReplicas: currentReplicas,
        reason: 'scale-up cooldown active',
        nextState: stateAfterSample,
      }
    }

    return withScaleState({
      action: 'scale_up',
      targetReplicas: Math.min(maxReplicas, currentReplicas + 1),
      reason:
        `oldest waiting chat job ${oldestWaitingMs}ms exceeded ` +
        `${input.config.scaleUpWaitMs}ms for ${consecutiveScaleUpSamples} samples`,
      nextState: stateAfterSample,
    })
  }

  if (idleForMs >= input.config.scaleDownIdleMs && currentReplicas > minReplicas) {
    if (scaleDownCooldownActive) {
      return {
        action: 'none',
        targetReplicas: currentReplicas,
        reason: 'scale-down cooldown active',
        nextState: stateAfterSample,
      }
    }

    return withScaleState({
      action: 'scale_down',
      targetReplicas: Math.max(minReplicas, currentReplicas - 1),
      reason: `chat queue idle for ${idleForMs}ms`,
      nextState: stateAfterSample,
    })
  }

  return {
    action: 'none',
    targetReplicas: currentReplicas,
    reason: 'within replica policy',
    nextState: stateAfterSample,
  }
}

function withScaleState(decision: AgentRuntimeAutoscalerDecision): AgentRuntimeAutoscalerDecision {
  return {
    ...decision,
    nextState: {
      consecutiveScaleUpSamples: 0,
      idleSinceMs: decision.action === 'scale_down' ? decision.nextState.idleSinceMs : null,
      lastScaleAtMs: decision.nextState.lastScaleAtMs,
    },
  }
}
