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

/** Stable Space/mission doc titles for the webinar fulfillment flow (WEB#N). */
export const WEBINAR_FLOW_DOCS = {
  precall: 'WEB#1 — Pre-Call Strategy Map',
  strategyV2: 'WEB#2 — Post-Call Strategy Map',
  thePlan: 'WEB#3 — THE PLAN — Launch Brief',
  marketResearch: 'WEB#4 — Market Research',
  copyPackage: 'WEB#5 — Copy Package',
  imageBriefs: 'WEB#6 — Image Briefs',
  mediaPlan: 'WEB#7 — Media Plan',
} as const

/** Agent work steps numbered in playbook order (gates stay Gate 1/2/3). */
export function taskTitle(n: number, label: string): string {
  return `Task ${n} — ${label}`
}

export const WEBINAR_FLOW_TASKS = {
  atlasContext: taskTitle(1, 'Atlas context preparation'),
  precall: taskTitle(2, 'Pre-call strategy map'),
  atlasTranscript: taskTitle(3, 'Atlas call and transcript intake'),
  strategyV2: taskTitle(4, 'Post-call strategy map'),
  marketResearch: taskTitle(5, 'Market research'),
  thePlan: taskTitle(6, 'THE PLAN launch brief'),
  copyPackage: taskTitle(7, 'Complete webinar copy package'),
  staticAds: taskTitle(8, 'Static Meta ads'),
  imageBriefs: taskTitle(9, 'Image briefs'),
  funnelDesign: taskTitle(10, 'Native webinar funnel'),
  deckBones: taskTitle(11, 'Webinar Deck Bones'),
  mediaPlan: taskTitle(12, 'Media plan'),
} as const

export const WEBINAR_FLOW_GATES = {
  precall: 'Gate 1 — review pre-call map and provide call',
  strategy: 'Gate 2 — approve strategy and client message',
  copy: 'Gate 3 — approve Copy Package',
  production: 'Gate 4 — approve production package',
} as const

/** Legacy titles still present on older Spaces — used for dual-write matching. */
export const WEBINAR_FLOW_DOC_ALIASES: Record<string, string[]> = {
  [WEBINAR_FLOW_DOCS.precall]: ['Pre-Call Strategy Map', WEBINAR_FLOW_DOCS.precall],
  [WEBINAR_FLOW_DOCS.strategyV2]: [
    'Strategy v2',
    'WEB#2 — Strategy v2',
    'Post-Call Strategy Map',
    WEBINAR_FLOW_DOCS.strategyV2,
  ],
  [WEBINAR_FLOW_DOCS.thePlan]: ['THE PLAN — Launch Brief', 'THE PLAN', WEBINAR_FLOW_DOCS.thePlan],
  [WEBINAR_FLOW_DOCS.marketResearch]: [
    'Market Research',
    'Market Research — [Client]',
    WEBINAR_FLOW_DOCS.marketResearch,
  ],
  [WEBINAR_FLOW_DOCS.copyPackage]: ['Copy Package', WEBINAR_FLOW_DOCS.copyPackage],
  [WEBINAR_FLOW_DOCS.imageBriefs]: ['Image Briefs', WEBINAR_FLOW_DOCS.imageBriefs],
  [WEBINAR_FLOW_DOCS.mediaPlan]: ['Media Plan', WEBINAR_FLOW_DOCS.mediaPlan],
}

export function docContract(
  title: string,
): NonNullable<MissionPlaybookPlanResult['subtasks'][number]['outputContract']> {
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

export function presentationContract(
  title: string,
): NonNullable<MissionPlaybookPlanResult['subtasks'][number]['outputContract']> {
  return {
    artifact_kind: 'presentation_artifact',
    required_action: 'create_presentation',
    required_artifact_type: 'presentation',
    expected: { title },
  }
}

export function adContract(
  title: string,
): NonNullable<MissionPlaybookPlanResult['subtasks'][number]['outputContract']> {
  return {
    artifact_kind: 'ad_artifact',
    required_action: 'create_ad',
    required_artifact_type: 'ad',
    expected: { title },
  }
}
