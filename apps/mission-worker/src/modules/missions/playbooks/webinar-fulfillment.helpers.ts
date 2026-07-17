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
  strategyV2: 'WEB#2 — Strategy v2',
  thePlan: 'WEB#3 — THE PLAN — Launch Brief',
  marketResearch: 'WEB#4 — Market Research',
  copyPackage: 'WEB#5 — Copy Package',
  imageBriefs: 'WEB#6 — Image Briefs',
  deckOutline: 'WEB#7 — Deck Outline v1',
  creativePack: 'WEB#8 — Creative Pack',
} as const

/** Agent work steps numbered in playbook order (gates stay Gate 1/2/3). */
export function taskTitle(n: number, label: string): string {
  return `Task ${n} — ${label}`
}

export const WEBINAR_FLOW_TASKS = {
  precall: taskTitle(1, 'Pre-call strategy map'),
  strategyV2: taskTitle(2, 'Strategy v2 after call'),
  thePlan: taskTitle(3, 'THE PLAN launch brief'),
  marketResearch: taskTitle(4, 'Market research'),
  copyPackage: taskTitle(5, 'Copy Package'),
  staticAds: taskTitle(6, 'Static ads'),
  imageBriefs: taskTitle(7, 'Image briefs'),
  funnelDesign: taskTitle(8, 'Funnel design'),
  deckOutline: taskTitle(9, 'Deck Outline v1'),
  deckBuild: taskTitle(10, 'Webinar Deck v1'),
} as const

export const WEBINAR_FLOW_GATES = {
  gate1: 'Gate 1 — approve strategy package',
  gate2: 'Gate 2 — approve Copy Package',
  gate3: 'Gate 3 — approve Deck Outline v1',
} as const

/** Legacy titles still present on older Spaces — used for dual-write matching. */
export const WEBINAR_FLOW_DOC_ALIASES: Record<string, string[]> = {
  [WEBINAR_FLOW_DOCS.precall]: ['Pre-Call Strategy Map', WEBINAR_FLOW_DOCS.precall],
  [WEBINAR_FLOW_DOCS.strategyV2]: ['Strategy v2', WEBINAR_FLOW_DOCS.strategyV2],
  [WEBINAR_FLOW_DOCS.thePlan]: ['THE PLAN — Launch Brief', 'THE PLAN', WEBINAR_FLOW_DOCS.thePlan],
  [WEBINAR_FLOW_DOCS.marketResearch]: [
    'Market Research',
    'Market Research — [Client]',
    WEBINAR_FLOW_DOCS.marketResearch,
  ],
  [WEBINAR_FLOW_DOCS.copyPackage]: ['Copy Package', WEBINAR_FLOW_DOCS.copyPackage],
  [WEBINAR_FLOW_DOCS.imageBriefs]: ['Image Briefs', WEBINAR_FLOW_DOCS.imageBriefs],
  [WEBINAR_FLOW_DOCS.deckOutline]: ['Deck Outline v1', WEBINAR_FLOW_DOCS.deckOutline],
  [WEBINAR_FLOW_DOCS.creativePack]: ['Creative Pack', WEBINAR_FLOW_DOCS.creativePack],
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
