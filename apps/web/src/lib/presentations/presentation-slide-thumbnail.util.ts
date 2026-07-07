import type { PresentationBundle } from '@/lib/artifacts/artifact-types'
import { buildPresentationHtmlSrcDoc } from './presentation-html-srcdoc'
import { injectPresentationSlideIsolation } from './presentation-slide-isolation.util'

export function buildPresentationSlideThumbnailSrcDoc(
  bundle: PresentationBundle,
  slideIndex: number,
): string | null {
  if (!bundle.has_entry || slideIndex < 0) return null

  const fullDoc = buildPresentationHtmlSrcDoc(bundle)
  return injectPresentationSlideIsolation(fullDoc, slideIndex)
}
