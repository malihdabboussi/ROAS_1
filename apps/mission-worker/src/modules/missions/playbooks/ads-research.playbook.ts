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
        'Atlas verifies who the client is, what they sell, who they serve, and which sources prove it.',
      sensory:
        'The handoff opens with a client identity check and separates verified client facts from agency guidance, account labels, competitors, and genuine gaps.',
      endState: 'ADS-R#0 - Verified Campaign Research Context exists as a native editable Doc.',
      ecology: `Start from the exact runtime CAMPAIGN_ID and SPACE_ID. Call get_campaign with CAMPAIGN_ID and get_space with SPACE_ID before broad retrieval. Use the resolved campaign, Space, linked files, active Theme, and kickoff for campaign-specific facts. Search Customer Brain with search_customer_brain for client, offer, audience, and customer evidence. Search Company Brain only for organization-wide strategy and standards; do not treat Company Brain guidance as proof of this client's identity. Meta account, Page, campaign, and advertiser names are routing or evidence labels, not proof of the client's business model. Competitor and ad-library findings are never client truth. Create a first section titled Client identity check with the verified client or brand name, business model, offer, target audience, exact source for each fact, confidence, and conflicts. Keep a source ledger that distinguishes client facts, supplied kickoff details, account metadata, agency guidance, and competitor observations. If the client identity, business model, offer, or audience is missing or sources conflict, do not choose a plausible answer; block the subtask and request correction. Save ADS-R#0 - Verified Campaign Research Context as a native Doc. Do not create a PDF. Kickoff: ${scope}`,
      outputContract: docContract('ADS-R#0 - Verified Campaign Research Context'),
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
      ecology: `Read ADS-R#0 - Verified Campaign Research Context before interpreting performance. If its Client identity check is missing, unresolved, or conflicting, block this subtask instead of guessing. Treat live Meta tools as the authority for connection and performance. Do not infer that Meta is disconnected from a missing document, empty kickoff field, or incomplete Atlas context. First call check_meta_connection in the current mission context. If the native action reports a missing token, call get_integration for Meta before declaring the account disconnected. When get_integration reports a connected Composio account, use the exact read-only account, campaign, and insights action slugs it returns through use_integration. If account selection needs verification, call list_meta_ad_accounts for native Meta or the equivalent discovered Composio action and compare the mounted account and Page with ADS-R#0. Then call get_meta_ads_insights with campaign_id set to the exact platform CAMPAIGN_ID, level campaign, and the requested date_preset. For ad-set detail, pass the selected campaign response row.id as ad_campaign_id. For ad detail, pass the selected ad-set response row.id as ad_set_id. Never put row.meta_id or any Meta numeric ID in campaign_id; campaign_id remains the platform CAMPAIGN_ID at every level. Use the discovered Composio insights action only when the native route is unavailable. Scope to selected Meta campaign names or IDs when supplied; otherwise review active campaigns. Interpret each campaign by its real objective and result action. Include spend, impressions, clicks, CTR, CPC, CPM, results, cost per result, revenue or ROAS only when applicable, and traffic or funnel concerns. A successful native or Composio connection or insights response is proof that Meta is connected. Only report live data as unavailable after both applicable routes return a structured failure, and record each exact error, action, and correction without inventing unknowns. Save ADS-R#1 - Current Ads Analysis as a native Doc. Never create a PDF. Kickoff: ${scope}`,
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
      ecology: `Read ADS-R#0 - Verified Campaign Research Context and use its verified offer and audience to define the market. Load roas-market-research. Use search_ads_research_advertisers plus run_ads_research_search so every query and returned snapshot is saved as a mission-linked search in this Space's Ads Research Library. Use Meta first; add TikTok or Google only when relevant. Treat advertiser names, claims, audiences, and offers as competitor observations, never client facts. Complete at least 3 distinct saved searches or advertisers and save at least 12 unique visual references before finishing this subtask. A duplicate ad returned by another query does not increase the visual_reference_count. Every reference must retain the actual creative thumbnail or snapshot when available, advertiser, format, angle, source URL, why it is relevant, and the pattern Blaze extracted. Use save_top_n, pull video transcripts and ad breakdowns, rank observed longevity and variant signals, and preserve source URLs. Confirm the tool response says saved_search_created: true and includes the current mission link for every saved search. Before saving ADS-R#2, state the saved_search_count and unique visual_reference_count and verify they are at least 3 and 12. Assemble one complete final document no longer than 10,000 characters, then call save_document exactly once. Use compact tables and link each visual reference instead of repeating long raw ad text. Do not create a draft Doc and rewrite it with update_document. If either count is below quota, block the subtask with the exact provider or data limitation instead of completing a documents-only run. Save ADS-R#2 - Market and Competitive Research as a native Doc only after the visual quota is satisfied. Never create a PDF. Kickoff: ${scope}`,
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
      ecology: `Read ADS-R#0, ADS-R#1, and ADS-R#2. Use the verified client identity, offer, and audience from ADS-R#0 as the boundary for every recommendation. Load roas-ad-concepts and roas-ad-copy. Identify what is working, failing, saturated, and open. Recommend distinct tests with the evidence that supports each one. Map every recommendation to one or more saved visual reference ads by advertiser and saved-search title, then include visual direction, on-image text, paste-ready primary text, headline, description, CTA, destination, and test hypothesis. Present finished copy as straight paste-ready text. Do not split it into Hook, Body, and CTA labels. These are research recommendations, not final production assets. ${WRITING_RULE} Save ADS-R#3 - Recommended Ads and Draft Copy as a native Doc. Never create a PDF.`,
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
        'Review ADS-R#1 through ADS-R#4 and the saved Ads Research sources. Do not approve a run with fewer than 12 visual references across at least 3 saved searches or advertisers. Approve specific concepts and scripts or request exact revisions. This gate does not create final visuals or authorize publishing.',
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
