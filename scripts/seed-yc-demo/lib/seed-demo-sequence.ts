/**
 * Upsert one demo sequence (+ emails, optional funnel workflow link).
 */
import type { DemoSequenceDef } from '../content/client-demo-sequences'
import { dateInWeek } from '../content/timeline'
import type { PhaseContext } from '../phases/_context'
import type { ResolvedDemoOrgState } from './demo-org-state'
import { iso } from './timeline'

export interface SeedDemoSequenceResult {
  emails: number
  workflows: number
  edges: number
  conversionPoints: number
}

export async function seedDemoSequence(
  ctx: PhaseContext,
  phaseId: string,
  def: DemoSequenceDef,
  resolved: ResolvedDemoOrgState,
): Promise<SeedDemoSequenceResult> {
  const { orgId, founderUserId, campaignIds } = resolved
  const campaignId = campaignIds[def.campaignSlug]
  if (!campaignId) {
    throw new Error(`${phaseId}: missing campaign id for ${def.campaignSlug}`)
  }

  const sequenceId = ctx.ids.id('sequence', orgId, def.clientSlug, def.slug)
  const createdAt = iso(dateInWeek(def.createdWeek, def.createdDay, def.createdHour ?? 10, 0))
  const updatedAt = iso(dateInWeek(def.createdWeek, def.createdDay + 2, 15, 30))

  if (ctx.dryRun) {
    return {
      emails: def.emails.length,
      workflows: def.funnelSlug ? 1 : 0,
      edges: def.funnelSlug ? 1 : 0,
      conversionPoints: def.funnelSlug ? 1 : 0,
    }
  }

  const trigger = def.funnelSlug
    ? { type: 'funnel_conversion', funnel_slug: def.funnelSlug }
    : { type: def.triggerType ?? 'manual', source: 'yc-demo-seeder' }

  const { error: seqErr } = await ctx.supabase.from('sequences').upsert(
    {
      id: sequenceId,
      user_id: founderUserId,
      org_id: orgId,
      campaign_id: campaignId,
      name: def.name,
      status: 'active',
      trigger,
      config: {
        client_slug: def.clientSlug,
        kind: def.configKind,
        ...(def.funnelSlug ? { funnel_slug: def.funnelSlug } : {}),
      },
      metrics: {},
      created_at: createdAt,
      updated_at: updatedAt,
    },
    { onConflict: 'id' },
  )
  if (seqErr) throw new Error(`${phaseId}: sequence upsert failed (${def.slug}): ${seqErr.message}`)

  const emailRows = def.emails.map((email, index) => ({
    id: ctx.ids.id('sequence-email', sequenceId, String(index)),
    sequence_id: sequenceId,
    org_id: orgId,
    subject: email.subject,
    body: email.body,
    delay_hours: email.delayHours,
    order_index: index,
    status: 'ready',
    metrics: {},
    created_at: createdAt,
    updated_at: updatedAt,
  }))

  const { error: emailErr } = await ctx.supabase
    .from('sequence_emails')
    .upsert(emailRows, { onConflict: 'id' })
  if (emailErr) {
    throw new Error(`${phaseId}: sequence_emails upsert failed (${def.slug}): ${emailErr.message}`)
  }

  let workflows = 0
  let edges = 0
  let conversionPoints = 0

  if (def.funnelSlug) {
    const { data: funnel, error: funnelErr } = await ctx.supabase
      .from('funnels')
      .select('id')
      .eq('org_id', orgId)
      .eq('slug', def.funnelSlug)
      .maybeSingle()
    if (funnelErr || !funnel?.id) {
      throw new Error(
        `${phaseId}: funnel "${def.funnelSlug}" not found (${funnelErr?.message ?? 'no row'})`,
      )
    }

    const funnelId = funnel.id as string

    const { data: page, error: pageErr } = await ctx.supabase
      .from('funnel_pages')
      .select('id')
      .eq('funnel_id', funnelId)
      .eq('page_type', 'opt-in')
      .order('order_index', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (pageErr || !page?.id) {
      throw new Error(`${phaseId}: opt-in page not found for ${def.funnelSlug}`)
    }

    const funnelPageId = page.id as string
    const workflowId = ctx.ids.id('campaign-workflow', orgId, def.clientSlug)
    const edgeId = ctx.ids.id('workflow-edge', orgId, def.clientSlug, def.slug)
    const conversionPointId = ctx.ids.id('funnel-conversion', funnelId, funnelPageId)

    const { error: convErr } = await ctx.supabase.from('funnel_conversion_points').upsert(
      {
        id: conversionPointId,
        user_id: founderUserId,
        funnel_id: funnelId,
        funnel_page_id: funnelPageId,
        kind: 'email_capture',
        config: { source: 'yc-demo-seeder', page_type: 'opt-in' },
        created_at: createdAt,
        updated_at: updatedAt,
      },
      { onConflict: 'id' },
    )
    if (convErr) {
      throw new Error(
        `${phaseId}: funnel_conversion_points failed (${def.slug}): ${convErr.message}`,
      )
    }
    conversionPoints = 1

    const { error: wfErr } = await ctx.supabase.from('campaign_workflows').upsert(
      {
        id: workflowId,
        user_id: founderUserId,
        campaign_id: campaignId,
        name: 'Main',
        created_at: createdAt,
        updated_at: updatedAt,
      },
      { onConflict: 'id' },
    )
    if (wfErr)
      throw new Error(`${phaseId}: campaign_workflows failed (${def.slug}): ${wfErr.message}`)
    workflows = 1

    const { error: edgeErr } = await ctx.supabase.from('campaign_workflow_edges').upsert(
      {
        id: edgeId,
        user_id: founderUserId,
        campaign_id: campaignId,
        workflow_id: workflowId,
        from_type: 'funnel',
        from_id: funnelId,
        to_type: 'sequence',
        to_id: sequenceId,
        edge_type: 'funnel_conversion_to_sequence',
        config: { source: 'yc-demo-seeder' },
        status: 'active',
        validation_errors: [],
        created_at: createdAt,
        updated_at: updatedAt,
      },
      { onConflict: 'id' },
    )
    if (edgeErr)
      throw new Error(`${phaseId}: workflow edge failed (${def.slug}): ${edgeErr.message}`)
    edges = 1
  }

  return { emails: emailRows.length, workflows, edges, conversionPoints }
}
