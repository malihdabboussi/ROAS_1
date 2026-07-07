import type {
  ArtifactPreviewResource,
  FunnelPage,
  FunnelPageBundle,
  Presentation,
} from '@/lib/artifacts'
import type { ArtifactsState } from '../tree/types'

type FunnelArtifact = ArtifactsState['funnels'][number]

export type SelectedFunnel = {
  id: string
  name: string
  status: string
  slug: string
  publishedUrl: string | null
  funnelType: string
  campaignId: string | null
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
}

export type FunnelPagePreviewContent = {
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

export function toSelectedFunnel(
  funnel: FunnelArtifact,
  activeThemeId: string | null,
): SelectedFunnel {
  return {
    id: funnel.id,
    name: funnel.name,
    status: funnel.status ?? 'draft',
    slug: funnel.slug ?? '',
    publishedUrl: funnel.published_url ?? null,
    funnelType: funnel.funnel_type ?? 'custom',
    campaignId: funnel.campaign_id ?? null,
    themeId: activeThemeId ?? funnel.theme_id ?? null,
    metadata: funnel.metadata ?? null,
    layout: funnel.layout ?? null,
  }
}

export function toSelectedPresentation(presentation: Presentation): SelectedPresentation {
  return {
    id: presentation.id,
    name: presentation.name ?? 'Untitled Presentation',
    status: presentation.status as 'draft' | 'generated' | 'published',
    fileUrl: presentation.file_url ?? null,
    generatedHtml: presentation.generated_html ?? null,
    publishedUrl: presentation.published_url ?? null,
    campaignId: presentation.campaign_id ?? null,
  }
}

export function sortFunnelPagesForSelection(pages: FunnelPage[]): FunnelPage[] {
  return [...pages].sort(
    (a, b) =>
      ((a as { order_index?: number }).order_index ?? a.sort_order ?? 0) -
      ((b as { order_index?: number }).order_index ?? b.sort_order ?? 0),
  )
}

export function getFirstSortedFunnelPage(funnel: FunnelArtifact): FunnelPage | null {
  return sortFunnelPagesForSelection(funnel.pages ?? [])[0] ?? null
}

export function getLatestBlogPostForFunnel(
  blogPosts: ArtifactsState['blogPosts'],
  funnelId: string,
) {
  return blogPosts
    .filter((post) => post.funnel_id === funnelId)
    .sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime() ||
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )[0]
}

export function getCategorySettingsResource(
  id: string,
  label: string,
): ArtifactPreviewResource | null {
  const sectionMap: Record<string, string> = {
    ads: 'ads',
    funnels: 'funnel',
    presentations: 'presentation',
  }
  const section = sectionMap[id]
  if (!section) return null
  return {
    type: 'category-settings',
    id,
    section,
    name: `${label} Settings`,
  }
}
