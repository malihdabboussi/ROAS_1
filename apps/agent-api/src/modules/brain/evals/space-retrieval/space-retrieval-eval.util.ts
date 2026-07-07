import { appendFileSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { BrainEvalCase } from '../brain-eval.types'
import {
  brainEvalDataRepository,
  type BrainEvalDataRepository,
} from '../repositories/brain-eval-data.repository'

/** Foundry Creative YC demo — see `../datasets/foundry-yc-demo-baseline.md` */
export const FOUNDRY_ORG_ID = '9fb9a0c1-7ce1-4d1a-9b4d-e68817e8f800'
export const FOUNDRY_USER_ID = 'ea216be9-d4c1-501a-b74e-4daf55e8d2ff'
export const DATASET_BASELINE = 'baseline-v1'

/** Deterministic demo space IDs (seed `scripts/seed-yc-demo`, org + slug). */
export const DEMO_SPACE_IDS = {
  'company-wiki': '9ccdb39d-2369-5b87-a35c-fe504369ef0e',
  'helmsmark-workspace': '8ffb35ec-4728-5821-9926-7cfddde683f4',
  operations: 'fa9c0215-636b-5e7b-896a-4851e75fb3d3',
  'plinthworks-workspace': '1fb5d2e0-1c69-5821-bd8b-563d08b8bd06',
} as const

export type DemoSpaceSlug = keyof typeof DEMO_SPACE_IDS

export function requireEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}

export function optionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim()
  return value || undefined
}

export function tagValue(evalCase: BrainEvalCase, prefix: string): string | null {
  const tag = evalCase.tags.find((value) => value.startsWith(prefix))
  const value = tag?.slice(prefix.length).trim()
  return value && !value.startsWith('<') ? value : null
}

export function parseSourceTag(tag: string): { sourceType: string; sourceId: string } | null {
  if (!tag.startsWith('source:')) return null
  const parts = tag.split(':')
  if (parts.length < 3) return null
  return { sourceType: parts[1]!, sourceId: parts.slice(2).join(':') }
}

export function parseDecoyTag(tag: string): { sourceType: string; sourceId: string } | null {
  if (!tag.startsWith('decoy:')) return null
  const parts = tag.split(':')
  if (parts.length < 3) return null
  return { sourceType: parts[1]!, sourceId: parts.slice(2).join(':') }
}

export function resolveDemoSpaceId(): string {
  const direct = optionalEnv('SPACE_EVAL_SPACE_ID')
  if (direct) return direct
  const slug = (optionalEnv('SPACE_EVAL_SPACE_SLUG') ?? 'company-wiki') as DemoSpaceSlug
  const mapped = DEMO_SPACE_IDS[slug]
  if (!mapped) {
    throw new Error(
      `Unknown SPACE_EVAL_SPACE_SLUG "${slug}". Set SPACE_EVAL_SPACE_ID or use a known slug.`,
    )
  }
  return mapped
}

async function fetchChunkIdsForSource(
  supabase: SupabaseClient,
  sourceType: string,
  sourceId: string,
  repository: BrainEvalDataRepository,
): Promise<string[]> {
  return repository.fetchSpaceSemanticChunkIds(supabase, sourceType, sourceId)
}

export async function resolveSourceRefsInCases(
  supabase: SupabaseClient,
  cases: BrainEvalCase[],
  repository: BrainEvalDataRepository = brainEvalDataRepository,
): Promise<BrainEvalCase[]> {
  const resolved: BrainEvalCase[] = []
  for (const evalCase of cases) {
    const expectedFromTags: string[] = []
    const decoyFromTags: string[] = []
    for (const tag of evalCase.tags) {
      const source = parseSourceTag(tag)
      if (source) {
        expectedFromTags.push(
          ...(await fetchChunkIdsForSource(
            supabase,
            source.sourceType,
            source.sourceId,
            repository,
          )),
        )
      }
      const decoy = parseDecoyTag(tag)
      if (decoy) {
        decoyFromTags.push(
          ...(await fetchChunkIdsForSource(supabase, decoy.sourceType, decoy.sourceId, repository)),
        )
      }
    }
    resolved.push({
      ...evalCase,
      userId: evalCase.userId ?? FOUNDRY_USER_ID,
      orgId: evalCase.orgId ?? FOUNDRY_ORG_ID,
      expectedEvidenceIds:
        expectedFromTags.length > 0 ? expectedFromTags : evalCase.expectedEvidenceIds,
      decoyEvidenceIds: decoyFromTags.length > 0 ? decoyFromTags : evalCase.decoyEvidenceIds,
    })
  }
  return resolved
}

export function writeRunJson(outputDir: string, suiteName: string, payload: unknown): string {
  mkdirSync(outputDir, { recursive: true })
  const outputPath = join(
    outputDir,
    `${suiteName}-run-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
  )
  writeFileSync(outputPath, JSON.stringify(payload, null, 2))
  return outputPath
}

export function appendEvalHistory(historyPath: string, entry: string): void {
  mkdirSync(join(historyPath, '..'), { recursive: true })
  appendFileSync(historyPath, entry)
}
