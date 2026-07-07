import { Injectable, Logger, Optional } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeTemporalPayload, type BrainTemporalPayload } from '@vibey/api-shared'
import { SnapshotsRepository } from '../repositories/snapshots.repository'
import { BrainEvidenceIngestionService } from './brain-evidence-ingestion.service'
import { EmbeddingService } from './embedding.service'

interface ThoughtExtraction {
  name: string
  type: 'Model' | 'Rule' | 'Conviction' | 'Principle'
  core: string
  one_liner: string
  confidence: number
}

const SNAPSHOT_TYPES = ['Model', 'Rule', 'Conviction', 'Principle'] as const

interface OriginMapping {
  story: string
  moment: string
  emotion: { intensity: number; feeling: string }
  source: string
}

interface SystemBuilding {
  trigger_pattern: string
  method: string
  steps: string[]
  filter: string
}

interface StressTestResult {
  challenge: string
  break_test: string
  risks: string
  proof: string
  significance_score: number
}

export interface PipelineTiming {
  phase1_ms: number
  phase2_ms: number
  phase3_ms: number
  embedding_ms: number
  total_ms: number
}

/**
 * Crystallization Service (US-008)
 *
 * 4-phase pipeline that turns raw text into structured neural snapshots:
 * Phase 1 (parallel): Thought Extractor + Origin Mapper
 * Phase 2: System Builder (uses Phase 1 output)
 * Phase 3: Stress Test (uses Phases 1-2 output)
 * Then: significance gate → embedding → save
 */
@Injectable()
export class CrystallizationService {
  private readonly logger = new Logger(CrystallizationService.name)

  constructor(
    private readonly embedding: EmbeddingService,
    private readonly snapshotsRepo: SnapshotsRepository,
    @Optional() private readonly evidenceIngestion?: BrainEvidenceIngestionService,
  ) {}

  async crystallize(
    supabase: SupabaseClient,
    input: string,
    ownerId: string,
    sourceType?: string,
    sourceId?: string,
    brainId?: string,
    orgId?: string | null,
    temporalInput?: BrainTemporalPayload | null,
  ): Promise<
    | { snapshot: Record<string, unknown>; pipeline: PipelineTiming }
    | { skipped: true; reason: string; significance_score: number }
  > {
    const totalStart = Date.now()
    const billing = { userId: ownerId, orgId }
    const temporal = normalizeTemporalPayload(temporalInput)

    // ── Phase 1 (parallel): Thought Extractor + Origin Mapper ──────────
    const phase1Start = Date.now()
    const [thoughtRaw, originRaw] = await Promise.all([
      this.embedding.callGemini(this.buildThoughtExtractorPrompt(input), undefined, billing),
      this.embedding.callGemini(this.buildOriginMapperPrompt(input), undefined, billing),
    ])
    const phase1Ms = Date.now() - phase1Start

    const thought = this.validateThoughtExtraction(
      this.parseJson<ThoughtExtraction>(thoughtRaw, 'ThoughtExtractor'),
    )
    const origin = this.parseJson<OriginMapping>(originRaw, 'OriginMapper')

    // ── Phase 2: System Builder ────────────────────────────────────────
    const phase2Start = Date.now()
    const systemRaw = await this.embedding.callGemini(
      this.buildSystemBuilderPrompt(input, thought, origin),
      undefined,
      billing,
    )
    const phase2Ms = Date.now() - phase2Start

    const system = this.parseJson<SystemBuilding>(systemRaw, 'SystemBuilder')

    // ── Phase 3: Stress Test ───────────────────────────────────────────
    const phase3Start = Date.now()
    const stressRaw = await this.embedding.callGemini(
      this.buildStressTestPrompt(input, thought, origin, system),
      undefined,
      billing,
    )
    const phase3Ms = Date.now() - phase3Start

    const stress = this.parseJson<StressTestResult>(stressRaw, 'StressTest')

    // ── Significance gate ──────────────────────────────────────────────
    const significanceScore = stress.significance_score ?? 0
    if (significanceScore < 0.3) {
      this.logger.log(`Skipped crystallization (score: ${significanceScore})`)
      return {
        skipped: true,
        reason: 'Input did not meet significance threshold (< 0.3)',
        significance_score: significanceScore,
      }
    }

    // ── Generate embedding ─────────────────────────────────────────────
    const embeddingStart = Date.now()
    const embeddingText = this.embedding.buildEmbeddingText({
      name: thought.name,
      core: thought.core,
      one_liner: thought.one_liner,
      story: origin.story,
      method: system.method,
      trigger_pattern: system.trigger_pattern,
    })
    const vector = await this.embedding.getEmbedding(embeddingText, {
      taskType: 'RETRIEVAL_DOCUMENT',
      billing,
    })
    const embeddingMs = Date.now() - embeddingStart

    // ── Save to neural_snapshots ───────────────────────────────────────
    const record: Record<string, unknown> = {
      name: thought.name,
      type: thought.type,
      core: thought.core,
      owner_id: ownerId,
      one_liner: thought.one_liner,
      confidence: thought.confidence ?? 0.8,
      story: origin.story,
      moment: origin.moment,
      emotion: origin.emotion,
      source: origin.source,
      trigger_pattern: system.trigger_pattern,
      method: system.method,
      steps: JSON.stringify(system.steps),
      filter: system.filter,
      challenge: stress.challenge,
      break_test: stress.break_test,
      risks: stress.risks,
      proof: stress.proof,
      significance_score: significanceScore,
      tags: [],
      source_type: sourceType ?? 'crystallize',
      source_id: sourceId ?? null,
      evidence_started_at:
        temporal.evidence_started_at ?? temporal.occurred_at ?? temporal.effective_from ?? null,
      evidence_ended_at:
        temporal.evidence_ended_at ?? temporal.occurred_until ?? temporal.effective_until ?? null,
      valid_from: temporal.valid_from ?? temporal.effective_from ?? null,
      valid_until: temporal.valid_until ?? temporal.effective_until ?? null,
      temporal_status: temporal.temporal_status ?? 'current',
      temporal_confidence: temporal.temporal_confidence ?? null,
      temporal_source: temporal.temporal_source ?? null,
    }
    if (brainId) {
      record.brain_id = brainId
    }
    if (vector) {
      record.embedding = JSON.stringify(vector)
    }
    const snapshot = await this.snapshotsRepo.create(
      supabase,
      record as { name: string; type: any; core: string; [key: string]: unknown },
    )

    if (brainId && this.evidenceIngestion) {
      await this.evidenceIngestion.writeEvidenceChunks(supabase, {
        brainId,
        family: 'user',
        orgId: orgId ?? null,
        ownerId,
        sourceType: sourceType ?? 'crystallize',
        sourceId: sourceId ?? String(snapshot.id ?? ''),
        sourceTitle: thought.name,
        ingestionPath: 'api',
        temporal,
        chunks: [input],
      })
    }

    const totalMs = Date.now() - totalStart
    this.logger.log(`Crystallized "${thought.name}" (score: ${significanceScore}) in ${totalMs}ms`)

    return {
      snapshot,
      pipeline: {
        phase1_ms: phase1Ms,
        phase2_ms: phase2Ms,
        phase3_ms: phase3Ms,
        embedding_ms: embeddingMs,
        total_ms: totalMs,
      },
    }
  }

  // ── Prompt builders ─────────────────────────────────────────────────────

  private buildThoughtExtractorPrompt(input: string): string {
    return `You are a Neural Snapshot crystallization engine. Your job is to extract the core thought from raw input text.

Return ONLY valid JSON with these exact fields:
- "name": A short title for this thought (3-6 words)
- "type": Exactly one of: "Model", "Rule", "Conviction", "Principle". (Beliefs are no longer snapshot types — for belief patterns use the create_belief_pattern action instead.)
- "core": The essential truth distilled into 2-3 sentences
- "one_liner": A crisp single-line version of the thought
- "confidence": A float between 0 and 1 representing how sure the person seems about this

Input text:
${input}`
  }

  private buildOriginMapperPrompt(input: string): string {
    return `You are a Neural Snapshot crystallization engine. Your job is to map the origin and backstory of a thought from raw input text.

Return ONLY valid JSON with these exact fields:
- "story": The backstory — what experiences or events led to this thought (2-4 sentences)
- "moment": The specific moment or event when this thought crystallized (1-2 sentences)
- "emotion": An object with exactly two keys: "intensity" (float 0-1) and "feeling" (a single word or short phrase describing the emotion)
- "source": Where this thought came from — e.g. "personal experience", "mentor", "book", "observation", "failure" etc.

Input text:
${input}`
  }

  private buildSystemBuilderPrompt(
    input: string,
    thought: ThoughtExtraction,
    origin: OriginMapping,
  ): string {
    return `You are a Neural Snapshot crystallization engine. Given a thought and its origin, derive the operational system behind it.

The thought:
- Name: ${thought.name}
- Type: ${thought.type}
- Core: ${thought.core}
- One-liner: ${thought.one_liner}

The origin:
- Story: ${origin.story}
- Moment: ${origin.moment}
- Source: ${origin.source}

Return ONLY valid JSON with these exact fields:
- "trigger_pattern": What situations, contexts, or cues activate this thought (1-2 sentences)
- "method": How this thought gets applied in practice — the operational approach (2-3 sentences)
- "steps": An array of 3-6 strings describing the step-by-step process for applying this thought
- "filter": What this thought filters out, rejects, or says no to (1-2 sentences)

Original input for additional context:
${input}`
  }

  private buildStressTestPrompt(
    input: string,
    thought: ThoughtExtraction,
    origin: OriginMapping,
    system: SystemBuilding,
  ): string {
    return `You are a Neural Snapshot crystallization engine. Given a complete thought with its origin and operational system, stress-test it by finding weaknesses and validating strengths.

The thought:
- Name: ${thought.name}
- Type: ${thought.type}
- Core: ${thought.core}

The origin:
- Story: ${origin.story}
- Source: ${origin.source}

The system:
- Trigger: ${system.trigger_pattern}
- Method: ${system.method}
- Filter: ${system.filter}

Return ONLY valid JSON with these exact fields:
- "challenge": The single strongest argument against this thought (2-3 sentences)
- "break_test": Under what specific conditions or scenarios would this thought completely break down (1-2 sentences)
- "risks": What could go wrong if this thought is wrong or misapplied (2-3 sentences)
- "proof": What evidence, results, or experiences support this thought (2-3 sentences)
- "significance_score": A float between 0 and 1 representing how significant this thought is. Most casual inputs should score below 0.3. Only score above 0.5 if the thought genuinely changes how someone operates.

Original input for additional context:
${input}`
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private parseJson<T>(raw: string, phaseName: string): T {
    try {
      return JSON.parse(raw) as T
    } catch {
      this.logger.error(`Failed to parse ${phaseName} JSON: ${raw.slice(0, 200)}`)
      throw new Error(`${phaseName} returned invalid JSON`)
    }
  }

  private validateThoughtExtraction(raw: ThoughtExtraction): ThoughtExtraction {
    const name = this.requireNonEmptyString(raw.name, 'ThoughtExtractor.name')
    const type = this.requireSnapshotType(raw.type, 'ThoughtExtractor.type')
    const core = this.requireNonEmptyString(raw.core, 'ThoughtExtractor.core')
    const oneLiner = this.requireNonEmptyString(raw.one_liner, 'ThoughtExtractor.one_liner')

    if (typeof raw.confidence !== 'number' || !Number.isFinite(raw.confidence)) {
      throw new Error('ThoughtExtractor.confidence must be a finite number')
    }
    if (raw.confidence < 0 || raw.confidence > 1) {
      throw new Error('ThoughtExtractor.confidence must be between 0 and 1')
    }

    return {
      ...raw,
      name,
      type,
      core,
      one_liner: oneLiner,
    }
  }

  private requireNonEmptyString(value: unknown, field: string): string {
    if (typeof value !== 'string') {
      throw new Error(`${field} must be a string`)
    }
    const trimmed = value.trim()
    if (!trimmed) {
      throw new Error(`${field} cannot be empty`)
    }
    return trimmed
  }

  private requireSnapshotType(value: unknown, field: string): ThoughtExtraction['type'] {
    if (typeof value !== 'string') {
      throw new Error(`${field} must be a string`)
    }
    if (!SNAPSHOT_TYPES.includes(value as ThoughtExtraction['type'])) {
      throw new Error(`${field} must be one of: ${SNAPSHOT_TYPES.join(', ')}`)
    }
    return value as ThoughtExtraction['type']
  }
}
