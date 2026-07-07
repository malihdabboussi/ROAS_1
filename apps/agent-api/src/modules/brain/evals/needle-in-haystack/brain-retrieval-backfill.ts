import { join } from 'path'
import { ConfigService } from '@nestjs/config'
import { config as loadEnv } from 'dotenv'
import { EmbeddingService, type GeminiTokenUsage } from '../../services/embedding.service'
import {
  brainEvalDataRepository,
  createEvalServiceClient,
  type BrainRetrievalBackfillTarget,
} from '../repositories/brain-eval-data.repository'

loadEnv({ path: join(process.cwd(), '../api/.env') })
loadEnv({ path: join(process.cwd(), '.env') })

type BackfillTarget = BrainRetrievalBackfillTarget & {
  text: (row: Record<string, unknown>) => string
}

type BackfillSummary = {
  table: string
  scanned: number
  embedded: number
  skipped: number
  errors: Array<{ id: string; error: string }>
}

type CostSummary = {
  model: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  providerCostUsd: number | null
  userCostUsd: number | null
  estimatedCredits: number | null
  pricingSource: 'token_providers_pricing' | 'unknown'
}

const DEFAULT_LIMIT = 100
const TEXT_MARGIN = 2
const CREDITS_PER_DOLLAR = 200
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL?.trim() || 'gemini-embedding-2'

const TARGETS: BackfillTarget[] = [
  {
    table: 'ns_memories',
    idColumn: 'id',
    select: 'id, content, source_title, memory_type',
    text: (row) => [row.source_title, row.memory_type, row.content].filter(Boolean).join('\n'),
  },
  {
    table: 'ns_snapshots',
    idColumn: 'id',
    select: 'id, name, core, one_liner, story, source',
    text: (row) =>
      [row.name, row.core, row.one_liner, row.story, row.source].filter(Boolean).join('\n'),
  },
  {
    table: 'ns_sk_entries',
    idColumn: 'id',
    select: 'id, title, content, domain, entry_type',
    text: (row) => [row.title, row.domain, row.entry_type, row.content].filter(Boolean).join('\n'),
  },
  {
    table: 'ns_narrative_pages',
    idColumn: 'id',
    select: 'id, title, page_type, summary, content_md',
    text: (row) =>
      [row.title, row.page_type, row.summary, row.content_md]
        .filter(Boolean)
        .join('\n')
        .slice(0, 8000),
  },
  {
    table: 'ns_belief_patterns',
    idColumn: 'id',
    select: 'id, pattern_name, description, evidence_type, status',
    text: (row) =>
      [row.pattern_name, row.evidence_type, row.status, row.description].filter(Boolean).join('\n'),
  },
  {
    table: 'ns_perspectives',
    idColumn: 'id',
    select: 'id, name, description, narrative_md, blind_spots, influence_areas',
    text: (row) =>
      [row.name, row.description, row.narrative_md, row.blind_spots, row.influence_areas]
        .filter(Boolean)
        .join('\n'),
  },
  {
    table: 'customer_avatars',
    idColumn: 'id',
    select: 'id, name, summary, narrative_md, blind_spots, dominant_pain_points',
    text: (row) =>
      [row.name, row.summary, row.narrative_md, row.blind_spots, row.dominant_pain_points]
        .filter(Boolean)
        .join('\n'),
  },
  {
    table: 'avatar_discriminator_axes',
    idColumn: 'id',
    select: 'id, name, description, high_end_signature, low_end_signature, scope',
    text: (row) =>
      [row.name, row.description, row.high_end_signature, row.low_end_signature, row.scope]
        .filter(Boolean)
        .join('\n'),
  },
  {
    table: 'company_cortex_objects',
    idColumn: 'id',
    select: 'id, object_type, title, truth, retrieval_rule',
    text: (row) =>
      [row.object_type, row.title, row.truth, JSON.stringify(row.retrieval_rule ?? {})]
        .filter(Boolean)
        .join('\n'),
  },
  {
    table: 'company_cortex_signals',
    idColumn: 'id',
    select: 'id, signal_type, truth, reason, context_form, source',
    text: (row) =>
      [row.signal_type, row.truth, row.reason, row.context_form, row.source]
        .filter(Boolean)
        .join('\n'),
  },
]

function requireEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}

async function loadInputPricePer1k(supabase: any, model: string): Promise<number | null> {
  return brainEvalDataRepository.loadInputPricePer1k(supabase, model)
}

function addUsage(total: GeminiTokenUsage, usage: GeminiTokenUsage): GeminiTokenUsage {
  return {
    inputTokens: total.inputTokens + usage.inputTokens,
    outputTokens: total.outputTokens + usage.outputTokens,
    totalTokens: total.totalTokens + usage.totalTokens,
  }
}

async function main() {
  const limit = Math.max(1, Number(process.env.BRAIN_BACKFILL_LIMIT ?? DEFAULT_LIMIT))
  const dryRun = process.env.BRAIN_BACKFILL_DRY_RUN !== '0'
  const targetFilter = process.env.BRAIN_BACKFILL_TABLE?.trim()
  const supabase = createEvalServiceClient(requireEnv)
  const embedding = new EmbeddingService(new ConfigService(), undefined)
  const summaries: BackfillSummary[] = []
  let usage: GeminiTokenUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 }

  for (const target of TARGETS.filter((item) => !targetFilter || item.table === targetFilter)) {
    const summary: BackfillSummary = {
      table: target.table,
      scanned: 0,
      embedded: 0,
      skipped: 0,
      errors: [],
    }
    const { data, error } = await brainEvalDataRepository.listRowsMissingEmbedding(
      supabase,
      target,
      limit,
    )
    if (error) throw new Error(`${target.table}: ${error.message}`)

    for (const row of (data ?? []) as unknown as Array<Record<string, unknown>>) {
      summary.scanned++
      const id = String(row[target.idColumn] ?? '')
      const text = target.text(row).trim()
      if (!id || !text) {
        summary.skipped++
        continue
      }
      if (dryRun) {
        summary.skipped++
        continue
      }
      const result = await embedding.getEmbeddingWithUsage(text, {
        taskType: 'RETRIEVAL_DOCUMENT',
        model: EMBEDDING_MODEL,
      })
      usage = addUsage(usage, result.usage)
      if (!result.embedding) {
        summary.errors.push({ id, error: 'embedding_missing' })
        continue
      }
      const { error: updateError } = await brainEvalDataRepository.updateTargetEmbedding(supabase, {
        target,
        id,
        embedding: `[${result.embedding.join(',')}]`,
      })
      if (updateError) {
        summary.errors.push({ id, error: updateError.message })
        continue
      }
      summary.embedded++
    }
    summaries.push(summary)
  }

  const inputPricePer1k = await loadInputPricePer1k(supabase, EMBEDDING_MODEL)
  const providerCostUsd =
    inputPricePer1k === null ? null : (usage.inputTokens / 1000) * inputPricePer1k
  const userCostUsd = providerCostUsd === null ? null : providerCostUsd * TEXT_MARGIN
  const cost: CostSummary = {
    model: EMBEDDING_MODEL,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    totalTokens: usage.totalTokens,
    providerCostUsd,
    userCostUsd,
    estimatedCredits: userCostUsd === null ? null : Math.ceil(userCostUsd * CREDITS_PER_DOLLAR),
    pricingSource: inputPricePer1k === null ? 'unknown' : 'token_providers_pricing',
  }

  console.log(
    JSON.stringify({ dryRun, limit, targetFilter: targetFilter ?? null, summaries, cost }, null, 2),
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
