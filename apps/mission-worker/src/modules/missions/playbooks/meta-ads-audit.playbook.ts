import type {
  MissionPlaybookExpandInput,
  MissionPlaybookPlanResult,
} from './mission-playbook.types'
import { docContract, intent, pickAgent } from './webinar-fulfillment.helpers'

export const META_ADS_AUDIT_PLAYBOOK_ID = 'meta-ads-audit'
const WRITING =
  'CLIENT WRITING RULE: Load dylans-super-voice as the only voice authority. Do not load human-written-copy or dylans-voice. Use no em dashes.'

function dylanDocContract(title: string) {
  const contract = docContract(title)
  return {
    ...contract,
    expected: { ...contract.expected, forbid_em_dash: true },
  }
}

type AuditKickoff = {
  reporting_period: string
  comparison_period: string
  selected_campaigns: string[]
  notes?: string
}

function readKickoff(input: Record<string, unknown> | null | undefined): AuditKickoff {
  const raw =
    input?.playbook_kickoff && typeof input.playbook_kickoff === 'object'
      ? (input.playbook_kickoff as Record<string, unknown>)
      : {}
  const strings = (value: unknown) =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
  return {
    reporting_period: typeof raw.reporting_period === 'string' ? raw.reporting_period : 'last_30d',
    comparison_period:
      typeof raw.comparison_period === 'string' ? raw.comparison_period : 'previous_30d',
    selected_campaigns: strings(raw.selected_campaigns),
    notes: typeof raw.notes === 'string' ? raw.notes : undefined,
  }
}

export function expandMetaAdsAuditPlaybook(
  input: MissionPlaybookExpandInput,
): MissionPlaybookPlanResult {
  const kickoff = readKickoff(input.mission.input)
  const atlas = pickAgent(['atlas'], input.workerAgentKeys, input.managerKey)
  const blaze = pickAgent(['ads_manager', 'blaze'], input.workerAgentKeys, input.managerKey)
  const human = `human:${input.mission.user_id}`
  const scope = JSON.stringify(kickoff).slice(0, 900)
  const subtasks: MissionPlaybookPlanResult['subtasks'] = [
    task({
      id: 'st-audit-context',
      title: 'Task 1 - Verify audit context and success metric',
      assignTo: atlas,
      dependsOn: [],
      why: 'Performance recommendations are only useful when the client, offer, funnel, and real success event are correct.',
      story: 'Atlas verifies the business context and the result that Meta should optimize toward.',
      sensory:
        'The audit brief distinguishes client truth, account labels, tracking assumptions, and unresolved gaps.',
      endState: 'ADS-A#0 - Verified Audit Context exists as a native editable Doc.',
      ecology: `Start from the runtime CAMPAIGN_ID and SPACE_ID. Call get_campaign and get_space, then read the active Brain and approved campaign documents. Verify the client identity, offer, audience, funnel, destination, primary Meta objective, and the exact result event that represents success. Account, Page, and campaign names are routing labels, not proof of the business model. Record sources and conflicts. If the client identity or primary result event cannot be verified, block instead of guessing. Save ADS-A#0 - Verified Audit Context as a native Doc. Never create a PDF. Kickoff: ${scope}. ${WRITING}`,
      outputContract: dylanDocContract('ADS-A#0 - Verified Audit Context'),
    }),
    task({
      id: 'st-live-account-audit',
      title: 'Task 2 - Audit live Meta performance',
      assignTo: blaze,
      dependsOn: ['st-audit-context'],
      why: 'Blaze needs objective-specific live evidence before diagnosing or recommending a change.',
      story: 'Blaze compares current and prior performance at campaign, ad set, and ad level.',
      sensory:
        'The audit shows real results, costs, trends, delivery, fatigue, and data-quality warnings.',
      endState: 'ADS-A#1 - Live Meta Account Audit exists as a native editable Doc.',
      ecology: `Load roas-meta-ads-audit and read ADS-A#0. Call check_meta_connection. If the native action reports a missing token, call get_integration for Meta before declaring the account disconnected. When get_integration reports a connected Composio account, use the exact read-only account, campaign, and insights action slugs it returns through use_integration. Verify the mounted account. For native Meta, call get_meta_ads_insights with campaign_id set to the exact platform CAMPAIGN_ID, level campaign, and date_preset ${kickoff.reporting_period}; repeat for ${kickoff.comparison_period}. For ad-set detail, pass the selected campaign response row.id as ad_campaign_id. For ad detail, pass the selected ad-set response row.id as ad_set_id. Never put row.meta_id or any Meta numeric ID in campaign_id; campaign_id remains the platform CAMPAIGN_ID at every level. Use the discovered Composio insights action only when native Meta is unavailable. Scope to selected campaigns when supplied. Interpret every campaign by its real objective and actual result action. Include spend, delivery, frequency, impressions, clicks, CTR, CPC, CPM, actual results, cost per result, and revenue or ROAS only when that objective and tracking make them valid. Reconcile missing or zero results against the returned action breakdown before diagnosing the funnel. A successful native or Composio insights response proves Meta access. Only call Meta unavailable after both applicable routes fail with structured errors. Separate observed facts from inferences. Save ADS-A#1 - Live Meta Account Audit as a native Doc. Never create a PDF. Kickoff: ${scope}. ${WRITING}`,
      outputContract: dylanDocContract('ADS-A#1 - Live Meta Account Audit'),
    }),
    task({
      id: 'st-optimization-recommendations',
      title: 'Task 3 - Produce optimization recommendations',
      assignTo: blaze,
      dependsOn: ['st-live-account-audit'],
      why: 'The human needs specific decisions tied to evidence, not generic media-buying advice.',
      story: 'Blaze converts the audit into prioritized actions with expected impact and risk.',
      sensory:
        'Each recommendation names the object, exact action, evidence, confidence, guardrail, and review window.',
      endState: 'ADS-A#2 - Optimization Recommendations exists as a native editable Doc.',
      ecology: `Load roas-meta-ads-audit and read ADS-A#0 and ADS-A#1. Produce prioritized recommendations only where the evidence supports a specific action. For each one include Meta object name and ID, observed evidence, diagnosis, exact action, expected effect, confidence, risk, budget or status guardrail, and when to reassess. Distinguish tracking fixes, funnel fixes, creative tests, audience changes, budget changes, and pause decisions. Do not recommend scaling from a blended metric that conflicts with the campaign's actual result event. Include a recommendation-only option for every mutation. Save ADS-A#2 - Optimization Recommendations as a native Doc. Never create a PDF. ${WRITING}`,
      outputContract: dylanDocContract('ADS-A#2 - Optimization Recommendations'),
    }),
    task({
      id: 'st-gate-optimization-approval',
      title: 'Gate 1 - Approve optimization actions',
      assignTo: human,
      dependsOn: ['st-optimization-recommendations'],
      why: 'Account changes can alter delivery and spend, so the human chooses exactly what Blaze may apply.',
      story:
        'Review each recommendation and approve, reject, revise, or keep the cycle recommendation-only.',
      sensory: 'Approval names exact object IDs, changes, budget caps, and the review window.',
      endState:
        'A bounded optimization change set is approved or the cycle ends recommendation-only.',
      ecology:
        'Review ADS-A#1 and ADS-A#2. Choose recommendation-only or approve specific changes. Approval must name exact campaign or ad set IDs, old and new values, spend caps, and reassessment timing. Do not approve unclear bulk changes.',
    }),
    task({
      id: 'st-apply-approved-optimizations',
      title: 'Task 4 - Apply approved Meta optimizations',
      assignTo: blaze,
      dependsOn: ['st-gate-optimization-approval'],
      publishToTaskList: true,
      why: 'Approved recommendations should become traceable account changes without expanding their scope.',
      story:
        'Blaze applies only the approved campaign and ad-set updates and records every response.',
      sensory:
        'The change log shows before, approved action, returned status, and direct review link.',
      endState: 'ADS-A#3 - Applied Optimization Log exists as a native editable Doc.',
      ecology: `Load roas-meta-ads-audit. If Gate 1 selected recommendation-only, record that decision and make no Meta calls. Otherwise use update_ad_campaign and update_ad_set for native Meta. If native Meta reports a missing token but get_integration confirms connected Composio Meta, use only the exact update action slugs returned by get_integration through use_integration. Apply only the exact approved IDs and values. Never activate a paused campaign, ad set, or ad. Never exceed the approved budget cap or modify unapproved targeting, schedule, creative, copy, or destination. Record each before value, requested change, returned status, Meta ID, and error. Save ADS-A#3 - Applied Optimization Log as a native Doc. Never create a PDF. ${WRITING}`,
      outputContract: dylanDocContract('ADS-A#3 - Applied Optimization Log'),
    }),
    task({
      id: 'st-verify-optimization-cycle',
      title: 'Task 5 - Verify changes and schedule the next review',
      assignTo: blaze,
      dependsOn: ['st-apply-approved-optimizations'],
      why: 'An optimization cycle is incomplete until the approved state is verified and the next decision window is clear.',
      story:
        'Blaze confirms the post-change account state and records the next measurement checkpoint.',
      sensory:
        'The closeout shows verified statuses, unchanged controls, measurement window, and next audit date.',
      endState: 'ADS-A#4 - Optimization Cycle Closeout exists as a native editable Doc.',
      ecology: `Read ADS-A#3. Re-read the affected Meta objects and confirm the post-change values match Gate 1 exactly. Verify unrelated controls were not changed. Define the next measurement window, decision thresholds, and next audit date based on spend and conversion volume. If no changes were approved, preserve the recommendation-only outcome and still define what evidence should trigger the next audit. Save ADS-A#4 - Optimization Cycle Closeout as a native Doc. Never create a PDF. ${WRITING}`,
      outputContract: dylanDocContract('ADS-A#4 - Optimization Cycle Closeout'),
    }),
  ]
  const assertions = subtasks.map((item) => ({
    assertionKey: item.assertionKeys[0]!,
    category: item.id.includes('gate') ? 'approval' : 'optimization',
    statement: `${item.title} completed with objective-specific evidence.`,
    priority: 'must' as const,
    validatorType: 'human_review',
    evidenceRequirement: `${item.title} evidence`,
    failureSeverity: 'blocker' as const,
  }))
  const assertionKeys = assertions.map((item) => item.assertionKey)
  return {
    kind: 'plan',
    title: 'Meta Ads Audit & Optimization',
    summary:
      'Atlas verifies the success metric, Blaze audits live Meta data and recommends actions, a human approves any mutation, and Blaze verifies the bounded optimization cycle.',
    approach:
      'Use objective-specific live evidence, separate facts from inferences, and keep every Meta mutation behind an exact human approval gate.',
    capability_gap: { exists: false, note: '', suggested_hire: '' },
    harness: {
      contextSnapshot: {
        summary: `Playbook ${META_ADS_AUDIT_PLAYBOOK_ID}; ${scope}`,
        sources: [
          {
            sourceType: 'playbook',
            title: META_ADS_AUDIT_PLAYBOOK_ID,
            confidence: 'strong',
            summary: 'Deterministic, gated Meta audit and optimization cycle.',
          },
        ],
        missing: [],
        sufficiency: {
          sufficientForPlan: true,
          sufficientForValidation: true,
          reason:
            'The first task verifies the objective and blocks unresolved identity or tracking gaps.',
        },
      },
      clarificationQuestions: [],
      assumptions: [
        {
          assumptionKey: 'AS-001',
          statement: 'Blaze or another Meta Ads Manager is assigned.',
          confidence: 'medium',
          impact: 'The audit requires paid-media judgment and Meta access.',
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
          evidenceRequired:
            'Native audit Docs, exact Gate 1 decision, Meta responses, and closeout.',
        },
      ],
    },
    subtasks,
    outOfScope: [
      'Ungated Meta mutations',
      'Activating paused objects',
      'Invented revenue or ROAS',
      'Creative production',
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
  publishToTaskList?: boolean
  why: string
  story: string
  sensory: string
  endState: string
  ecology: string
  outputContract?: MissionPlaybookPlanResult['subtasks'][number]['outputContract']
}): MissionPlaybookPlanResult['subtasks'][number] {
  return {
    ...input,
    assertionKeys: [`A-${input.id}`],
    scheduledAt: null,
    intent: intent(input),
  }
}
