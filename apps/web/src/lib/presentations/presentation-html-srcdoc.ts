import { buildHtmlBundleSrcDoc } from '@/lib/html/html-bundle-srcdoc'
import type { PresentationBundle } from '@/lib/artifacts/artifact-types'

export function buildPresentationHtmlSrcDoc(bundle: PresentationBundle): string {
  return buildHtmlBundleSrcDoc(
    bundle.files,
    bundle.assets,
    bundle.entry_file,
    'No presentation entry file',
  )
}
