/**
 * P10f — IG Research views + tracked account sync for demo client spaces.
 */
import { DEMO_IG_RESEARCH_SPACES, IG_RESEARCH_VIEW_ID } from '../content/demo-ig-research'
import { resolveDemoOrgState } from '../lib/demo-org-state'
import { syncIgResearchSpace } from '../lib/seed-ig-research-sync'
import { startResult, type PhaseContext, type PhaseHandler } from './_context'

const PHASE_ID = '10f-ig-research'

export async function seedDemoIgResearch(ctx: PhaseContext): Promise<{
  spaces: number
  accounts: number
  itemsCreated: number
  itemsUpdated: number
}> {
  const resolved = await resolveDemoOrgState(ctx)
  const auth = { userId: resolved.founderUserId, orgId: resolved.orgId }

  let spaces = 0
  let accounts = 0
  let itemsCreated = 0
  let itemsUpdated = 0

  for (const def of DEMO_IG_RESEARCH_SPACES) {
    const spaceId = ctx.ids.id('space', resolved.orgId, def.spaceSlug)
    const { data: space, error: spaceErr } = await ctx.supabase
      .from('spaces')
      .select('id, schema')
      .eq('id', spaceId)
      .eq('org_id', resolved.orgId)
      .maybeSingle()

    if (spaceErr || !space?.id) {
      throw new Error(
        `${PHASE_ID}: space "${def.spaceSlug}" (${spaceId}) not found (${spaceErr?.message ?? 'no row'})`,
      )
    }

    if (ctx.dryRun) {
      ctx.log.step(
        `(dry) Would add IG Research view + sync ${def.handles.length} accounts on ${def.spaceSlug}`,
      )
      spaces += 1
      accounts += def.handles.length
      continue
    }

    ctx.log.step(`${def.spaceSlug}: syncing ${def.handles.length} IG accounts`)
    const result = await syncIgResearchSpace({
      api: ctx.api,
      auth,
      spaceId: space.id as string,
      schema: space.schema as { version: number; views: Array<Record<string, unknown>> },
      viewId: IG_RESEARCH_VIEW_ID,
      viewName: def.viewName,
      handles: def.handles,
      log: (msg) => ctx.log.step(msg),
    })

    spaces += 1
    accounts += result.accounts
    itemsCreated += result.itemsCreated
    itemsUpdated += result.itemsUpdated
  }

  return { spaces, accounts, itemsCreated, itemsUpdated }
}

export const runP10fIgResearch: PhaseHandler = async (ctx) => {
  const r = startResult(PHASE_ID)
  const counts = await seedDemoIgResearch(ctx)
  return r.finish(counts)
}
