export interface HtmlBundleSrcDocFile {
  path: string
  content: string
  mime_type: string
  role: string
}

export interface HtmlBundleSrcDocAsset {
  path: string
  url?: string | null
  signed_url?: string | null
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function replaceAllLiteral(source: string, find: string, replace: string): string {
  if (!find) return source
  return source.replace(new RegExp(escapeRegExp(find), 'g'), replace)
}

export function applyBundleAssetUrls(source: string, assets: HtmlBundleSrcDocAsset[]): string {
  let next = source
  for (const asset of assets) {
    const url = asset.url ?? asset.signed_url
    if (!url) continue
    next = replaceAllLiteral(next, `./${asset.path}`, url)
    next = replaceAllLiteral(next, asset.path, url)
  }
  return next
}

export function inlineBundleLocalReferences(
  entryHtml: string,
  files: HtmlBundleSrcDocFile[],
  assets: HtmlBundleSrcDocAsset[],
  entryPath: string,
): string {
  let next = applyBundleAssetUrls(entryHtml, assets)

  for (const file of files) {
    if (file.path === entryPath) continue
    const content = applyBundleAssetUrls(file.content, assets)
    const escapedPath = escapeRegExp(file.path)
    const escapedDotPath = escapeRegExp(`./${file.path}`)

    if (file.mime_type === 'text/css' || file.path.endsWith('.css')) {
      next = next.replace(
        new RegExp(`<link([^>]+)href=["'](?:${escapedPath}|${escapedDotPath})["']([^>]*)>`, 'g'),
        `<style data-vibey-source="${file.path}">\n${content}\n</style>`,
      )
      continue
    }

    if (
      file.mime_type === 'text/javascript' ||
      file.path.endsWith('.js') ||
      file.path.endsWith('.jsx')
    ) {
      next = next.replace(
        new RegExp(
          `<script([^>]+)src=["'](?:${escapedPath}|${escapedDotPath})["']([^>]*)><\\/script>`,
          'g',
        ),
        `<script data-vibey-source="${file.path}">\n${content}\n</script>`,
      )
    }
  }

  return next
}

export function buildHtmlBundleSrcDoc(
  files: HtmlBundleSrcDocFile[],
  assets: HtmlBundleSrcDocAsset[],
  entryPath: string,
  emptyLabel = 'No entry file',
): string {
  const entry =
    files.find((file) => file.path === entryPath) ??
    files.find((file) => file.path === 'index.html')
  if (!entry) {
    return `<!doctype html><html><body><main><section><h1>${emptyLabel}</h1></section></main></body></html>`
  }
  return inlineBundleLocalReferences(entry.content, files, assets, entry.path)
}
