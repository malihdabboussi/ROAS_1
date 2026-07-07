import { join } from 'path'
import { ConfigService } from '@nestjs/config'
import { config as loadEnv } from 'dotenv'
import { SpaceAssetIndexRegistry } from '../../../spaces-retrieval/services/space-asset-index.registry'
import { SpaceAssetIndexService } from '../../../spaces-retrieval/services/space-asset-index.service'
import { SpaceKeywordContextService } from '../../../spaces-retrieval/services/space-keyword-context.service'
import { SpaceSemanticChunkWriterService } from '../../../spaces-retrieval/services/space-semantic-chunk-writer.service'
import type { SpaceSemanticSourceType } from '../../../spaces-retrieval/types/space-retrieval.types'
import { EmbeddingService } from '../../services/embedding.service'
import { createEvalServiceClient } from '../repositories/brain-eval-data.repository'
import { spaceRetrievalBackfillRepository } from '../repositories/space-retrieval-backfill.repository'
import {
  FOUNDRY_ORG_ID,
  FOUNDRY_USER_ID,
  optionalEnv,
  requireEnv,
  resolveDemoSpaceId,
} from './space-retrieval-eval.util'

loadEnv({ path: join(process.cwd(), '../api/.env') })
loadEnv({ path: join(process.cwd(), '.env') })

type BackfillSummary = {
  source_type: SpaceSemanticSourceType
  scanned: number
  indexed: number
  skipped: number
  errors: Array<{ source_id: string; error: string }>
}

const DEFAULT_LIMIT = 500

function csvEnv(name: string): string[] {
  return (process.env[name] ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

async function main() {
  process.env.SPACE_SEMANTIC_RETRIEVAL = '1'
  process.env.SPACE_ASSET_INDEXING = '1'

  const dryRun = process.env.SPACE_BACKFILL_DRY_RUN !== '0'
  const limit = Math.max(1, Number(process.env.SPACE_BACKFILL_LIMIT ?? DEFAULT_LIMIT))
  const supabase = createEvalServiceClient(requireEnv)
  const indexService = new SpaceAssetIndexService(
    new SpaceAssetIndexRegistry(),
    new SpaceSemanticChunkWriterService(
      new EmbeddingService(new ConfigService(), undefined),
      new SpaceKeywordContextService(),
    ),
  )

  const scopes = await spaceRetrievalBackfillRepository.resolveBackfillSpaces(supabase, {
    explicitSpaceIds: csvEnv('SPACE_BACKFILL_SPACE_IDS'),
    userIds: csvEnv('SPACE_BACKFILL_USER_IDS'),
    orgIds: csvEnv('SPACE_BACKFILL_ORG_IDS'),
    includePersonal: process.env.SPACE_BACKFILL_INCLUDE_PERSONAL !== '0',
    spaceLimit: Math.max(1, Number(process.env.SPACE_BACKFILL_SPACE_LIMIT ?? 5000)),
    defaultSpaceId: resolveDemoSpaceId(),
    defaultUserId: optionalEnv('SPACE_EVAL_USER_ID') ?? FOUNDRY_USER_ID,
    defaultOrgId: optionalEnv('SPACE_EVAL_ORG_ID') ?? FOUNDRY_ORG_ID,
  })
  const sourceAllowlist = new Set(csvEnv('SPACE_BACKFILL_SOURCE_TYPES'))
  const handleAllowlist = new Set(
    csvEnv('SPACE_BACKFILL_SOCIAL_HANDLES').map((handle) => handle.toLowerCase()),
  )
  const jobs = (
    await Promise.all(
      scopes.map((scope) =>
        spaceRetrievalBackfillRepository.collectIndexJobs(supabase, {
          spaceId: scope.spaceId,
          userId: scope.userId,
          orgId: scope.orgId,
          limit,
          sourceAllowlist,
          handleAllowlist,
        }),
      ),
    )
  )
    .flat()
    .slice(0, limit)
  const summaries = new Map<SpaceSemanticSourceType, BackfillSummary>()

  for (const job of jobs) {
    const summary =
      summaries.get(job.sourceType) ??
      ({
        source_type: job.sourceType,
        scanned: 0,
        indexed: 0,
        skipped: 0,
        errors: [],
      } satisfies BackfillSummary)
    summary.scanned += 1
    if (dryRun) {
      summary.skipped += 1
      summaries.set(job.sourceType, summary)
      continue
    }
    try {
      const result = await indexService.indexSource(supabase, job)
      if (result.indexed > 0) summary.indexed += 1
      else summary.skipped += 1
    } catch (error) {
      summary.errors.push({
        source_id: job.sourceId,
        error: error instanceof Error ? error.message : String(error),
      })
    }
    summaries.set(job.sourceType, summary)
  }

  const scopedSpaceIds = scopes.map((scope) => scope.spaceId)
  const { count: chunkCount, error: countError } =
    await spaceRetrievalBackfillRepository.countChunks(supabase, scopedSpaceIds)
  if (countError) throw new Error(`chunk count: ${countError.message}`)

  console.log(
    JSON.stringify(
      {
        dryRun,
        scopes,
        jobCount: jobs.length,
        chunkCount: chunkCount ?? 0,
        summaries: [...summaries.values()],
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
