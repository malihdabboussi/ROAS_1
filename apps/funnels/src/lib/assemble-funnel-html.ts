import type { FunnelBundleAsset, FunnelBundleFile, FunnelPageBundle } from './resolve-funnel-bundle'

export interface AssembledFunnelHtml {
  /** Inner-body HTML with assets rewritten and referenced scripts inlined. */
  bodyHtml: string
  /** All bundle CSS (shared first, then page) with assets rewritten. */
  css: string
  /** Title extracted from the entry <head>, if any. */
  title: string | null
  /** Meta description extracted from the entry <head>, if any. */
  description: string | null
  /** Shared nav/footer fragments (assets rewritten), when present. */
  navHtml: string | null
  footerHtml: string | null
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function rewriteAssetPaths(html: string, assets: FunnelBundleAsset[]): string {
  let next = html
  for (const asset of assets) {
    if (!asset.url) continue
    next = next.replace(new RegExp(escapeRegExp(`./${asset.path}`), 'g'), asset.url)
    next = next.replace(new RegExp(escapeRegExp(asset.path), 'g'), asset.url)
  }
  return next
}

function extractHead(entryHtml: string): { title: string | null; description: string | null } {
  const headMatch = entryHtml.match(/<head[^>]*>([\s\S]*?)<\/head>/i)
  const head = headMatch?.[1] ?? ''
  const title = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? null
  const description =
    head.match(/<meta[^>]+name=["']description["'][^>]*content=["']([\s\S]*?)["'][^>]*>/i)?.[1] ??
    head.match(/<meta[^>]+content=["']([\s\S]*?)["'][^>]*name=["']description["'][^>]*>/i)?.[1] ??
    null
  return { title, description: description?.trim() ?? null }
}

function extractBodyInner(entryHtml: string): string {
  const bodyMatch = entryHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i)
  if (bodyMatch?.[1]) return bodyMatch[1]
  // Fragments without a full document wrapper render as-is (minus head/doctype).
  return entryHtml
    .replace(/<!doctype[^>]*>/i, '')
    .replace(/<head[^>]*>[\s\S]*?<\/head>/i, '')
    .replace(/<\/?html[^>]*>/gi, '')
    .replace(/<\/?body[^>]*>/gi, '')
}

function isCssFile(file: FunnelBundleFile): boolean {
  return file.mime_type === 'text/css' || file.path.endsWith('.css')
}

function isJsFile(file: FunnelBundleFile): boolean {
  return (
    file.mime_type === 'text/javascript' || file.path.endsWith('.js') || file.path.endsWith('.jsx')
  )
}

/**
 * Inline `<script src="page.js">` references in body HTML with the bundle
 * file contents (mirrors the presentation srcDoc builder, fragment-shaped).
 */
function inlineReferencedScripts(bodyHtml: string, files: FunnelBundleFile[]): string {
  let next = bodyHtml
  for (const file of files) {
    if (!isJsFile(file)) continue
    const pathPattern = `${escapeRegExp(file.path)}|${escapeRegExp(`./${file.path}`)}`
    next = next.replace(
      new RegExp(`<script([^>]*)src=["'](?:${pathPattern})["']([^>]*)><\\/script>`, 'g'),
      `<script data-vibey-source="${file.path}">\n${file.content}\n</script>`,
    )
  }
  return next
}

/** Head metadata from a bundle entry, for generateMetadata fallbacks. */
export function extractFunnelBundleHeadMeta(bundle: FunnelPageBundle): {
  title: string | null
  description: string | null
} {
  const entry = bundle.files.find((file) => file.path === 'index.html')
  if (!entry) return { title: null, description: null }
  return extractHead(entry.content)
}

/**
 * Assemble a funnel page HTML bundle into SSR-ready fragments. Funnel pages
 * render directly into the page response (no iframe) so crawlers see the
 * content and the lead/navigation runtime stays same-origin.
 */
export function assembleFunnelHtml(bundle: FunnelPageBundle): AssembledFunnelHtml | null {
  const entry = bundle.files.find((file) => file.path === 'index.html')
  if (!entry) return null

  const { title, description } = extractHead(entry.content)

  let bodyHtml = extractBodyInner(entry.content)
  bodyHtml = inlineReferencedScripts(bodyHtml, [...bundle.sharedFiles, ...bundle.files])
  bodyHtml = rewriteAssetPaths(bodyHtml, bundle.assets)

  const cssFiles = [...bundle.sharedFiles.filter(isCssFile), ...bundle.files.filter(isCssFile)]
  const css = cssFiles
    .map((file) => `/* ${file.path} */\n${rewriteAssetPaths(file.content, bundle.assets)}`)
    .join('\n\n')

  const navFile = bundle.sharedFiles.find((file) => file.path === 'shared/nav.html')
  const footerFile = bundle.sharedFiles.find((file) => file.path === 'shared/footer.html')

  return {
    bodyHtml,
    css,
    title,
    description,
    navHtml: navFile ? rewriteAssetPaths(navFile.content, bundle.assets) : null,
    footerHtml: footerFile ? rewriteAssetPaths(footerFile.content, bundle.assets) : null,
  }
}
