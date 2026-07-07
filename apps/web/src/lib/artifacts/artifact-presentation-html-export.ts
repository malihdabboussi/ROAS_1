import type { PresentationBundle } from './artifact-types'

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const blob = await response.blob()
    return await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

export async function buildStandalonePresentationHtml(bundle: PresentationBundle): Promise<string> {
  const entry =
    bundle.files.find((file) => file.path === bundle.entry_file) ??
    bundle.files.find((file) => file.path === 'index.html')
  if (!entry)
    return '<!doctype html><html><body><main>No presentation entry file</main></body></html>'

  let html = entry.content
  const assetUrls = new Map<string, string>()

  for (const asset of bundle.assets) {
    const url = asset.url ?? asset.signed_url
    if (!url) continue
    const dataUrl = await urlToDataUrl(url)
    assetUrls.set(asset.path, dataUrl ?? url)
  }

  const replaceBundleAssets = (source: string): string => {
    let next = source
    for (const [path, url] of assetUrls) {
      next = next.replace(new RegExp(escapeRegExp(`./${path}`), 'g'), url)
      next = next.replace(new RegExp(escapeRegExp(path), 'g'), url)
    }
    return next
  }

  html = replaceBundleAssets(html)
  for (const file of bundle.files) {
    if (file.path === entry.path) continue
    const content = replaceBundleAssets(file.content)
    const pathPattern = `${escapeRegExp(file.path)}|${escapeRegExp(`./${file.path}`)}`
    if (file.mime_type === 'text/css' || file.path.endsWith('.css')) {
      html = html.replace(
        new RegExp(`<link([^>]+)href=["'](?:${pathPattern})["']([^>]*)>`, 'g'),
        `<style data-vibey-source="${file.path}">\n${content}\n</style>`,
      )
    } else if (
      file.mime_type === 'text/javascript' ||
      file.path.endsWith('.js') ||
      file.path.endsWith('.jsx')
    ) {
      html = html.replace(
        new RegExp(`<script([^>]+)src=["'](?:${pathPattern})["']([^>]*)><\\/script>`, 'g'),
        `<script data-vibey-source="${file.path}">\n${content}\n</script>`,
      )
    }
  }

  return html
}
