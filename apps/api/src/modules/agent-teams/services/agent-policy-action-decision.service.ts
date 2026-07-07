import { Injectable } from '@nestjs/common'
import {
  ACTION_TO_DOMAIN,
  getActionContract,
  isAtlasLikeAgent,
  isDomain,
  isHrAgent,
  isLegacySystemBuilderAgent,
  isProtectedSystemAgent,
  isVibeyAgent,
  resolveActionPolicy,
  type Action,
  type ActionContract,
  type Domain,
  type PolicyDecision,
} from '@vibey/agent-policy'
import type { AgentCapability, ResolvedAgentPolicy } from '../types'

function isLoopAgentKey(agentKey: string): boolean {
  return agentKey.trim().toLowerCase() === 'loop'
}

@Injectable()
export class AgentPolicyActionDecisionService {
  resolveUnknownAction(action: string): PolicyDecision {
    return {
      allowed: false,
      reason: `Unknown action "${action}".`,
      sourceLevel: 'role_default',
      domain: 'communicate',
    }
  }

  resolveImmediateDecision(action: Action, agentKey: string): PolicyDecision | null {
    return (
      this.resolveActionContractDecision(action, agentKey) ??
      this.resolveSystemDomainDecision(action, agentKey)
    )
  }

  resolvePolicyDecision(
    agentKey: string,
    action: Action,
    input: {
      policy: ResolvedAgentPolicy
      roleDomains: readonly Domain[]
      isSystemAgent: boolean
    },
  ): PolicyDecision {
    const teamGrants = this.extractActionDomains(input.policy.grants)
    const agentAllowExtra = this.extractActionDomains(input.policy.overrides.allow_extra)
    const agentDeny = this.extractActionDomains(input.policy.overrides.deny)

    if (input.isSystemAgent) {
      return resolveActionPolicy(action, {
        roleDomains: input.roleDomains,
        teamGrants: [],
        agentAllowExtra: [],
        agentDeny: [],
      })
    }

    const usesActionDomainPolicy =
      teamGrants.length > 0 || agentAllowExtra.length > 0 || agentDeny.length > 0

    return resolveActionPolicy(action, {
      roleDomains: usesActionDomainPolicy ? [] : input.roleDomains,
      teamGrants,
      agentAllowExtra,
      agentDeny,
    })
  }

  private resolveActionContractDecision(action: Action, agentKey: string): PolicyDecision | null {
    const contract = getActionContract(action)
    const domain = contract.domain

    if (contract.exclusiveOwner) {
      const allowed =
        this.agentMatchesOwner(agentKey, contract.exclusiveOwner) ||
        (contract.sharedOwners ? this.agentMatchesAnyOwner(agentKey, contract.sharedOwners) : false)
      return {
        allowed,
        reason: allowed
          ? `Action "${action}" is allowed for ${contract.exclusiveOwner}.`
          : `Action "${action}" is restricted to ${contract.exclusiveOwner}.`,
        sourceLevel: 'role_default',
        domain,
      }
    }

    if (contract.sharedOwners?.length) {
      if (this.agentMatchesAnyOwner(agentKey, contract.sharedOwners)) {
        return {
          allowed: true,
          reason: `Action "${action}" is allowed by shared action ownership.`,
          sourceLevel: 'role_default',
          domain,
        }
      }

      if (isProtectedSystemAgent(agentKey)) {
        return {
          allowed: false,
          reason: `Action "${action}" is not part of this protected system agent contract.`,
          sourceLevel: 'role_default',
          domain,
        }
      }
    }

    if (
      !contract.userPolicyAddable &&
      !isLegacySystemBuilderAgent(agentKey) &&
      domain !== 'edit_brain_models' &&
      domain !== 'edit_brain_company' &&
      domain !== 'write_brain' &&
      domain !== 'manage_team_identity'
    ) {
      return {
        allowed: false,
        reason: `Action "${action}" is not user-policy-addable.`,
        sourceLevel: 'role_default',
        domain,
      }
    }

    return null
  }

  private agentMatchesAnyOwner(
    agentKey: string,
    owners: NonNullable<ActionContract['sharedOwners']>,
  ): boolean {
    return owners.some((owner) => this.agentMatchesOwner(agentKey, owner))
  }

  private agentMatchesOwner(
    agentKey: string,
    owner: 'vibey' | 'atlas' | 'hr' | 'loop' | 'managed',
  ): boolean {
    if (owner === 'vibey') return isVibeyAgent(agentKey)
    if (owner === 'atlas') return isAtlasLikeAgent(agentKey)
    if (owner === 'hr') return isHrAgent(agentKey)
    if (owner === 'loop') return isLoopAgentKey(agentKey)
    return (
      !isProtectedSystemAgent(agentKey) &&
      !isLegacySystemBuilderAgent(agentKey) &&
      !isVibeyAgent(agentKey) &&
      !isAtlasLikeAgent(agentKey) &&
      !isHrAgent(agentKey) &&
      !isLoopAgentKey(agentKey)
    )
  }

  private resolveSystemDomainDecision(action: Action, agentKey: string): PolicyDecision | null {
    const domain = ACTION_TO_DOMAIN[action]
    if (domain === 'manage_own_skills') {
      return {
        allowed: true,
        reason: `Action "${action}" is allowed as a system-managed agent action.`,
        sourceLevel: 'role_default',
        domain,
      }
    }
    if (domain === 'write_user_memory') {
      return {
        allowed: true,
        reason: `Action "${action}" is allowed as regular user memory.`,
        sourceLevel: 'role_default',
        domain,
      }
    }
    if (domain === 'write_brain' || domain === 'edit_brain_models') {
      const isBrainSystemAgent = isAtlasLikeAgent(agentKey)
      return {
        allowed: isBrainSystemAgent,
        reason: isBrainSystemAgent
          ? `Action "${action}" is allowed for Atlas brain agents.`
          : `Action "${action}" is restricted to Atlas brain agents (atlas, brain_scholar).`,
        sourceLevel: 'role_default',
        domain,
      }
    }
    if (domain === 'edit_brain_company') {
      const allowed = isAtlasLikeAgent(agentKey) || isVibeyAgent(agentKey)
      return {
        allowed,
        reason: allowed
          ? `Action "${action}" is allowed for Atlas or Vibey CEO on company brain.`
          : `Action "${action}" is restricted to Atlas brain agents or Vibey CEO.`,
        sourceLevel: 'role_default',
        domain,
      }
    }
    if (domain === 'manage_team_identity') {
      const isHrMutation = action === 'create_agent' || action === 'update_agent'
      const isHrSystemAgent = isHrAgent(agentKey)
      const isVibeyOrHr = isHrSystemAgent || isVibeyAgent(agentKey)
      const allowed = isHrMutation ? isHrSystemAgent : isVibeyOrHr
      return {
        allowed,
        reason: allowed
          ? `Action "${action}" is allowed for HR.`
          : `Action "${action}" is restricted to HR. Use ask_agent or delegate_to_agent to reach HR.`,
        sourceLevel: 'role_default',
        domain,
      }
    }
    return null
  }

  private extractActionDomains(capabilities: readonly AgentCapability[]): Domain[] {
    return capabilities
      .filter((capability) => capability.kind === 'action_domain' && isDomain(capability.id))
      .map((capability) => capability.id as Domain)
  }
}
