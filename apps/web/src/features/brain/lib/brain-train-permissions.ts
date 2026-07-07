import type { BrainScopeNavOption } from '@/features/brain/hooks/use-brain-scope-nav-options'
import type { MissionAgent } from '@/lib/agents'

export function canTrainBrainScope(
  option: BrainScopeNavOption,
  ctx: {
    isOrg: boolean
    isAdmin: boolean
    agentsByKey: Map<string, MissionAgent>
    canEditAgent: (agent: MissionAgent) => boolean
  },
): boolean {
  const brainId = option.brainId
  if (!brainId) return false

  const agent =
    option.scopeType === 'agent' && option.agentId ? ctx.agentsByKey.get(option.agentId) : undefined

  const canTrainCompany = ctx.isOrg && ctx.isAdmin
  const canTrainCustomer = !ctx.isOrg || ctx.isAdmin
  const canTrainUser = true
  const canTrainAgent = ctx.isAdmin || (agent ? ctx.canEditAgent(agent) : false)

  switch (option.scopeType) {
    case 'user':
      return canTrainUser
    case 'shared':
      return option.shareLevel === 'train'
    case 'company':
      return canTrainCompany
    case 'customer':
      return canTrainCustomer
    case 'agent':
      return canTrainAgent
    case 'campaign':
    case 'campaign_knowledge':
      return canTrainUser
    default:
      return false
  }
}
