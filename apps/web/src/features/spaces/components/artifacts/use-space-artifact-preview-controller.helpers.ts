import {
  buildThemePreviewCss,
  fetchFunnelPageBundleCached,
  fetchFunnelPageCached,
  type ArtifactPreviewResource,
  type Funnel,
  type FunnelPage,
  type FunnelPageBundle,
  type Presentation,
} from '@/lib/artifacts'
import { cachedFetch } from '@/lib/cache/keyed-fetch-cache'
import { fetchCampaign } from '@/lib/campaigns'
import { getTheme } from '@/lib/themes'
import type { ArtifactPreviewSelection } from './artifact-preview-selection'

export type SelectedResource = ArtifactPreviewResource

export type Viewport = 'desktop' | 'tablet' | 'mobile'

export type SelectedFunnel = {
  id: string
  name: string
  status: string
  slug: string
  publishedUrl: string | null
  funnelType: string
  campaignId: string | null
  funnelThemeId: string | null
  themeId: string | null
  metadata: Record<string, unknown> | null
  layout?: Record<string, unknown> | null
}

export type SelectedPresentation = {
  id: string
  name: string
  status: 'draft' | 'generated' | 'published'
  fileUrl: string | null
  generatedHtml: string | null
  publishedUrl: string | null
  campaignId: string | null
  bundleVersion: number
}

export type PageContent = {
  code: string
  css: string
  name: string
  contract?: {
    normalization_applied: string[]
    recovery_applied: string[]
    used_fallback: boolean
  }
  bundle?: FunnelPageBundle
}

/**
 * Stable version key derived from the row's updated_at; unlike `Date.now()`,
 * unchanged realtime row events keep the same key.
 */
export function presentationBundleVersion(pres: Presentation): number {
  const parsed = pres.updated_at ? Date.parse(pres.updated_at) : Number.NaN
  return Number.isNaN(parsed) ? Date.now() : parsed
}

export function toSelectedPresentation(
  pres: Presentation,
  bundleVersion = presentationBundleVersion(pres),
): SelectedPresentation {
  return {
    id: pres.id,
    name: pres.name ?? 'Untitled Presentation',
    status: pres.status as 'draft' | 'generated' | 'published',
    fileUrl: pres.file_url ?? null,
    generatedHtml: pres.generated_html ?? null,
    publishedUrl: pres.published_url ?? null,
    campaignId: pres.campaign_id ?? null,
    bundleVersion,
  }
}

export function toSelectedFunnel(
  funnel: Funnel,
  activeThemeId: string | null,
): SelectedFunnel {
  const funnelThemeId = funnel.theme_id ?? null
  return {
    id: funnel.id,
    name: funnel.name,
    status: funnel.status ?? 'draft',
    slug: funnel.slug ?? '',
    publishedUrl: funnel.published_url ?? null,
    funnelType: funnel.funnel_type ?? 'custom',
    campaignId: funnel.campaign_id ?? null,
    funnelThemeId,
    themeId: activeThemeId ?? funnelThemeId,
    metadata: funnel.metadata ?? null,
    layout: funnel.layout ?? null,
  }
}

export async function loadFunnelPagePreview(
  funnelId: string,
  pageId: string,
): Promise<PageContent | { error: string }> {
  const page = await fetchFunnelPageCached(funnelId, pageId)
  if (page.source_mode === 'html_bundle') {
    const bundle = await fetchFunnelPageBundleCached(funnelId, pageId)
    return { code: '', css: '', name: page.name, bundle }
  }
  const content = page.generated_html ?? ''
  if (!content) {
    return { error: 'Page has no generated content yet' }
  }
  return {
    code: content,
    css: page.generated_css ?? '',
    name: page.name,
    contract: page.preview_contract,
  }
}

export function selectionToResource(selection: ArtifactPreviewSelection): SelectedResource {
  switch (selection.type) {
    case 'doc':
      return { type: 'doc', id: selection.id, name: selection.title }
    case 'funnel':
    case 'website':
      return { type: 'funnel', id: selection.id, name: selection.title }
    case 'offer':
      return { type: 'offer', id: selection.id, name: selection.title }
    case 'form':
      return { type: 'form', id: selection.id, name: selection.title }
    case 'ad':
      return { type: 'ad', id: selection.id, name: selection.title }
    case 'ad_set':
      return { type: 'ad-set', id: selection.id, name: selection.title }
    case 'ad_campaign':
      return { type: 'ad-campaign', id: selection.id, name: selection.title }
    case 'sequence':
      return { type: 'sequence', id: selection.id, name: selection.title }
    case 'email':
      return { type: 'email', id: selection.id, name: selection.title }
    case 'presentation':
      return { type: 'presentation', id: selection.id, name: selection.title }
    case 'avatar':
      return { type: 'avatar', id: selection.id, name: selection.title }
    case 'social_post':
      return { type: 'social-post', id: selection.id, name: selection.title }
    case 'task':
    case 'mission':
    case 'flow':
    case 'theme':
    case 'custom_object':
      return { type: 'doc', id: selection.id, name: selection.title }
  }
}

export function sortPages(pages: FunnelPage[]): FunnelPage[] {
  return [...pages].sort(
    (a, b) =>
      ((a as { order_index?: number }).order_index ?? a.sort_order ?? 0) -
      ((b as { order_index?: number }).order_index ?? b.sort_order ?? 0),
  )
}

export async function fetchCampaignThemePreview(
  campaignId: string,
): Promise<{ themeId: string | null; css: string }> {
  const campaign = await cachedFetch(`campaign:${campaignId}`, () => fetchCampaign(campaignId), {
    ttlMs: 60_000,
  })
  const config = (campaign?.config ?? {}) as Record<string, unknown>
  const agentSettings = (config.agent_settings ?? {}) as Record<string, unknown>
  const themeId =
    typeof agentSettings.theme_id === 'string' && agentSettings.theme_id.trim()
      ? agentSettings.theme_id
      : null
  if (!themeId) return { themeId: null, css: '' }
  const theme = await cachedFetch(`theme:${themeId}`, () => getTheme(themeId), {
    ttlMs: 300_000,
  })
  return { themeId, css: buildThemePreviewCss(theme) }
}
