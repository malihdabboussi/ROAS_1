import type {
  MissionPlaybookExpandInput,
  MissionPlaybookPlanResult,
} from './mission-playbook.types'
import { docContract, intent, pickAgent } from './webinar-fulfillment.helpers'

export const ADS_RESEARCH_PLAYBOOK_ID = 'ads-research'

const WRITING_RULE =
  'For every client-facing concept, ad, or script, load dylans-super-voice as the only voice authority. Do not load human-written-copy or dylans-voice. Use no em dashes.'

type Kickoff = {
  prompt?: string
  depth: 'standard' | 'deep'
  reporting_period: string
  selected_campaigns: string[]
  competitors: string[]
  links?: string
}

function readKickoff(input: Record<string, unknown> | null | undefined): Kickoff {
  const raw =
    input?.playbook_kickoff && typeof input.playbook_kickoff === 'object'
      ? (input.playbook_kickoff as Record<string, unknown>)
      : {}
  const strings = (value: unknown) =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
  return {
    prompt: typeof raw.prompt === 'string' ? raw.prompt : undefined,
    depth: raw.depth === 'deep' ? 'deep' : 'standard',
    reporting_period: typeof raw.reporting_period === 'string' ? raw.reporting_period : 'last_30d',
    selected_campaigns: strings(raw.selected_campaigns),
    competitors: strings(raw.competitors),
    links: typeof raw.links === 'string' ? raw.links : undefined,
  }
}

export function expandAdsResearchPlaybook(
  input: MissionPlaybookExpandInput,
): MissionPlaybookPlanResult {
  const kickoff = readKickoff(input.mission.input)
  const atlas = pickAgent(['atlas'], input.workerAgentKeys, input.managerKey)
  const blaze = pickAgent(['ads_manager', 'blaze'], input.workerAgentKeys, input.managerKey)
  const human = `human:${input.mission.user_id}`
  const scope = JSON.stringify(kickoff).slice(0, 1200)
  const subtasks: MissionPlaybookPlanResult['subtasks'] = [
    task({
      id: 'st-research-context',
      title: 'Task 1 - Prepare campaign research context',
      assignTo: atlas,
      dependsOn: [],
      why: 'Give Blaze one grounded picture of the client before interpreting ads.',
      story:
        'Atlas gathers the offer, audience, positioning, proof, Theme, and relevant Brain context.',
      sensory: 'The handoff distinguishes verified facts, supplied inputs, and genuine gaps.',
      endState: 'Blaze has enough trusted context to evaluate current and competitive ads.',
      ecology: `Read the campaign, Space, Customer Brain, Company Brain, active Theme, linked files, and kickoff. Preserve source links and do not invent missing client facts. Do not create a PDF. Kickoff: ${scope}`,
    }),
    task({
      id: 'st-current-ads-analysis',
      title: 'Task 2 - Analyze current ads',
      assignTo: blaze,
      dependsOn: ['st-research-context'],
      why: 'Recommendations need to reflect what is already winning or failing in the live account.',
      story:
        'Blaze reviews the selected Meta campaigns and diagnoses performance by actual result type.',
      sensory:
        'The analysis shows winners, losers, fatigue, traffic quality, funnel signals, and missing data.',
      endState: 'ADS-R#1 - Current Ads Analysis exists as a native editable Doc.',
      ecology: `Use get_meta_ads_insights for the mounted Meta account and the requested reporting period. Scope to selected campaign names or IDs when supplied; otherwise review active campaigns. Interpret each campaign by its real objective and result action. Include spend, impressions, clicks, CTR, CPC, CPM, results, cost per result, revenue or ROAS only when applicable, and traffic or funnel concerns. If live data is unavailable, record the exact gap and continue without inventing performance. Save ADS-R#1 - Current Ads Analysis as a native Doc. Never create a PDF. Kickoff: ${scope}`,
      outputContract: docContract('ADS-R#1 - Current Ads Analysis'),
    }),
    task({
      id: 'st-competitive-research',
      title: 'Task 3 - Research the market and competitive ads',
      assignTo: blaze,
      dependsOn: ['st-research-context'],
      why: 'The Space needs observed competitor evidence, not isolated manual searches.',
      story:
        'Blaze runs the reusable market-research skill and saves each search into Ads Research.',
      sensory: 'The Ads Research Library shows the searches and source ads used by the mission.',
      endState: 'ADS-R#2 - Market and Competitive Research exists with visual saved searches.',
      ecology: `Load roas-market-research. Prefer search_ads_research_advertisers plus run_ads_research_search so every query and returned snapshot appears in this Space's Ads Research Library. Use Meta first; add TikTok or Google only when relevant. Use save_top_n for the strongest references, pull video transcripts and ad breakdowns, rank observed longevity and variant signals, and preserve source URLs. Standard depth uses 3-5 references; deep uses 8-10. Save ADS-R#2 - Market and Competitive Research as a native Doc. Never create a PDF. Kickoff: ${scope}`,
      outputContract: docContract('ADS-R#2 - Market and Competitive Research'),
    }),
    task({
      id: 'st-ad-recommendations',
      title: 'Task 4 - Recommend new ads and draft copy',
      assignTo: blaze,
      dependsOn: ['st-current-ads-analysis', 'st-competitive-research'],
      why: 'Research becomes valuable when it produces evidence-backed tests for the client.',
      story:
        'Blaze compares account performance with market patterns and proposes distinct new ads.',
      sensory:
        'Each recommendation links its evidence, audience, angle, format, hypothesis, and draft copy.',
      endState: 'ADS-R#3 - Recommended Ads and Draft Copy exists as a native editable Doc.',
      ecology: `Read ADS-R#1 and ADS-R#2. Load roas-ad-concepts and roas-ad-copy. Identify what is working, failing, saturated, and open. Recommend distinct tests with the evidence that supports each one. Include the visual concept, on-image text, paste-ready primary text, headline, description, CTA, destination, and test hypothesis. These are research recommendations, not final production assets. ${WRITING_RULE} Save ADS-R#3 - Recommended Ads and Draft Copy as a native Doc. Never create a PDF.`,
      outputContract: docContract('ADS-R#3 - Recommended Ads and Draft Copy'),
    }),
    task({
      id: 'st-draft-video-scripts',
      title: 'Task 5 - Draft recommended video ad scripts',
      assignTo: blaze,
      dependsOn: ['st-ad-recommendations'],
      why: 'The strongest video opportunities need usable scripts before creative production begins.',
      story: 'Blaze turns approved research directions into draft client-ready video scripts.',
      sensory:
        'Every script is continuous copy with shooting instructions, overlays, and shared post-production notes.',
      endState: 'ADS-R#4 - Draft Video Ad Scripts exists as a native editable Doc.',
      ecology: `Load roas-video-ad-scripts and use the evidence and concepts in ADS-R#1 through ADS-R#3. Produce draft scripts only for recommended video concepts. Format each as Script, Shooting instructions, and Overlays, followed by one shared Post-production section. Use no quotation marks around spoken scripts and no timestamps or time ranges. ${WRITING_RULE} Save ADS-R#4 - Draft Video Ad Scripts as a native Doc. Never create a PDF.`,
      outputContract: docContract('ADS-R#4 - Draft Video Ad Scripts'),
    }),
    task({
      id: 'st-gate-research-review',
      title: 'Gate 1 - Approve research recommendations',
      assignTo: human,
      dependsOn: ['st-ad-recommendations', 'st-draft-video-scripts'],
      why: 'A human chooses what advances before production work begins.',
      story:
        'Review the evidence, concepts, copy, and scripts, then select the ideas for Ad Creation.',
      sensory: 'The gate names approved concepts and gives exact revision notes for rejected work.',
      endState: 'Approved recommendations are ready for a future Ad Creation mission.',
      ecology:
        'Review ADS-R#1 through ADS-R#4 and the saved Ads Research sources. Approve specific concepts and scripts or request exact revisions. This gate does not create final visuals or authorize publishing.',
    }),
  ]
  const assertions = subtasks.map((item) => ({
    assertionKey: item.assertionKeys[0]!,
    category: item.id.includes('gate') ? 'approval' : 'research',
    statement: `${item.title} completed with source-backed evidence.`,
    priority: 'must' as const,
    validatorType: 'human_review',
    evidenceRequirement: `${item.title} evidence`,
    failureSeverity: 'blocker' as const,
  }))
  const assertionKeys = assertions.map((item) => item.assertionKey)
  return {
    kind: 'plan',
    title: 'Ads Research',
    summary:
      'Atlas prepares context, Blaze analyzes current and competitive ads, recommends new ads and scripts, then a human approves what advances to creation.',
    approach:
      'Use one mission to connect live performance, visual ad-library evidence, Brain context, recommendations, and draft copy without producing or publishing final ads.',
    capability_gap: { exists: false, note: '', suggested_hire: '' },
    harness: {
      contextSnapshot: {
        summary: `Playbook ${ADS_RESEARCH_PLAYBOOK_ID}; ${scope}`,
        sources: [
          {
            sourceType: 'playbook',
            title: ADS_RESEARCH_PLAYBOOK_ID,
            confidence: 'strong',
            summary: 'Deterministic Ads Research flow.',
          },
        ],
        missing: [],
        sufficiency: {
          sufficientForPlan: true,
          sufficientForValidation: true,
          reason:
            'The mission records missing live data and continues with observed market evidence.',
        },
      },
      clarificationQuestions: [],
      assumptions: [
        {
          assumptionKey: 'AS-001',
          statement: 'Blaze or another ads manager is assigned.',
          confidence: 'medium',
          impact: 'Research requires a media buyer.',
        },
      ],
      assertions,
      assertionCoverage: assertions.map((assertion, index) => ({
        assertionKey: assertion.assertionKey,
        implementedBy: [subtasks[index]!.id],
        verifiedBy: ['human-review'],
        rationale: 'Playbook-owned coverage',
      })),
      validatorPlan: [
        {
          validatorKey: 'human-review',
          validatorType: 'human_review',
          assertionKeys,
          evidenceRequired: 'Native Docs, saved Ads Research snapshots, and final approval.',
        },
      ],
    },
    subtasks,
    outOfScope: [
      'Final creative production',
      'Meta campaign construction',
      'Meta publishing or activation',
      'Automatic optimization',
      'PDF deliverables',
    ],
    assignTo: blaze,
  }
}

function task(input: {
  id: string
  title: string
  assignTo: string
  dependsOn: string[]
  why: string
  story: string
  sensory: string
  endState: string
  ecology: string
  outputContract?: MissionPlaybookPlanResult['subtasks'][number]['outputContract']
}): MissionPlaybookPlanResult['subtasks'][number] {
  return { ...input, assertionKeys: [`A-${input.id}`], scheduledAt: null, intent: intent(input) }
}
