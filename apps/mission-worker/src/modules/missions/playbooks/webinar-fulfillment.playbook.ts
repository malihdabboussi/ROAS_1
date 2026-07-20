import type {
  MissionPlaybookExpandInput,
  MissionPlaybookKickoff,
  MissionPlaybookPlanResult,
} from './mission-playbook.types'
import { addWebinarCreativeProduction } from './webinar-fulfillment.creative'
import {
  docContract,
  intent,
  launchBibleContract,
  pickAgent,
  WEBINAR_FLOW_DOCS,
  WEBINAR_FLOW_GATES,
  WEBINAR_FLOW_TASKS,
} from './webinar-fulfillment.helpers'

export const WEBINAR_FULFILLMENT_PLAYBOOK_ID = 'webinar-fulfillment'

const SKILLS = {
  precall: 'auto-skill-1-roas-precall-strategy',
  postcall: 'auto-skill-2-roas-strategy-adjust',
  plan: 'auto-skill-3-roas-launch-brief',
  research: 'roas-market-research',
  copy: 'roas-webinar-copy-package',
  landingCopy: 'roas-landing-page-copy',
} as const

const REVIEW_MAP =
  '5A.1→roas-webinar-topics · 5A.2→roas-webinar-emails · 5A.3→roas-ad-copy · 5A.4→roas-video-ad-scripts · 5B→roas-landing-page-copy'

const CLIENT_WRITING_RULE =
  'CLIENT WRITING RULE: For client-facing text, load dylans-super-voice as the only voice authority. Do not load human-written-copy or dylans-voice; block if the required skill is unavailable.'

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

export function expandWebinarFulfillmentPlaybook(
  input: MissionPlaybookExpandInput,
): MissionPlaybookPlanResult {
  const kickoff = readKickoff(input.mission.input)
  const atlas = 'atlas'
  const strategist = pickAgent(['strategist', 'reed'], input.workerAgentKeys, input.managerKey)
  const adsManager = pickAgent(['ads_manager', 'blaze'], input.workerAgentKeys, input.managerKey)
  const copywriter = pickAgent(
    ['copywriter', 'writer', 'ivy'],
    input.workerAgentKeys,
    input.managerKey,
  )
  const designer = pickAgent(['designer', 'lux'], input.workerAgentKeys, input.managerKey)
  const human = `human:${input.mission.user_id}`
  const hasHuman = Boolean(input.mission.user_id)
  const kickoffBits = [
    kickoff.client_context ? `Client context: ${kickoff.client_context}` : null,
    kickoff.transcript_url ? `Transcript/call: ${kickoff.transcript_url}` : null,
    kickoff.drive_links ? `Drive/links: ${kickoff.drive_links}` : null,
    kickoff.notes ? `Notes: ${kickoff.notes}` : null,
  ]
    .filter(Boolean)
    .join('\n')
  const subtasks: MissionPlaybookPlanResult['subtasks'] = []
  const assertions: MissionPlaybookPlanResult['harness']['assertions'] = []
  let assertionNumber = 0

  const add = (
    task: MissionPlaybookPlanResult['subtasks'][number],
    category: string,
    statement: string,
  ) => {
    if (!task.assignTo.startsWith('human:')) {
      task.intent.ecology = `${task.intent.ecology}\n\n${CLIENT_WRITING_RULE}`
    }
    assertionNumber += 1
    const assertionKey = `A-${String(assertionNumber).padStart(3, '0')}`
    task.assertionKeys = [assertionKey]
    subtasks.push(task)
    assertions.push({
      assertionKey,
      category,
      statement,
      priority: 'must',
      validatorType: 'human_review',
      evidenceRequirement: statement,
      failureSeverity: 'blocker',
    })
  }

  add(
    {
      id: 'st-atlas-context',
      title: WEBINAR_FLOW_TASKS.atlasContext,
      assignTo: atlas,
      dependsOn: [],
      assertionKeys: [],
      scheduledAt: null,
      intent: intent({
        why: 'Give every specialist the client, company, and Space context before work begins.',
        story: 'Atlas prepares the shared context layer once so specialists do not rediscover it.',
        sensory:
          'The mission context names the client, offer, known proof, constraints, and source links.',
        endState:
          'Relevant Brain and Space context is attached to the mission without inventing gaps.',
        ecology: `Read the client Space, campaign context, Customer Brain, Company Brain, and linked files. Summarize only durable, relevant facts for the team. Do not create a PDF or loose export. Kickoff:\n${kickoffBits || '(none)'}`,
      }),
    },
    'context',
    'Atlas prepared client and Brain context for the mission.',
  )

  let strategyDependency = 'st-atlas-context'
  add(
    {
      id: 'st-precall',
      title: WEBINAR_FLOW_TASKS.precall,
      assignTo: strategist,
      dependsOn: [strategyDependency],
      assertionKeys: [],
      scheduledAt: null,
      intent: intent({
        why: 'Walk into the client call with a proposed strategy to confirm or correct.',
        story: 'Reed prepares the call around decisions, not blank-page discovery.',
        sensory: `"${WEBINAR_FLOW_DOCS.precall}" is specific to the client and includes the offer stack hypothesis.`,
        endState: 'The pre-call map is saved as a native editable Space Doc.',
        ecology: `Load skill ${SKILLS.precall}. Include suggested offer, complete offer-stack hypothesis, avatars, proof gaps, and confirm-or-correct agenda. Save exactly "${WEBINAR_FLOW_DOCS.precall}". Never create a PDF.`,
      }),
      outputContract: docContract(WEBINAR_FLOW_DOCS.precall),
    },
    'strategy',
    'Pre-call strategy map exists in Space Docs.',
  )
  strategyDependency = 'st-precall'

  let launchBibleDependency = 'st-media-plan'
  if (hasHuman) {
    add(
      {
        id: 'st-gate-precall',
        title: WEBINAR_FLOW_GATES.precall,
        assignTo: human,
        dependsOn: [strategyDependency],
        assertionKeys: [],
        scheduledAt: null,
        intent: intent({
          why: 'The human must review the pre-call map and supply the completed call before post-call work.',
          story: 'Review the map, conduct the call, then attach or identify the call for Atlas.',
          sensory:
            'The gate comment contains a Fathom call, transcript, recording link, upload, or notes.',
          endState: 'A usable call source is available and Atlas can begin transcript intake.',
          ecology:
            'Review the pre-call map. Then provide one of: a selected Fathom meeting, Fathom URL or recording ID, pasted/uploaded transcript, recording link, or detailed call notes. Do not approve without a call source.',
        }),
      },
      'compliance',
      'Human reviewed the pre-call map and provided the call source.',
    )
    strategyDependency = 'st-gate-precall'
  }

  add(
    {
      id: 'st-atlas-transcript',
      title: WEBINAR_FLOW_TASKS.atlasTranscript,
      assignTo: atlas,
      dependsOn: [strategyDependency],
      assertionKeys: [],
      scheduledAt: null,
      intent: intent({
        why: 'Turn the real onboarding call into trusted context before strategy is corrected.',
        story:
          'Atlas locates the Fathom call when connected or uses the supplied transcript source.',
        sensory:
          'The call context retains source links, speaker meaning, decisions, objections, and proof.',
        endState: 'Reed has a grounded call summary and transcript source for post-call strategy.',
        ecology: `If Fathom is connected, list recent meetings, resolve the supplied meeting, retrieve its transcript, and ingest the useful context. Otherwise use the pasted/uploaded transcript, recording, or notes. Preserve the source. Never invent missing call content. Kickoff:\n${kickoffBits || '(gate supplies the call source)'}`,
      }),
    },
    'context',
    'Atlas retrieved or processed the call transcript and preserved its source.',
  )
  strategyDependency = 'st-atlas-transcript'

  add(
    {
      id: 'st-strategy-v2',
      title: WEBINAR_FLOW_TASKS.strategyV2,
      assignTo: strategist,
      dependsOn: [strategyDependency],
      assertionKeys: [],
      scheduledAt: null,
      intent: intent({
        why: 'Correct the proposed strategy using what the client actually said.',
        story: 'Reed converts the call into locked strategic decisions and visible open questions.',
        sensory: `"${WEBINAR_FLOW_DOCS.strategyV2}" clearly shows what changed after the call.`,
        endState:
          'A native post-call strategy map exists with the offer, avatar, proof, and constraints.',
        ecology: `Load skill ${SKILLS.postcall}. Use Atlas call context and the pre-call map. Save exactly "${WEBINAR_FLOW_DOCS.strategyV2}". Never create a PDF.`,
      }),
      outputContract: docContract(WEBINAR_FLOW_DOCS.strategyV2),
    },
    'strategy',
    'Post-call strategy map exists and reflects the client call.',
  )
  strategyDependency = 'st-strategy-v2'

  add(
    {
      id: 'st-market-research',
      title: WEBINAR_FLOW_TASKS.marketResearch,
      assignTo: adsManager,
      dependsOn: [strategyDependency],
      assertionKeys: [],
      scheduledAt: null,
      intent: intent({
        why: 'Ground THE PLAN and downstream production in observed market evidence.',
        story: 'Blaze researches the market and buyer language before Reed locks the launch brief.',
        sensory:
          'The research cites real ads and sources; the campaign Theme contains verified logo, colors, fonts, people, product, and social assets.',
        endState: `"${WEBINAR_FLOW_DOCS.marketResearch}" exists and the active campaign Theme is production-ready.`,
        ecology: `Load skill ${SKILLS.research}. Use Ads Intelligence first; claim a source unavailable only after an actual failed tool attempt, then record the error and fallback. Call list_campaign_media; inspect site, uploads, logos, headshots, products, and generated media. Call list_themes/get_theme, then create_theme or update_theme so verified colors, fonts, logo asset ID, people/product assets, social links, voice, values, and design settings are stored on the active campaign Theme. Add a Brand Evidence Ledger marking confirmed, inferred, or missing fields. Save exactly "${WEBINAR_FLOW_DOCS.marketResearch}" as a native Doc. Do not render ads.`,
      }),
      outputContract: docContract(WEBINAR_FLOW_DOCS.marketResearch),
    },
    'research',
    'Market research exists with real sources and tool evidence.',
  )
  strategyDependency = 'st-market-research'

  add(
    {
      id: 'st-launch-brief',
      title: WEBINAR_FLOW_TASKS.thePlan,
      assignTo: strategist,
      dependsOn: [strategyDependency],
      assertionKeys: [],
      scheduledAt: null,
      intent: intent({
        why: 'Give production one locked launch brief.',
        story: 'Reed turns strategy and completed market research into THE PLAN.',
        sensory: 'The promise, funnel path, asset list, offer stack, proof, and constraints agree.',
        endState: `"${WEBINAR_FLOW_DOCS.thePlan}" exists as the production source of truth.`,
        ecology: `Load skill ${SKILLS.plan}. Consume the completed "${WEBINAR_FLOW_DOCS.marketResearch}" document and preserve its observed-source labels; do not rerun or speculate about integration availability inside THE PLAN. Save exactly "${WEBINAR_FLOW_DOCS.thePlan}" as a native editable Doc. Include a draft client Slack approval message. Never create a PDF.`,
      }),
      outputContract: docContract(WEBINAR_FLOW_DOCS.thePlan),
    },
    'strategy',
    'THE PLAN exists with completed market research and a client approval message.',
  )

  let afterStrategy = 'st-launch-brief'
  if (hasHuman) {
    add(
      {
        id: 'st-gate-strategy',
        title: WEBINAR_FLOW_GATES.strategy,
        assignTo: human,
        dependsOn: [afterStrategy],
        assertionKeys: [],
        scheduledAt: null,
        intent: intent({
          why: 'The human approves the post-call strategy and client-facing message before production.',
          story:
            'Review both strategy docs, edit and send the Slack message, then record approval or feedback.',
          sensory:
            'The final gate note records client approval, requested changes, or the sent message link.',
          endState: 'Strategy is approved for research and copy production.',
          ecology:
            'Review the Post-Call Strategy Map and THE PLAN. Review and send the drafted client Slack message. Record client approval or feedback in this gate before completing it.',
        }),
      },
      'compliance',
      'Human approved strategy and recorded the client message outcome.',
    )
    afterStrategy = 'st-gate-strategy'
  }

  add(
    {
      id: 'st-build-checklist',
      title: WEBINAR_FLOW_TASKS.buildChecklist,
      assignTo: input.managerKey || 'vibey',
      dependsOn: [afterStrategy],
      assertionKeys: [],
      scheduledAt: null,
      intent: intent({
        why: 'Turn THE PLAN Build List into executable work without losing client-specific items.',
        story:
          'Vibey reconciles the Build List against the fixed playbook before production starts.',
        sensory:
          'Every concrete build item is represented by one Mission step and one linked Space Task.',
        endState:
          'Missing build work is assigned, published to the task list, and included in the final production dependency chain.',
        ecology: `Read the Build List in "${WEBINAR_FLOW_DOCS.thePlan}" and list current Mission subtasks. Do not duplicate fixed copy package, landing-page copy, ads, image briefs, funnel, deck bones, or media-plan work. For each other concrete build item, call create_mission_subtask with the best human or agent owner, dependsOn set to this reconciliation step, and publishToTaskList true. Use the returned subtask IDs. Then call edit_mission_subtask on Media Plan with a dependsOn list that preserves its existing dependencies and adds every created ID, so production approval cannot finish early. Internal research or coordination notes stay Mission-only.`,
      }),
    },
    'production',
    'THE PLAN Build List is reconciled into linked Mission steps and Space Tasks.',
  )
  afterStrategy = 'st-build-checklist'

  add(
    {
      id: 'st-copy-package',
      title: WEBINAR_FLOW_TASKS.copyPackage,
      assignTo: copywriter,
      dependsOn: [afterStrategy],
      assertionKeys: [],
      scheduledAt: null,
      publishToTaskList: true,
      intent: intent({
        why: 'Assemble one complete reviewable copy package.',
        story:
          'Ivy runs the atomic copy skills internally but delivers one package in one mission step.',
        sensory: 'Topics, emails, Meta ads, video scripts, and open flags agree.',
        endState: `One native Doc "${WEBINAR_FLOW_DOCS.copyPackage}" contains the complete package.`,
        ecology: `Load ${SKILLS.copy} and dylans-super-voice. Use verified Brain facts and client vocabulary. Keep email and SMS together; live-now email uses "Live on Zoom, waiting for you" or an approved factual variation. Use only real scarcity. Format ads as continuous ad text plus on-image text, headline, button, and destination; no Hook/Body/CTA sections. Format videos as Script, Shooting instructions, Overlays, then one shared Post-production section; spoken copy stays continuous and unquoted. Require zero em dashes and zero voice-checklist AI patterns before saving. Re-run a failing section's owning skill. REVIEW MAP: ${REVIEW_MAP}. Save one native editable Doc; no loose exports.`,
      }),
      outputContract: docContract(WEBINAR_FLOW_DOCS.copyPackage),
    },
    'copy',
    'WEB#5A Copy Package exists in Space Docs and passes Dylan Super Voice review.',
  )

  add(
    {
      id: 'st-landing-page-copy',
      title: WEBINAR_FLOW_TASKS.landingPageCopy,
      assignTo: copywriter,
      dependsOn: ['st-copy-package'],
      assertionKeys: [],
      scheduledAt: null,
      publishToTaskList: true,
      intent: intent({
        why: 'Give the funnel builder one clean, dedicated landing-page copy handoff.',
        story:
          'Ivy runs the landing-page skill after the title, promise, emails, ads, and scripts are aligned.',
        sensory:
          'The opt-in and confirmation pages use the picked title and approved promise without copy-package clutter.',
        endState: `One native Doc "${WEBINAR_FLOW_DOCS.landingPageCopy}" contains complete page copy and design handoff.`,
        ecology: `Load ${SKILLS.landingCopy} and dylans-super-voice. Consume "${WEBINAR_FLOW_DOCS.copyPackage}" and THE PLAN. Apply Dylan's Super Voice to every client-facing line, use verified client facts and vocabulary, do not load human-written-copy, and run the literal zero-em-dash plus anti-AI scan before saving. Save exactly "${WEBINAR_FLOW_DOCS.landingPageCopy}" as one native editable Doc. Never create PDF, DOCX, XLSX, or loose exports.`,
      }),
      outputContract: docContract(WEBINAR_FLOW_DOCS.landingPageCopy),
    },
    'copy',
    'WEB#5B Landing Page Copy exists and passes Dylan Super Voice review.',
  )

  let afterCopy = 'st-landing-page-copy'
  if (hasHuman) {
    add(
      {
        id: 'st-gate-copy',
        title: WEBINAR_FLOW_GATES.copy,
        assignTo: human,
        dependsOn: [afterCopy],
        assertionKeys: [],
        scheduledAt: null,
        intent: intent({
          why: 'Approve all copy before design begins.',
          story: 'The reviewer approves WEB#5A and WEB#5B or requests a surgical section revision.',
          sensory: 'Feedback names the exact section and change.',
          endState: 'Copy is approved for production.',
          ecology: `REVIEW MAP: ${REVIEW_MAP}. On needs_revision, re-run ONLY the owning skill with {{run.review_feedback}}. Reassemble WEB#5A only for sections 5A.1-5A.4; update WEB#5B directly for landing-page feedback.`,
        }),
      },
      'compliance',
      'Human approved WEB#5A Copy Package and WEB#5B Landing Page Copy.',
    )
    afterCopy = 'st-gate-copy'
  }

  addWebinarCreativeProduction({ add, afterCopy, designer, adsManager, human, hasHuman })

  add(
    {
      id: 'st-media-plan',
      title: WEBINAR_FLOW_TASKS.mediaPlan,
      assignTo: adsManager,
      dependsOn: ['st-compile-ads', 'st-funnel-design', 'st-deck-bones'],
      assertionKeys: [],
      scheduledAt: null,
      publishToTaskList: true,
      intent: intent({
        why: 'Let the media buyer translate approved strategy and creative into a launch-ready buying plan.',
        story:
          'Blaze reviews the assets Lux produced and defines audiences, budget, structure, tests, and measurement.',
        sensory:
          'The plan maps each creative to audience, budget, funnel destination, KPI, and test order.',
        endState: `"${WEBINAR_FLOW_DOCS.mediaPlan}" exists as the activation handoff; no campaign is launched yet.`,
        ecology: `Review the native Meta Ads, Funnels, Docs, and Presentations views. Save exactly "${WEBINAR_FLOW_DOCS.mediaPlan}" as a native Doc with campaign structure, audiences, budget, creative mapping, naming, tracking, launch checks, KPIs, and test order. Do not design assets and do not launch without a separate explicit activation approval.`,
      }),
      outputContract: docContract(WEBINAR_FLOW_DOCS.mediaPlan),
    },
    'media',
    'Blaze created the media plan after reviewing all production artifacts.',
  )

  if (hasHuman) {
    add(
      {
        id: 'st-gate-production',
        title: WEBINAR_FLOW_GATES.production,
        assignTo: human,
        dependsOn: ['st-media-plan'],
        assertionKeys: [],
        scheduledAt: null,
        intent: intent({
          why: 'The human approves the complete production package before any activation run.',
          story:
            'Review the linked native assets in their Space views and either approve or send exact revisions.',
          sensory: 'Ads, briefs, funnel, deck bones, and media plan are all linked and reviewable.',
          endState:
            'Production is approved and ready for a separately authorized Meta activation run.',
          ecology:
            'Review assets in Meta Ads, Docs, Funnels, and Presentations plus the Media Plan. This gate does not launch ads. Record exact revisions or approve the production package.',
        }),
      },
      'compliance',
      'Human approved the production package before activation.',
    )
    launchBibleDependency = 'st-gate-production'
  }

  add(
    {
      id: 'st-launch-bible',
      title: WEBINAR_FLOW_TASKS.launchBible,
      assignTo: atlas,
      dependsOn: [launchBibleDependency],
      assertionKeys: [],
      scheduledAt: null,
      publishToTaskList: true,
      intent: intent({
        why: 'Give the team one final source of truth with every approved asset and preview link.',
        story: 'Atlas compiles the approved mission outputs into a tabbed Google Doc Launch Bible.',
        sensory:
          'The overview links every native asset; copy is complete, approved, and organized into real Google Doc tabs.',
        endState:
          'One linked Google Doc deliverable contains the complete webinar handoff and opens ready for team use.',
        ecology:
          'Read every approved deliverable and preserve approved copy verbatim. compile_webinar_launch_bible copies the ROAS master tab tree, then replaces each tab body with campaign-ready HTML; never append beneath prompts or samples. Use clear headings, native lists, and useful tables. Include no AI instructions, example-project copy, empty placeholders, or duplicate compilation blocks. Call once in contract order: 0 - Overview, 1 - ICP Sheet, through 7 - SMS & Emails. Set parent_title="3 - Funnel Pages" on P1-P4. Overview includes client details, dates, notes, and funnel, presentation, ad, image, creative, and source links. Put image URLs and prompts in their sections. Label genuinely missing assets; never invent copy or links.',
      }),
      outputContract: launchBibleContract(),
    },
    'handoff',
    'Atlas created and linked the final tabbed Google Doc Webinar Launch Bible.',
  )

  const assertionKeys = assertions.map((item) => item.assertionKey)
  return {
    kind: 'plan',
    title: 'Webinar Fulfillment',
    summary:
      'Atlas context → pre-call gate → call intake → post-call strategy → market research → THE PLAN → strategy gate → WEB#5A copy package → WEB#5B landing-page copy → copy gate → Lux creative production (statics, image briefs, generated images, funnel, deck bones) → creative gate → Blaze compiles approved ads → media plan → production gate → Atlas compiles the final Google Doc Launch Bible.',
    approach: `Follow the complete ${WEBINAR_FULFILLMENT_PLAYBOOK_ID} flow from pre-call preparation. Atlas owns context, Reed owns strategy, Ivy owns copy, Lux owns visual/funnel/deck production, Blaze owns research/ad compilation/media planning, and the creative gate approves Lux's assets before Blaze assembles native ads.`,
    capability_gap: { exists: false, note: '', suggested_hire: '' },
    harness: {
      contextSnapshot: {
        summary: `Playbook ${WEBINAR_FULFILLMENT_PLAYBOOK_ID}; pre-call-first flow. ${kickoffBits || 'No extra kickoff links.'}`,
        sources: [
          {
            sourceType: 'playbook',
            title: WEBINAR_FULFILLMENT_PLAYBOOK_ID,
            confidence: 'strong',
            summary: 'Approved deterministic webinar fulfillment flow.',
          },
        ],
        missing: [],
        sufficiency: {
          sufficientForPlan: true,
          sufficientForValidation: true,
          reason: 'The lifecycle and ownership are fixed; gates collect missing human inputs.',
        },
      },
      clarificationQuestions: [],
      assumptions: [
        {
          assumptionKey: 'AS-001',
          statement: 'Atlas, Reed, Ivy, Lux, and Blaze are available to the mission runtime.',
          confidence: 'medium',
          impact: 'A missing runtime agent blocks its owned step.',
        },
      ],
      assertions,
      assertionCoverage: assertions.map((assertion) => {
        const owner = subtasks.find((task) => task.assertionKeys.includes(assertion.assertionKey))
        return {
          assertionKey: assertion.assertionKey,
          implementedBy: owner ? [owner.id] : [],
          verifiedBy: ['human-review'],
          rationale: 'Playbook-owned coverage',
        }
      }),
      validatorPlan: [
        {
          validatorKey: 'human-review',
          validatorType: 'human_review',
          assertionKeys,
          evidenceRequired: 'Human gates plus native Space artifact links.',
        },
      ],
    },
    subtasks,
    outOfScope: [
      'Meta campaign activation without separate explicit approval',
      'Full 40-60 slide webinar deck',
      'PDF, PPTX, DOCX, XLSX, or loose export deliverables',
    ],
    assignTo: strategist,
  }
}

export function expandMissionPlaybook(
  input: MissionPlaybookExpandInput,
): MissionPlaybookPlanResult | null {
  return input.playbookId === WEBINAR_FULFILLMENT_PLAYBOOK_ID
    ? expandWebinarFulfillmentPlaybook(input)
    : null
}
