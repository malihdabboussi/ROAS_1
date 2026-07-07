import type { FunnelPage, FunnelPageBundle } from '../services/artifact-preview.service'

export type FunnelPageFlowEdge = {
  fromPageId: string
  toPageId: string
  label: string
}

const PAGE_TYPE_LABELS: Record<string, string> = {
  'opt-in': 'Opt-in',
  'thank-you': 'Thank you',
  confirmation: 'Confirmation',
  offer: 'Offer',
  'pre-call': 'Pre-call',
  home: 'Home',
}

export function getFunnelPagePath(page: FunnelPage): string {
  if (page.path && page.path !== '') return page.path
  if (page.page_type === 'home' || !page.slug || page.slug === 'home') return '/'
  return `/${page.slug}`
}

export function formatFunnelPageTypeLabel(page: FunnelPage): string {
  const fromType = PAGE_TYPE_LABELS[page.page_type]
  if (fromType) return fromType
  if (page.name?.trim()) return page.name.trim()
  return page.page_type
}

function sortFunnelPages(pages: FunnelPage[]): FunnelPage[] {
  return [...pages].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
}

function bundleHtmlContent(bundle: FunnelPageBundle): string {
  return [...bundle.files, ...bundle.shared_files].map((file) => file.content).join('\n')
}

function extractLeadNavTargets(bundle: FunnelPageBundle): string[] {
  const html = bundleHtmlContent(bundle)
  const targets: string[] = []

  if (/data-vibey-capture/.test(html)) {
    const nextPageMatch = html.match(/data-next-page=["']([^"']*)["']/)
    targets.push(nextPageMatch?.[1] ?? '')
  }

  for (const match of html.matchAll(/data-vibey-link=["']([^"']*)["']/g)) {
    targets.push(match[1] ?? '')
  }

  return targets
}

function resolveNavTargetToPage(
  pages: FunnelPage[],
  fromIndex: number,
  target: string | null | undefined,
): FunnelPage | null {
  const sorted = sortFunnelPages(pages)
  const normalizedTarget = (target ?? '').trim()

  if (!normalizedTarget) {
    return sorted[fromIndex + 1] ?? null
  }

  if (normalizedTarget.startsWith('http')) {
    return null
  }

  if (/^\d+$/.test(normalizedTarget)) {
    const idx = Number.parseInt(normalizedTarget, 10)
    return sorted[idx] ?? null
  }

  const pathTarget = normalizedTarget.startsWith('/') ? normalizedTarget : `/${normalizedTarget}`
  const byPath = sorted.find((page) => getFunnelPagePath(page) === pathTarget)
  if (byPath) return byPath

  const bySlug = sorted.find((page) => page.slug === normalizedTarget.replace(/^\//, ''))
  if (bySlug) return bySlug

  const byType = sorted.find((page) => page.page_type === normalizedTarget.replace(/^\//, ''))
  if (byType) return byType

  return null
}

export function buildFunnelPageFlowEdges(
  pages: FunnelPage[],
  bundlesByPageId: Record<string, FunnelPageBundle | null | undefined>,
): FunnelPageFlowEdge[] {
  const sorted = sortFunnelPages(pages)
  const edges: FunnelPageFlowEdge[] = []
  const seen = new Set<string>()

  for (let index = 0; index < sorted.length; index += 1) {
    const fromPage = sorted[index]
    if (!fromPage) continue
    const bundle = bundlesByPageId[fromPage.id]
    const targets = bundle ? extractLeadNavTargets(bundle) : ['']

    for (const target of targets) {
      const toPage = resolveNavTargetToPage(sorted, index, target)
      if (!toPage || toPage.id === fromPage.id) continue

      const key = `${fromPage.id}->${toPage.id}`
      if (seen.has(key)) continue
      seen.add(key)

      edges.push({
        fromPageId: fromPage.id,
        toPageId: toPage.id,
        label: formatFunnelPageTypeLabel(toPage),
      })
      break
    }
  }

  if (edges.length > 0) return edges

  for (let index = 0; index < sorted.length - 1; index += 1) {
    const fromPage = sorted[index]
    const toPage = sorted[index + 1]
    if (!fromPage || !toPage) continue
    edges.push({
      fromPageId: fromPage.id,
      toPageId: toPage.id,
      label: formatFunnelPageTypeLabel(toPage),
    })
  }

  return edges
}

export function mapOutgoingFunnelPageFlowEdges(
  edges: FunnelPageFlowEdge[],
): Map<string, FunnelPageFlowEdge> {
  const map = new Map<string, FunnelPageFlowEdge>()
  for (const edge of edges) {
    if (!map.has(edge.fromPageId)) {
      map.set(edge.fromPageId, edge)
    }
  }
  return map
}
