/**
 * P10d — Plinthworks on-call webinar reminder sequence + funnel workflow link.
 */
import { PLINTHWORKS_WEBINAR_SEQUENCE } from '../content/plinthworks-webinar-sequence'
import { dateInWeek } from '../content/timeline'
import { resolveDemoOrgState } from '../lib/demo-org-state'
import { iso } from '../lib/timeline'
import { startResult, type PhaseContext, type PhaseHandler } from './_context'

const PHASE_ID = '10d-plinthworks-webinar-sequence'

export async function seedPlinthworksWebinarSequence(
  ctx: PhaseContext,
): Promise<{
  sequence: number
  emails: number
  workflow: number
  edges: number
  conversionPoints: number
}> {
  const resolved = await resolveDemoOrgState(ctx)
  const { orgId, founderUserId, campaignIds } = resolved
  const campaignId = campaignIds[PLINTHWORKS_WEBINAR_SEQUENCE.campaignSlug]
  if (!campaignId) {
    throw new Error(
      `${PHASE_ID}: missing campaign id for ${PLINTHWORKS_WEBINAR_SEQUENCE.campaignSlug}`,
    )
  }

  const { data: funnel, error: funnelErr } = await ctx.supabase
    .from('funnels')
    .select('id')
    .eq('org_id', orgId)
    .eq('slug', PLINTHWORKS_WEBINAR_SEQUENCE.funnelSlug)
    .maybeSingle()
  if (funnelErr || !funnel?.id) {
    throw new Error(
      `${PHASE_ID}: funnel "${PLINTHWORKS_WEBINAR_SEQUENCE.funnelSlug}" not found (${funnelErr?.message ?? 'no row'})`,
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
    throw new Error(
      `${PHASE_ID}: opt-in page not found for funnel (${pageErr?.message ?? 'no row'})`,
    )
  }

  const funnelPageId = page.id as string
  const sequenceId = ctx.ids.id(
    'sequence',
    orgId,
    PLINTHWORKS_WEBINAR_SEQUENCE.clientSlug,
    PLINTHWORKS_WEBINAR_SEQUENCE.slug,
  )
  const workflowId = ctx.ids.id('campaign-workflow', orgId, PLINTHWORKS_WEBINAR_SEQUENCE.clientSlug)
  const edgeId = ctx.ids.id(
    'workflow-edge',
    orgId,
    PLINTHWORKS_WEBINAR_SEQUENCE.clientSlug,
    PLINTHWORKS_WEBINAR_SEQUENCE.slug,
  )
  const conversionPointId = ctx.ids.id('funnel-conversion', funnelId, funnelPageId)

  const createdAt = iso(dateInWeek(9, 2, 10, 0))
  const updatedAt = iso(dateInWeek(9, 4, 15, 30))

  if (ctx.dryRun) {
    return {
      sequence: 1,
      emails: PLINTHWORKS_WEBINAR_SEQUENCE.emails.length,
      workflow: 1,
      edges: 1,
      conversionPoints: 1,
    }
  }

  const { error: seqErr } = await ctx.supabase.from('sequences').upsert(
    {
      id: sequenceId,
      user_id: founderUserId,
      org_id: orgId,
      campaign_id: campaignId,
      name: PLINTHWORKS_WEBINAR_SEQUENCE.name,
      status: 'active',
      trigger: { type: 'funnel_conversion', funnel_slug: PLINTHWORKS_WEBINAR_SEQUENCE.funnelSlug },
      config: {
        client_slug: PLINTHWORKS_WEBINAR_SEQUENCE.clientSlug,
        kind: 'webinar_reminder',
        funnel_slug: PLINTHWORKS_WEBINAR_SEQUENCE.funnelSlug,
      },
      metrics: {},
      created_at: createdAt,
      updated_at: updatedAt,
    },
    { onConflict: 'id' },
  )
  if (seqErr) throw new Error(`${PHASE_ID}: sequence upsert failed: ${seqErr.message}`)

  const emailRows = PLINTHWORKS_WEBINAR_SEQUENCE.emails.map((email, index) => ({
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
  if (emailErr) throw new Error(`${PHASE_ID}: sequence_emails upsert failed: ${emailErr.message}`)

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
  if (convErr)
    throw new Error(`${PHASE_ID}: funnel_conversion_points upsert failed: ${convErr.message}`)

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
  if (wfErr) throw new Error(`${PHASE_ID}: campaign_workflows upsert failed: ${wfErr.message}`)

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
    throw new Error(`${PHASE_ID}: campaign_workflow_edges upsert failed: ${edgeErr.message}`)

  return {
    sequence: 1,
    emails: emailRows.length,
    workflow: 1,
    edges: 1,
    conversionPoints: 1,
  }
}

export const runP10dPlinthworksWebinarSequence: PhaseHandler = async (ctx) => {
  const result = startResult(PHASE_ID)
  const counts = await seedPlinthworksWebinarSequence(ctx)
  result.counts = counts
  result.ok = true
  return result
}
