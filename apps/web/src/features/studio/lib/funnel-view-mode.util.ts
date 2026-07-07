import type { FunnelPage, FunnelPageBundle } from '../services/artifact-preview.service'

export function isFunnelHtmlBundleFullMode(params: {
  spacesDeepWorkBack?: (() => void) | null
  selectedFunnel: { id: string } | null | undefined
  funnelPages?: FunnelPage[] | null
  currentPageId?: string | null
  pageBundle?: FunnelPageBundle | null
}): boolean {
  if (!params.spacesDeepWorkBack || !params.selectedFunnel) return false
  if (params.pageBundle) return true

  const pages = params.funnelPages ?? []
  if (pages.length === 0) return false

  if (params.currentPageId) {
    const currentPage = pages.find((page) => page.id === params.currentPageId)
    if (currentPage?.source_mode === 'html_bundle') return true
  }

  return pages.some((page) => page.source_mode === 'html_bundle')
}
