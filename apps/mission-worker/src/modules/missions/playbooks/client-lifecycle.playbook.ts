import type {
  MissionPlaybookExpandInput,
  MissionPlaybookKickoff,
  MissionPlaybookPlanResult,
} from './mission-playbook.types'
import { docContract, intent, pickAgent } from './webinar-fulfillment.helpers'

export const CLIENT_LIFECYCLE_PLAYBOOK_ID = 'client-lifecycle'

function readKickoff(input: Record<string, unknown> | null | undefined): MissionPlaybookKickoff {
  const raw =
    input?.playbook_kickoff && typeof input.playbook_kickoff === 'object'
      ? (input.playbook_kickoff as Record<string, unknown>)
      : {}
  return {
    notes: typeof raw.notes === 'string' ? raw.notes : undefined,
    transcript_url: typeof raw.transcript_url === 'string' ? raw.transcript_url : undefined,
    drive_links: typeof raw.drive_links === 'string' ? raw.drive_links : undefined,
    client_context: typeof raw.client_context === 'string' ? raw.client_context : undefined,
  }
}

function humanGate(input: {
  id: string
  title: string
  userId: string
  dependsOn: string[]
  endState: string
}): MissionPlaybookPlanResult['subtasks'][number] {
  return {
    id: input.id,
    title: input.title,
    assignTo: `human:${input.userId}`,
    dependsOn: input.dependsOn,
    assertionKeys: [],
    scheduledAt: null,
    intent: intent({
      why: 'Keep the consequential client decision under human control.',
      story: 'Pixel pauses the lifecycle at a clear decision instead of silently continuing.',
      sensory: 'The reviewer sees the source-backed output, proposed next move, and one approval.',
      endState: input.endState,
      ecology:
        'Review the linked output. Approve it, provide corrections, or use mission chat to retry, edit, cancel, replan, or extend the lifecycle. Never treat silence as approval.',
    }),
  }
}

export function expandClientLifecyclePlaybook(
  input: MissionPlaybookExpandInput,
): MissionPlaybookPlanResult {
  const kickoff = readKickoff(input.mission.input)
  const strategist = pickAgent(['strategist', 'reed'], input.workerAgentKeys, input.managerKey)
  const context = [
    kickoff.client_context ? `Client context: ${kickoff.client_context}` : null,
    kickoff.transcript_url ? `Starting transcript: ${kickoff.transcript_url}` : null,
    kickoff.drive_links ? `Drive/links: ${kickoff.drive_links}` : null,
    kickoff.notes ? `Notes: ${kickoff.notes}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  const subtasks: MissionPlaybookPlanResult['subtasks'] = [
    {
      id: 'st-lifecycle-context',
      title: 'Stage 1 — Client source-of-truth review',
      assignTo: 'atlas',
      dependsOn: [],
      assertionKeys: ['A-context'],
      scheduledAt: null,
      intent: intent({
        why: 'Begin from verified client evidence and agency method.',
        story:
          'Atlas reconciles Client Brain, Company Brain, campaign context, meetings, and files.',
        sensory:
          'One source map separates verified facts, live truth, missing inputs, and conflicts.',
        endState: 'The mission has a grounded client context audit with sources and explicit gaps.',
        ecology: `Use Client Brain for durable client facts and approved decisions; Company Brain for agency method; structured Offer, Avatar, and Theme records for marketing fundamentals; and live tasks, requests, meetings, and metrics as operational truth. Never substitute another client or model assumptions. ${context || 'No extra kickoff context was supplied.'}`,
      }),
      outputContract: docContract('Client Source-of-Truth Audit'),
    },
    humanGate({
      id: 'st-gate-context',
      title: 'Gate 1 — Confirm onboarding context',
      userId: input.mission.user_id,
      dependsOn: ['st-lifecycle-context'],
      endState: 'The source map is approved or corrected before fundamentals change.',
    }),
    {
      id: 'st-lifecycle-fundamentals',
      title: 'Stage 2 — Confirm Avatar and Offer',
      assignTo: strategist,
      dependsOn: ['st-gate-context'],
      assertionKeys: ['A-fundamentals'],
      scheduledAt: null,
      intent: intent({
        why: 'Anchor later decisions in who the client sells to and what they sell.',
        story: 'The strategist resolves one approved Avatar and Offer from the client record.',
        sensory: 'The campaign shows explicit Avatar and Offer selections with evidence and gaps.',
        endState: 'Canonical Avatar and Offer records are selected for this lifecycle.',
        ecology:
          'Reuse existing Offer and Avatar records. Do not duplicate them inside Brain or create replacements just to satisfy this mission. If no viable record exists, propose the missing record and wait for approval before creating it. Persist approved IDs in campaign context as selected_offer_ids and selected_avatar_ids.',
      }),
      outputContract: docContract('Client Fundamentals Decision'),
    },
    humanGate({
      id: 'st-gate-fundamentals',
      title: 'Gate 2 — Approve Avatar and Offer',
      userId: input.mission.user_id,
      dependsOn: ['st-lifecycle-fundamentals'],
      endState: 'The selected Avatar and Offer are approved before strategy begins.',
    }),
    {
      id: 'st-lifecycle-bind-fundamentals',
      title: 'Stage 2B — Bind approved Avatar and Offer',
      assignTo: input.managerKey || 'vibey',
      dependsOn: ['st-gate-fundamentals'],
      assertionKeys: ['A-fundamentals'],
      scheduledAt: null,
      intent: intent({
        why: 'Make the approved marketing fundamentals canonical for every later surface.',
        story: 'Pixel binds the exact approved existing records to campaign context.',
        sensory: 'Campaign context contains selected_offer_ids and selected_avatar_ids.',
        endState: 'Chat, later Mission steps, Artifacts, Canvas, and strategy read the same ids.',
        ecology:
          'Read the approved Client Fundamentals Decision and gate feedback. Call update_campaign_context with this mission campaign_id, selected_offer_ids, and selected_avatar_ids. Use only the approved existing record ids. Then call get_campaign and verify both arrays were persisted. Fail closed if either record or approval is unclear; never create a duplicate or continue from document text alone.',
      }),
    },
    {
      id: 'st-lifecycle-strategy',
      title: 'Stage 3 — Build client strategy',
      assignTo: strategist,
      dependsOn: ['st-lifecycle-bind-fundamentals'],
      assertionKeys: ['A-strategy'],
      scheduledAt: null,
      intent: intent({
        why: 'Turn approved fundamentals and evidence into a client-specific growth strategy.',
        story:
          'The strategist connects outcome, proof, constraints, Offer, Avatar, and agency method.',
        sensory: 'The strategy states what to do, why, what not to do, and what must be validated.',
        endState: 'A source-backed Client Strategy Map is ready for approval.',
        ecology:
          'Use the approved Offer and Avatar, verified Client Brain facts, and Company Brain method. Preserve sources, distinguish facts from recommendations, and save a native editable document.',
      }),
      outputContract: docContract('Client Strategy Map'),
    },
    humanGate({
      id: 'st-gate-strategy',
      title: 'Gate 3 — Approve client strategy',
      userId: input.mission.user_id,
      dependsOn: ['st-lifecycle-strategy'],
      endState: 'The strategy is approved or revised before campaigns are planned.',
    }),
    {
      id: 'st-lifecycle-campaign-plan',
      title: 'Stage 4 — Build campaign roadmap',
      assignTo: strategist,
      dependsOn: ['st-gate-strategy'],
      assertionKeys: ['A-roadmap'],
      scheduledAt: null,
      intent: intent({
        why: 'Translate strategy into sequenced campaigns with explicit outcomes and dependencies.',
        story: 'The roadmap recommends the smallest useful production and launch branches.',
        sensory:
          'Each campaign names its outcome, audience, Offer, outputs, owner, approval, and signal.',
        endState: 'The user can choose exactly which production Mission to run next.',
        ecology:
          'Recommend existing playbooks where they fit. Tell the user to extend this lifecycle mission into the approved child playbook from Mission chat or the visual Extend menu. Do not activate external systems or invent a branch without approval.',
      }),
      outputContract: docContract('Client Campaign Roadmap'),
    },
    humanGate({
      id: 'st-gate-production',
      title: 'Gate 4 — Choose production Missions',
      userId: input.mission.user_id,
      dependsOn: ['st-lifecycle-campaign-plan'],
      endState: 'Approved production branches are attached as child Missions.',
    }),
    {
      id: 'st-lifecycle-sync-canvas',
      title: 'Stage 4B — Sync approved roadmap to Canvas',
      assignTo: input.managerKey || 'vibey',
      dependsOn: ['st-gate-production'],
      assertionKeys: ['A-roadmap'],
      scheduledAt: null,
      intent: intent({
        why: 'Keep the visual campaign plan aligned with the approved lifecycle roadmap.',
        story: 'Pixel turns the approved stages, existing resources, and missing work into one editable campaign Canvas.',
        sensory: 'The Canvas shows connected stages, canonical resource cards, and actionable placeholders without duplicating assets.',
        endState: 'Chat, Mission, Artifacts, tasks, Work Requests, and Canvas point to the same campaign plan.',
        ecology:
          'Call get_campaign and verify the approved selected_offer_ids and selected_avatar_ids. Call get_canvas_board immediately before mutation, preserve its current revision and existing resources, then call build_campaign_blueprint for the approved Client Campaign Roadmap. Represent existing campaign artifacts as resource cards and missing approved production work as placeholders. Use complete_canvas_placeholder later when a child Mission creates the canonical resource. Never erase unrelated Canvas work or create duplicate Offer, Avatar, task, Work Request, or artifact records.',
      }),
    },
    {
      id: 'st-lifecycle-launch-readiness',
      title: 'Stage 5 — Verify launch readiness',
      assignTo: input.managerKey || 'vibey',
      dependsOn: ['st-lifecycle-sync-canvas'],
      assertionKeys: ['A-launch'],
      scheduledAt: null,
      intent: intent({
        why: 'Prevent launch before outputs and operational prerequisites are ready.',
        story:
          'Pixel reconciles child deliverables, tasks, Work Requests, access, tracking, and approvals.',
        sensory: 'The report shows pass, fail, owner, and evidence for every launch dependency.',
        endState: 'A launch decision can be made without guessing.',
        ecology:
          'Read child Missions and their durable deliverables. Call list_tasks in this mission Space for canonical task state and get_canvas_board for the approved visual plan. Discover the enabled Page Grader MCP tools before reading current Work Requests; keep Work Requests distinct from native Space tasks and report an unavailable connection instead of assuming there are none. Reconcile Artifacts, access, integrations, tracking, and live configuration against those records. Do not infer completion from chat. Do not publish, spend, or message externally.',
      }),
      outputContract: docContract('Client Launch Readiness'),
    },
    humanGate({
      id: 'st-gate-launch',
      title: 'Gate 5 — Authorize launch',
      userId: input.mission.user_id,
      dependsOn: ['st-lifecycle-launch-readiness'],
      endState: 'The human explicitly authorizes or blocks the launch path.',
    }),
    {
      id: 'st-lifecycle-optimization',
      title: 'Stage 6 — Establish optimization cadence',
      assignTo: input.managerKey || 'vibey',
      dependsOn: ['st-gate-launch'],
      assertionKeys: ['A-optimization'],
      scheduledAt: null,
      intent: intent({
        why: 'Turn launch into a repeatable measurement and decision cycle.',
        story:
          'Pixel defines live metrics, review cadence, thresholds, owners, and optimization Missions.',
        sensory: 'The client has a weekly cadence with evidence-backed decisions and approvals.',
        endState: 'A Client Optimization Cadence is ready to operate and extend.',
        ecology:
          'Use live reporting as truth. Link recurring review work to this lifecycle and recommend existing audit playbooks when applicable. Never fabricate performance or auto-apply consequential changes.',
      }),
      outputContract: docContract('Client Optimization Cadence'),
    },
  ]

  const assertions = [
    ['A-context', 'context', 'Client truth is reconciled with sources.'],
    ['A-fundamentals', 'fundamentals', 'One canonical Offer and Avatar selection is recorded.'],
    ['A-strategy', 'strategy', 'The client strategy is grounded and approved.'],
    ['A-roadmap', 'planning', 'The campaign roadmap has explicit outcomes and branches.'],
    ['A-launch', 'launch', 'Launch readiness is verified from canonical records.'],
    ['A-optimization', 'optimization', 'The optimization cadence uses live metrics and approvals.'],
  ].map(([assertionKey, category, statement]) => ({
    assertionKey: assertionKey!,
    category: category!,
    statement: statement!,
    priority: 'must' as const,
    validatorType: 'human_review',
    evidenceRequirement: 'Native linked output and human approval where required.',
    failureSeverity: 'blocker' as const,
  }))

  return {
    kind: 'plan',
    title: 'Client Lifecycle',
    summary:
      'Operate the client from grounded onboarding through an approved optimization cadence.',
    approach: 'Use one auditable Mission with human gates and approved child production Missions.',
    capability_gap: { exists: false, note: '', suggested_hire: '' },
    harness: {
      contextSnapshot: {
        summary: `Playbook ${CLIENT_LIFECYCLE_PLAYBOOK_ID}. ${context || 'No extra kickoff links.'}`,
        sources: [
          {
            sourceType: 'playbook',
            title: CLIENT_LIFECYCLE_PLAYBOOK_ID,
            confidence: 'strong',
            summary:
              'Gated client lifecycle orchestration using canonical context and child Missions.',
          },
        ],
        missing: [],
        sufficiency: {
          sufficientForPlan: true,
          sufficientForValidation: true,
          reason:
            'The first stage audits sources and records missing inputs before later work begins.',
        },
      },
      clarificationQuestions: [],
      assumptions: [],
      assertions,
      assertionCoverage: assertions.map((assertion) => ({
        assertionKey: assertion.assertionKey,
        implementedBy: subtasks
          .filter((subtask) => subtask.assertionKeys.includes(assertion.assertionKey))
          .map((subtask) => subtask.id),
        verifiedBy: ['human-review'],
        rationale: 'Each lifecycle output is reviewed at the following human gate.',
      })),
      validatorPlan: [
        {
          validatorKey: 'human-review',
          validatorType: 'human_review',
          assertionKeys: assertions.map((assertion) => assertion.assertionKey),
          evidenceRequired: 'Canonical records, linked artifacts, and explicit approvals.',
        },
      ],
    },
    subtasks,
    outOfScope: [
      'Unapproved external publishing, spend, or client messages',
      'Duplicating Offer or Avatar records already owned by the campaign',
    ],
    assignTo: input.managerKey || 'vibey',
  }
}
