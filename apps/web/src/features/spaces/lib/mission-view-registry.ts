import type { MissionDeliverable, MissionSubtask } from '@/lib/missions'

export interface MissionViewPhase {
  id: string
  label: string
  description: string
  subtaskPatterns: RegExp[]
  deliverablePatterns: RegExp[]
}

export interface MissionViewDefinition {
  playbookId: string
  eyebrow: string
  phases: MissionViewPhase[]
}

const WEBINAR_PHASES: MissionViewPhase[] = [
  {
    id: 'strategy',
    label: 'Strategy',
    description: 'Context, pre-call, post-call, market research, and the approved launch brief.',
    subtaskPatterns: [
      /context/i,
      /pre-call/i,
      /post-call/i,
      /market research/i,
      /THE PLAN/i,
      /strategy/i,
    ],
    deliverablePatterns: [/WEB#[0-4]|strategy|THE PLAN|market research/i],
  },
  {
    id: 'copy',
    label: 'Copy',
    description: 'The complete webinar copy package and landing-page copy.',
    subtaskPatterns: [/copy package/i, /landing page copy/i, /approve copy/i],
    deliverablePatterns: [/WEB#5A|WEB#5B|copy package|landing page copy/i],
  },
  {
    id: 'creative',
    label: 'Creative',
    description: 'Static ads, image briefs, generated concepts, funnel, and deck bones.',
    subtaskPatterns: [/static/i, /image brief/i, /generated/i, /funnel/i, /deck/i, /creative/i],
    deliverablePatterns: [/static|image brief|generated|funnel|deck/i],
  },
  {
    id: 'activation',
    label: 'Activation',
    description: 'Compiled ads, media plan, production approval, and final launch handoff.',
    subtaskPatterns: [/compile/i, /media plan/i, /production package/i, /launch bible/i],
    deliverablePatterns: [/approved Meta ads|media plan|launch bible/i],
  },
]

const META_LAUNCH_PHASES: MissionViewPhase[] = [
  {
    id: 'prepare',
    label: 'Prepare',
    description: 'Reconcile every approved asset and confirm the Meta destination.',
    subtaskPatterns: [/reconcile/i, /confirm Meta account/i],
    deliverablePatterns: [/launch manifest/i],
  },
  {
    id: 'build',
    label: 'Build',
    description: 'Create campaigns, ad sets, and ads as paused Meta objects.',
    subtaskPatterns: [/build paused/i],
    deliverablePatterns: [/paused Meta build/i],
  },
  {
    id: 'activate',
    label: 'Activate',
    description: 'Review the paused build and record the human activation decision.',
    subtaskPatterns: [/review paused build/i],
    deliverablePatterns: [],
  },
]

const META_AUDIT_PHASES: MissionViewPhase[] = [
  {
    id: 'analyze',
    label: 'Analyze',
    description: 'Verify the objective and audit live performance using the real result event.',
    subtaskPatterns: [/verify audit context/i, /audit live Meta/i],
    deliverablePatterns: [/audit context|live Meta account audit/i],
  },
  {
    id: 'recommend',
    label: 'Recommend',
    description: 'Turn evidence into prioritized, bounded optimization actions.',
    subtaskPatterns: [/optimization recommendations/i, /approve optimization/i],
    deliverablePatterns: [/optimization recommendations/i],
  },
  {
    id: 'apply',
    label: 'Apply and verify',
    description: 'Apply only approved changes and schedule the next review.',
    subtaskPatterns: [/apply approved/i, /verify changes/i],
    deliverablePatterns: [/applied optimization|optimization cycle closeout/i],
  },
]

const TASK_CLEANUP_PHASES: MissionViewPhase[] = [
  {
    id: 'gather',
    label: 'Gather',
    description: 'Pull this window of calls and currently open native tasks.',
    subtaskPatterns: [/pull calls/i, /open tasks/i],
    deliverablePatterns: [],
  },
  {
    id: 'board',
    label: 'Board',
    description: 'Write the cleanup board and wait for approval before filing.',
    subtaskPatterns: [/task cleanup board/i, /approve proposed/i],
    deliverablePatterns: [/task cleanup board/i],
  },
  {
    id: 'file',
    label: 'File',
    description: 'Create only the approved proposed tasks as native platform tasks.',
    subtaskPatterns: [/file approved/i],
    deliverablePatterns: [],
  },
]

const DEFINITIONS: MissionViewDefinition[] = [
  {
    playbookId: 'webinar-fulfillment',
    eyebrow: 'WEBINAR MISSION',
    phases: WEBINAR_PHASES,
  },
  {
    playbookId: 'meta-ads-launch',
    eyebrow: 'META ADS LAUNCH',
    phases: META_LAUNCH_PHASES,
  },
  {
    playbookId: 'meta-ads-audit',
    eyebrow: 'META ADS ANALYSIS',
    phases: META_AUDIT_PHASES,
  },
  {
    playbookId: 'task-cleanup',
    eyebrow: 'TASK CLEANUP',
    phases: TASK_CLEANUP_PHASES,
  },
]

export function getMissionViewDefinition(playbookId: unknown): MissionViewDefinition | undefined {
  return DEFINITIONS.find((definition) => definition.playbookId === playbookId)
}

export function matchesMissionPhase(phase: MissionViewPhase, subtask: MissionSubtask): boolean {
  return phase.subtaskPatterns.some((pattern) => pattern.test(subtask.title))
}

export function matchesMissionPhaseDeliverable(
  phase: MissionViewPhase,
  deliverable: MissionDeliverable,
): boolean {
  return phase.deliverablePatterns.some((pattern) => pattern.test(deliverable.title))
}
