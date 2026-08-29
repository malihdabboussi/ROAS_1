import type { ResolvedAgentPolicy } from '../../agent-policy/agent-policy.types'

export function serializeResolvedAgentPolicy(policy: ResolvedAgentPolicy | null) {
  return policy
    ? {
        ...policy,
        effective: Array.from(policy.effective),
      }
    : null
}

export function deserializeResolvedAgentPolicy(
  policy: Omit<ResolvedAgentPolicy, 'effective'> & { effective?: string[] },
): ResolvedAgentPolicy {
  return {
    ...policy,
    effective: new Set(policy.effective ?? []),
  }
}
