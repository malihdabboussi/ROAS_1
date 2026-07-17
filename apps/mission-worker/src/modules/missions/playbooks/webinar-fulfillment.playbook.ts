import type {
  MissionPlaybookExpandInput,
  MissionPlaybookKickoff,
  MissionPlaybookPlanResult,
  MissionPlaybookStartAt,
} from './mission-playbook.types'
import {
  adContract,
  docContract,
  funnelContract,
  intent,
  pickAgent,
  presentationContract,
  WEBINAR_FLOW_DOCS,
  WEBINAR_FLOW_GATES,
  WEBINAR_FLOW_TASKS,
} from './webinar-fulfillment.helpers'

export const WEBINAR_FULFILLMENT_PLAYBOOK_ID = 'webinar-fulfillment'

const SKILL_1 = 'auto-skill-1-roas-precall-strategy'
const SKILL_2 = 'auto-skill-2-roas-strategy-adjust'
const SKILL_3 = 'auto-skill-3-roas-launch-brief'
const SKILL_MARKET_RESEARCH = 'roas-market-research'
const SKILL_COPY_PACKAGE = 'roas-webinar-copy-package'
const SKILL_AD_DESIGN = 'roas-ad-design'
const SKILL_IMAGE_BRIEF = 'roas-image-brief'
const SKILL_FUNNEL_DESIGN = 'roas-funnel-design'
const SKILL_WEBINAR_DECK = 'roas-webinar-deck'

const REVIEW_MAP =
  '1→roas-webinar-topics · 2→roas-webinar-emails · 3→roas-ad-copy · 4→roas-video-ad-scripts · 5→roas-landing-page-copy'

function normalizeStartAt(value: unknown): MissionPlaybookStartAt {
  if (value === 'post_call' || value === 'launch_brief' || value === 'pre_call') return value
  return 'pre_call'
}

function readKickoff(input: Record<string, unknown> | null | undefined): MissionPlaybookKickoff {
  const kickoff =
    input?.playbook_kickoff && typeof input.playbook_kickoff === 'object'
      ? (input.playbook_kickoff as Record<string, unknown>)
      : {}
  return {
    start_at: normalizeStartAt(kickoff.start_at ?? input?.start_at),
    notes: typeof kickoff.notes === 'string' ? kickoff.notes : undefined,
    transcript_url: typeof kickoff.transcript_url === 'string' ? kickoff.transcript_url : undefined,
    drive_links: typeof kickoff.drive_links === 'string' ? kickoff.drive_links : undefined,
    client_context: typeof kickoff.client_context === 'string' ? kickoff.client_context : undefined,
  }
}

type PhaseStep = {
  id: string
  title: string
  skillKey: string
  docTitle: string
  why: string
  endState: string
}

/**
 * Deterministic Webinar Fulfillment playbook:
 * Phase A (skills 1→2→3) → Gate 1 → Pre-B research → Phase B copy package → Gate 2
 * → Phase C (ads / image briefs / funnel / deck outline) → Gate 3 → deck build.
 */
export function expandWebinarFulfillmentPlaybook(
  input: MissionPlaybookExpandInput,
): MissionPlaybookPlanResult {
  const kickoff = readKickoff(input.mission.input)
  const startAt = normalizeStartAt(kickoff.start_at)
  const strategist = pickAgent(
    ['strategist', 'atlas', 'vibey'],
    input.workerAgentKeys,
    input.managerKey,
  )
  const adsManager = pickAgent(
    ['ads_manager', 'blaze', 'strategist'],
    input.workerAgentKeys,
    input.managerKey,
  )
  const copywriter = pickAgent(
    ['copywriter', 'writer', 'strategist'],
    input.workerAgentKeys,
    input.managerKey,
  )
  const designer = pickAgent(
    ['designer', 'aria', 'copywriter'],
    input.workerAgentKeys,
    input.managerKey,
  )
  // Personal and org missions both get human gates assigned to the mission owner.
  const canAssignHuman = Boolean(input.mission.user_id)
  const humanAssign = `human:${input.mission.user_id}`

  const kickoffBits = [
    kickoff.client_context ? `Client context: ${kickoff.client_context}` : null,
    kickoff.transcript_url ? `Transcript: ${kickoff.transcript_url}` : null,
    kickoff.drive_links ? `Drive/links: ${kickoff.drive_links}` : null,
    kickoff.notes ? `Notes: ${kickoff.notes}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  const allPhaseA: PhaseStep[] = [
    {
      id: 'st-precall',
      title: WEBINAR_FLOW_TASKS.precall,
      skillKey: SKILL_1,
      docTitle: WEBINAR_FLOW_DOCS.precall,
      why: 'Walk into the client call already mapped so the call confirms strategy instead of discovering it.',
      endState:
        'A Pre-Call Strategy Map doc exists in this Space with suggested offers, avatars, and call agenda.',
    },
    {
      id: 'st-strategy-v2',
      title: WEBINAR_FLOW_TASKS.strategyV2,
      skillKey: SKILL_2,
      docTitle: WEBINAR_FLOW_DOCS.strategyV2,
      why: 'Lock the corrected strategy after the onboarding call before production starts.',
      endState: 'A Strategy v2 doc exists reflecting call corrections and locked offer/avatar.',
    },
    {
      id: 'st-launch-brief',
      title: WEBINAR_FLOW_TASKS.thePlan,
      skillKey: SKILL_3,
      docTitle: WEBINAR_FLOW_DOCS.thePlan,
      why: 'Hand production a clear launch brief before copy and creative fan out.',
      endState:
        'THE PLAN launch brief doc exists with webinar promise, funnel path, and asset list.',
    },
  ]

  const phaseA =
    startAt === 'launch_brief'
      ? allPhaseA.filter((s) => s.id === 'st-launch-brief')
      : startAt === 'post_call'
        ? allPhaseA.filter((s) => s.id !== 'st-precall')
        : allPhaseA

  const subtasks: MissionPlaybookPlanResult['subtasks'] = []
  const assertions: MissionPlaybookPlanResult['harness']['assertions'] = []
  let assertionN = 0
  const nextAssertion = () => {
    assertionN += 1
    return `A-${String(assertionN).padStart(3, '0')}`
  }

  // —— Phase A ——
  for (let index = 0; index < phaseA.length; index++) {
    const step = phaseA[index]!
    const assertionKey = nextAssertion()
    const dependsOn = index === 0 ? [] : [phaseA[index - 1]!.id]
    subtasks.push({
      id: step.id,
      title: step.title,
      assignTo: strategist,
      dependsOn,
      assertionKeys: [assertionKey],
      scheduledAt: null,
      intent: intent({
        why: step.why,
        story: `The agency team and client feel the strategy is already owned before production starts.`,
        sensory: `The Space doc "${step.docTitle}" reads specific to this client — not a generic template.`,
        endState: step.endState,
        ecology: `Load skill ${step.skillKey}. Save the durable doc into this Space/campaign Docs. Kickoff:\n${kickoffBits || '(none beyond mission brief)'}`,
      }),
      outputContract: docContract(step.docTitle),
    })
    assertions.push({
      assertionKey,
      category: 'strategy',
      statement: `${step.docTitle} exists in Space Docs and reflects this client.`,
      priority: 'must',
      validatorType: 'human_review',
      evidenceRequirement: `Document artifact titled like "${step.docTitle}" saved to the Space.`,
      failureSeverity: 'blocker',
    })
  }

  const lastPhaseAId = phaseA[phaseA.length - 1]?.id
  let afterStrategyId = lastPhaseAId

  if (canAssignHuman && lastPhaseAId) {
    const gateAssertion = nextAssertion()
    subtasks.push({
      id: 'st-gate-1',
      title: WEBINAR_FLOW_GATES.gate1,
      assignTo: humanAssign,
      dependsOn: [lastPhaseAId],
      assertionKeys: [gateAssertion],
      scheduledAt: null,
      intent: intent({
        why: 'Human must approve the strategy package before research/copy/creative production.',
        story:
          'You review the docs, leave mission comments if something is wrong, then complete this gate.',
        sensory: 'Strategy docs feel client-specific and ready for production handoff.',
        endState: 'Gate 1 completed; Pre-B market research can start.',
        ecology:
          'Use mission comments for revision feedback. Do not mark done until Pre-Call/Strategy v2/THE PLAN (as started) are good.',
      }),
    })
    assertions.push({
      assertionKey: gateAssertion,
      category: 'compliance',
      statement: 'Human approved the Phase A strategy package before production.',
      priority: 'must',
      validatorType: 'human_review',
      evidenceRequirement: 'Gate 1 human subtask completed.',
      failureSeverity: 'blocker',
    })
    afterStrategyId = 'st-gate-1'
  }

  // —— Pre-B: market research ——
  const researchAssertion = nextAssertion()
  subtasks.push({
    id: 'st-market-research',
    title: WEBINAR_FLOW_TASKS.marketResearch,
    assignTo: adsManager,
    dependsOn: afterStrategyId ? [afterStrategyId] : [],
    assertionKeys: [researchAssertion],
    scheduledAt: null,
    intent: intent({
      why: 'Ground every downstream copy unit in real ad-library receipts before Phase B.',
      story: 'Production stops guessing; ads and emails inherit observed competitor language.',
      sensory: 'The research brief cites real ads with longevity and transcripts where available.',
      endState: `Doc "${WEBINAR_FLOW_DOCS.marketResearch}" exists with raw JSON attachment.`,
      ecology: `Load skill ${SKILL_MARKET_RESEARCH}. Use platform-managed ads_intelligence + social_analysis via get_integration / use_integration (not MCP tool_search). Save Doc titled exactly "${WEBINAR_FLOW_DOCS.marketResearch}" plus raw JSON attachment. Kickoff:\n${kickoffBits || '(none)'}`,
    }),
    outputContract: docContract(WEBINAR_FLOW_DOCS.marketResearch),
  })
  assertions.push({
    assertionKey: researchAssertion,
    category: 'research',
    statement: 'Market Research doc exists with receipts for this client niche.',
    priority: 'must',
    validatorType: 'human_review',
    evidenceRequirement: `Document titled "${WEBINAR_FLOW_DOCS.marketResearch}" in Space Docs.`,
    failureSeverity: 'blocker',
  })

  // —— Phase B: copy package (orchestrator) ——
  const copyAssertion = nextAssertion()
  subtasks.push({
    id: 'st-copy-package',
    title: WEBINAR_FLOW_TASKS.copyPackage,
    assignTo: copywriter,
    dependsOn: ['st-market-research'],
    assertionKeys: [copyAssertion],
    scheduledAt: null,
    intent: intent({
      why: 'Assemble one reviewable Copy Package from atomic skills (topics → emails → ads → scripts → LP).',
      story:
        'Reviewer opens one doc, five sections, one flags list, and a REVIEW MAP for surgical rejects.',
      sensory: 'Title + three discover-bullets read verbatim across sections.',
      endState: `One Doc "${WEBINAR_FLOW_DOCS.copyPackage}" with 5 sections + Open flags + REVIEW MAP exists in Space Docs.`,
      ecology: `Load skill ${SKILL_COPY_PACKAGE}. Sequence atomic skills; write no copy in the orchestrator. Topics first. Include REVIEW MAP: ${REVIEW_MAP}. Save one native editable Doc titled exactly "${WEBINAR_FLOW_DOCS.copyPackage}". Do not create PDF, DOCX, XLSX, or other file-export companions. Do NOT write to /mnt/user-data/outputs/.`,
    }),
    outputContract: docContract(WEBINAR_FLOW_DOCS.copyPackage),
  })
  assertions.push({
    assertionKey: copyAssertion,
    category: 'copy',
    statement: 'Copy Package doc has 5 sections, open flags, and REVIEW MAP.',
    priority: 'must',
    validatorType: 'human_review',
    evidenceRequirement: `Document titled "${WEBINAR_FLOW_DOCS.copyPackage}" in Space Docs.`,
    failureSeverity: 'blocker',
  })

  let afterCopyId: string = 'st-copy-package'
  if (canAssignHuman) {
    const gate2Assertion = nextAssertion()
    subtasks.push({
      id: 'st-gate-2',
      title: WEBINAR_FLOW_GATES.gate2,
      assignTo: humanAssign,
      dependsOn: ['st-copy-package'],
      assertionKeys: [gate2Assertion],
      scheduledAt: null,
      intent: intent({
        why: 'Human approves the assembled Copy Package before Phase C creative.',
        story:
          'Approve to unlock ads/funnel/deck. On needs_revision, name the section number in the comment.',
        sensory: 'Copy Package feels launch-ready; flags are honest.',
        endState: 'Gate 2 completed (or surgical revision requested).',
        ecology: `REVIEW MAP: ${REVIEW_MAP}. On needs_revision + comment naming a section: re-run ONLY the owning skill for that section with {{run.review_feedback}} injected, then reassemble the Copy Package. Never re-run the whole package for a single-section reject.`,
      }),
    })
    assertions.push({
      assertionKey: gate2Assertion,
      category: 'compliance',
      statement: 'Human approved the Copy Package (or requested surgical section revision).',
      priority: 'must',
      validatorType: 'human_review',
      evidenceRequirement: 'Gate 2 human subtask completed.',
      failureSeverity: 'blocker',
    })
    afterCopyId = 'st-gate-2'
  }

  // —— Phase C (parallel after Gate 2) ——
  const phaseCDepends = [afterCopyId]

  const adAssertion = nextAssertion()
  subtasks.push({
    id: 'st-ad-design',
    title: WEBINAR_FLOW_TASKS.staticAds,
    assignTo: adsManager,
    dependsOn: phaseCDepends,
    assertionKeys: [adAssertion],
    scheduledAt: null,
    intent: intent({
      why: 'Produce static ad creatives from locked ad lines.',
      story: 'Deliverables show Static Ads cards ready for media buy review.',
      sensory: 'Highlight and brand color sit correctly; copy matches locked lines.',
      endState: 'Ad artifacts registered as Deliverables "Static Ads — [Campaign]".',
      ecology: `Load skill ${SKILL_AD_DESIGN}. Register each PNG as a native ad/media artifact titled like "Static Ads — [Campaign]". No /mnt/user-data/outputs/ in-platform.`,
    }),
    outputContract: adContract('Static Ads — [Campaign]'),
  })
  assertions.push({
    assertionKey: adAssertion,
    category: 'creative',
    statement: 'Static ad artifacts exist under Deliverables for this campaign.',
    priority: 'must',
    validatorType: 'human_review',
    evidenceRequirement: 'Ad/media Deliverables titled like "Static Ads — …".',
    failureSeverity: 'blocker',
  })

  const imageBriefAssertion = nextAssertion()
  subtasks.push({
    id: 'st-image-brief',
    title: WEBINAR_FLOW_TASKS.imageBriefs,
    assignTo: designer,
    dependsOn: phaseCDepends,
    assertionKeys: [imageBriefAssertion],
    scheduledAt: null,
    intent: intent({
      why: 'Hand ImageGen paste-ready design prompts for non-text-on-texture concepts.',
      story: 'Designer/media can paste prompts without rewriting.',
      sensory: `Doc "${WEBINAR_FLOW_DOCS.imageBriefs}" lists concepts with theme → prompt blocks.`,
      endState: `Doc "${WEBINAR_FLOW_DOCS.imageBriefs}" exists in Space Docs.`,
      ecology: `Load skill ${SKILL_IMAGE_BRIEF}. Save Doc titled exactly "${WEBINAR_FLOW_DOCS.imageBriefs}". Do not generate images unless asked.`,
    }),
    outputContract: docContract(WEBINAR_FLOW_DOCS.imageBriefs),
  })
  assertions.push({
    assertionKey: imageBriefAssertion,
    category: 'creative',
    statement: 'Image Briefs doc exists.',
    priority: 'must',
    validatorType: 'human_review',
    evidenceRequirement: `Document titled "${WEBINAR_FLOW_DOCS.imageBriefs}".`,
    failureSeverity: 'blocker',
  })

  const funnelAssertion = nextAssertion()
  subtasks.push({
    id: 'st-funnel-design',
    title: WEBINAR_FLOW_TASKS.funnelDesign,
    assignTo: designer,
    dependsOn: phaseCDepends,
    assertionKeys: [funnelAssertion],
    scheduledAt: null,
    intent: intent({
      why: 'Build the webinar funnel from Copy Package Section 5 design-handoff as-is.',
      story: 'Wireframe intent survives into a native funnel artifact.',
      sensory: 'Funnel pages carry verbatim LP copy and labeled placeholders.',
      endState: 'Native funnel artifact exists; Section 5 handoff was not reshaped.',
      ecology: `Load skill ${SKILL_FUNNEL_DESIGN}. Consume Copy Package Section 5 design-handoff block WITHOUT reshaping. Prefer native funnel builder when it can express wireframe intent; otherwise HTML review artifact then hi-fi. Register a funnel artifact — not loose HTML files.`,
    }),
    outputContract: funnelContract(),
  })
  assertions.push({
    assertionKey: funnelAssertion,
    category: 'funnel',
    statement: 'Funnel artifact exists consuming Section 5 handoff as-is.',
    priority: 'must',
    validatorType: 'human_review',
    evidenceRequirement: 'Native funnel artifact in the Space/campaign.',
    failureSeverity: 'blocker',
  })

  const deckOutlineAssertion = nextAssertion()
  subtasks.push({
    id: 'st-deck-outline',
    title: WEBINAR_FLOW_TASKS.deckOutline,
    assignTo: designer,
    dependsOn: phaseCDepends,
    assertionKeys: [deckOutlineAssertion],
    scheduledAt: null,
    intent: intent({
      why: 'Pause at Deck Outline v1 for human gate before building slides.',
      story: 'Outline locks the webinar arc before design directives and native build.',
      sensory: `Doc "${WEBINAR_FLOW_DOCS.deckOutline}" mirrors LP discover-bullets as three secrets.`,
      endState: `Doc "${WEBINAR_FLOW_DOCS.deckOutline}" exists; no presentation built yet.`,
      ecology: `Load skill ${SKILL_WEBINAR_DECK}. Produce Doc titled exactly "${WEBINAR_FLOW_DOCS.deckOutline}" only in this step. Do NOT build the presentation yet. Do NOT export PPTX.`,
    }),
    outputContract: docContract(WEBINAR_FLOW_DOCS.deckOutline),
  })
  assertions.push({
    assertionKey: deckOutlineAssertion,
    category: 'deck',
    statement: 'Deck Outline v1 doc exists before presentation build.',
    priority: 'must',
    validatorType: 'human_review',
    evidenceRequirement: `Document titled "${WEBINAR_FLOW_DOCS.deckOutline}".`,
    failureSeverity: 'blocker',
  })

  let afterDeckOutlineId: string = 'st-deck-outline'
  if (canAssignHuman) {
    const gate3Assertion = nextAssertion()
    subtasks.push({
      id: 'st-gate-3',
      title: WEBINAR_FLOW_GATES.gate3,
      assignTo: humanAssign,
      dependsOn: ['st-deck-outline'],
      assertionKeys: [gate3Assertion],
      scheduledAt: null,
      intent: intent({
        why: 'Human approves the deck outline before native presentation build.',
        story: 'Approve to unlock Webinar Deck v1 build; comment for outline revisions.',
        sensory: 'Outline arc feels teachable and offer-tight.',
        endState: 'Gate 3 completed; deck build can start.',
        ecology: 'Approve outline only. Presentation build is the next step — no PPTX export.',
      }),
    })
    assertions.push({
      assertionKey: gate3Assertion,
      category: 'compliance',
      statement: 'Human approved Deck Outline v1.',
      priority: 'must',
      validatorType: 'human_review',
      evidenceRequirement: 'Gate 3 human subtask completed.',
      failureSeverity: 'blocker',
    })
    afterDeckOutlineId = 'st-gate-3'
  }

  const deckBuildAssertion = nextAssertion()
  subtasks.push({
    id: 'st-deck-build',
    title: WEBINAR_FLOW_TASKS.deckBuild,
    assignTo: designer,
    dependsOn: [afterDeckOutlineId],
    assertionKeys: [deckBuildAssertion],
    scheduledAt: null,
    intent: intent({
      why: 'Build the editable presentation from the approved outline via native presentation actions.',
      story: 'Webinar Deck v1 lives as a presentation artifact, not a file dump.',
      sensory: 'Slides follow design directives; three secrets match LP bullets.',
      endState: 'Presentation artifact "Webinar Deck v1" exists; no .pptx in the run.',
      ecology: `Load skill ${SKILL_WEBINAR_DECK}. Use existing presentation actions only. Title "Webinar Deck v1". NEVER export or save a .pptx in-platform.`,
    }),
    outputContract: presentationContract('Webinar Deck v1'),
  })
  assertions.push({
    assertionKey: deckBuildAssertion,
    category: 'deck',
    statement: 'Presentation "Webinar Deck v1" exists; no PPTX file artifact.',
    priority: 'must',
    validatorType: 'human_review',
    evidenceRequirement: 'Native presentation artifact titled "Webinar Deck v1".',
    failureSeverity: 'blocker',
  })

  const assertionKeys = assertions.map((a) => a.assertionKey)

  return {
    kind: 'plan',
    title: 'Webinar Fulfillment',
    summary:
      'Phase A strategy → Gate 1 → market research → Copy Package → Gate 2 → Phase C creatives (ads, image briefs, funnel, deck outline) → Gate 3 → Webinar Deck v1.',
    approach: `Follow playbook ${WEBINAR_FULFILLMENT_PLAYBOOK_ID} starting at ${startAt}. Do not invent a different lifecycle. Strategy→${strategist}; research/ads→${adsManager}; copy→${copywriter}; design→${designer}.`,
    capability_gap: {
      exists: false,
      note: '',
      suggested_hire: '',
    },
    harness: {
      contextSnapshot: {
        summary: `Playbook ${WEBINAR_FULFILLMENT_PLAYBOOK_ID}; start_at=${startAt}. ${kickoffBits || 'Kickoff had no extra links.'}`,
        sources: [
          {
            sourceType: 'playbook',
            title: WEBINAR_FULFILLMENT_PLAYBOOK_ID,
            confidence: 'strong',
            summary: 'Deterministic Phase A→B→C + Gates 1–3',
          },
        ],
        missing: [],
        sufficiency: {
          sufficientForPlan: true,
          sufficientForValidation: true,
          reason: 'Playbook skeleton is fixed; kickoff supplies client context.',
        },
      },
      clarificationQuestions: [],
      assumptions: [
        {
          assumptionKey: 'AS-001',
          statement:
            'Campaign team includes strategist, ads_manager, copywriter, and designer capable workers (or fallbacks).',
          confidence: 'medium',
          impact: 'Wrong assignee weakens skill execution quality.',
        },
        {
          assumptionKey: 'AS-002',
          statement:
            'ads_manager runtime has platform-managed ads_intelligence (SearchAPI) and social_analysis (Scrape Creators Ad Library) actions for market research.',
          confidence: 'medium',
          impact: 'Pre-B research cannot pull live ad-library receipts without those connectors.',
        },
      ],
      assertions,
      assertionCoverage: assertions.map((a) => {
        const owner = subtasks.find((s) => s.assertionKeys.includes(a.assertionKey))
        return {
          assertionKey: a.assertionKey,
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
          evidenceRequired: 'Human gate completion plus Space docs/artifacts.',
        },
      ],
    },
    subtasks,
    outOfScope: [
      'auto-skill-4 (built separately)',
      'Flow-builder Standard vs Mission chooser',
      'PPTX export inside the platform',
    ],
    assignTo: strategist,
  }
}

export function expandMissionPlaybook(
  input: MissionPlaybookExpandInput,
): MissionPlaybookPlanResult | null {
  if (input.playbookId === WEBINAR_FULFILLMENT_PLAYBOOK_ID) {
    return expandWebinarFulfillmentPlaybook(input)
  }
  return null
}
