import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Job } from 'bullmq'
import {
  parseInteractionEnvelope,
  type InteractionChannel,
  type InteractionEnvelopeV1,
  type InteractionParticipant,
} from '@vibey/api-shared'
import { DatabaseService } from '../../lib/services/database.service'
import {
  MissionOpenclawGateway,
  type MissionTraceToolStep,
} from '../missions/services/gateways/mission-openclaw.gateway'
import { CompanyCortexFormationService } from './company-cortex-formation.service'
import { CompanyDailyDreamRunnerService } from './company-daily-dream-runner.service'
import { CustomerInteractionExtractionService } from './customer-interaction-extraction.service'
import { BRAIN_OPS_QUEUE, type BrainOpsJobData, type BrainOpsJobResult } from './types'

// ── Customer Call Routing skill contract ──────────────────────────────────
// See docker/agents/templates/brain_scholar/skills/customer-call-routing/SKILL.md
// for the authoring contract. Atlas writes Customer Brain memories by calling
// save_customer_memory; this processor prepares contact ids and observes the
// action results instead of parsing assistant text for writes.

const SAVE_CUSTOMER_MEMORY_ACTION = 'save_customer_memory'

interface ExistingContactRow {
  id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  contact_type: string | null
  contact_type_source: string | null
  contact_type_confidence: number | null
  business_name: string | null
}

interface RoutingAttendee {
  email: string
  name: string | null
}

interface PreparedRoutingContact {
  contact_id: string
  email: string
  name: string | null
  existing_contact_type: string
  existing_contact_type_source: string
  existing_contact_type_confidence: number | null
  business_name: string | null
}

interface PreparedRoutingSourceIdentity {
  source_type: string
  source_id: string
  identity_kind: string
  name: string | null
  role: string
}

type BrainJobScopeRow = {
  id?: string
  owner_id?: string | null
  org_id?: string | null
  scope?: string | null
}

// ── Customer-brain pattern-analysis skill contract ───────────────────────
// See docker/agents/templates/brain_scholar/skills/customer-brain-pattern-analysis/SKILL.md
// for the authoring contract. Same architecture as customer-call-routing —
// Atlas judges, the worker writes. Cross-contact thresholds and id validity
// are enforced here so a hallucinated response can't bypass them.

const CUSTOMER_BELIEF_MIN_DISTINCT_UNITS = 3
const CUSTOMER_PERSPECTIVE_MIN_BELIEFS = 3
const CUSTOMER_PATTERN_MEMORY_LIMIT = 200
const CUSTOMER_PATTERN_TARGETED_MEMORY_LIMIT = 80
const CUSTOMER_PATTERN_PROMPT_BUDGET_CHARS = 60_000
const CUSTOMER_PATTERN_TARGETED_PROMPT_BUDGET_CHARS = 40_000
const BRAIN_HIGH_STAKES_MODEL_ID = 'anthropic/claude-opus-5'
const BRAIN_HIGH_STAKES_MODEL_SETTINGS = {
  context_window_tokens: 250_000,
  reasoning_effort: 'medium',
  speed_mode: 'standard',
} as const
const VALID_EVIDENCE_TYPES = new Set<string>(['stated', 'revealed', 'behavioral'])
const EVIDENCE_TYPE_RANK: Record<string, number> = {
  stated: 0,
  revealed: 1,
  behavioral: 2,
}
const VALID_BELIEF_OPS = new Set<string>(['reinforce', 'challenge', 'resolve'])
const VALID_PERSPECTIVE_OPS = new Set<string>(['update', 'archive'])
const VALID_DISCRIMINATOR_AXES = new Set<string>([
  'stakes',
  'horizon',
  'money',
  'reference_frame',
  'identity',
  'pain',
  'risk',
])

interface PatternAnalysisDecision {
  brain_id: string
  evidence_requests: PatternEvidenceRequest[]
  new_beliefs: NewBeliefDraft[]
  belief_updates: BeliefUpdateDraft[]
  new_perspectives: NewPerspectiveDraft[]
  perspective_updates: PerspectiveUpdateDraft[]
  log_event: { summary: string } | null
}

interface PatternEvidenceRequest {
  belief_ids: string[]
  perspective_ids: string[]
  reason: string
}

interface NewBeliefDraft {
  pattern_name: string
  description: string
  emotional_signature: Record<string, unknown> | null
  supporting_memory_ids: string[]
  supporting_customer_unit_ids: string[]
  supporting_contact_ids: string[]
  evidence_type: string
  discriminator_axis: string | null
}

interface BeliefUpdateDraft {
  id: string
  op: string
  supporting_memory_ids: string[]
  evidence_type: string | null
  rationale: string
}

interface NewPerspectiveDraft {
  name: string
  description: string
  narrative_md: string
  belief_ids: string[]
  blind_spots: string | null
  evidence_distribution: Record<string, number> | null
}

interface PerspectiveUpdateDraft {
  id: string
  op: string
  rationale: string
  narrative_md: string | null
}

interface CustomerMemoryRow {
  id: string
  content: string
  contact_id: string | null
  customer_entity_id: string | null
  customer_source_identity_id: string | null
  customer_resolution_status: string | null
  source_type: string | null
  source_title: string | null
  emotional_valence: number | null
  emotional_intensity: number | null
  created_at: string
  occurred_at: string | null
  occurred_until: string | null
  asserted_at: string | null
}

interface ExistingBeliefRow {
  id: string
  pattern_name: string
  description: string | null
  status: string | null
  strength: number | null
  evidence_type: string | null
  reinforcement_count: number | null
  last_reinforced_at: string | null
  supporting_memories: string[] | null
}

interface ExistingPerspectiveRow {
  id: string
  name: string
  description: string | null
  status: string | null
  strength: number | null
  beliefs: string[] | null
}

interface DiscriminatorAxisRow {
  id: string
  name: string
  description: string | null
  scope: string | null
  status: string | null
}

// ── Customer-avatar-synthesis skill contract ─────────────────────────────
// See docker/agents/templates/brain_scholar/skills/customer-avatar-synthesis/SKILL.md
// for the authoring contract. Atlas judges, the worker writes. Min 3 distinct
// member contacts per avatar + 3-per-offer cap + axis-id validity are enforced
// here so a hallucinated response can't bypass them.

const AVATAR_MIN_DISTINCT_MEMBERS = 3
const AVATAR_MAX_PER_OFFER = 3
const AVATAR_SYNTHESIS_MEMORY_LIMIT = 300
const AVATAR_SYNTHESIS_PROMPT_BUDGET_CHARS = 80_000
const VALID_AVATAR_OPS = new Set<string>(['update', 'split', 'merge', 'archive', 'shift'])
const VALID_NEEDS_KEYS = new Set<string>([
  'certainty',
  'variety',
  'significance',
  'connection',
  'growth',
  'contribution',
])
const VALID_NEEDS_RANKS = new Set<string>(['primary', 'secondary'])

interface AvatarDecision {
  brain_id: string
  new_avatars: NewAvatarDraft[]
  avatar_updates: AvatarUpdateDraft[]
  proposed_axes: ProposedAxisDraft[]
  log_event: { summary: string } | null
}

interface NewAvatarDraft {
  name: string
  summary: string
  narrative_md: string
  status: string
  strength: number
  confidence: number
  member_customer_unit_ids: string[]
  member_contact_ids: string[]
  member_strength: Record<string, number>
  dominant_perspective_ids: string[]
  dominant_belief_ids: string[]
  dominant_pain_points: string[]
  emotional_signature: Record<string, unknown> | null
  blind_spots: string | null
  discriminator_profile: Record<string, number>
  needs_profile: Record<string, { score: number; rank: string | null }> | null
  evidence_distribution: Record<string, number> | null
  lineage: Record<string, unknown> | null
  contrast_profile: Record<string, string> | null
  discriminator_questions: string[]
  offer_ids: string[]
  declared_avatar_id: string | null
}

interface AvatarUpdateDraft {
  id: string
  op: string
  patch: Record<string, unknown>
  merged_with: string[]
  rationale: string
}

interface ProposedAxisDraft {
  id: string
  name: string
  description: string
  high_end_signature: string
  low_end_signature: string
}

interface ExistingAvatarRow {
  id: string
  name: string
  status: string | null
  member_customer_unit_ids: string[] | null
  member_contact_ids: string[] | null
  discriminator_profile: Record<string, number> | null
  offer_ids: string[] | null
}

interface ExistingPerspectiveLite {
  id: string
  name: string
  narrative_md: string | null
  beliefs: string[] | null
  status: string | null
}

interface ExistingBeliefLite {
  id: string
  pattern_name: string
  description: string | null
  evidence_type: string | null
  status: string | null
}

interface CustomerContactLite {
  id: string
  email: string | null
  business_name: string | null
  contact_type: string | null
}

interface CustomerUnitLite {
  id: string
  entity_key: string
  entity_type: string | null
  display_name: string | null
  primary_contact_id: string | null
}

const LINT_PROMPT = `/brain-library-lint

Your library has accumulated enough updates to warrant a health check.

Step back from incremental syncs and look at your entire library holistically. Check for gaps, stale content, contradictions, orphaned pages, shallow evidence, and missing cross-references.

## Your Workflow

1. Read ~/brain/INDEX.md and get_brain_pages with brain_type=user_default to see all pages with their metadata
2. Run each check: gaps, stale (30+ days), contradictions, orphans, shallow (< 3 sources), missing links
3. For gaps: use search_user_brain with broad topic queries to find unorganized clusters
4. Fix what you can (create pages, update stale content, add links)
5. Log your findings via log_brain_event with event_type lint_pass`

const PATTERN_ANALYSIS_PROMPT = `/brain-pattern-analysis

You have enough new page updates to warrant a pattern analysis pass.

Your organized narrative pages have been updated since your last analysis. Your job is to read your library, detect belief patterns forming across topics, and synthesize perspectives when the belief landscape changes.

This is the Dispenza layer of your brain — memories form beliefs, beliefs cluster into perspectives, perspectives reveal the user's evolving worldview.

## Your Workflow

1. Read ~/brain/INDEX.md to see your current pages
2. Read the narrative pages from your workspace — focus on recently updated ones
3. Call get_brain_belief_patterns with brain_type=user_default to see existing beliefs
4. Call get_brain_perspectives with brain_type=user_default to see existing perspectives
5. Keep retrieval targeted: do not load the entire library. Start from INDEX, recently changed pages, and the compact belief/perspective lists. When a contradiction, resolution, or worldview rewrite is uncertain, search for that exact belief or tension and read only the older pages needed to decide safely.
6. Detect new patterns across pages (repeated emotional themes, behavioral consistency, stated beliefs, contradictions)
7. Run border control on existing beliefs:
   - reinforce beliefs when the new pages support them
   - mark beliefs challenged when new evidence contradicts them
   - archive beliefs only when the user's newer evidence clearly resolves them
8. Surface tensions deliberately. A tension is not a bug — it is a belief under pressure. Use update_brain_belief_pattern(status="challenged") when the evidence is clear.
9. For each pattern: create_brain_belief_pattern (new), update_brain_belief_pattern (reinforce/challenge), or archive_brain_belief_pattern (resolved)
10. Check if 3+ beliefs now align into a new perspective → create_brain_perspective
11. Check if existing perspectives need updating → update_brain_perspective
12. Log what you did via log_brain_event`

const TIMELINE_SYNTHESIS_PROMPT = `/brain-timeline-synthesis

You have enough Cortex Max changes to update temporal timelines.

Use timelines for curated milestones, shifts, contradictions, decisions, formations, and resolutions. Do not turn every episode or memory into a timeline item. created_at is when Atlas learned the row; occurred_at/evidence_started_at/effective_from is when the event happened or became true.

## Your Workflow

1. Read existing timelines with get_brain_timelines
2. Inspect relevant pages, beliefs, perspectives, memories, objects, or avatars for changes with source time
3. Create missing timelines with create_brain_timeline
4. Add or update only important items with upsert_brain_timeline_items
5. Use item_type: event, decision, shift, milestone, contradiction, formation, or resolution
6. Preserve temporal metadata: occurred_at for event time, asserted_at for learned time, valid_from/valid_until for truth windows
7. Leave unknown event time null. Never infer broad dates from text in v1
8. Archive timelines only when the target is no longer meaningful`

const LIBRARY_SYNC_PROMPT = `/brain-library-organization

You have new knowledge entries to organize into your library.

These entries were captured from conversations, documents, and curated sources since your last library sync. Your job is to integrate them into your organized knowledge pages so the library stays current and coherent.

Organized pages make you faster at answering user questions — instead of searching hundreds of scattered entries, you read one well-maintained page and have the full picture. A stale library means stale answers.

## Your Workflow

1. Read ~/brain/INDEX.md to see your current pages
2. For each entry, decide which page(s) it belongs to
3. Read affected pages from your workspace
4. Update pages using patch_brain_page for section edits, or create_brain_page for new themes
5. If entries don't fit any existing page, skip them — they'll be caught by lint later
6. If 3+ entries cluster around a new theme, create a page and use search_user_brain to find older related entries
7. Update INDEX.md with any new or changed page summaries
8. Update CAPSULE.md if the overall picture shifted
9. Log what you did via log_brain_event

If you notice contradictions between new entries and existing page content, note the evolution in the narrative: "Previously X, but as of [date], Y." Contradictions are valuable — they show growth, not errors.`

const BRAIN_OPS_CONCURRENCY = readPositiveInt(
  process.env.AGENT_RUNTIME_BRAIN_CONCURRENCY || process.env.BRAIN_OPS_CONCURRENCY,
  2,
)

@Processor(BRAIN_OPS_QUEUE, {
  concurrency: BRAIN_OPS_CONCURRENCY,
  lockDuration: 5_000_000,
  stalledInterval: 120_000,
})
export class BrainOpsProcessor extends WorkerHost {
  private readonly logger = new Logger(BrainOpsProcessor.name)

  constructor(
    private readonly openclawGateway: MissionOpenclawGateway,
    private readonly databaseService: DatabaseService,
    private readonly companyDailyDreamRunner: CompanyDailyDreamRunnerService,
    private readonly companyCortexFormation: CompanyCortexFormationService,
    private readonly customerInteractionExtraction: CustomerInteractionExtractionService,
  ) {
    super()
  }

  async process(job: Job<BrainOpsJobData>): Promise<BrainOpsJobResult> {
    const { brainId, eventType } = job.data
    this.logger.log(`Processing brain-ops job: ${eventType} for brain ${brainId.slice(0, 8)}`)

    try {
      await this.assertBrainJobScope(job.data)
      const cortexEnabled = await this.isCortexMaxEnabled(brainId)
      if (!cortexEnabled) {
        this.logger.log(
          `Skipping brain-ops job: cortex_max is off for brain ${brainId.slice(0, 8)}`,
        )
        await this.markOutboxDone(job.data.outboxId)
        return {
          brainId,
          success: true,
          eventType,
          processedAt: new Date().toISOString(),
          output: { skipped: 'cortex_max_disabled' },
        }
      }

      switch (eventType) {
        case 'brain_library_sync':
          return await this.processLibrarySync(job)
        case 'brain_pattern_analysis': {
          // Customer brains use the cross-customer synthesis skill instead of the
          // user-brain narrative-page version. Same event type, different path so
          // both can be enqueued through the same outbox column.
          const scope = await this.getBrainScope(brainId)
          if (scope === 'customer') {
            return await this.processCustomerBrainPatternAnalysis(job)
          }
          return await this.processPatternAnalysis(job, scope)
        }
        case 'brain_timeline_synthesis': {
          const scope = await this.getBrainScope(brainId)
          return await this.processTimelineSynthesis(job, scope)
        }
        case 'brain_lint':
          return await this.processLint(job)
        case 'customer_interaction_route':
          return await this.processCustomerInteractionRoute(job)
        case 'brain_avatar_synthesis':
          return await this.processCustomerAvatarSynthesis(job)
        case 'company_daily_dream':
          return await this.processCompanyDailyDream(job)
        case 'company_cortex_formation':
          return await this.processCompanyCortexFormation(job)
        case 'company_context_rule_lint':
          return await this.processCompanyContextRuleLint(job)
        default:
          throw new Error(`Unknown brain-ops event type: ${eventType}`)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.logger.error(
        `Brain-ops job failed: ${eventType} brain=${brainId.slice(0, 8)}: ${errorMessage}`,
      )

      await this.markOutboxFailed(job.data.outboxId, errorMessage)

      return {
        brainId,
        success: false,
        eventType,
        processedAt: new Date().toISOString(),
        error: errorMessage,
      }
    }
  }

  private async assertBrainJobScope(data: BrainOpsJobData): Promise<void> {
    const { data: brain, error } = await this.databaseService
      .getClient()
      .from('ns_brains')
      .select('id, owner_id, org_id, scope')
      .eq('id', data.brainId)
      .maybeSingle()
    if (error) throw new Error(`Failed brain job scope lookup: ${error.message}`)
    if (!brain) throw new Error(`Brain ${data.brainId} not found for brain-ops job`)

    const row = brain as BrainJobScopeRow
    const ownerId = typeof row.owner_id === 'string' ? row.owner_id : null
    const brainOrgId = typeof row.org_id === 'string' ? row.org_id : null
    const jobOrgId = data.orgId ?? null
    if (ownerId !== data.userId) {
      throw new Error(`Brain job user mismatch for brain ${data.brainId}`)
    }
    if (jobOrgId) {
      if (brainOrgId !== jobOrgId) {
        throw new Error(`Brain job org mismatch for brain ${data.brainId}`)
      }
      return
    }
    if (brainOrgId) {
      throw new Error(`Brain job org mismatch for personal brain ${data.brainId}`)
    }
  }

  private async processDeferredAtlasSkill(job: Job<BrainOpsJobData>): Promise<BrainOpsJobResult> {
    const { brainId, eventType } = job.data
    this.logger.log(
      `Brain ops event ${eventType} is queued for future Atlas skill wiring (brain ${brainId.slice(0, 8)})`,
    )
    await this.markOutboxDone(job.data.outboxId)
    return {
      brainId,
      success: true,
      eventType,
      processedAt: new Date().toISOString(),
      output: { skipped: 'atlas_skill_out_of_scope' },
    }
  }

  private async processCompanyDailyDream(job: Job<BrainOpsJobData>): Promise<BrainOpsJobResult> {
    const { brainId, userId, orgId, payload } = job.data
    if (!orgId) throw new Error('company_daily_dream requires orgId')

    const localDate =
      typeof payload.local_date === 'string'
        ? payload.local_date
        : new Date().toISOString().slice(0, 10)
    const windowEnd =
      typeof payload.window_end === 'string' ? payload.window_end : new Date().toISOString()
    const windowStart =
      typeof payload.window_start === 'string'
        ? payload.window_start
        : new Date(new Date(windowEnd).getTime() - 24 * 60 * 60 * 1000).toISOString()

    const output = await this.companyDailyDreamRunner.runDailyDream({
      orgId,
      brainId,
      userId,
      localDate,
      windowStart,
      windowEnd,
      manual: payload.manual === true,
    })

    await this.markOutboxDone(job.data.outboxId)
    return {
      brainId,
      success: true,
      eventType: 'company_daily_dream',
      processedAt: new Date().toISOString(),
      output,
    }
  }

  private async processCompanyCortexFormation(
    job: Job<BrainOpsJobData>,
  ): Promise<BrainOpsJobResult> {
    const { brainId, userId, orgId } = job.data
    if (!orgId) throw new Error('company_cortex_formation requires orgId')
    const output = await this.companyCortexFormation.runFormation({
      outboxId: job.data.outboxId,
      userId,
      orgId,
      brainId,
      payload: job.data.payload,
    })
    await this.markOutboxDone(job.data.outboxId)
    return {
      brainId,
      success: true,
      eventType: 'company_cortex_formation',
      processedAt: new Date().toISOString(),
      output,
    }
  }

  private async processCompanyContextRuleLint(
    job: Job<BrainOpsJobData>,
  ): Promise<BrainOpsJobResult> {
    const { brainId, userId, orgId, payload } = job.data
    if (!orgId) throw new Error('company_context_rule_lint requires orgId')

    const fakeMission = {
      id: job.data.outboxId,
      user_id: userId,
      org_id: orgId,
      campaign_id: null,
      correlation_id: job.data.outboxId,
      title: 'Company Context Rule Lint',
      brief: 'Audit Company Cortex retrieval rules and context injection quality',
      priority: 'low',
      assigned_agent_key: 'atlas',
      current_agent_key: 'atlas',
      input: {},
    }

    const taskUserMessage = [
      'Run the company-context-rule-lint skill for this Company Cortex brain.',
      `brain_id: ${brainId}`,
      `org_id: ${orgId}`,
      '',
      'Context feedback / trigger:',
      JSON.stringify(payload ?? {}, null, 2),
      '',
      'Return only the JSON report described in the skill.',
    ].join('\n')

    const result = await this.openclawGateway.callOpenClawRaw(
      fakeMission,
      'atlas',
      '',
      taskUserMessage,
      undefined,
      'mission_execute',
      { channel: 'brain-ops' },
    )

    await this.markOutboxDone(job.data.outboxId)
    return {
      brainId,
      success: true,
      eventType: 'company_context_rule_lint',
      processedAt: new Date().toISOString(),
      output: { content_preview: String(result.content ?? '').slice(0, 200) },
    }
  }

  // ── Customer Avatar Synthesis ────────────────────────────────────────────
  private async processCustomerAvatarSynthesis(
    job: Job<BrainOpsJobData>,
  ): Promise<BrainOpsJobResult> {
    const { brainId, userId, orgId } = job.data
    const supabase = this.databaseService.getClient()

    const scope = await this.getBrainScope(brainId)
    if (scope !== 'customer') {
      this.logger.log(
        `brain_avatar_synthesis: brain=${brainId.slice(0, 8)} scope=${scope ?? 'unknown'} — skipping (not a customer brain)`,
      )
      await this.markOutboxDone(job.data.outboxId)
      return {
        brainId,
        success: true,
        eventType: 'brain_avatar_synthesis',
        processedAt: new Date().toISOString(),
        output: { skipped: 'wrong_scope' },
      }
    }

    const [perspectives, beliefs, existingAvatars, axes, contextBundle] = await Promise.all([
      this.loadExistingPerspectivesLite(supabase, brainId),
      this.loadExistingBeliefsLite(supabase, brainId),
      this.loadExistingAvatars(supabase, brainId),
      this.loadDiscriminatorAxes(supabase, orgId ?? null),
      this.loadCustomerBrainContext(supabase, brainId, userId, orgId ?? null),
    ])

    if (perspectives.length === 0 || beliefs.length === 0) {
      this.logger.log(
        `brain_avatar_synthesis: brain=${brainId.slice(0, 8)} skipping — ` +
          `perspectives=${perspectives.length} beliefs=${beliefs.length} ` +
          '(need cognition before avatars can form)',
      )
      await this.markOutboxDone(job.data.outboxId)
      return {
        brainId,
        success: true,
        eventType: 'brain_avatar_synthesis',
        processedAt: new Date().toISOString(),
        output: { skipped: 'insufficient_cognition' },
      }
    }

    const memories = await this.loadAvatarSynthesisMemories(supabase, brainId)
    const memoryCustomerUnitIds = Array.from(
      new Set(memories.map(customerUnitIdForMemory).filter((id): id is string => !!id)),
    )
    const memoryContactIds = Array.from(
      new Set(memories.map((m) => m.contact_id).filter((c): c is string => !!c)),
    )
    const customerUnits = memoryCustomerUnitIds.length
      ? await this.loadCustomerUnitsLite(supabase, memoryCustomerUnitIds)
      : []
    const contacts = memoryContactIds.length
      ? await this.loadCustomerContactsLite(supabase, memoryContactIds)
      : []
    const contactIdByUnitId = new Map(
      customerUnits
        .filter((unit) => !!unit.primary_contact_id)
        .map((unit) => [unit.id, unit.primary_contact_id as string]),
    )
    for (const memory of memories) {
      const unitId = customerUnitIdForMemory(memory)
      if (unitId && memory.contact_id && !contactIdByUnitId.has(unitId)) {
        contactIdByUnitId.set(unitId, memory.contact_id)
      }
    }

    if (memoryCustomerUnitIds.length < AVATAR_MIN_DISTINCT_MEMBERS) {
      this.logger.log(
        `brain_avatar_synthesis: brain=${brainId.slice(0, 8)} skipping — ` +
          `distinct customer units=${memoryCustomerUnitIds.length} ` +
          `(need ${AVATAR_MIN_DISTINCT_MEMBERS}+)`,
      )
      await this.markOutboxDone(job.data.outboxId)
      return {
        brainId,
        success: true,
        eventType: 'brain_avatar_synthesis',
        processedAt: new Date().toISOString(),
        output: { skipped: 'insufficient_customer_units' },
      }
    }

    const taskUserMessage = this.buildAvatarSynthesisPrompt({
      brainId,
      orgName: contextBundle.orgName,
      offers: contextBundle.offers,
      axes,
      perspectives,
      beliefs,
      existingAvatars,
      customerUnits,
      contacts,
      memories,
    })

    const fakeMission = {
      id: job.data.outboxId,
      user_id: userId,
      org_id: orgId ?? null,
      campaign_id: null,
      correlation_id: job.data.outboxId,
      title: 'Customer Avatar Synthesis',
      brief: 'Cluster customer-side perspectives + beliefs into emergent avatars',
      priority: 'low',
      assigned_agent_key: 'atlas',
      current_agent_key: 'atlas',
      input: {},
    }

    const result = await this.openclawGateway.callOpenClawRaw(
      fakeMission,
      'atlas',
      '',
      taskUserMessage,
      BRAIN_HIGH_STAKES_MODEL_ID,
      'mission_execute',
      { channel: 'brain-ops', modelSettings: BRAIN_HIGH_STAKES_MODEL_SETTINGS },
    )

    const decision = this.parseAvatarDecision(String(result.content ?? ''), brainId)
    if (!decision) {
      throw new Error('brain_avatar_synthesis: Atlas response did not parse to AvatarDecision JSON')
    }

    const writeOutcome = await this.applyAvatarDecision(supabase, {
      decision,
      brainId,
      orgId: orgId ?? null,
      existingAvatars,
      validContactIds: new Set(contacts.map((c) => c.id)),
      validCustomerUnitIds: new Set(memoryCustomerUnitIds),
      customerEntityIds: new Set(customerUnits.map((unit) => unit.id)),
      contactIdByUnitId,
      validPerspectiveIds: new Set(perspectives.map((p) => p.id)),
      validBeliefIds: new Set(beliefs.map((b) => b.id)),
      validAxisIds: new Set(axes.map((a) => a.id)),
    })

    await this.touchAvatarSynthesisTimestamp(brainId)
    await this.markOutboxDone(job.data.outboxId)

    this.logger.log(
      `brain_avatar_synthesis: brain=${brainId.slice(0, 8)} ` +
        `new_avatars=${writeOutcome.newAvatars} updates=${writeOutcome.avatarUpdates} ` +
        `proposed_axes=${writeOutcome.proposedAxes}`,
    )

    return {
      brainId,
      success: true,
      eventType: 'brain_avatar_synthesis',
      processedAt: new Date().toISOString(),
      output: writeOutcome,
    }
  }

  private async loadExistingAvatars(
    supabase: SupabaseClient,
    brainId: string,
  ): Promise<ExistingAvatarRow[]> {
    const { data } = await supabase
      .from('customer_avatars')
      .select(
        'id, name, status, member_customer_unit_ids, member_contact_ids, discriminator_profile, offer_ids',
      )
      .eq('brain_id', brainId)
      .in('status', ['emerging', 'active', 'shifting'])
      .order('strength', { ascending: false })
    return (data ?? []) as ExistingAvatarRow[]
  }

  private async loadExistingPerspectivesLite(
    supabase: SupabaseClient,
    brainId: string,
  ): Promise<ExistingPerspectiveLite[]> {
    const { data } = await supabase
      .from('ns_perspectives')
      .select('id, name, narrative_md, beliefs, status')
      .eq('brain_id', brainId)
      .in('status', ['emerging', 'active'])
    return (data ?? []) as ExistingPerspectiveLite[]
  }

  private async loadExistingBeliefsLite(
    supabase: SupabaseClient,
    brainId: string,
  ): Promise<ExistingBeliefLite[]> {
    const { data } = await supabase
      .from('ns_belief_patterns')
      .select('id, pattern_name, description, evidence_type, status')
      .eq('brain_id', brainId)
      .in('status', ['emerging', 'active', 'challenged'])
    return (data ?? []) as ExistingBeliefLite[]
  }

  private async loadCustomerContactsLite(
    supabase: SupabaseClient,
    contactIds: string[],
  ): Promise<CustomerContactLite[]> {
    const { data } = await supabase
      .from('contacts')
      .select('id, email, business_name, contact_type')
      .in('id', contactIds)
    return (data ?? []) as CustomerContactLite[]
  }

  private async loadCustomerUnitsLite(
    supabase: SupabaseClient,
    customerUnitIds: string[],
  ): Promise<CustomerUnitLite[]> {
    const { data } = await supabase
      .from('customer_entities')
      .select('id, entity_key, entity_type, display_name, primary_contact_id')
      .in('id', customerUnitIds)
    return (data ?? []) as CustomerUnitLite[]
  }

  private async loadAvatarSynthesisMemories(
    supabase: SupabaseClient,
    brainId: string,
  ): Promise<CustomerMemoryRow[]> {
    const { data } = await supabase
      .from('ns_memories')
      .select(
        'id, content, contact_id, customer_entity_id, customer_source_identity_id, customer_resolution_status, source_type, source_title, emotional_valence, emotional_intensity, created_at, occurred_at, occurred_until, asserted_at',
      )
      .eq('brain_id', brainId)
      .order('created_at', { ascending: false })
      .limit(AVATAR_SYNTHESIS_MEMORY_LIMIT)
    return ((data ?? []) as CustomerMemoryRow[]).filter((m) => !!customerUnitIdForMemory(m))
  }

  private buildAvatarSynthesisPrompt(input: {
    brainId: string
    orgName: string | null
    offers: Array<{ name: string; price: string | null }>
    axes: DiscriminatorAxisRow[]
    perspectives: ExistingPerspectiveLite[]
    beliefs: ExistingBeliefLite[]
    existingAvatars: ExistingAvatarRow[]
    customerUnits: CustomerUnitLite[]
    contacts: CustomerContactLite[]
    memories: CustomerMemoryRow[]
  }): string {
    const offersBlock = input.offers.length
      ? input.offers.map((o) => `- ${o.name}${o.price ? ` (${o.price})` : ''}`).join('\n')
      : '(no declared offers)'

    const axesBlock = input.axes.length
      ? input.axes
          .map((a) => `- ${a.id} (${a.scope}): ${a.name} — ${a.description ?? ''}`)
          .join('\n')
      : '(no axes)'

    const existingAvatarsBlock = input.existingAvatars.length
      ? input.existingAvatars
          .map((a) => {
            const profile = a.discriminator_profile
              ? Object.entries(a.discriminator_profile)
                  .map(([k, v]) => `${k}=${v}`)
                  .join(', ')
              : '(unset)'
            return `- id=${a.id} status=${a.status ?? 'unknown'} name="${a.name}" units=${(a.member_customer_unit_ids ?? []).length} contacts=${(a.member_contact_ids ?? []).length} profile=${profile}`
          })
          .join('\n')
      : '(none)'

    const perspectivesBlock = input.perspectives.length
      ? input.perspectives
          .map(
            (p) =>
              `- id=${p.id} status=${p.status ?? 'unknown'} name="${p.name}" beliefs=${(p.beliefs ?? []).length}\n  narrative: ${(p.narrative_md ?? '').slice(0, 360)}`,
          )
          .join('\n\n')
      : '(none)'

    const beliefsBlock = input.beliefs.length
      ? input.beliefs
          .map(
            (b) =>
              `- id=${b.id} status=${b.status ?? 'unknown'} evidence=${b.evidence_type ?? 'unset'}\n  name: ${b.pattern_name}\n  desc: ${(b.description ?? '').slice(0, 240)}`,
          )
          .join('\n\n')
      : '(none)'

    const contactsBlock = input.contacts.length
      ? input.contacts
          .map(
            (c) =>
              `- id=${c.id} email=${c.email ?? '(unset)'} business=${c.business_name ?? '(unset)'} type=${c.contact_type ?? 'unknown'}`,
          )
          .join('\n')
      : '(none)'

    const customerUnitsBlock = input.customerUnits.length
      ? input.customerUnits
          .map(
            (u) =>
              `- id=${u.id} type=${u.entity_type ?? 'unknown'} contact_id=${u.primary_contact_id ?? '(none)'} name=${u.display_name ?? u.entity_key}`,
          )
          .join('\n')
      : '(none)'

    // Memory sample with character budget — mirrors the pattern-analysis prompt.
    const memoryLines: string[] = []
    let usedChars = 0
    for (const m of input.memories) {
      const valence = m.emotional_valence ?? null
      const intensity = m.emotional_intensity ?? null
      const emoTag =
        valence !== null || intensity !== null
          ? ` [valence=${valence ?? 'n/a'} intensity=${intensity ?? 'n/a'}]`
          : ''
      const happened = m.occurred_at ?? m.created_at
      const unitId = customerUnitIdForMemory(m) ?? '(none)'
      const line = `- id=${m.id} customer_unit_id=${unitId} contact_id=${m.contact_id ?? '(none)'} source_identity_id=${m.customer_source_identity_id ?? '(none)'} status=${m.customer_resolution_status ?? 'unknown'} happened=${happened} learned=${m.asserted_at ?? m.created_at}${emoTag}\n  ${m.content}`
      if (usedChars + line.length > AVATAR_SYNTHESIS_PROMPT_BUDGET_CHARS) break
      memoryLines.push(line)
      usedChars += line.length
    }
    const memoriesBlock = memoryLines.length ? memoryLines.join('\n\n') : '(no memories)'

    return [
      '/customer-avatar-synthesis',
      '',
      'Run a synthesis pass on this customer brain. Read the inputs and emit the JSON decision described in your skill markdown. The worker validates ids, member-count thresholds, axis-id validity, and the 3-per-offer cap before writing.',
      '',
      '## BRAIN',
      `brain_id: ${input.brainId}`,
      `org: ${input.orgName ?? '(unset)'}`,
      `offers:\n${offersBlock}`,
      '',
      '## DISCRIMINATOR_AXES',
      axesBlock,
      '',
      '## EXISTING_AVATARS',
      existingAvatarsBlock,
      '',
      '## PERSPECTIVES',
      perspectivesBlock,
      '',
      '## BELIEFS',
      beliefsBlock,
      '',
      '## CONTACTS',
      contactsBlock,
      '',
      '## CUSTOMER_UNITS',
      customerUnitsBlock,
      '',
      '## MEMORIES_SAMPLE',
      memoriesBlock,
    ].join('\n')
  }

  private parseAvatarDecision(content: string, expectedBrainId: string): AvatarDecision | null {
    if (!content) return null
    const fenceMatch =
      content.match(/```json\s*([\s\S]*?)```/i) ?? content.match(/```\s*([\s\S]*?)```/)
    const jsonText = fenceMatch ? fenceMatch[1] : content
    let parsed: unknown
    try {
      parsed = JSON.parse(jsonText.trim())
    } catch {
      return null
    }
    if (!parsed || typeof parsed !== 'object') return null
    const obj = parsed as Record<string, unknown>

    const brainId = String(obj.brain_id ?? '').trim()
    if (brainId !== expectedBrainId) {
      this.logger.warn(
        `brain_avatar_synthesis: brain_id mismatch — expected ${expectedBrainId} got ${brainId}`,
      )
    }

    const newAvatars = Array.isArray(obj.new_avatars)
      ? obj.new_avatars
          .map((a) => this.normalizeNewAvatar(a))
          .filter((a): a is NewAvatarDraft => !!a)
      : []
    const avatarUpdates = Array.isArray(obj.avatar_updates)
      ? obj.avatar_updates
          .map((a) => this.normalizeAvatarUpdate(a))
          .filter((a): a is AvatarUpdateDraft => !!a)
      : []
    const proposedAxes = Array.isArray(obj.proposed_axes)
      ? obj.proposed_axes
          .map((a) => this.normalizeProposedAxis(a))
          .filter((a): a is ProposedAxisDraft => !!a)
      : []

    const logEvent =
      obj.log_event && typeof obj.log_event === 'object'
        ? { summary: String((obj.log_event as { summary?: string }).summary ?? '').trim() }
        : null

    return {
      brain_id: expectedBrainId,
      new_avatars: newAvatars,
      avatar_updates: avatarUpdates,
      proposed_axes: proposedAxes,
      log_event: logEvent,
    }
  }

  private normalizeNewAvatar(raw: unknown): NewAvatarDraft | null {
    if (!raw || typeof raw !== 'object') return null
    const r = raw as Record<string, unknown>
    if (!String(r.name ?? '').trim()) return null

    const memberCustomerUnits = Array.isArray(r.member_customer_unit_ids)
      ? r.member_customer_unit_ids.map((m) => String(m ?? '').trim()).filter(Boolean)
      : []
    const members = Array.isArray(r.member_contact_ids)
      ? r.member_contact_ids.map((m) => String(m ?? '').trim()).filter(Boolean)
      : []

    const memberStrengthRaw = r.member_strength
    const memberStrength: Record<string, number> = {}
    if (memberStrengthRaw && typeof memberStrengthRaw === 'object') {
      for (const [k, v] of Object.entries(memberStrengthRaw as Record<string, unknown>)) {
        if (typeof v === 'number' && Number.isFinite(v)) {
          memberStrength[k] = Math.max(0, Math.min(1, v))
        }
      }
    }

    const discriminatorProfile: Record<string, number> = {}
    if (r.discriminator_profile && typeof r.discriminator_profile === 'object') {
      for (const [k, v] of Object.entries(r.discriminator_profile as Record<string, unknown>)) {
        if (typeof v === 'number' && Number.isFinite(v)) {
          discriminatorProfile[k] = Math.max(0, Math.min(10, Math.round(v)))
        }
      }
    }

    const needsProfile: Record<string, { score: number; rank: string | null }> = {}
    if (r.needs_profile && typeof r.needs_profile === 'object') {
      for (const [k, v] of Object.entries(r.needs_profile as Record<string, unknown>)) {
        if (!VALID_NEEDS_KEYS.has(k)) continue
        if (!v || typeof v !== 'object') continue
        const vObj = v as { score?: unknown; rank?: unknown }
        const score =
          typeof vObj.score === 'number' ? Math.max(0, Math.min(10, Math.round(vObj.score))) : 0
        const rankRaw = typeof vObj.rank === 'string' ? vObj.rank.trim() : ''
        const rank = VALID_NEEDS_RANKS.has(rankRaw) ? rankRaw : null
        needsProfile[k] = { score, rank }
      }
    }

    const evidenceDistRaw = r.evidence_distribution
    let evidenceDist: Record<string, number> | null = null
    if (evidenceDistRaw && typeof evidenceDistRaw === 'object') {
      const result: Record<string, number> = {}
      let any = false
      for (const k of ['stated', 'revealed', 'behavioral'] as const) {
        const v = (evidenceDistRaw as Record<string, unknown>)[k]
        if (typeof v === 'number' && Number.isFinite(v)) {
          result[k] = Math.max(0, Math.min(1, v))
          any = true
        }
      }
      if (any) evidenceDist = result
    }

    const lineage =
      r.lineage && typeof r.lineage === 'object' ? (r.lineage as Record<string, unknown>) : null
    const contrastProfile: Record<string, string> | null = (() => {
      if (!r.contrast_profile || typeof r.contrast_profile !== 'object') return null
      const result: Record<string, string> = {}
      for (const [k, v] of Object.entries(r.contrast_profile as Record<string, unknown>)) {
        if (typeof v === 'string' && v.trim()) result[k] = v.trim()
      }
      return Object.keys(result).length > 0 ? result : null
    })()

    return {
      name: String(r.name).trim(),
      summary: String(r.summary ?? '').trim(),
      narrative_md: String(r.narrative_md ?? '').trim(),
      status: ['emerging', 'active'].includes(String(r.status ?? '').trim())
        ? String(r.status).trim()
        : 'emerging',
      strength: typeof r.strength === 'number' ? Math.max(0, Math.min(1, r.strength)) : 0.5,
      confidence: typeof r.confidence === 'number' ? Math.max(0, Math.min(1, r.confidence)) : 0.5,
      member_customer_unit_ids: memberCustomerUnits,
      member_contact_ids: members,
      member_strength: memberStrength,
      dominant_perspective_ids: Array.isArray(r.dominant_perspective_ids)
        ? r.dominant_perspective_ids.map((p) => String(p ?? '').trim()).filter(Boolean)
        : [],
      dominant_belief_ids: Array.isArray(r.dominant_belief_ids)
        ? r.dominant_belief_ids.map((b) => String(b ?? '').trim()).filter(Boolean)
        : [],
      dominant_pain_points: Array.isArray(r.dominant_pain_points)
        ? r.dominant_pain_points.map((p) => String(p ?? '').trim()).filter(Boolean)
        : [],
      emotional_signature:
        r.emotional_signature && typeof r.emotional_signature === 'object'
          ? (r.emotional_signature as Record<string, unknown>)
          : null,
      blind_spots:
        typeof r.blind_spots === 'string' && r.blind_spots.trim().length > 0
          ? r.blind_spots.trim()
          : null,
      discriminator_profile: discriminatorProfile,
      needs_profile: Object.keys(needsProfile).length > 0 ? needsProfile : null,
      evidence_distribution: evidenceDist,
      lineage,
      contrast_profile: contrastProfile,
      discriminator_questions: Array.isArray(r.discriminator_questions)
        ? r.discriminator_questions.map((q) => String(q ?? '').trim()).filter(Boolean)
        : [],
      offer_ids: Array.isArray(r.offer_ids)
        ? r.offer_ids.map((o) => String(o ?? '').trim()).filter(Boolean)
        : [],
      declared_avatar_id:
        typeof r.declared_avatar_id === 'string' && r.declared_avatar_id.trim().length > 0
          ? r.declared_avatar_id.trim()
          : null,
    }
  }

  private normalizeAvatarUpdate(raw: unknown): AvatarUpdateDraft | null {
    if (!raw || typeof raw !== 'object') return null
    const r = raw as Record<string, unknown>
    const id = String(r.id ?? '').trim()
    const op = String(r.op ?? '').trim()
    if (!id || !VALID_AVATAR_OPS.has(op)) return null
    return {
      id,
      op,
      patch: r.patch && typeof r.patch === 'object' ? (r.patch as Record<string, unknown>) : {},
      merged_with: Array.isArray(r.merged_with)
        ? r.merged_with.map((m) => String(m ?? '').trim()).filter(Boolean)
        : [],
      rationale: String(r.rationale ?? '').trim(),
    }
  }

  private normalizeProposedAxis(raw: unknown): ProposedAxisDraft | null {
    if (!raw || typeof raw !== 'object') return null
    const r = raw as Record<string, unknown>
    const id = String(r.id ?? '').trim()
    const name = String(r.name ?? '').trim()
    if (!id || !name) return null
    return {
      id,
      name,
      description: String(r.description ?? '').trim(),
      high_end_signature: String(r.high_end_signature ?? '').trim(),
      low_end_signature: String(r.low_end_signature ?? '').trim(),
    }
  }

  private async applyAvatarDecision(
    supabase: SupabaseClient,
    input: {
      decision: AvatarDecision
      brainId: string
      orgId: string | null
      existingAvatars: ExistingAvatarRow[]
      validContactIds: Set<string>
      validCustomerUnitIds: Set<string>
      customerEntityIds: Set<string>
      contactIdByUnitId: Map<string, string>
      validPerspectiveIds: Set<string>
      validBeliefIds: Set<string>
      validAxisIds: Set<string>
    },
  ): Promise<{ newAvatars: number; avatarUpdates: number; proposedAxes: number }> {
    let newAvatars = 0
    let avatarUpdates = 0
    let proposedAxes = 0
    const existingById = new Map(input.existingAvatars.map((a) => [a.id, a]))
    const unitIdByContactId = new Map(
      Array.from(input.contactIdByUnitId.entries()).map(([unitId, contactId]) => [
        contactId,
        unitId,
      ]),
    )

    // 1. Apply avatar updates first so the cap check below operates on a consistent active set.
    for (const update of input.decision.avatar_updates) {
      const existing = existingById.get(update.id)
      if (!existing) continue
      try {
        if (update.op === 'archive' || update.op === 'split') {
          await supabase
            .from('customer_avatars')
            .update({ status: 'transformed' })
            .eq('id', update.id)
          avatarUpdates++
        } else if (update.op === 'merge') {
          await supabase
            .from('customer_avatars')
            .update({ status: 'transformed' })
            .eq('id', update.id)
          for (const otherId of update.merged_with) {
            await supabase
              .from('customer_avatars')
              .update({ status: 'transformed' })
              .eq('id', otherId)
          }
          avatarUpdates++
        } else if (update.op === 'update' || update.op === 'shift') {
          const patch: Record<string, unknown> = {}
          const p = update.patch
          if (typeof p.name === 'string' && p.name.trim()) patch.name = (p.name as string).trim()
          if (typeof p.narrative_md === 'string' && (p.narrative_md as string).trim()) {
            patch.narrative_md = (p.narrative_md as string).trim()
          }
          if (p.discriminator_profile && typeof p.discriminator_profile === 'object') {
            const cleaned: Record<string, number> = {}
            for (const [k, v] of Object.entries(
              p.discriminator_profile as Record<string, unknown>,
            )) {
              if (input.validAxisIds.has(k) && typeof v === 'number' && Number.isFinite(v)) {
                cleaned[k] = Math.max(0, Math.min(10, Math.round(v)))
              }
            }
            if (Object.keys(cleaned).length > 0) patch.discriminator_profile = cleaned
          }
          const patchUnits = Array.isArray(p.member_customer_unit_ids)
            ? (p.member_customer_unit_ids as unknown[])
                .map((m) => String(m ?? '').trim())
                .filter((m) => m && input.validCustomerUnitIds.has(m))
            : []
          const patchContacts = Array.isArray(p.member_contact_ids)
            ? (p.member_contact_ids as unknown[])
                .map((m) => String(m ?? '').trim())
                .filter((m) => m && input.validContactIds.has(m))
            : []
          const projectedUnits =
            patchUnits.length > 0
              ? patchUnits
              : patchContacts.map((contactId) => unitIdByContactId.get(contactId) ?? contactId)
          const filteredUnits = Array.from(
            new Set(projectedUnits.filter((m) => input.validCustomerUnitIds.has(m))),
          )
          if (filteredUnits.length >= AVATAR_MIN_DISTINCT_MEMBERS) {
            patch.member_customer_unit_ids = filteredUnits
            patch.member_contact_ids = Array.from(
              new Set(
                [
                  ...patchContacts,
                  ...filteredUnits.map((unitId) => input.contactIdByUnitId.get(unitId)),
                ].filter(
                  (contactId): contactId is string =>
                    !!contactId && input.validContactIds.has(contactId),
                ),
              ),
            )
          }
          if (
            typeof p.status === 'string' &&
            ['emerging', 'active', 'shifting', 'transformed'].includes(p.status as string)
          ) {
            patch.status = p.status
          } else if (update.op === 'shift') {
            patch.status = 'shifting'
          }
          if (p.contrast_profile && typeof p.contrast_profile === 'object') {
            patch.contrast_profile = p.contrast_profile
          }
          if (Array.isArray(p.discriminator_questions)) {
            patch.discriminator_questions = (p.discriminator_questions as unknown[])
              .map((q) => String(q ?? '').trim())
              .filter(Boolean)
          }
          if (Object.keys(patch).length > 0) {
            patch.updated_at = new Date().toISOString()
            await supabase.from('customer_avatars').update(patch).eq('id', update.id)
            avatarUpdates++
          }
        }
      } catch (err) {
        this.logger.warn(
          `brain_avatar_synthesis: avatar update failed for ${update.id}: ${(err as Error).message}`,
        )
      }
    }

    // 2. Insert new avatars (validate threshold + axis ids + 3-per-offer cap).
    // Build a per-offer count of currently-active avatars (after the updates above).
    const activeByOffer = new Map<string, number>()
    for (const a of input.existingAvatars) {
      if (a.status === 'transformed') continue
      for (const o of a.offer_ids ?? []) {
        activeByOffer.set(o, (activeByOffer.get(o) ?? 0) + 1)
      }
    }

    for (const draft of input.decision.new_avatars) {
      const memberUnitCandidates =
        draft.member_customer_unit_ids.length > 0
          ? draft.member_customer_unit_ids
          : draft.member_contact_ids.map(
              (contactId) => unitIdByContactId.get(contactId) ?? contactId,
            )
      const distinctCustomerUnits = Array.from(
        new Set(memberUnitCandidates.filter((unitId) => input.validCustomerUnitIds.has(unitId))),
      )
      if (distinctCustomerUnits.length < AVATAR_MIN_DISTINCT_MEMBERS) continue
      const distinctContactMembers = Array.from(
        new Set(
          [
            ...draft.member_contact_ids,
            ...distinctCustomerUnits.map((unitId) => input.contactIdByUnitId.get(unitId)),
          ].filter(
            (contactId): contactId is string => !!contactId && input.validContactIds.has(contactId),
          ),
        ),
      )

      // Cap: don't exceed 3 active avatars per offer. If this avatar's offer_ids put any offer
      // over the cap, drop it — Atlas should have emitted a merge/archive in the same pass.
      const wouldExceedCap = (draft.offer_ids ?? []).some(
        (o) => (activeByOffer.get(o) ?? 0) >= AVATAR_MAX_PER_OFFER,
      )
      if (wouldExceedCap) {
        this.logger.warn(
          `brain_avatar_synthesis: skipping new avatar "${draft.name}" — would exceed 3-per-offer cap`,
        )
        continue
      }

      const cleanedDiscriminatorProfile: Record<string, number> = {}
      for (const [k, v] of Object.entries(draft.discriminator_profile)) {
        if (input.validAxisIds.has(k)) cleanedDiscriminatorProfile[k] = v
      }

      const cleanedPerspectives = draft.dominant_perspective_ids.filter((p) =>
        input.validPerspectiveIds.has(p),
      )
      const cleanedBeliefs = draft.dominant_belief_ids.filter((b) => input.validBeliefIds.has(b))

      const { data, error } = await supabase
        .from('customer_avatars')
        .insert({
          brain_id: input.brainId,
          name: draft.name,
          summary: draft.summary,
          narrative_md: draft.narrative_md,
          status: draft.status,
          strength: draft.strength,
          confidence: draft.confidence,
          member_customer_unit_ids: distinctCustomerUnits,
          member_contact_ids: distinctContactMembers,
          member_strength: draft.member_strength,
          dominant_perspective_ids: cleanedPerspectives,
          dominant_belief_ids: cleanedBeliefs,
          dominant_pain_points: draft.dominant_pain_points,
          emotional_signature: draft.emotional_signature ?? {},
          blind_spots: draft.blind_spots,
          discriminator_profile: cleanedDiscriminatorProfile,
          needs_profile: draft.needs_profile ?? {},
          evidence_distribution: draft.evidence_distribution ?? null,
          lineage: draft.lineage ?? null,
          contrast_profile: draft.contrast_profile ?? null,
          discriminator_questions: draft.discriminator_questions,
          offer_ids: draft.offer_ids,
          declared_avatar_id: draft.declared_avatar_id,
        })
        .select('id')
        .single()
      if (error) {
        this.logger.warn(
          `brain_avatar_synthesis: failed to insert avatar "${draft.name}": ${error.message}`,
        )
        continue
      }
      const avatarId = (data as { id?: string } | null)?.id ?? null
      if (avatarId) {
        await this.replaceCustomerAvatarMemberships(supabase, {
          avatarId,
          brainId: input.brainId,
          customerUnitIds: distinctCustomerUnits,
          contactIdByUnitId: input.contactIdByUnitId,
          customerEntityIds: input.customerEntityIds,
          memberStrength: draft.member_strength,
        })
      }
      newAvatars++
      for (const o of draft.offer_ids ?? []) {
        activeByOffer.set(o, (activeByOffer.get(o) ?? 0) + 1)
      }
    }

    // 3. Register proposed axes (status='proposed', org-scoped).
    for (const axis of input.decision.proposed_axes) {
      // First-time insertion or recurrence increment.
      const { data: existingAxis } = await supabase
        .from('avatar_discriminator_axes')
        .select('id, recurrence_count, status')
        .eq('id', axis.id)
        .eq('org_id', input.orgId ?? '00000000-0000-0000-0000-000000000000')
        .maybeSingle()
      // The org_id filter when null must match NULL literals via .is(); the dummy uuid above
      // would never match, so re-issue when no orgId is set (canonical proposals not allowed
      // — only orgs propose).
      if (!input.orgId) {
        this.logger.warn(
          `brain_avatar_synthesis: skipping proposed axis "${axis.id}" — no org_id (canonical proposals must come through engineering)`,
        )
        continue
      }
      if (existingAxis) {
        const next = ((existingAxis as { recurrence_count?: number }).recurrence_count ?? 0) + 1
        const promote = next >= 3 && (existingAxis as { status?: string }).status !== 'active'
        await supabase
          .from('avatar_discriminator_axes')
          .update({
            recurrence_count: next,
            status: promote
              ? 'active'
              : ((existingAxis as { status?: string }).status ?? 'proposed'),
            last_seen_at: new Date().toISOString(),
          })
          .eq('id', axis.id)
          .eq('org_id', input.orgId)
        proposedAxes++
        continue
      }
      const { error } = await supabase.from('avatar_discriminator_axes').insert({
        id: axis.id,
        name: axis.name,
        description: axis.description,
        high_end_signature: axis.high_end_signature,
        low_end_signature: axis.low_end_signature,
        scope: 'org-specific',
        org_id: input.orgId,
        status: 'proposed',
        recurrence_count: 1,
        first_seen_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
      })
      if (error) {
        this.logger.warn(
          `brain_avatar_synthesis: failed to insert proposed axis "${axis.id}": ${error.message}`,
        )
        continue
      }
      proposedAxes++
    }

    return { newAvatars, avatarUpdates, proposedAxes }
  }

  private async replaceCustomerAvatarMemberships(
    supabase: SupabaseClient,
    input: {
      avatarId: string
      brainId: string
      customerUnitIds: string[]
      contactIdByUnitId: Map<string, string>
      customerEntityIds: Set<string>
      memberStrength: Record<string, number>
    },
  ): Promise<void> {
    const rows = input.customerUnitIds.map((unitId) => {
      const contactId = input.contactIdByUnitId.get(unitId) ?? null
      const strengthValue =
        input.memberStrength[unitId] ?? (contactId ? input.memberStrength[contactId] : undefined)
      return {
        avatar_id: input.avatarId,
        brain_id: input.brainId,
        member_key: unitId,
        member_kind: input.customerEntityIds.has(unitId)
          ? 'customer_entity'
          : contactId
            ? 'contact'
            : 'source_identity',
        customer_entity_id: input.customerEntityIds.has(unitId) ? unitId : null,
        contact_id: contactId,
        customer_source_identity_id:
          !input.customerEntityIds.has(unitId) && !contactId ? unitId : null,
        strength:
          typeof strengthValue === 'number' && Number.isFinite(strengthValue)
            ? Math.max(0, Math.min(1, strengthValue))
            : 0.7,
        metadata: {
          source: 'customer_avatar_synthesis',
        },
        last_seen_at: new Date().toISOString(),
      }
    })
    if (rows.length === 0) return
    const { error } = await supabase
      .from('customer_avatar_memberships')
      .upsert(rows, { onConflict: 'avatar_id,member_key' })
    if (error) {
      this.logger.warn(
        `brain_avatar_synthesis: failed to upsert avatar memberships for ${input.avatarId}: ${error.message}`,
      )
    }
  }

  private async touchAvatarSynthesisTimestamp(brainId: string): Promise<void> {
    try {
      await this.databaseService
        .getClient()
        .from('ns_brains')
        .update({
          last_avatar_synthesis_at: new Date().toISOString(),
          customer_memories_since_last_avatar_pass: 0,
        })
        .eq('id', brainId)
    } catch (err) {
      this.logger.warn(`Failed to update avatar synthesis timestamp: ${(err as Error).message}`)
    }
  }

  private summarizeCustomerMemoryActions(toolSteps: MissionTraceToolStep[]): {
    customerMemoriesWritten: number
    failedCustomerMemoryCalls: number
    memoryIds: string[]
    errors: string[]
  } {
    let customerMemoriesWritten = 0
    let failedCustomerMemoryCalls = 0
    const memoryIds: string[] = []
    const errors: string[] = []

    for (const step of toolSteps) {
      const action =
        step.action ??
        (step.args && typeof step.args.action === 'string' ? (step.args.action as string) : null)
      if (action !== SAVE_CUSTOMER_MEMORY_ACTION) continue

      const result =
        step.result && typeof step.result === 'object' && !Array.isArray(step.result)
          ? (step.result as Record<string, unknown>)
          : null
      const resultFailed = result?.success === false
      if (step.isError === true || resultFailed) {
        failedCustomerMemoryCalls++
        errors.push(String(step.error ?? result?.error ?? 'unknown save_customer_memory failure'))
        continue
      }

      customerMemoriesWritten++
      if (typeof result?.memory_id === 'string') memoryIds.push(result.memory_id)
    }

    return { customerMemoriesWritten, failedCustomerMemoryCalls, memoryIds, errors }
  }

  // ── Customer Interaction Routing (channel-agnostic) ─────────────────────
  // Consumes interaction envelopes (telegram/widget chats today, fathom after
  // the adapter migration). Two cost paths: a single customer/source needs no
  // judgment — one Gemini extraction call writes the memories directly; any
  // ambiguity (multiple/unknown participants) goes through the full Atlas
  // routing run with the same save_customer_memory action contract.
  private async processCustomerInteractionRoute(
    job: Job<BrainOpsJobData>,
  ): Promise<BrainOpsJobResult> {
    const { brainId, userId, orgId, payload } = job.data
    const envelope = parseInteractionEnvelope(payload?.envelope)
    if (!envelope) {
      throw new Error('customer_interaction_route: invalid envelope payload')
    }

    const transcript = envelope.content.text.trim()
    if (!transcript) {
      await this.markOutboxDone(job.data.outboxId)
      return {
        brainId,
        success: true,
        eventType: 'customer_interaction_route',
        processedAt: new Date().toISOString(),
        output: { skipped: 'no_transcript', source_id: envelope.source_id },
      }
    }

    const supabase = this.databaseService.getClient()
    const customers = envelope.participants.filter((participant) => participant.role === 'customer')
    const soleCustomer = customers.length === 1 ? customers[0] : null

    let memoriesWritten = 0
    let memoryIds: string[] = []
    let path: 'extraction' | 'atlas'

    if (soleCustomer) {
      path = 'extraction'
      const emailIdentifier = soleCustomer.identifiers.find(
        (candidate) => candidate.kind === 'email',
      )
      const nonEmailIdentifier = soleCustomer.identifiers.find(
        (candidate) => candidate.kind !== 'email' && candidate.value.trim(),
      )
      const contact = emailIdentifier
        ? await this.resolveOrCreateContactByIdentifier(supabase, {
            userId,
            orgId: orgId ?? null,
            kind: 'email',
            value: emailIdentifier.value,
            email: emailIdentifier.value,
            name: soleCustomer.name,
            channel: envelope.channel,
          })
        : nonEmailIdentifier
          ? await this.resolveExistingContactByIdentifier(supabase, {
              orgId: orgId ?? null,
              kind: nonEmailIdentifier.kind,
              value: nonEmailIdentifier.value,
            })
          : null

      const result = await this.customerInteractionExtraction.extractAndSave(supabase, {
        envelope,
        brainId,
        userId,
        orgId: orgId ?? null,
        contactId: contact?.id ?? null,
      })
      if (result.status === 'error') {
        throw new Error(`customer_interaction_route: extraction failed: ${result.reason}`)
      }
      memoriesWritten = result.memories_created
      memoryIds = result.memory_ids
    } else {
      path = 'atlas'
      const bundle = await this.buildInteractionRoutingBundle(supabase, {
        userId,
        orgId: orgId ?? null,
        envelope,
      })

      const fakeMission = {
        id: job.data.outboxId,
        user_id: userId,
        org_id: orgId ?? null,
        campaign_id: null,
        correlation_id: job.data.outboxId,
        title: 'Customer Interaction Routing',
        brief: 'Judge interaction participants and route slices to the right brains',
        priority: 'low',
        assigned_agent_key: 'atlas',
        current_agent_key: 'atlas',
        input: {},
      }

      const taskUserMessage = this.buildRoutingPrompt(
        bundle,
        brainId,
        envelope.source_id,
        envelope.channel,
      )
      const result = await this.openclawGateway.callOpenClawRaw(
        fakeMission,
        'atlas',
        '',
        taskUserMessage,
        undefined,
        'mission_execute',
        { channel: 'brain-ops', targetBrainId: brainId },
      )

      const actionOutcome = this.summarizeCustomerMemoryActions(
        (result.toolSteps as MissionTraceToolStep[] | undefined) ?? [],
      )
      if (actionOutcome.failedCustomerMemoryCalls > 0) {
        throw new Error(
          `customer_interaction_route: save_customer_memory action failed: ${actionOutcome.errors.join('; ')}`,
        )
      }
      memoriesWritten = actionOutcome.customerMemoriesWritten
      memoryIds = actionOutcome.memoryIds
    }

    if (memoriesWritten > 0) {
      await this.bumpCustomerMemoryCounterAndMaybeEnqueue(
        brainId,
        userId,
        orgId ?? null,
        memoriesWritten,
      )
    }

    await this.markOutboxDone(job.data.outboxId)

    this.logger.log(
      `customer_interaction_route: brain=${brainId.slice(0, 8)} channel=${envelope.channel} ` +
        `source=${envelope.source_id} path=${path} customer_memories=${memoriesWritten}`,
    )

    return {
      brainId,
      success: true,
      eventType: 'customer_interaction_route',
      processedAt: new Date().toISOString(),
      output: {
        source_id: envelope.source_id,
        channel: envelope.channel,
        path,
        customer_memories_written: memoriesWritten,
        memory_ids: memoryIds,
      },
    }
  }

  // Envelope-driven sibling of buildRoutingInputBundle: same bundle shape so
  // buildRoutingPrompt and the Atlas skill contract stay unchanged, but every
  // input comes from the envelope instead of a raw channel payload.
  private async buildInteractionRoutingBundle(
    supabase: SupabaseClient,
    input: {
      userId: string
      orgId: string | null
      envelope: InteractionEnvelopeV1
    },
  ): Promise<{
    hostName: string
    hostEmail: string | null
    hostAliases: string[]
    offers: Array<{ name: string; price: string | null }>
    existingContacts: ExistingContactRow[]
    routedContacts: PreparedRoutingContact[]
    sourceIdentities: PreparedRoutingSourceIdentity[]
    recentUserBrainContext: string
    attendees: RoutingAttendee[]
    transcript: string
    meetingTitle: string
    meetingStartedAt: string | null
  }> {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email, fathom_aliases')
      .eq('id', input.userId)
      .maybeSingle()

    const teamParticipant = input.envelope.participants.find(
      (participant) => participant.role === 'team',
    )
    const hostName =
      (typeof profile?.full_name === 'string' && profile.full_name.trim()) ||
      teamParticipant?.name?.trim() ||
      'Host'
    const hostEmail = (profile?.email ?? null) as string | null
    const hostAliases = Array.isArray(profile?.fathom_aliases)
      ? (profile?.fathom_aliases as string[]).map((alias) => alias.toLowerCase())
      : []
    if (hostEmail && !hostAliases.includes(hostEmail.toLowerCase())) {
      hostAliases.push(hostEmail.toLowerCase())
    }
    for (const participant of input.envelope.participants) {
      if (participant.role !== 'team') continue
      for (const identifier of participant.identifiers) {
        if (identifier.kind === 'email' && !hostAliases.includes(identifier.value.toLowerCase())) {
          hostAliases.push(identifier.value.toLowerCase())
        }
      }
    }

    const attendees: RoutingAttendee[] = input.envelope.participants
      .filter((participant) => participant.role !== 'team')
      .flatMap((participant) =>
        participant.identifiers
          .filter((identifier) => identifier.kind === 'email')
          .map((identifier) => ({
            email: identifier.value.toLowerCase(),
            name: participant.name,
          })),
      )
      .filter((attendee) => !hostAliases.includes(attendee.email))

    const attendeeEmails = [...new Set(attendees.map((attendee) => attendee.email))]
    const sourceIdentityMap = new Map<string, PreparedRoutingSourceIdentity>()
    for (const participant of input.envelope.participants) {
      if (participant.role === 'team') continue
      const sourceIdentity = sourceIdentityForInteractionParticipant(
        input.envelope.channel,
        input.envelope.source_id,
        participant,
      )
      if (
        sourceIdentity.identity_kind === 'email' &&
        hostAliases.includes(sourceIdentity.source_id.toLowerCase())
      ) {
        continue
      }
      const key = `${sourceIdentity.source_type}:${sourceIdentity.source_id}`
      if (!sourceIdentityMap.has(key)) sourceIdentityMap.set(key, sourceIdentity)
    }
    const sourceIdentities = [...sourceIdentityMap.values()]

    let existingContacts: ExistingContactRow[] = []
    const routedContacts: PreparedRoutingContact[] = []
    if (attendeeEmails.length > 0) {
      let q = supabase
        .from('contacts')
        .select(
          'id, email, first_name, last_name, contact_type, contact_type_source, contact_type_confidence, business_name',
        )
        .eq('user_id', input.userId)
        .in('email', attendeeEmails)
      if (input.orgId === null) q = q.is('org_id', null)
      else q = q.eq('org_id', input.orgId)
      const { data } = await q
      existingContacts = (data ?? []) as ExistingContactRow[]

      for (const attendee of attendees) {
        const contact = await this.resolveOrCreateContactByIdentifier(supabase, {
          userId: input.userId,
          orgId: input.orgId,
          kind: 'email',
          value: attendee.email,
          email: attendee.email,
          name: attendee.name,
          channel: input.envelope.channel,
        })
        routedContacts.push({
          contact_id: contact.id,
          email: attendee.email,
          name: attendee.name,
          existing_contact_type: contact.contact_type ?? 'unknown',
          existing_contact_type_source: contact.contact_type_source ?? 'unset',
          existing_contact_type_confidence: contact.contact_type_confidence ?? null,
          business_name: contact.business_name ?? null,
        })
      }
    }

    let offers: Array<{ name: string; price: string | null }> = []
    {
      let q = supabase.from('offers').select('name, price').eq('user_id', input.userId).limit(20)
      if (input.orgId === null) q = q.is('org_id', null)
      else q = q.eq('org_id', input.orgId)
      const { data } = await q
      offers = (data ?? []) as Array<{ name: string; price: string | null }>
    }

    const recentUserBrainContext = await this.buildRecentUserBrainContext(supabase, input.userId)

    return {
      hostName,
      hostEmail,
      hostAliases,
      offers,
      existingContacts,
      routedContacts,
      sourceIdentities,
      recentUserBrainContext,
      attendees,
      transcript: input.envelope.content.text,
      meetingTitle: input.envelope.title,
      meetingStartedAt: input.envelope.window.from || null,
    }
  }

  private async buildRecentUserBrainContext(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<string> {
    const { data } = await supabase
      .from('ns_brains')
      .select('id')
      .eq('owner_id', userId)
      .eq('scope', 'user')
      .eq('is_default', true)
      .maybeSingle()
    const userBrainId = (data as { id?: string } | null)?.id
    if (!userBrainId) return '(no user brain context available)'

    const { data: capsule } = await supabase
      .from('ns_narrative_pages')
      .select('summary, content_md')
      .eq('brain_id', userBrainId)
      .eq('page_type', 'capsule')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (capsule?.summary || capsule?.content_md) {
      const summary = String(capsule.summary ?? '').slice(0, 800)
      const body = String(capsule.content_md ?? '').slice(0, 1600)
      return [summary, body].filter(Boolean).join('\n\n')
    }
    return '(no capsule yet)'
  }

  private buildRoutingPrompt(
    bundle: {
      hostName: string
      hostEmail: string | null
      hostAliases: string[]
      offers: Array<{ name: string; price: string | null }>
      existingContacts: ExistingContactRow[]
      routedContacts: PreparedRoutingContact[]
      sourceIdentities: PreparedRoutingSourceIdentity[]
      recentUserBrainContext: string
      attendees: RoutingAttendee[]
      transcript: string
      meetingTitle: string
      meetingStartedAt: string | null
    },
    brainId: string,
    meetingId: string,
    channel: InteractionChannel = 'fathom',
  ): string {
    const channelLabel =
      channel === 'telegram'
        ? 'Telegram conversation'
        : channel === 'widget'
          ? 'website chat conversation'
          : 'Fathom call'
    const sourceTypeForChannel =
      channel === 'telegram'
        ? 'telegram_chat'
        : channel === 'widget'
          ? 'widget_chat'
          : 'fathom_call'
    const offersBlock = bundle.offers.length
      ? bundle.offers.map((o) => `- ${o.name}${o.price ? ` (${o.price})` : ''}`).join('\n')
      : '(no declared offers)'

    const contactsBlock = bundle.existingContacts.length
      ? bundle.existingContacts
          .map((c) => {
            const fullName = [c.first_name, c.last_name].filter(Boolean).join(' ').trim()
            const business = c.business_name ? ` @ ${c.business_name}` : ''
            const role = c.contact_type ?? 'unknown'
            const source = c.contact_type_source ?? 'unset'
            const confidence =
              typeof c.contact_type_confidence === 'number'
                ? c.contact_type_confidence.toFixed(2)
                : 'n/a'
            return `- ${c.email ?? '(no email)'} — ${fullName}${business} — contact_type=${role}, role_source=${source}, role_confidence=${confidence}`
          })
          .join('\n')
      : '(no matching existing contacts)'

    const attendeesBlock = bundle.attendees.length
      ? bundle.attendees.map((a) => `- ${a.email}${a.name ? ` — ${a.name}` : ''}`).join('\n')
      : '(no attendees in payload)'

    const routedContactsBlock = bundle.routedContacts.length
      ? bundle.routedContacts
          .map(
            (c) =>
              `- contact_id=${c.contact_id} email=${c.email}${c.name ? ` name="${c.name}"` : ''} ` +
              `type=${c.existing_contact_type} source=${c.existing_contact_type_source} ` +
              `confidence=${c.existing_contact_type_confidence ?? 'n/a'} ` +
              `business=${c.business_name ?? '(unset)'}`,
          )
          .join('\n')
      : '(no non-host attendees with email identity)'
    const sourceIdentitiesBlock = bundle.sourceIdentities.length
      ? bundle.sourceIdentities
          .map(
            (identity) =>
              `- source_type=${identity.source_type} source_id=${identity.source_id} ` +
              `identity_kind=${identity.identity_kind} role=${identity.role} ` +
              `name=${identity.name ?? '(unset)'}`,
          )
          .join('\n')
      : '(no participant source identities; use the interaction Source ID only for source-level memories)'

    return [
      '/customer-call-routing',
      '',
      `You are routing a ${channelLabel} into Customer Brain using backend actions.`,
      '',
      'Do not return a routing JSON object. Customer Brain writes must happen only by calling the save_customer_memory backend action.',
      '',
      'Call save_customer_memory only for non-host attendees whose relationship is customer, lead, or team_of_customer with confidence >= 0.75.',
      'Do not call save_customer_memory for cofounder, team_member, vendor, investor, peer, friend, family, or unknown.',
      'For internal/team-only calls, make no save_customer_memory calls. The worker treats zero Customer Brain writes as a valid completed route.',
      'Use contact_id only when it appears in ALLOWED_CUSTOMER_CONTACTS. Do not invent contact IDs.',
      'If a real customer/lead has no allowed contact_id, omit contact_id and include a durable source anchor from ALLOWED_CUSTOMER_SOURCE_IDENTITIES or the interaction Source ID.',
      'Do not invent source identity values.',
      'Use only the Customer Brain id shown in CUSTOMER_BRAIN. Do not invent or substitute brain IDs.',
      '',
      'Required action payload shape:',
      JSON.stringify(
        {
          action: SAVE_CUSTOMER_MEMORY_ACTION,
          data: {
            brain_id: brainId,
            contact_id: '<optional contact_id from ALLOWED_CUSTOMER_CONTACTS>',
            source_identity:
              '<optional source_id from ALLOWED_CUSTOMER_SOURCE_IDENTITIES when contact_id is absent>',
            content: '<2-4 paragraph customer memory grounded in this interaction>',
            memory_type: 'insight',
            source_type: sourceTypeForChannel,
            source_id: meetingId,
            source_title: bundle.meetingTitle,
            significance: 0.6,
            tags: [channel, 'customer_interaction_routing'],
            speaker: '<attendee name or email>',
            metadata: {
              source_id: meetingId,
              source_identity_kind: '<identity kind or null>',
              source_identity_value: '<identity value or null>',
              attendee_email: '<attendee email>',
              attendee_name: '<attendee name or null>',
              routing_confidence: 0.85,
              routing_rationale: '<short reason>',
            },
          },
        },
        null,
        2,
      ),
      '',
      '## CUSTOMER_BRAIN',
      `brain_id: ${brainId}`,
      '',
      `## HOST`,
      `Name: ${bundle.hostName}`,
      `Email: ${bundle.hostEmail ?? '(unknown)'}`,
      `Known aliases: ${bundle.hostAliases.length ? bundle.hostAliases.join(', ') : '(none)'}`,
      '',
      `## OFFERS`,
      offersBlock,
      '',
      `## EXISTING_CONTACTS`,
      contactsBlock,
      '',
      `## ALLOWED_CUSTOMER_CONTACTS`,
      routedContactsBlock,
      '',
      `## ALLOWED_CUSTOMER_SOURCE_IDENTITIES`,
      sourceIdentitiesBlock,
      '',
      `## RECENT_USER_BRAIN_CONTEXT`,
      bundle.recentUserBrainContext,
      '',
      `## INTERACTION`,
      `Source ID: ${meetingId}`,
      `Title: ${bundle.meetingTitle}`,
      `Started at: ${bundle.meetingStartedAt ?? '(unknown)'}`,
      `Participants:`,
      attendeesBlock,
      '',
      'Transcript:',
      bundle.transcript,
    ].join('\n')
  }

  // Channel-agnostic contact identity resolution: any contact_identifiers kind
  // (email, telegram_chat_id, ...) resolves to the same contact row. Creation
  // keeps contact_type='unknown' so reclassification stays the user's single
  // click correction primitive; the originating channel is preserved in
  // contact_source_detail per the contacts source-channel normalization.
  private async resolveExistingContactByIdentifier(
    supabase: SupabaseClient,
    input: {
      orgId: string | null
      kind: string
      value: string
    },
  ): Promise<(ExistingContactRow & { contact_type: string }) | null> {
    const value = input.kind === 'email' ? input.value.trim().toLowerCase() : input.value.trim()
    if (!value) return null

    const { data: identifier } = await supabase
      .from('contact_identifiers')
      .select('contact_id')
      .eq('kind', input.kind)
      .eq('value', value)
      .maybeSingle()
    if (!identifier?.contact_id) return null

    let q = supabase
      .from('contacts')
      .select(
        'id, email, first_name, last_name, contact_type, contact_type_source, contact_type_confidence, business_name',
      )
      .eq('id', identifier.contact_id)
    q = input.orgId === null ? q.is('org_id', null) : q.eq('org_id', input.orgId)
    const { data: contact } = await q.maybeSingle()
    if (!contact) return null
    return {
      ...(contact as ExistingContactRow),
      contact_type: (contact as ExistingContactRow).contact_type ?? 'unknown',
    }
  }

  private async resolveOrCreateContactByIdentifier(
    supabase: SupabaseClient,
    input: {
      userId: string
      orgId: string | null
      kind: string
      value: string
      email?: string | null
      name?: string | null
      channel: string
    },
  ): Promise<ExistingContactRow & { contact_type: string }> {
    const value = input.kind === 'email' ? input.value.trim().toLowerCase() : input.value.trim()
    const email = input.email?.trim().toLowerCase() || (input.kind === 'email' ? value : null)
    const identifierSource = `${input.channel}_routing`

    // Identifier lookup (preferred — single source of truth).
    const { data: identifier } = await supabase
      .from('contact_identifiers')
      .select('contact_id')
      .eq('kind', input.kind)
      .eq('value', value)
      .maybeSingle()

    if (identifier?.contact_id) {
      let q = supabase
        .from('contacts')
        .select(
          'id, email, first_name, last_name, contact_type, contact_type_source, contact_type_confidence, business_name',
        )
        .eq('id', identifier.contact_id)
      if (input.orgId === null) q = q.is('org_id', null)
      else q = q.eq('org_id', input.orgId)
      const { data: contact } = await q.maybeSingle()
      if (contact) {
        return {
          ...(contact as ExistingContactRow),
          contact_type: (contact as ExistingContactRow).contact_type ?? 'unknown',
        }
      }
    }

    // Email column lookup (legacy contacts that have no contact_identifiers row yet).
    if (email) {
      let emailQuery = supabase
        .from('contacts')
        .select(
          'id, email, first_name, last_name, contact_type, contact_type_source, contact_type_confidence, business_name',
        )
        .eq('user_id', input.userId)
        .eq('email', email)
      if (input.orgId === null) emailQuery = emailQuery.is('org_id', null)
      else emailQuery = emailQuery.eq('org_id', input.orgId)
      const { data: byEmail } = await emailQuery.maybeSingle()
      if (byEmail) {
        // Backfill the identifier row so subsequent calls hit the fast path.
        await supabase.from('contact_identifiers').upsert(
          {
            contact_id: (byEmail as { id: string }).id,
            kind: input.kind,
            value,
            confidence: 1,
            source: identifierSource,
            last_seen_at: new Date().toISOString(),
          },
          { onConflict: 'kind,value' },
        )
        return {
          ...(byEmail as ExistingContactRow),
          contact_type: (byEmail as ExistingContactRow).contact_type ?? 'unknown',
        }
      }
    }

    // Create a fresh contact with contact_type='unknown' so reclassification is the user's
    // single click correction primitive.
    const { firstName, lastName } = splitName(input.name ?? null)
    const { data: created, error: createErr } = await supabase
      .from('contacts')
      .insert({
        user_id: input.userId,
        org_id: input.orgId,
        email,
        first_name: firstName,
        last_name: lastName,
        source: 'import',
        contact_source: 'integration',
        contact_source_detail: input.channel,
        contact_type: 'unknown',
        contact_type_source: 'integration',
        contact_type_confidence: 0.2,
        contact_type_set_at: new Date().toISOString(),
        tags: [],
      })
      .select(
        'id, email, first_name, last_name, contact_type, contact_type_source, contact_type_confidence, business_name',
      )
      .single()
    if (createErr || !created) {
      throw new Error(`createContact failed: ${createErr?.message ?? 'no row returned'}`)
    }
    await supabase.from('contact_identifiers').upsert(
      {
        contact_id: (created as { id: string }).id,
        kind: input.kind,
        value,
        confidence: 1,
        source: identifierSource,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'kind,value' },
    )
    return {
      ...(created as ExistingContactRow),
      contact_type: (created as ExistingContactRow).contact_type ?? 'unknown',
    }
  }

  private async getBrainScope(brainId: string): Promise<string | null> {
    try {
      const { data } = await this.databaseService
        .getClient()
        .from('ns_brains')
        .select('scope')
        .eq('id', brainId)
        .maybeSingle()
      return (data as { scope?: string } | null)?.scope ?? null
    } catch {
      return null
    }
  }

  // ── Customer Brain Pattern Analysis ─────────────────────────────────────
  private async processCustomerBrainPatternAnalysis(
    job: Job<BrainOpsJobData>,
  ): Promise<BrainOpsJobResult> {
    const { brainId, userId, orgId } = job.data
    const supabase = this.databaseService.getClient()

    // Pull what's new since the last analysis pass. First-pass safety: fall back
    // to a recent window so we don't try to load every memory the brain has.
    const { data: brainRow } = await supabase
      .from('ns_brains')
      .select('id, scope, last_pattern_analysis_at')
      .eq('id', brainId)
      .maybeSingle()
    const sinceIso =
      (brainRow as { last_pattern_analysis_at?: string | null } | null)?.last_pattern_analysis_at ??
      new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

    const memories = await this.loadCustomerBrainMemoriesSince(supabase, brainId, sinceIso)
    const distinctCustomerUnitIds = new Set(
      memories.map(customerUnitIdForMemory).filter((id): id is string => !!id),
    )

    if (
      memories.length === 0 ||
      distinctCustomerUnitIds.size < CUSTOMER_BELIEF_MIN_DISTINCT_UNITS
    ) {
      this.logger.log(
        `customer pattern-analysis: brain=${brainId.slice(0, 8)} skipping — ` +
          `memories=${memories.length} distinct_customer_units=${distinctCustomerUnitIds.size} ` +
          `(need ${CUSTOMER_BELIEF_MIN_DISTINCT_UNITS}+ customer units to form a belief)`,
      )
      await this.markOutboxDone(job.data.outboxId)
      await this.touchPatternAnalysisTimestamp(brainId)
      return {
        brainId,
        success: true,
        eventType: 'brain_pattern_analysis',
        processedAt: new Date().toISOString(),
        output: {
          skipped: 'insufficient_signal',
          memories: memories.length,
          distinct_customer_units: distinctCustomerUnitIds.size,
        },
      }
    }

    const [existingBeliefs, existingPerspectives, axes, brainContext] = await Promise.all([
      this.loadExistingBeliefs(supabase, brainId),
      this.loadExistingPerspectives(supabase, brainId),
      this.loadDiscriminatorAxes(supabase, orgId ?? null),
      this.loadCustomerBrainContext(supabase, brainId, userId, orgId ?? null),
    ])

    const taskUserMessage = this.buildCustomerPatternPrompt({
      brainId,
      orgName: brainContext.orgName,
      offers: brainContext.offers,
      axes,
      existingBeliefs,
      existingPerspectives,
      memories,
    })

    const fakeMission = {
      id: job.data.outboxId,
      user_id: userId,
      org_id: orgId ?? null,
      campaign_id: null,
      correlation_id: job.data.outboxId,
      title: 'Customer Brain Pattern Analysis',
      brief: 'Detect cross-customer beliefs and perspectives from customer brain memories',
      priority: 'low',
      assigned_agent_key: 'atlas',
      current_agent_key: 'atlas',
      input: {},
    }

    const result = await this.openclawGateway.callOpenClawRaw(
      fakeMission,
      'atlas',
      '',
      taskUserMessage,
      'auto',
      'mission_execute',
      { channel: 'brain-ops', maxOutputTokens: 8_192, toolChoice: 'none' },
    )

    const firstDecision = this.parsePatternAnalysisDecision(String(result.content ?? ''), brainId)
    if (!firstDecision) {
      throw new Error('customer pattern-analysis: Atlas response did not parse to decision JSON')
    }

    let decision = firstDecision
    let targetedMemories: CustomerMemoryRow[] = []
    let escalatedToOpus = false
    if (this.shouldEscalatePatternDecision(firstDecision)) {
      const targetedMemoryIds = this.collectTargetedPatternMemoryIds({
        decision: firstDecision,
        existingBeliefs,
        existingPerspectives,
        currentMemoryIds: new Set(memories.map((memory) => memory.id)),
      })
      targetedMemories = await this.loadCustomerBrainMemoriesByIds(
        supabase,
        brainId,
        targetedMemoryIds,
      )
      const reviewPrompt = this.buildCustomerPatternReviewPrompt({
        initialPrompt: taskUserMessage,
        initialDecision: firstDecision,
        targetedMemories,
      })
      const reviewResult = await this.openclawGateway.callOpenClawRaw(
        fakeMission,
        'atlas',
        '',
        reviewPrompt,
        BRAIN_HIGH_STAKES_MODEL_ID,
        'mission_execute',
        {
          channel: 'brain-ops',
          maxOutputTokens: 8_192,
          toolChoice: 'none',
          modelSettings: BRAIN_HIGH_STAKES_MODEL_SETTINGS,
        },
      )
      const reviewedDecision = this.parsePatternAnalysisDecision(
        String(reviewResult.content ?? ''),
        brainId,
      )
      if (!reviewedDecision) {
        throw new Error('customer pattern-analysis: Opus review did not parse to decision JSON')
      }
      if (reviewedDecision.evidence_requests.length > 0) {
        throw new Error(
          'customer pattern-analysis: Opus review still requires unresolved older evidence',
        )
      }
      decision = reviewedDecision
      escalatedToOpus = true
    }

    const decisionMemories = [...memories, ...targetedMemories].filter(
      (memory, index, all) => all.findIndex((candidate) => candidate.id === memory.id) === index,
    )
    const writeOutcome = await this.applyPatternAnalysisDecision(supabase, {
      decision,
      brainId,
      existingBeliefs,
      existingPerspectives,
      memories: decisionMemories,
      validMemoryIds: new Set(decisionMemories.map((m) => m.id)),
      validCustomerUnitIds: this.validCustomerUnitIdsForMemories(decisionMemories),
    })

    await this.touchPatternAnalysisTimestamp(brainId)
    await this.markOutboxDone(job.data.outboxId)

    this.logger.log(
      `customer pattern-analysis: brain=${brainId.slice(0, 8)} ` +
        `memories=${memories.length} distinct_customer_units=${distinctCustomerUnitIds.size} ` +
        `new_beliefs=${writeOutcome.newBeliefs} belief_updates=${writeOutcome.beliefUpdates} ` +
        `new_perspectives=${writeOutcome.newPerspectives} perspective_updates=${writeOutcome.perspectiveUpdates}`,
    )

    return {
      brainId,
      success: true,
      eventType: 'brain_pattern_analysis',
      processedAt: new Date().toISOString(),
      output: {
        memories: memories.length,
        distinct_customer_units: distinctCustomerUnitIds.size,
        targeted_older_memories: targetedMemories.length,
        escalated_to_opus: escalatedToOpus,
        ...writeOutcome,
      },
    }
  }

  private async loadCustomerBrainMemoriesSince(
    supabase: SupabaseClient,
    brainId: string,
    sinceIso: string,
  ): Promise<CustomerMemoryRow[]> {
    const { data } = await supabase
      .from('ns_memories')
      .select(
        'id, content, contact_id, customer_entity_id, customer_source_identity_id, customer_resolution_status, source_type, source_title, emotional_valence, emotional_intensity, created_at, occurred_at, occurred_until, asserted_at',
      )
      .eq('brain_id', brainId)
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: true })
      .limit(CUSTOMER_PATTERN_MEMORY_LIMIT)
    return ((data ?? []) as CustomerMemoryRow[]).filter((m) => !!customerUnitIdForMemory(m))
  }

  private async loadCustomerBrainMemoriesByIds(
    supabase: SupabaseClient,
    brainId: string,
    memoryIds: string[],
  ): Promise<CustomerMemoryRow[]> {
    if (memoryIds.length === 0) return []
    const { data } = await supabase
      .from('ns_memories')
      .select(
        'id, content, contact_id, customer_entity_id, customer_source_identity_id, customer_resolution_status, source_type, source_title, emotional_valence, emotional_intensity, created_at, occurred_at, occurred_until, asserted_at',
      )
      .eq('brain_id', brainId)
      .in('id', memoryIds.slice(0, CUSTOMER_PATTERN_TARGETED_MEMORY_LIMIT))
    return ((data ?? []) as CustomerMemoryRow[]).filter(
      (memory) => !!customerUnitIdForMemory(memory),
    )
  }

  private validCustomerUnitIdsForMemories(memories: CustomerMemoryRow[]): Set<string> {
    const ids = new Set<string>()
    for (const memory of memories) {
      const unitId = customerUnitIdForMemory(memory)
      if (unitId) ids.add(unitId)
      if (memory.contact_id) ids.add(memory.contact_id)
      if (memory.customer_source_identity_id) ids.add(memory.customer_source_identity_id)
    }
    return ids
  }

  private async loadExistingBeliefs(
    supabase: SupabaseClient,
    brainId: string,
  ): Promise<ExistingBeliefRow[]> {
    const { data } = await supabase
      .from('ns_belief_patterns')
      .select(
        'id, pattern_name, description, status, strength, evidence_type, reinforcement_count, last_reinforced_at, supporting_memories',
      )
      .eq('brain_id', brainId)
      .in('status', ['emerging', 'active', 'challenged'])
      .order('strength', { ascending: false })
      .limit(200)
    return (data ?? []) as ExistingBeliefRow[]
  }

  private async loadExistingPerspectives(
    supabase: SupabaseClient,
    brainId: string,
  ): Promise<ExistingPerspectiveRow[]> {
    const { data } = await supabase
      .from('ns_perspectives')
      .select('id, name, description, status, strength, beliefs')
      .eq('brain_id', brainId)
      .in('status', ['emerging', 'active'])
      .order('strength', { ascending: false })
      .limit(50)
    return (data ?? []) as ExistingPerspectiveRow[]
  }

  private async loadDiscriminatorAxes(
    supabase: SupabaseClient,
    orgId: string | null,
  ): Promise<DiscriminatorAxisRow[]> {
    // Canonical (org_id IS NULL) + org-specific active axes for this org.
    const { data: canonical } = await supabase
      .from('avatar_discriminator_axes')
      .select('id, name, description, scope, status')
      .is('org_id', null)
      .eq('status', 'active')

    let orgAxes: DiscriminatorAxisRow[] = []
    if (orgId) {
      const { data } = await supabase
        .from('avatar_discriminator_axes')
        .select('id, name, description, scope, status')
        .eq('org_id', orgId)
        .eq('status', 'active')
      orgAxes = (data ?? []) as DiscriminatorAxisRow[]
    }
    return [...((canonical ?? []) as DiscriminatorAxisRow[]), ...orgAxes]
  }

  private async loadCustomerBrainContext(
    supabase: SupabaseClient,
    brainId: string,
    userId: string,
    orgId: string | null,
  ): Promise<{ orgName: string | null; offers: Array<{ name: string; price: string | null }> }> {
    let orgName: string | null = null
    if (orgId) {
      const { data } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', orgId)
        .maybeSingle()
      orgName = (data as { name?: string } | null)?.name ?? null
    }

    let q = supabase.from('offers').select('name, price').eq('user_id', userId).limit(20)
    q = orgId === null ? q.is('org_id', null) : q.eq('org_id', orgId)
    const { data: offerRows } = await q
    return {
      orgName,
      offers: (offerRows ?? []) as Array<{ name: string; price: string | null }>,
    }
  }

  private buildCustomerPatternPrompt(input: {
    brainId: string
    orgName: string | null
    offers: Array<{ name: string; price: string | null }>
    axes: DiscriminatorAxisRow[]
    existingBeliefs: ExistingBeliefRow[]
    existingPerspectives: ExistingPerspectiveRow[]
    memories: CustomerMemoryRow[]
  }): string {
    const offersBlock = input.offers.length
      ? input.offers.map((o) => `- ${o.name}${o.price ? ` (${o.price})` : ''}`).join('\n')
      : '(no declared offers)'

    const axesBlock = input.axes.length
      ? input.axes.map((a) => `- ${a.id} (${a.scope}): ${a.name}`).join('\n')
      : '(no axes)'

    const beliefsBlock = input.existingBeliefs.length
      ? input.existingBeliefs
          .map(
            (b) =>
              `- id=${b.id} status=${b.status ?? 'unknown'} strength=${(b.strength ?? 0).toFixed(2)} evidence=${b.evidence_type ?? 'unset'} reinforcements=${b.reinforcement_count ?? 0}\n  name: ${b.pattern_name}\n  desc: ${(b.description ?? '').slice(0, 240)}`,
          )
          .join('\n\n')
      : '(none)'

    const perspectivesBlock = input.existingPerspectives.length
      ? input.existingPerspectives
          .map(
            (p) =>
              `- id=${p.id} status=${p.status ?? 'unknown'} strength=${(p.strength ?? 0).toFixed(2)} beliefs=${(p.beliefs ?? []).length}\n  name: ${p.name}\n  desc: ${(p.description ?? '').slice(0, 240)}`,
          )
          .join('\n\n')
      : '(none)'

    const memoriesBlock = this.buildCustomerPatternMemoryBlock(
      input.memories,
      CUSTOMER_PATTERN_PROMPT_BUDGET_CHARS,
    )

    return [
      '/customer-brain-pattern-analysis',
      '',
      'Run one cross-customer pattern analysis pass on this customer brain. Do not call tools, search, or delegate. Use the compact evidence below first. If an existing belief or perspective cannot be safely challenged, resolved, archived, or rewritten without its older trail, request only targeted older evidence by existing belief or perspective id in evidence_requests. Emit only the JSON decision described in your skill markdown. The worker validates ids and thresholds before writing.',
      '',
      'Required request field:',
      '"evidence_requests": [{"belief_ids": ["existing-belief-id"], "perspective_ids": [], "reason": "why older evidence is required"}]',
      'Use an empty array when the compact packet is sufficient.',
      '',
      '## BRAIN',
      `brain_id: ${input.brainId}`,
      `org: ${input.orgName ?? '(unset)'}`,
      `offers:\n${offersBlock}`,
      '',
      '## DISCRIMINATOR_AXES',
      axesBlock,
      '',
      '## EXISTING_BELIEFS',
      beliefsBlock,
      '',
      '## EXISTING_PERSPECTIVES',
      perspectivesBlock,
      '',
      '## MEMORIES',
      memoriesBlock,
    ].join('\n')
  }

  private buildCustomerPatternMemoryBlock(
    memories: CustomerMemoryRow[],
    budgetChars: number,
  ): string {
    const memoryLines: string[] = []
    let usedChars = 0
    for (const m of memories) {
      const valence = m.emotional_valence ?? null
      const intensity = m.emotional_intensity ?? null
      const emoTag =
        valence !== null || intensity !== null
          ? ` [valence=${valence ?? 'n/a'} intensity=${intensity ?? 'n/a'}]`
          : ''
      const happened = m.occurred_at ?? m.created_at
      const unitId = customerUnitIdForMemory(m) ?? '(none)'
      const line = `- id=${m.id} customer_unit_id=${unitId} contact_id=${m.contact_id ?? '(none)'} source_identity_id=${m.customer_source_identity_id ?? '(none)'} resolution=${m.customer_resolution_status ?? 'unknown'} source=${m.source_type ?? '?'} happened=${happened} learned=${m.asserted_at ?? m.created_at}${emoTag}\n  ${m.content}`
      if (usedChars + line.length > budgetChars) break
      memoryLines.push(line)
      usedChars += line.length
    }
    return memoryLines.length ? memoryLines.join('\n\n') : '(no memories)'
  }

  private buildCustomerPatternReviewPrompt(input: {
    initialPrompt: string
    initialDecision: PatternAnalysisDecision
    targetedMemories: CustomerMemoryRow[]
  }): string {
    const targetedEvidence = this.buildCustomerPatternMemoryBlock(
      input.targetedMemories,
      CUSTOMER_PATTERN_TARGETED_PROMPT_BUDGET_CHARS,
    )
    return [
      input.initialPrompt,
      '',
      '## HIGH-STAKES REVIEW',
      'Review the initial Opus decision below. This pass is required because it requested older evidence or proposes a challenge, resolution, archive, or perspective synthesis. Correct duplicate beliefs, unsupported lifecycle changes, invented specificity, and conclusions that exceed the supplied evidence.',
      'Do not call tools, search, or delegate. Return a complete replacement decision. evidence_requests must be [] in the final decision; if the evidence is still insufficient, remove the unsafe operation instead of guessing.',
      '',
      '## INITIAL_OPUS_DECISION',
      JSON.stringify(input.initialDecision),
      '',
      '## TARGETED_OLDER_EVIDENCE',
      targetedEvidence,
    ].join('\n')
  }

  private shouldEscalatePatternDecision(decision: PatternAnalysisDecision): boolean {
    return (
      decision.evidence_requests.length > 0 ||
      decision.belief_updates.some(
        (update) => update.op === 'challenge' || update.op === 'resolve',
      ) ||
      decision.new_perspectives.length > 0 ||
      decision.perspective_updates.length > 0
    )
  }

  private collectTargetedPatternMemoryIds(input: {
    decision: PatternAnalysisDecision
    existingBeliefs: ExistingBeliefRow[]
    existingPerspectives: ExistingPerspectiveRow[]
    currentMemoryIds: Set<string>
  }): string[] {
    const beliefById = new Map(input.existingBeliefs.map((belief) => [belief.id, belief]))
    const perspectiveById = new Map(
      input.existingPerspectives.map((perspective) => [perspective.id, perspective]),
    )
    const beliefIds = new Set<string>()
    for (const request of input.decision.evidence_requests) {
      request.belief_ids.forEach((id) => beliefIds.add(id))
      for (const perspectiveId of request.perspective_ids) {
        perspectiveById.get(perspectiveId)?.beliefs?.forEach((beliefId) => beliefIds.add(beliefId))
      }
    }
    for (const update of input.decision.belief_updates) {
      if (update.op === 'challenge' || update.op === 'resolve') beliefIds.add(update.id)
    }
    for (const perspective of input.decision.new_perspectives) {
      perspective.belief_ids.forEach((id) => beliefIds.add(id))
    }
    for (const update of input.decision.perspective_updates) {
      perspectiveById.get(update.id)?.beliefs?.forEach((beliefId) => beliefIds.add(beliefId))
    }

    const memoryIds = new Set<string>()
    for (const beliefId of beliefIds) {
      for (const memoryId of beliefById.get(beliefId)?.supporting_memories ?? []) {
        if (!input.currentMemoryIds.has(memoryId)) memoryIds.add(memoryId)
        if (memoryIds.size >= CUSTOMER_PATTERN_TARGETED_MEMORY_LIMIT) return [...memoryIds]
      }
    }
    return [...memoryIds]
  }

  private parsePatternAnalysisDecision(
    content: string,
    expectedBrainId: string,
  ): PatternAnalysisDecision | null {
    if (!content) return null
    const fenceMatch =
      content.match(/```json\s*([\s\S]*?)```/i) ?? content.match(/```\s*([\s\S]*?)```/)
    const jsonText = fenceMatch ? fenceMatch[1] : content
    let parsed: unknown
    try {
      parsed = JSON.parse(jsonText.trim())
    } catch {
      return null
    }
    if (!parsed || typeof parsed !== 'object') return null
    const obj = parsed as Record<string, unknown>
    const evidenceRequests = Array.isArray(obj.evidence_requests)
      ? obj.evidence_requests
          .map((request) => this.normalizePatternEvidenceRequest(request))
          .filter((request): request is PatternEvidenceRequest => !!request)
          .slice(0, 5)
      : []

    const brainId = String(obj.brain_id ?? '').trim()
    if (brainId !== expectedBrainId) {
      this.logger.warn(
        `customer pattern-analysis: brain_id mismatch — expected ${expectedBrainId} got ${brainId}`,
      )
    }

    const newBeliefs = Array.isArray(obj.new_beliefs)
      ? obj.new_beliefs
          .map((b) => this.normalizeNewBelief(b))
          .filter((b): b is NewBeliefDraft => !!b)
      : []
    const beliefUpdates = Array.isArray(obj.belief_updates)
      ? obj.belief_updates
          .map((b) => this.normalizeBeliefUpdate(b))
          .filter((b): b is BeliefUpdateDraft => !!b)
      : []
    const newPerspectives = Array.isArray(obj.new_perspectives)
      ? obj.new_perspectives
          .map((p) => this.normalizeNewPerspective(p))
          .filter((p): p is NewPerspectiveDraft => !!p)
      : []
    const perspectiveUpdates = Array.isArray(obj.perspective_updates)
      ? obj.perspective_updates
          .map((p) => this.normalizePerspectiveUpdate(p))
          .filter((p): p is PerspectiveUpdateDraft => !!p)
      : []

    const logEvent =
      obj.log_event && typeof obj.log_event === 'object'
        ? { summary: String((obj.log_event as { summary?: string }).summary ?? '').trim() }
        : null

    return {
      brain_id: expectedBrainId,
      evidence_requests: evidenceRequests,
      new_beliefs: newBeliefs,
      belief_updates: beliefUpdates,
      new_perspectives: newPerspectives,
      perspective_updates: perspectiveUpdates,
      log_event: logEvent,
    }
  }

  private normalizePatternEvidenceRequest(raw: unknown): PatternEvidenceRequest | null {
    if (!raw || typeof raw !== 'object') return null
    const request = raw as Record<string, unknown>
    const beliefIds = Array.isArray(request.belief_ids)
      ? [...new Set(request.belief_ids.map((id) => String(id ?? '').trim()).filter(Boolean))].slice(
          0,
          10,
        )
      : []
    const perspectiveIds = Array.isArray(request.perspective_ids)
      ? [
          ...new Set(request.perspective_ids.map((id) => String(id ?? '').trim()).filter(Boolean)),
        ].slice(0, 10)
      : []
    const reason = String(request.reason ?? '')
      .trim()
      .slice(0, 500)
    if (!reason || beliefIds.length + perspectiveIds.length === 0) return null
    return { belief_ids: beliefIds, perspective_ids: perspectiveIds, reason }
  }

  private normalizeNewBelief(raw: unknown): NewBeliefDraft | null {
    if (!raw || typeof raw !== 'object') return null
    const r = raw as Record<string, unknown>
    const evidenceType = String(r.evidence_type ?? '').trim()
    if (!VALID_EVIDENCE_TYPES.has(evidenceType)) return null
    const memoryIds = Array.isArray(r.supporting_memory_ids)
      ? r.supporting_memory_ids.map((id) => String(id ?? '').trim()).filter(Boolean)
      : []
    const customerUnitIds = Array.isArray(r.supporting_customer_unit_ids)
      ? r.supporting_customer_unit_ids.map((id) => String(id ?? '').trim()).filter(Boolean)
      : []
    const contactIds = Array.isArray(r.supporting_contact_ids)
      ? r.supporting_contact_ids.map((id) => String(id ?? '').trim()).filter(Boolean)
      : []
    if (!String(r.pattern_name ?? '').trim()) return null
    const axisRaw = r.discriminator_axis === null ? null : String(r.discriminator_axis ?? '').trim()
    const axis = axisRaw && VALID_DISCRIMINATOR_AXES.has(axisRaw) ? axisRaw : null
    return {
      pattern_name: String(r.pattern_name).trim(),
      description: String(r.description ?? '').trim(),
      emotional_signature:
        r.emotional_signature && typeof r.emotional_signature === 'object'
          ? (r.emotional_signature as Record<string, unknown>)
          : null,
      supporting_memory_ids: memoryIds,
      supporting_customer_unit_ids: customerUnitIds,
      supporting_contact_ids: contactIds,
      evidence_type: evidenceType,
      discriminator_axis: axis,
    }
  }

  private normalizeBeliefUpdate(raw: unknown): BeliefUpdateDraft | null {
    if (!raw || typeof raw !== 'object') return null
    const r = raw as Record<string, unknown>
    const id = String(r.id ?? '').trim()
    const op = String(r.op ?? '').trim()
    if (!id || !VALID_BELIEF_OPS.has(op)) return null
    const evidenceType = String(r.evidence_type ?? '').trim()
    return {
      id,
      op,
      supporting_memory_ids: Array.isArray(r.supporting_memory_ids)
        ? r.supporting_memory_ids.map((m) => String(m ?? '').trim()).filter(Boolean)
        : [],
      evidence_type: VALID_EVIDENCE_TYPES.has(evidenceType) ? evidenceType : null,
      rationale: String(r.rationale ?? '').trim(),
    }
  }

  private normalizeNewPerspective(raw: unknown): NewPerspectiveDraft | null {
    if (!raw || typeof raw !== 'object') return null
    const r = raw as Record<string, unknown>
    const beliefIds = Array.isArray(r.belief_ids)
      ? r.belief_ids.map((b) => String(b ?? '').trim()).filter(Boolean)
      : []
    if (!String(r.name ?? '').trim()) return null
    const evidenceDist =
      r.evidence_distribution && typeof r.evidence_distribution === 'object'
        ? this.normalizeEvidenceDistribution(r.evidence_distribution as Record<string, unknown>)
        : null
    return {
      name: String(r.name).trim(),
      description: String(r.description ?? '').trim(),
      narrative_md: String(r.narrative_md ?? '').trim(),
      belief_ids: beliefIds,
      blind_spots:
        typeof r.blind_spots === 'string' && r.blind_spots.trim().length > 0
          ? r.blind_spots.trim()
          : null,
      evidence_distribution: evidenceDist,
    }
  }

  private normalizePerspectiveUpdate(raw: unknown): PerspectiveUpdateDraft | null {
    if (!raw || typeof raw !== 'object') return null
    const r = raw as Record<string, unknown>
    const id = String(r.id ?? '').trim()
    const op = String(r.op ?? '').trim()
    if (!id || !VALID_PERSPECTIVE_OPS.has(op)) return null
    const narrative =
      typeof r.narrative_md === 'string' && r.narrative_md.trim().length > 0
        ? r.narrative_md.trim()
        : null
    return { id, op, rationale: String(r.rationale ?? '').trim(), narrative_md: narrative }
  }

  private normalizeEvidenceDistribution(
    raw: Record<string, unknown>,
  ): Record<string, number> | null {
    const result: Record<string, number> = {}
    let any = false
    for (const k of ['stated', 'revealed', 'behavioral'] as const) {
      const v = raw[k]
      if (typeof v === 'number' && Number.isFinite(v)) {
        result[k] = Math.max(0, Math.min(1, v))
        any = true
      }
    }
    return any ? result : null
  }

  private normalizeBeliefIdentity(value: string | null | undefined): string {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
  }

  private findExistingBeliefForDraft(
    draft: NewBeliefDraft,
    existingBeliefs: ExistingBeliefRow[],
  ): ExistingBeliefRow | null {
    const draftName = this.normalizeBeliefIdentity(draft.pattern_name)
    const draftDescription = this.normalizeBeliefIdentity(draft.description)
    for (const existing of existingBeliefs) {
      const existingName = this.normalizeBeliefIdentity(existing.pattern_name)
      const existingDescription = this.normalizeBeliefIdentity(existing.description)
      if (draftName && existingName && draftName === existingName) return existing
      if (draftDescription && existingDescription && draftDescription === existingDescription) {
        return existing
      }
    }
    return null
  }

  private strongestEvidenceType(
    current: string | null | undefined,
    incoming: string | null | undefined,
  ): string | null {
    const currentType = current && VALID_EVIDENCE_TYPES.has(current) ? current : null
    const incomingType = incoming && VALID_EVIDENCE_TYPES.has(incoming) ? incoming : null
    if (!currentType) return incomingType
    if (!incomingType) return currentType
    return EVIDENCE_TYPE_RANK[incomingType] > EVIDENCE_TYPE_RANK[currentType]
      ? incomingType
      : currentType
  }

  private evidenceWindowForMemories(
    memories: CustomerMemoryRow[],
    memoryIds: string[],
  ): {
    evidence_started_at: string | null
    evidence_ended_at: string | null
    valid_from: string | null
    temporal_source: string
  } {
    const selected = new Set(memoryIds)
    const timestamps = memories
      .filter((memory) => selected.has(memory.id))
      .flatMap((memory) => [
        memory.occurred_at ?? memory.created_at,
        memory.occurred_until ?? memory.occurred_at ?? memory.created_at,
      ])
      .map((value) => Date.parse(value))
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => a - b)
    if (timestamps.length === 0) {
      return {
        evidence_started_at: null,
        evidence_ended_at: null,
        valid_from: null,
        temporal_source: 'supporting_memories',
      }
    }
    return {
      evidence_started_at: new Date(timestamps[0]).toISOString(),
      evidence_ended_at: new Date(timestamps[timestamps.length - 1]).toISOString(),
      valid_from: new Date(timestamps[timestamps.length - 1]).toISOString(),
      temporal_source: 'supporting_memories',
    }
  }

  private async applyPatternAnalysisDecision(
    supabase: SupabaseClient,
    input: {
      decision: PatternAnalysisDecision
      brainId: string
      existingBeliefs: ExistingBeliefRow[]
      existingPerspectives: ExistingPerspectiveRow[]
      memories: CustomerMemoryRow[]
      validMemoryIds: Set<string>
      validCustomerUnitIds: Set<string>
    },
  ): Promise<{
    newBeliefs: number
    beliefUpdates: number
    newPerspectives: number
    perspectiveUpdates: number
  }> {
    let newBeliefs = 0
    let beliefUpdates = 0
    let newPerspectives = 0
    let perspectiveUpdates = 0

    const beliefById = new Map(input.existingBeliefs.map((b) => [b.id, b]))
    const perspectiveById = new Map(input.existingPerspectives.map((p) => [p.id, p]))
    // Track newly-created belief ids in this pass so perspective writes can reference them.
    const newBeliefIdMap = new Map<string, string>() // pattern_name -> uuid

    // 1. Insert new beliefs (validate threshold + memory/contact id validity).
    for (const draft of input.decision.new_beliefs) {
      const supportingCustomerUnitIds = Array.isArray(draft.supporting_customer_unit_ids)
        ? draft.supporting_customer_unit_ids
        : []
      const supportingContactIds = Array.isArray(draft.supporting_contact_ids)
        ? draft.supporting_contact_ids
        : []
      const unitCandidates =
        supportingCustomerUnitIds.length > 0 ? supportingCustomerUnitIds : supportingContactIds
      const distinctCustomerUnits = Array.from(
        new Set(unitCandidates.filter((unitId) => input.validCustomerUnitIds.has(unitId))),
      )
      if (distinctCustomerUnits.length < CUSTOMER_BELIEF_MIN_DISTINCT_UNITS) continue
      const memoryIds = draft.supporting_memory_ids.filter((m) => input.validMemoryIds.has(m))
      if (memoryIds.length === 0) continue

      const initialStrength = Math.min(
        0.55 + 0.05 * Math.max(0, distinctCustomerUnits.length - 3),
        0.85,
      )
      const initialStatus = initialStrength >= 0.6 ? 'active' : 'emerging'
      const existingDuplicate = this.findExistingBeliefForDraft(draft, input.existingBeliefs)
      if (existingDuplicate) {
        const supportingMemories = Array.from(
          new Set([...(existingDuplicate.supporting_memories ?? []), ...memoryIds]),
        )
        const newStrength = Math.min(
          0.99,
          Math.max((existingDuplicate.strength ?? 0.5) + 0.05, initialStrength),
        )
        const newStatus =
          existingDuplicate.status === 'challenged'
            ? 'challenged'
            : newStrength >= 0.6
              ? 'active'
              : (existingDuplicate.status ?? initialStatus)
        const evidenceWindow = this.evidenceWindowForMemories(input.memories, supportingMemories)
        await supabase
          .from('ns_belief_patterns')
          .update({
            supporting_memories: supportingMemories,
            strength: newStrength,
            status: newStatus,
            evidence_type: this.strongestEvidenceType(
              existingDuplicate.evidence_type,
              draft.evidence_type,
            ),
            reinforcement_count: (existingDuplicate.reinforcement_count ?? 0) + 1,
            last_reinforced_at: new Date().toISOString(),
            ...evidenceWindow,
            temporal_status: newStatus === 'resolved' ? 'historical' : 'current',
            temporal_confidence: newStrength,
          })
          .eq('id', existingDuplicate.id)
        newBeliefIdMap.set(draft.pattern_name, existingDuplicate.id)
        beliefUpdates++
        continue
      }
      const evidenceWindow = this.evidenceWindowForMemories(input.memories, memoryIds)

      const { data, error } = await supabase
        .from('ns_belief_patterns')
        .insert({
          brain_id: input.brainId,
          subject_id: input.brainId,
          pattern_name: draft.pattern_name,
          description: draft.description,
          emotional_signature: draft.emotional_signature ?? {},
          supporting_memories: memoryIds,
          strength: initialStrength,
          status: initialStatus,
          evidence_type: draft.evidence_type,
          reinforcement_count: 1,
          last_reinforced_at: new Date().toISOString(),
          detected_at: new Date().toISOString(),
          ...evidenceWindow,
          temporal_status: 'current',
          temporal_confidence: initialStrength,
        })
        .select('id')
        .single()
      if (error || !data) {
        this.logger.warn(
          `customer pattern-analysis: failed to insert belief "${draft.pattern_name}": ${error?.message ?? 'no row'}`,
        )
        continue
      }
      newBeliefIdMap.set(draft.pattern_name, (data as { id: string }).id)
      newBeliefs++
    }

    // 2. Apply belief updates (reinforce / challenge / resolve).
    for (const update of input.decision.belief_updates) {
      const existing = beliefById.get(update.id)
      if (!existing) continue
      try {
        if (update.op === 'reinforce') {
          const supportingMemories = Array.from(
            new Set([
              ...((existing.supporting_memories as string[] | null) ?? []),
              ...update.supporting_memory_ids.filter((m) => input.validMemoryIds.has(m)),
            ]),
          )
          const reinforcements = (existing.reinforcement_count ?? 0) + 1
          const newStrength = Math.min(0.99, (existing.strength ?? 0.5) + 0.05)
          const newStatus =
            existing.status === 'challenged'
              ? 'challenged'
              : newStrength >= 0.6
                ? 'active'
                : (existing.status ?? 'emerging')
          const evidenceWindow = this.evidenceWindowForMemories(input.memories, supportingMemories)
          await supabase
            .from('ns_belief_patterns')
            .update({
              supporting_memories: supportingMemories,
              strength: newStrength,
              status: newStatus,
              evidence_type: this.strongestEvidenceType(
                existing.evidence_type,
                update.evidence_type,
              ),
              reinforcement_count: reinforcements,
              last_reinforced_at: new Date().toISOString(),
              ...evidenceWindow,
              temporal_status: newStatus === 'resolved' ? 'historical' : 'current',
              temporal_confidence: newStrength,
            })
            .eq('id', update.id)
          beliefUpdates++
        } else if (update.op === 'challenge') {
          await supabase
            .from('ns_belief_patterns')
            .update({
              status: 'challenged',
              last_reinforced_at: new Date().toISOString(),
            })
            .eq('id', update.id)
          beliefUpdates++
        } else if (update.op === 'resolve') {
          await supabase
            .from('ns_belief_patterns')
            .update({
              status: 'resolved',
              resolved_at: new Date().toISOString(),
            })
            .eq('id', update.id)
          beliefUpdates++
        }
      } catch (err) {
        this.logger.warn(
          `customer pattern-analysis: belief update failed for ${update.id}: ${(err as Error).message}`,
        )
      }
    }

    // 3. Insert new perspectives — belief_ids may reference rows we just inserted, so
    //    map names to ids when needed before validating.
    const allBeliefIds = new Set<string>([
      ...beliefById.keys(),
      ...Array.from(newBeliefIdMap.values()),
    ])

    for (const draft of input.decision.new_perspectives) {
      const beliefIds = draft.belief_ids
        .map((id) => (allBeliefIds.has(id) ? id : (newBeliefIdMap.get(id) ?? id)))
        .filter((id) => allBeliefIds.has(id))
      if (beliefIds.length < CUSTOMER_PERSPECTIVE_MIN_BELIEFS) continue
      const supportingMemoryIds = input.decision.new_beliefs
        .filter((belief) => beliefIds.includes(newBeliefIdMap.get(belief.pattern_name) ?? ''))
        .flatMap((belief) => belief.supporting_memory_ids)
        .filter((id) => input.validMemoryIds.has(id))
      const evidenceWindow = this.evidenceWindowForMemories(input.memories, supportingMemoryIds)

      const { error } = await supabase.from('ns_perspectives').insert({
        brain_id: input.brainId,
        subject_id: input.brainId,
        name: draft.name,
        description: draft.description,
        narrative_md: draft.narrative_md,
        beliefs: beliefIds,
        blind_spots: draft.blind_spots,
        strength: 0.6,
        status: 'active',
        evidence_distribution: draft.evidence_distribution ?? null,
        detected_at: new Date().toISOString(),
        ...evidenceWindow,
        temporal_status: 'current',
        temporal_confidence: 0.6,
      })
      if (error) {
        this.logger.warn(
          `customer pattern-analysis: failed to insert perspective "${draft.name}": ${error.message}`,
        )
        continue
      }
      newPerspectives++
    }

    // 4. Apply perspective updates.
    for (const update of input.decision.perspective_updates) {
      const existing = perspectiveById.get(update.id)
      if (!existing) continue
      try {
        if (update.op === 'archive') {
          await supabase
            .from('ns_perspectives')
            .update({ status: 'transformed' })
            .eq('id', update.id)
          perspectiveUpdates++
        } else if (update.op === 'update') {
          const patch: Record<string, unknown> = {}
          if (update.narrative_md) patch.narrative_md = update.narrative_md
          if (Object.keys(patch).length > 0) {
            await supabase.from('ns_perspectives').update(patch).eq('id', update.id)
          }
          perspectiveUpdates++
        }
      } catch (err) {
        this.logger.warn(
          `customer pattern-analysis: perspective update failed for ${update.id}: ${(err as Error).message}`,
        )
      }
    }

    return { newBeliefs, beliefUpdates, newPerspectives, perspectiveUpdates }
  }

  private async touchPatternAnalysisTimestamp(brainId: string): Promise<void> {
    try {
      await this.databaseService
        .getClient()
        .from('ns_brains')
        .update({ last_pattern_analysis_at: new Date().toISOString() })
        .eq('id', brainId)
    } catch (err) {
      this.logger.warn(
        `Failed to update brain pattern-analysis timestamp: ${(err as Error).message}`,
      )
    }
  }

  private async processLibrarySync(job: Job<BrainOpsJobData>): Promise<BrainOpsJobResult> {
    const { brainId, userId, orgId, payload } = job.data

    const formattedEntries =
      typeof payload.formatted_entries === 'string' ? payload.formatted_entries : ''
    const entryCount = typeof payload.entry_count === 'number' ? payload.entry_count : 0
    const brainLabel = typeof payload.brain_label === 'string' ? payload.brain_label : 'brain'
    const agentId = typeof payload.agent_id === 'string' ? payload.agent_id : null
    const isAgentBrain = payload.entry_type === 'sk_entry' || Boolean(agentId)

    const agentTargetBlock = isAgentBrain
      ? [
          '',
          '## Target Brain (IMPORTANT)',
          '',
          `This library belongs to an AGENT brain (agent: ${agentId ?? 'unknown'}), not your user brain.`,
          `Every brain action call in this job (get_brain_pages, create_brain_page, patch_brain_page, log_brain_event) MUST include brain_type="agent" and brain_id="${brainId}".`,
          'Do NOT use brain_type=user_default in this job — that would write the pages into the wrong brain.',
        ]
      : []

    const taskUserMessage = [
      LIBRARY_SYNC_PROMPT,
      ...agentTargetBlock,
      '',
      `## New Entries (${entryCount} items from ${brainLabel})`,
      '',
      `brain_id: ${brainId}`,
      '',
      formattedEntries,
    ].join('\n')

    const fakeMission = {
      id: job.data.outboxId,
      user_id: userId,
      org_id: orgId ?? null,
      campaign_id: null,
      correlation_id: job.data.outboxId,
      title: 'Brain Library Sync',
      brief: `Organize entries from ${brainLabel}`,
      priority: 'low',
      assigned_agent_key: 'atlas',
      current_agent_key: 'atlas',
      input: {},
    }

    const result = await this.openclawGateway.callOpenClawRaw(
      fakeMission,
      'atlas',
      '',
      taskUserMessage,
      undefined,
      'mission_execute',
      { channel: 'brain-ops' },
    )

    await this.updateBrainSyncTimestamp(
      brainId,
      typeof payload.batch_max_created_at === 'string' ? payload.batch_max_created_at : null,
    )
    await this.markOutboxDone(job.data.outboxId)
    await this.incrementPagesUpdatedCounter(brainId, userId, orgId ?? null)
    await this.incrementSinceLastLintCounter(brainId, userId, orgId ?? null)

    this.logger.log(
      `Brain library sync completed for ${brainLabel} (brain ${brainId.slice(0, 8)}): ${
        typeof result.content === 'string' ? result.content.slice(0, 100) : 'ok'
      }`,
    )

    return {
      brainId,
      success: true,
      eventType: 'brain_library_sync',
      processedAt: new Date().toISOString(),
      output: { content_preview: String(result.content ?? '').slice(0, 200) },
    }
  }

  private async processPatternAnalysis(
    job: Job<BrainOpsJobData>,
    scope?: string | null,
  ): Promise<BrainOpsJobResult> {
    const { brainId, userId, orgId } = job.data

    const taskUserMessage =
      scope === 'agent'
        ? [
            PATTERN_ANALYSIS_PROMPT,
            '',
            '## Target Brain (IMPORTANT)',
            '',
            `This is an AGENT brain (brain_id: ${brainId}) — the worldview you are synthesizing belongs to the agent, not the user.`,
            `Every brain action call in this job (get_brain_pages, get_brain_belief_patterns, get_brain_perspectives, create_brain_belief_pattern, update_brain_belief_pattern, archive_brain_belief_pattern, create_brain_perspective, update_brain_perspective, log_brain_event) MUST include brain_type="agent" and brain_id="${brainId}".`,
            'Ignore the brain_type=user_default references in the workflow above for this job — that would read and write the wrong brain.',
          ].join('\n')
        : PATTERN_ANALYSIS_PROMPT

    const fakeMission = {
      id: job.data.outboxId,
      user_id: userId,
      org_id: orgId ?? null,
      campaign_id: null,
      correlation_id: job.data.outboxId,
      title: 'Brain Pattern Analysis',
      brief: 'Detect belief patterns and synthesize perspectives from organized pages',
      priority: 'low',
      assigned_agent_key: 'atlas',
      current_agent_key: 'atlas',
      input: {},
    }

    const result = await this.openclawGateway.callOpenClawRaw(
      fakeMission,
      'atlas',
      '',
      taskUserMessage,
      'auto',
      'mission_execute',
      { channel: 'brain-ops', modelSettings: BRAIN_HIGH_STAKES_MODEL_SETTINGS },
    )

    await this.updateBrainAnalysisTimestamp(brainId)
    await this.markOutboxDone(job.data.outboxId)

    this.logger.log(
      `Brain pattern analysis completed (brain ${brainId.slice(0, 8)}): ${
        typeof result.content === 'string' ? result.content.slice(0, 100) : 'ok'
      }`,
    )

    return {
      brainId,
      success: true,
      eventType: 'brain_pattern_analysis',
      processedAt: new Date().toISOString(),
      output: { content_preview: String(result.content ?? '').slice(0, 200) },
    }
  }

  private async processTimelineSynthesis(
    job: Job<BrainOpsJobData>,
    scope?: string | null,
  ): Promise<BrainOpsJobResult> {
    const { brainId, userId, orgId } = job.data
    const brainType =
      scope === 'agent' || scope === 'customer' || scope === 'company' ? scope : 'user'

    const taskUserMessage = [
      TIMELINE_SYNTHESIS_PROMPT,
      '',
      '## Target Brain',
      `brain_type: ${brainType}`,
      `brain_id: ${brainId}`,
      '',
      'Every timeline action call in this job MUST include that brain_type and brain_id.',
      'Focus on the strongest recent cognitive changes. If no timeline-worthy change exists, do not write anything.',
    ].join('\n')

    const fakeMission = {
      id: job.data.outboxId,
      user_id: userId,
      org_id: orgId ?? null,
      campaign_id: null,
      correlation_id: job.data.outboxId,
      title: 'Brain Timeline Synthesis',
      brief: 'Update Cortex Max temporal timelines from recent cognition changes',
      priority: 'low',
      assigned_agent_key: 'atlas',
      current_agent_key: 'atlas',
      input: {},
    }

    const result = await this.openclawGateway.callOpenClawRaw(
      fakeMission,
      'atlas',
      '',
      taskUserMessage,
      undefined,
      'mission_execute',
      { channel: 'brain-ops' },
    )

    await this.markOutboxDone(job.data.outboxId)

    this.logger.log(
      `Brain timeline synthesis completed (brain ${brainId.slice(0, 8)}): ${
        typeof result.content === 'string' ? result.content.slice(0, 100) : 'ok'
      }`,
    )

    return {
      brainId,
      success: true,
      eventType: 'brain_timeline_synthesis',
      processedAt: new Date().toISOString(),
      output: { content_preview: String(result.content ?? '').slice(0, 200) },
    }
  }

  private async processLint(job: Job<BrainOpsJobData>): Promise<BrainOpsJobResult> {
    const { brainId, userId, orgId } = job.data

    const fakeMission = {
      id: job.data.outboxId,
      user_id: userId,
      org_id: orgId ?? null,
      campaign_id: null,
      correlation_id: job.data.outboxId,
      title: 'Brain Library Lint',
      brief: 'Holistic health check of the brain library',
      priority: 'low',
      assigned_agent_key: 'atlas',
      current_agent_key: 'atlas',
      input: {},
    }

    const result = await this.openclawGateway.callOpenClawRaw(
      fakeMission,
      'atlas',
      '',
      LINT_PROMPT,
      undefined,
      'mission_execute',
      { channel: 'brain-ops' },
    )

    await this.updateBrainLintTimestamp(brainId)
    await this.markOutboxDone(job.data.outboxId)

    this.logger.log(
      `Brain lint completed (brain ${brainId.slice(0, 8)}): ${
        typeof result.content === 'string' ? result.content.slice(0, 100) : 'ok'
      }`,
    )

    return {
      brainId,
      success: true,
      eventType: 'brain_lint',
      processedAt: new Date().toISOString(),
      output: { content_preview: String(result.content ?? '').slice(0, 200) },
    }
  }

  private async incrementPagesUpdatedCounter(
    brainId: string,
    userId: string,
    orgId: string | null,
  ) {
    try {
      const client = this.databaseService.getClient()
      const { data: newCount, error: rpcErr } = await client.rpc('increment_brain_counter', {
        p_brain_id: brainId,
        p_field: 'pages_updated_since_last_analysis',
        p_amount: 1,
      })

      if (rpcErr) {
        this.logger.warn(`Pages counter increment failed: ${rpcErr.message}`)
        return
      }

      if ((newCount ?? 0) < 5) return

      if (!(await this.isCortexMaxEnabled(brainId))) return

      await client
        .from('ns_brains')
        .update({ pages_updated_since_last_analysis: 0 })
        .eq('id', brainId)

      const { error: insertErr } = await client.from('brain_ops_outbox').insert({
        brain_id: brainId,
        user_id: userId,
        org_id: orgId,
        event_type: 'brain_pattern_analysis',
        dedupe_key: `brain-pattern-analysis-${brainId}-${Date.now()}`,
        payload: {},
      })

      if (insertErr) {
        this.logger.warn(`Failed to enqueue pattern analysis: ${insertErr.message}`)
        return
      }

      this.logger.log(
        `Brain ops outbox: brain_pattern_analysis enqueued for brain ${brainId.slice(0, 8)}`,
      )
    } catch (err) {
      this.logger.warn(`Pages updated counter failed: ${(err as Error).message}`)
    }
  }

  private async bumpCustomerMemoryCounterAndMaybeEnqueue(
    brainId: string,
    userId: string,
    orgId: string | null,
    delta: number,
  ): Promise<void> {
    // Two thresholds reading the same counter:
    //   10+ memories  -> pattern analysis (cheap; finds cross-customer beliefs/perspectives)
    //   25+ memories  -> avatar synthesis (expensive; clusters perspectives into avatars)
    // Pattern analysis at 10 doesn't reset the counter — only avatar synthesis does — so
    // a brain that crosses 25 always gets a fresh pattern-analysis pass too (the synthesis
    // skill assumes recent cognition is fresh).
    const PATTERN_THRESHOLD = 10
    const AVATAR_THRESHOLD = 25
    try {
      const client = this.databaseService.getClient()
      const { data: row } = await client
        .from('ns_brains')
        .select('customer_memories_since_last_avatar_pass, last_pattern_analysis_at')
        .eq('id', brainId)
        .maybeSingle()
      const current =
        (row as { customer_memories_since_last_avatar_pass?: number } | null)
          ?.customer_memories_since_last_avatar_pass ?? 0
      const lastPatternAt =
        (row as { last_pattern_analysis_at?: string | null } | null)?.last_pattern_analysis_at ??
        null
      const next = current + delta

      const { error: updateErr } = await client
        .from('ns_brains')
        .update({ customer_memories_since_last_avatar_pass: next })
        .eq('id', brainId)
      if (updateErr) {
        this.logger.warn(`customer memory counter increment failed: ${updateErr.message}`)
        return
      }

      if (!(await this.isCortexMaxEnabled(brainId))) return

      // Pattern analysis trigger — fires when memory count hits the threshold AND no
      // analysis has run in the last hour (debounce against bursts of writes).
      const oneHourAgo = Date.now() - 60 * 60 * 1000
      const recentPatternPass = lastPatternAt && new Date(lastPatternAt).getTime() > oneHourAgo
      if (next >= PATTERN_THRESHOLD && !recentPatternPass) {
        const { error: patternErr } = await client.from('brain_ops_outbox').insert({
          brain_id: brainId,
          user_id: userId,
          org_id: orgId,
          event_type: 'brain_pattern_analysis',
          dedupe_key: `customer-pattern-analysis-${brainId}-${Date.now()}`,
          payload: {},
        })
        if (patternErr) {
          this.logger.warn(`Failed to enqueue customer pattern analysis: ${patternErr.message}`)
        } else {
          this.logger.log(
            `Brain ops outbox: brain_pattern_analysis enqueued for customer brain ${brainId.slice(0, 8)} (counter=${next})`,
          )
        }
      }

      // Avatar synthesis trigger — fires when counter hits 25+. The processor itself resets
      // the counter to 0 when the synthesis pass succeeds (touchAvatarSynthesisTimestamp).
      if (next >= AVATAR_THRESHOLD) {
        const { error: avatarErr } = await client.from('brain_ops_outbox').insert({
          brain_id: brainId,
          user_id: userId,
          org_id: orgId,
          event_type: 'brain_avatar_synthesis',
          dedupe_key: `customer-avatar-synthesis-${brainId}-${Date.now()}`,
          payload: {},
        })
        if (avatarErr) {
          this.logger.warn(`Failed to enqueue customer avatar synthesis: ${avatarErr.message}`)
        } else {
          this.logger.log(
            `Brain ops outbox: brain_avatar_synthesis enqueued for customer brain ${brainId.slice(0, 8)} (counter=${next})`,
          )
        }
      }
    } catch (err) {
      this.logger.warn(`Customer memory counter wiring failed: ${(err as Error).message}`)
    }
  }

  private async incrementSinceLastLintCounter(
    brainId: string,
    userId: string,
    orgId: string | null,
  ) {
    try {
      const client = this.databaseService.getClient()
      const { data: newCount, error: rpcErr } = await client.rpc('increment_brain_counter', {
        p_brain_id: brainId,
        p_field: 'syncs_since_last_lint',
        p_amount: 1,
      })

      if (rpcErr) {
        this.logger.warn(`Lint counter increment failed: ${rpcErr.message}`)
        return
      }

      if ((newCount ?? 0) < 10) return

      if (!(await this.isCortexMaxEnabled(brainId))) return

      await client.from('ns_brains').update({ syncs_since_last_lint: 0 }).eq('id', brainId)

      const { error: insertErr } = await client.from('brain_ops_outbox').insert({
        brain_id: brainId,
        user_id: userId,
        org_id: orgId,
        event_type: 'brain_lint',
        dedupe_key: `brain-lint-${brainId}-${Date.now()}`,
        payload: {},
      })

      if (insertErr) {
        this.logger.warn(`Failed to enqueue brain lint: ${insertErr.message}`)
        return
      }

      this.logger.log(`Brain ops outbox: brain_lint enqueued for brain ${brainId.slice(0, 8)}`)
    } catch (err) {
      this.logger.warn(`Lint counter failed: ${(err as Error).message}`)
    }
  }

  private async updateBrainLintTimestamp(brainId: string) {
    try {
      await this.databaseService
        .getClient()
        .from('ns_brains')
        .update({ last_lint_at: new Date().toISOString() })
        .eq('id', brainId)
    } catch (err) {
      this.logger.warn(`Failed to update brain lint timestamp: ${(err as Error).message}`)
    }
  }

  private async updateBrainAnalysisTimestamp(brainId: string) {
    try {
      await this.databaseService
        .getClient()
        .from('ns_brains')
        .update({ last_pattern_analysis_at: new Date().toISOString() })
        .eq('id', brainId)
    } catch (err) {
      this.logger.warn(`Failed to update brain analysis timestamp: ${(err as Error).message}`)
    }
  }

  private async updateBrainSyncTimestamp(brainId: string, syncedThrough?: string | null) {
    try {
      // Advance the watermark only to the newest entry actually included in this
      // batch, so entries beyond the batch cap are picked up by the next sync.
      const parsed = syncedThrough ? Date.parse(syncedThrough) : NaN
      const ts = Number.isNaN(parsed) ? new Date().toISOString() : new Date(parsed).toISOString()
      await this.databaseService
        .getClient()
        .from('ns_brains')
        .update({ last_library_sync_at: ts })
        .eq('id', brainId)
        .or(`last_library_sync_at.is.null,last_library_sync_at.lt.${ts}`)
    } catch (err) {
      this.logger.warn(`Failed to update brain sync timestamp: ${(err as Error).message}`)
    }
  }

  private async markOutboxDone(outboxId: string) {
    try {
      await this.databaseService
        .getClient()
        .from('brain_ops_outbox')
        .update({ status: 'done', processed_at: new Date().toISOString(), error: null })
        .eq('id', outboxId)
    } catch (err) {
      this.logger.warn(`Failed to mark brain ops outbox done: ${(err as Error).message}`)
    }
  }

  private async markOutboxFailed(outboxId: string, error: string) {
    try {
      await this.databaseService
        .getClient()
        .from('brain_ops_outbox')
        .update({ status: 'failed', error: error.slice(0, 1200) })
        .eq('id', outboxId)
    } catch (err) {
      this.logger.warn(`Failed to mark brain ops outbox failed: ${(err as Error).message}`)
    }
  }

  private async isCortexMaxEnabled(brainId: string): Promise<boolean> {
    try {
      const { data } = await this.databaseService
        .getClient()
        .from('ns_brains')
        .select('cortex_max')
        .eq('id', brainId)
        .single()
      return data?.cortex_max === true
    } catch {
      return false
    }
  }
}

// ── Module-private helpers ────────────────────────────────────────────────

function normalizeInteractionIdentifier(kind: string, value: string): string {
  const trimmed = value.trim()
  return kind === 'email' ? trimmed.toLowerCase() : trimmed
}

function sourceIdentityTypeForInteraction(channel: InteractionChannel, kind: string): string {
  if (kind === 'email') return 'email'
  if (kind === 'telegram_chat_id') return 'telegram_chat'
  if (kind === 'visitor_id') return 'widget_visitor'
  return `${channel}_${kind}`.replace(/[^a-z0-9_]+/gi, '_').toLowerCase()
}

function sourceTypeForInteractionChannel(channel: InteractionChannel): string {
  if (channel === 'telegram') return 'telegram_chat'
  if (channel === 'widget') return 'widget_chat'
  return 'fathom_call'
}

function sourceIdentityForInteractionParticipant(
  channel: InteractionChannel,
  sourceId: string,
  participant: InteractionParticipant,
): PreparedRoutingSourceIdentity {
  const selected =
    participant.identifiers.find(
      (candidate) => candidate.kind === 'email' && candidate.value.trim(),
    ) ??
    participant.identifiers.find(
      (candidate) => candidate.kind === 'telegram_chat_id' && candidate.value.trim(),
    ) ??
    participant.identifiers.find(
      (candidate) => candidate.kind === 'visitor_id' && candidate.value.trim(),
    ) ??
    participant.identifiers.find((candidate) => candidate.value.trim()) ??
    null

  if (selected) {
    return {
      source_type: sourceIdentityTypeForInteraction(channel, selected.kind),
      source_id: normalizeInteractionIdentifier(selected.kind, selected.value),
      identity_kind: selected.kind,
      name: participant.name,
      role: participant.role,
    }
  }

  return {
    source_type: sourceTypeForInteractionChannel(channel),
    source_id: sourceId,
    identity_kind: 'source_id',
    name: participant.name,
    role: participant.role,
  }
}

function customerUnitIdForMemory(memory: CustomerMemoryRow): string | null {
  return (
    memory.customer_entity_id ?? memory.contact_id ?? memory.customer_source_identity_id ?? null
  )
}

function splitName(name: string | null): { firstName: string | null; lastName: string | null } {
  if (!name) return { firstName: null, lastName: null }
  const trimmed = name.trim()
  if (!trimmed) return { firstName: null, lastName: null }
  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) return { firstName: parts[0], lastName: null }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  }
}

function readPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}
