#!/usr/bin/env tsx
/**
 * One-off: add IG Research views + sync tracked accounts on demo client spaces.
 *
 *   pnpm exec tsx scripts/seed-yc-demo/one-off/seed-ig-research.ts
 *   pnpm exec tsx scripts/seed-yc-demo/one-off/seed-ig-research.ts --space=cloverkin-workspace
 */
import { createClient } from '@supabase/supabase-js'
import { DEMO_IG_RESEARCH_SPACES, IG_RESEARCH_VIEW_ID } from '../content/demo-ig-research'
import { createApiClient } from '../lib/api'
import { resolveDemoOrgState } from '../lib/demo-org-state'
import { loadEnv } from '../lib/env'
import { ids } from '../lib/ids'
import { createLogger } from '../lib/log'
import { syncIgResearchSpace } from '../lib/seed-ig-research-sync'
import * as timelineHelpers from '../lib/timeline'
import type { PhaseContext } from '../phases/_context'
import { seedDemoIgResearch } from '../phases/10f-ig-research'

async function main(): Promise<void> {
  const env = loadEnv()
  const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false },
  })
  const api = createApiClient(env)
  const log = createLogger(false)
  const ctx: PhaseContext = {
    env,
    supabase,
    api,
    ids,
    log,
    timeline: timelineHelpers,
    dryRun: false,
    reset: false,
    state: {},
  }

  const onlySpace = process.argv.find((a) => a.startsWith('--space='))?.slice('--space='.length)
  if (onlySpace) {
    const def = DEMO_IG_RESEARCH_SPACES.find((s) => s.spaceSlug === onlySpace)
    if (!def) throw new Error(`Unknown space slug "${onlySpace}"`)
    const resolved = await resolveDemoOrgState(ctx)
    const spaceId = ids.id('space', resolved.orgId, def.spaceSlug)
    const { data: space, error } = await supabase
      .from('spaces')
      .select('id, schema')
      .eq('id', spaceId)
      .maybeSingle()
    if (error || !space?.id) throw new Error(`Space not found: ${def.spaceSlug}`)
    log.step(`${def.spaceSlug}: syncing ${def.handles.length} IG accounts`)
    const counts = await syncIgResearchSpace({
      api,
      auth: { userId: resolved.founderUserId, orgId: resolved.orgId },
      spaceId: space.id as string,
      schema: space.schema as { version: number; views: Array<Record<string, unknown>> },
      viewId: IG_RESEARCH_VIEW_ID,
      viewName: def.viewName,
      handles: def.handles,
      log: (msg) => log.step(msg),
    })
    console.log(JSON.stringify({ spaces: 1, ...counts }, null, 2))
    return
  }

  const counts = await seedDemoIgResearch(ctx)
  console.log(JSON.stringify(counts, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
