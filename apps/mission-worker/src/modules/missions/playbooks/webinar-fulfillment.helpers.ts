import type { MissionPlaybookPlanResult } from './mission-playbook.types'

/** Preferred role slug → hired agent_key aliases (name-derived hires). */
const ROLE_AGENT_KEY_ALIASES: Record<string, string[]> = {
  strategist: ['strategist', 'nate', 'reed'],
  copywriter: ['copywriter', 'writer', 'ivy'],
  designer: ['designer', 'aria', 'lux'],
  ads_manager: ['ads_manager', 'blaze'],
}

export function pickAgent(
  preferred: string[],
  workerAgentKeys: string[],
  managerKey: string,
): string {
  const workers = new Set(workerAgentKeys)
  for (const key of preferred) {
    if (workers.has(key)) return key
    const aliases = ROLE_AGENT_KEY_ALIASES[key] ?? []
    for (const alias of aliases) {
      if (workers.has(alias)) return alias
    }
  }
  if (workerAgentKeys.length > 0) return workerAgentKeys[0]!
  return managerKey || 'vibey'
}

export function intent(parts: {
  why: string
  story: string
  sensory: string
  endState: string
  ecology: string
}) {
  return parts
}

export function docContract(title: string): NonNullable<
  MissionPlaybookPlanResult['subtasks'][number]['outputContract']
> {
  return {
    artifact_kind: 'document_artifact',
    required_action: 'save_document',
    required_artifact_type: 'doc',
    expected: { title },
  }
}

export function funnelContract(): NonNullable<
  MissionPlaybookPlanResult['subtasks'][number]['outputContract']
> {
  return {
    artifact_kind: 'funnel_artifact',
    required_action: 'create_funnel',
    required_artifact_type: 'funnel',
    expected: { consume: 'Copy Package Section 5 design-handoff block as-is' },
  }
}

export function presentationContract(title: string): NonNullable<
  MissionPlaybookPlanResult['subtasks'][number]['outputContract']
> {
  return {
    artifact_kind: 'presentation_artifact',
    required_action: 'create_presentation',
    required_artifact_type: 'presentation',
    expected: { title },
  }
}

export function adContract(title: string): NonNullable<
  MissionPlaybookPlanResult['subtasks'][number]['outputContract']
> {
  return {
    artifact_kind: 'ad_artifact',
    required_action: 'create_ad',
    required_artifact_type: 'ad',
    expected: { title },
  }
}
