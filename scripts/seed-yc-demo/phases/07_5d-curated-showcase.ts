/**
 * P7.5d — Curated showcase artifacts (Adley prod templates → demo clients).
 *
 * Standalone phase. Run after the demo org exists:
 *   pnpm seed:yc-demo --phase=07_5d-curated-showcase
 *
 * Reads 6 hand-picked Adley presentations/funnels from prod (same Supabase
 * project), reskins copy + brand colors for each Foundry client, and upserts
 * showcase rows with deterministic IDs under the Foundry Creative org.
 *
 * Does NOT touch P7.5b stub artifacts — these are parallel "showcase" rows
 * intended for YC walkthrough quality.
 */
import {
  clientForSlug,
  CURATED_SHOWCASE_TEMPLATES,
  type CuratedFunnelSpec,
  type CuratedPresentationSpec,
  type CuratedTemplateSpec,
} from '../content/curated-templates'
import {
  CLIENT_WORKSPACE_SLUG,
  mergeArtifactViewIntoSchema,
  type ArtifactViewType,
} from '../lib/artifact-space-view'
import { resolveDemoOrgState } from '../lib/demo-org-state'
import { replaceEmojisWithLucide } from '../lib/replace-emojis-with-lucide'
import { reskinGeneratedCode, reskinPresentationName } from '../lib/reskin-html'
import { makePresentationResponsive } from '../lib/responsive-presentation-html'
import { startResult, type PhaseContext, type PhaseHandler } from './_context'

const PHASE_ID = '07_5d-curated-showcase'

const UPSERT_BATCH_SIZE = 50

interface SourcePresentationRow {
  id: string
  name: string
  status: string
  slides: unknown
  generated_html: string | null
  metadata: Record<string, unknown> | null
  slug: string | null
  theme_id: string | null
  file_url: string | null
  hide_branding: boolean | null
}

interface SourceFunnelRow {
  id: string
  name: string
  status: string
  funnel_type: string | null
  slug: string | null
  metadata: Record<string, unknown> | null
}

interface SourceFunnelPageRow {
  id: string
  funnel_id: string
  name: string
  page_type: string
  sections: unknown
  theme_config: Record<string, unknown> | null
  order_index: number | null
  is_published: boolean | null
  generated_html: string | null
  generated_css: string | null
  slug: string | null
  content: unknown
  seo: unknown
  generation_mode: string | null
  path: string | null
  composition: unknown
}

async function batchUpsert(
  ctx: PhaseContext,
  table: string,
  rows: ReadonlyArray<Record<string, unknown>>,
): Promise<void> {
  if (rows.length === 0) return
  for (let i = 0; i < rows.length; i += UPSERT_BATCH_SIZE) {
    const chunk = rows.slice(i, i + UPSERT_BATCH_SIZE)
    const { error } = await ctx.supabase
      .from(table)
      .upsert(chunk, { onConflict: 'id', ignoreDuplicates: false })
    if (error) {
      throw new Error(
        `${PHASE_ID}: upsert ${table} (batch ${i}..${i + chunk.length}) failed: ${error.message}`,
      )
    }
  }
}

function jitterIso(ctx: PhaseContext, baseAt: Date, seedKey: string): string {
  const end = ctx.timeline.dayOffset(0, 18, 0)
  const at = ctx.timeline.jitterWithin(baseAt, end, seedKey)
  return ctx.timeline.iso(at)
}

function trackArtifact(
  ctx: PhaseContext,
  table: string,
  clientSlug: string,
  demoSlug: string,
  id: string,
): void {
  ctx.state.artifactIds = ctx.state.artifactIds ?? {}
  const bucket = ctx.state.artifactIds[table] ?? (ctx.state.artifactIds[table] = {})
  bucket[`${clientSlug}:showcase-${demoSlug}`] = id
}

async function loadSourcePresentation(
  ctx: PhaseContext,
  prodId: string,
): Promise<SourcePresentationRow> {
  const { data, error } = await ctx.supabase
    .from('presentations')
    .select(
      'id, name, status, slides, generated_html, metadata, slug, theme_id, file_url, hide_branding',
    )
    .eq('id', prodId)
    .maybeSingle()

  if (error) {
    throw new Error(`${PHASE_ID}: SELECT presentations(${prodId}) failed: ${error.message}`)
  }
  if (!data?.generated_html || String(data.generated_html).length < 500) {
    throw new Error(
      `${PHASE_ID}: presentation ${prodId} missing generated_html — cannot reskin empty template.`,
    )
  }
  return data as SourcePresentationRow
}

async function loadSourceFunnelBundle(
  ctx: PhaseContext,
  spec: CuratedFunnelSpec,
): Promise<{ funnel: SourceFunnelRow; page: SourceFunnelPageRow }> {
  const { data: funnel, error: funnelErr } = await ctx.supabase
    .from('funnels')
    .select('id, name, status, funnel_type, slug, metadata')
    .eq('id', spec.sourceProdId)
    .maybeSingle()

  if (funnelErr || !funnel) {
    throw new Error(
      `${PHASE_ID}: SELECT funnels(${spec.sourceProdId}) failed: ${funnelErr?.message ?? 'not found'}`,
    )
  }

  const { data: page, error: pageErr } = await ctx.supabase
    .from('funnel_pages')
    .select(
      'id, funnel_id, name, page_type, sections, theme_config, order_index, is_published, generated_html, generated_css, slug, content, seo, generation_mode, path, composition',
    )
    .eq('id', spec.sourcePageProdId)
    .maybeSingle()

  if (pageErr || !page) {
    throw new Error(
      `${PHASE_ID}: SELECT funnel_pages(${spec.sourcePageProdId}) failed: ${pageErr?.message ?? 'not found'}`,
    )
  }
  if (!page.generated_html || String(page.generated_html).length < 500) {
    throw new Error(`${PHASE_ID}: funnel page ${spec.sourcePageProdId} missing generated_html.`)
  }

  return { funnel: funnel as SourceFunnelRow, page: page as SourceFunnelPageRow }
}

async function buildPresentationRow(
  ctx: PhaseContext,
  spec: CuratedPresentationSpec,
  resolved: Awaited<ReturnType<typeof resolveDemoOrgState>>,
  warnings: string[],
): Promise<Record<string, unknown>> {
  const client = clientForSlug(spec.clientSlug)
  const campaignId = resolved.campaignIds[spec.clientSlug]
  if (!campaignId) {
    throw new Error(`${PHASE_ID}: no campaign id for client "${spec.clientSlug}".`)
  }

  const source = await loadSourcePresentation(ctx, spec.sourceProdId)
  const presentationId = ctx.ids.id(
    'presentation-showcase',
    resolved.orgId,
    spec.clientSlug,
    spec.demoSlug,
  )
  trackArtifact(ctx, 'presentations', spec.clientSlug, spec.demoSlug, presentationId)

  const at = jitterIso(ctx, client.onboardedAt, `showcase:presentation:${spec.demoSlug}`)
  const { html: reskinnedHtml, warnings: reskinWarnings } = reskinGeneratedCode(
    String(source.generated_html),
    client,
    spec,
  )
  warnings.push(...reskinWarnings)
  const html = makePresentationResponsive(reskinnedHtml)

  const demoSlug = `${spec.clientSlug}-${spec.demoSlug}`

  return {
    id: presentationId,
    user_id: resolved.founderUserId,
    org_id: resolved.orgId,
    campaign_id: campaignId,
    offer_id: null,
    name: reskinPresentationName(source.name, client, spec),
    slides: source.slides ?? [],
    generated_html: html,
    theme_id: source.theme_id,
    file_url: null,
    status: 'published',
    slug: demoSlug,
    published_url: null,
    hide_branding: source.hide_branding ?? false,
    metadata: {
      ...(source.metadata ?? {}),
      client_slug: spec.clientSlug,
      showcase: true,
      source_prod_id: spec.sourceProdId,
      seeded_by: 'yc-demo-curated-showcase',
    },
    created_at: at,
    updated_at: at,
  }
}

async function buildFunnelBundle(
  ctx: PhaseContext,
  spec: CuratedFunnelSpec,
  resolved: Awaited<ReturnType<typeof resolveDemoOrgState>>,
  warnings: string[],
): Promise<{ funnel: Record<string, unknown>; page: Record<string, unknown> }> {
  const client = clientForSlug(spec.clientSlug)
  const campaignId = resolved.campaignIds[spec.clientSlug]
  if (!campaignId) {
    throw new Error(`${PHASE_ID}: no campaign id for client "${spec.clientSlug}".`)
  }

  const source = await loadSourceFunnelBundle(ctx, spec)
  const funnelId = ctx.ids.id('funnel-showcase', resolved.orgId, spec.clientSlug, spec.demoSlug)
  const pageId = ctx.ids.id('funnel-page-showcase', funnelId, spec.sourcePageProdId)

  trackArtifact(ctx, 'funnels', spec.clientSlug, spec.demoSlug, funnelId)
  trackArtifact(ctx, 'funnel_pages', spec.clientSlug, spec.demoSlug, pageId)

  const at = jitterIso(ctx, client.onboardedAt, `showcase:funnel:${spec.demoSlug}`)
  const { html: reskinnedHtml, warnings: reskinWarnings } = reskinGeneratedCode(
    String(source.page.generated_html),
    client,
    spec,
  )
  warnings.push(...reskinWarnings)
  const html =
    spec.demoSlug === 'pantry-club-vsl' ? replaceEmojisWithLucide(reskinnedHtml) : reskinnedHtml

  const reskinnedCss = source.page.generated_css
    ? reskinGeneratedCode(String(source.page.generated_css), client, spec).html
    : null

  const demoSlug = `${spec.clientSlug}-${spec.demoSlug}`

  const funnelRow: Record<string, unknown> = {
    id: funnelId,
    user_id: resolved.founderUserId,
    org_id: resolved.orgId,
    campaign_id: campaignId,
    offer_id: null,
    name: `${client.name} — ${spec.demoName}`,
    funnel_type: source.funnel.funnel_type ?? 'custom',
    status: 'published',
    slug: demoSlug,
    metadata: {
      ...(source.funnel.metadata ?? {}),
      client_slug: spec.clientSlug,
      showcase: true,
      source_prod_id: spec.sourceProdId,
      brand: client.brand,
      voice_tone: client.voice.tone,
      seeded_by: 'yc-demo-curated-showcase',
    },
    created_at: at,
    updated_at: at,
  }

  const pageRow: Record<string, unknown> = {
    id: pageId,
    funnel_id: funnelId,
    org_id: resolved.orgId,
    name: `${client.name} — ${spec.demoName}`,
    page_type: source.page.page_type,
    sections: source.page.sections ?? [],
    theme_config: {
      ...(source.page.theme_config ?? {}),
      primary: client.brand.primary,
      accent: client.brand.accent,
      secondary: client.brand.secondary,
    },
    order_index: source.page.order_index ?? 0,
    is_published: true,
    generated_html: html,
    generated_css: reskinnedCss,
    slug: demoSlug,
    content: source.page.content ?? null,
    seo: source.page.seo ?? null,
    generation_mode: source.page.generation_mode,
    path: source.page.path,
    composition: source.page.composition ?? null,
    created_at: at,
    updated_at: at,
  }

  return { funnel: funnelRow, page: pageRow }
}

function isPresentation(spec: CuratedTemplateSpec): spec is CuratedPresentationSpec {
  return spec.kind === 'presentation'
}

function isFunnel(spec: CuratedTemplateSpec): spec is CuratedFunnelSpec {
  return spec.kind === 'funnel'
}

function artifactViewTypeForSpec(spec: CuratedTemplateSpec): ArtifactViewType {
  return spec.kind === 'presentation' ? 'presentations' : 'funnels'
}

async function patchWorkspaceArtifactViews(
  ctx: PhaseContext,
  orgId: string,
): Promise<{ patched: number; skipped: number }> {
  const needed = new Map<string, ArtifactViewType>()
  for (const spec of CURATED_SHOWCASE_TEMPLATES) {
    needed.set(spec.clientSlug, artifactViewTypeForSpec(spec))
  }

  let patched = 0
  let skipped = 0

  for (const [clientSlug, viewType] of needed) {
    const workspaceSlug = CLIENT_WORKSPACE_SLUG[clientSlug]
    if (!workspaceSlug) {
      throw new Error(`${PHASE_ID}: no workspace slug for client "${clientSlug}".`)
    }

    const spaceId = ctx.ids.id('space', orgId, workspaceSlug)
    const { data: space, error } = await ctx.supabase
      .from('spaces')
      .select('id, schema')
      .eq('id', spaceId)
      .maybeSingle()

    if (error) {
      throw new Error(`${PHASE_ID}: SELECT spaces(${spaceId}) failed: ${error.message}`)
    }
    if (!space) {
      throw new Error(
        `${PHASE_ID}: workspace space "${workspaceSlug}" (${spaceId}) not found — run P6 first.`,
      )
    }

    const { schema: nextSchema, added } = mergeArtifactViewIntoSchema(space.schema, viewType)
    if (!added) {
      skipped += 1
      continue
    }

    const { error: updateErr } = await ctx.supabase
      .from('spaces')
      .update({ schema: nextSchema, updated_at: new Date().toISOString() })
      .eq('id', spaceId)

    if (updateErr) {
      throw new Error(
        `${PHASE_ID}: UPDATE spaces(${spaceId}) add ${viewType} view failed: ${updateErr.message}`,
      )
    }

    patched += 1
    ctx.log.step(`Added ${viewType} view to ${workspaceSlug}`)
  }

  return { patched, skipped }
}

export const runP07_5dCuratedShowcase: PhaseHandler = async (ctx) => {
  const r = startResult(PHASE_ID)
  ctx.log.step('P7.5d — curated showcase artifacts (Adley templates → demo clients)')

  const resolved = await resolveDemoOrgState(ctx)
  ctx.log.step(
    `Resolved demo org id=${resolved.orgId} founder=${resolved.founderUserId} campaigns=${Object.keys(resolved.campaignIds).length}`,
  )

  const warnings: string[] = []
  const presentations: Record<string, unknown>[] = []
  const funnels: Record<string, unknown>[] = []
  const funnelPages: Record<string, unknown>[] = []

  if (ctx.dryRun) {
    for (const spec of CURATED_SHOWCASE_TEMPLATES) {
      ctx.log.step(
        `[dry-run] would reskin ${spec.kind} "${spec.demoName}" (${spec.sourceProdId}) → client ${spec.clientSlug}`,
      )
    }
    for (const [clientSlug, viewType] of new Map(
      CURATED_SHOWCASE_TEMPLATES.map((spec) => [spec.clientSlug, artifactViewTypeForSpec(spec)]),
    )) {
      const workspaceSlug = CLIENT_WORKSPACE_SLUG[clientSlug]
      ctx.log.step(`[dry-run] would ensure ${viewType} view on ${workspaceSlug}`)
    }
    return r.finish(
      {
        showcase_presentations: CURATED_SHOWCASE_TEMPLATES.filter(isPresentation).length,
        showcase_funnels: CURATED_SHOWCASE_TEMPLATES.filter(isFunnel).length,
        showcase_funnel_pages: CURATED_SHOWCASE_TEMPLATES.filter(isFunnel).length,
      },
      warnings,
    )
  }

  for (const spec of CURATED_SHOWCASE_TEMPLATES) {
    if (isPresentation(spec)) {
      ctx.log.step(`Reskinning presentation "${spec.demoName}" for ${spec.clientSlug}`)
      presentations.push(await buildPresentationRow(ctx, spec, resolved, warnings))
      continue
    }
    if (isFunnel(spec)) {
      ctx.log.step(`Reskinning funnel "${spec.demoName}" for ${spec.clientSlug}`)
      const bundle = await buildFunnelBundle(ctx, spec, resolved, warnings)
      funnels.push(bundle.funnel)
      funnelPages.push(bundle.page)
    }
  }

  ctx.log.step(`Upserting ${presentations.length} showcase presentations`)
  await batchUpsert(ctx, 'presentations', presentations)

  ctx.log.step(`Upserting ${funnels.length} showcase funnels`)
  await batchUpsert(ctx, 'funnels', funnels)

  ctx.log.step(`Upserting ${funnelPages.length} showcase funnel_pages`)
  await batchUpsert(ctx, 'funnel_pages', funnelPages)

  ctx.log.step('Ensuring artifact views on client workspace spaces')
  const { patched, skipped } = await patchWorkspaceArtifactViews(ctx, resolved.orgId)
  ctx.log.step(`Space views: ${patched} patched, ${skipped} already present`)

  return r.finish(
    {
      showcase_presentations: presentations.length,
      showcase_funnels: funnels.length,
      showcase_funnel_pages: funnelPages.length,
      space_views_patched: patched,
      space_views_skipped: skipped,
    },
    warnings,
  )
}
