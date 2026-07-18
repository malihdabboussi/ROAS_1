import type {
  MissionPlaybookExpandInput,
  MissionPlaybookKickoff,
  MissionPlaybookPlanResult,
} from './mission-playbook.types'
import { addWebinarCreativeProduction } from './webinar-fulfillment.creative'
import {
  docContract,
  intent,
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
  'CLIENT WRITING RULE: If this step creates or revises any wording a client, prospect, attendee, presenter, or public audience will read or hear, load dylans-super-voice and confirm it loaded before drafting. It is the only voice authority. Do not load human-written-copy or dylans-voice. Client samples and Brain context may supply verified facts, vocabulary, and subject-matter texture, but they do not replace or override Dylan Super Voice. Apply its correct surface mode, run its complete final checklist, and search the shipping text for the literal `—` character before saving. If the skill is unavailable, block instead of approximating it. This includes client updates, Slack messages, recaps, approval requests, emails, SMS, ads, scripts, landing pages, slide copy, on-image text, and copy inside dynamically created build tasks. When creating another mission subtask that may write client-facing text, copy this rule into that subtask ecology.'

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
          'The research cites real ads and sources, while the Campaign Theme holds the verified logo, palette, typography, identity, social links, and image assets.',
        endState: `"${WEBINAR_FLOW_DOCS.marketResearch}" exists with evidence and source links, and one active Campaign Theme is selected with every brand field either populated or explicitly marked not found in the research ledger.`,
        ecology: `Load skill ${SKILLS.research}. Use platform-managed Ads Intelligence first and record the service, integration action, and source links in the document. Only say a provider or search surface is unavailable after an actual failed tool attempt, and record the returned error plus the fallback used.

Complete campaign brand setup during this step. Call list_campaign_media and inspect the client website, uploaded logo files, existing design images, product imagery, and team headshots. Call list_themes. When a client website is known, call extract_website_theme with its URL. Map verified evidence into the flat Theme fields: colors, font_heading, font_body, logo_asset_id, brand_voice, brand_values, social_links, design_settings, headshot_images, product_images, and image_style_prompt. If the campaign has an active Theme, call update_theme; otherwise call create_theme with the current campaign_id so it becomes active. Never replace verified user-entered Theme values with weaker inference.

Add a Brand Evidence Ledger to "${WEBINAR_FLOW_DOCS.marketResearch}". For every Theme field, record its source and one status: confirmed, inferred, or not found. A missing value is not silently skipped. Save exactly "${WEBINAR_FLOW_DOCS.marketResearch}" as a native Doc and attach raw research data when available. Do not design or render ads.`,
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
        ecology: `Load skill ${SKILLS.plan} and dylans-super-voice. Consume the completed "${WEBINAR_FLOW_DOCS.marketResearch}" document and preserve its observed-source labels; do not rerun or speculate about integration availability inside THE PLAN. Save exactly "${WEBINAR_FLOW_DOCS.thePlan}" as a native editable Doc. Include a draft client Slack approval message written in Dylan Super Voice Professional Message mode. Never create a PDF.`,
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
            'Review the Post-Call Strategy Map, THE PLAN, the Market Research Brand Evidence Ledger, and the selected Campaign Theme. Confirm the logo, colors, fonts, identity, social links, and image assets or accept fields marked not found. Review and send the drafted client Slack message. Record client approval or feedback in this gate before completing it.',
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
        ecology: `Load ${SKILLS.copy} and dylans-super-voice. Keep Dylan's Super Voice active for every atomic skill and the final package check, then layer verified client facts and vocabulary from Brain context. Do not load human-written-copy. Keep emails and SMS together. For live-now email use subject "Live on Zoom, waiting for you" or an approved factual variation. Use real scarcity only. Format every ad variation as continuous ad text, followed only by operational fields such as on-image text, headline, button, and destination. Do not split ad prose into Hook, Body, or CTA. Format every video as Script, Shooting instructions, Overlays, then one shared Post-production section for all scripts. The spoken script is continuous unquoted text with no Hook, Body, CTA, Delivery, or Shot + setting labels. Before save, run a literal package-wide scan: zero em dashes in client-facing copy and zero residual AI patterns from the dylans-super-voice checklist. If a section fails, re-run its owning skill before assembly; do not silently repair it in the assembler. REVIEW MAP: ${REVIEW_MAP}. Save one native editable Doc only. Never create PDF, DOCX, XLSX, or loose exports.`,
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
  }

  const assertionKeys = assertions.map((item) => item.assertionKey)
  return {
    kind: 'plan',
    title: 'Webinar Fulfillment',
    summary:
      'Atlas context → pre-call gate → call intake → post-call strategy → market research → THE PLAN → strategy gate → WEB#5A copy package → WEB#5B landing-page copy → copy gate → editable statics + generated images → creative gate → native ad assembly → media plan → production gate.',
    approach: `Follow the complete ${WEBINAR_FULFILLMENT_PLAYBOOK_ID} flow from pre-call preparation. Atlas owns context, Reed owns strategy, Ivy owns copy, Lux owns visual/funnel/deck production, and Blaze owns research/media planning.`,
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
