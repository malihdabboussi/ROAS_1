import { normalizeEmDashToHyphen } from './artifact-text-normalization'

export function sanitizeFilename(title: string, fallback = 'export'): string {
  const slugify = (value: string): string => {
    const raw = normalizeEmDashToHyphen(String(value ?? '').trim())
    return raw
      .normalize('NFKD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }
  const primary = slugify(title)
  if (primary) return primary
  const fallbackSlug = slugify(fallback ?? 'export')
  return fallbackSlug || 'export'
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

export function downloadJSON(data: unknown, title: string, filenameFallback?: string): string {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const filename = `${sanitizeFilename(title, filenameFallback ?? 'export')}.json`
  downloadBlob(blob, filename)
  return filename
}

export function downloadText(content: string, title: string): string {
  const blob = new Blob([content], { type: 'text/plain' })
  const filename = `${sanitizeFilename(title)}.txt`
  downloadBlob(blob, filename)
  return filename
}

export function downloadMarkdown(
  content: string,
  title: string,
  filenameFallback?: string,
): string {
  const blob = new Blob([content], { type: 'text/markdown' })
  const filename = `${sanitizeFilename(title, filenameFallback ?? 'export')}.md`
  downloadBlob(blob, filename)
  return filename
}

export function downloadHTML(html: string, title: string): string {
  const blob = new Blob([html], { type: 'text/html' })
  const filename = `${sanitizeFilename(title)}.html`
  downloadBlob(blob, filename)
  return filename
}

export function downloadDocx(
  data: Blob | ArrayBuffer | Uint8Array,
  title: string,
  filenameFallback?: string,
): string {
  const blob =
    data instanceof Blob
      ? data
      : new Blob([data as BlobPart], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        })
  const filename = `${sanitizeFilename(title, filenameFallback ?? 'export')}.docx`
  downloadBlob(blob, filename)
  return filename
}

export function downloadCSS(css: string, title: string): string {
  const blob = new Blob([css], { type: 'text/css' })
  const filename = `${sanitizeFilename(title)}.css`
  downloadBlob(blob, filename)
  return filename
}

export function downloadJS(js: string, title: string): string {
  const blob = new Blob([js], { type: 'text/javascript' })
  const filename = `${sanitizeFilename(title)}.js`
  downloadBlob(blob, filename)
  return filename
}

export function downloadCSV(data: string[][], title: string): string {
  const csv = data
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const filename = `${sanitizeFilename(title)}.csv`
  downloadBlob(blob, filename)
  return filename
}

export async function downloadImage(
  url: string,
  title: string,
  extension: 'png' | 'jpg' = 'png',
): Promise<string> {
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error('Failed to fetch image')
    const blob = await response.blob()
    const filename = `${sanitizeFilename(title)}.${extension}`
    downloadBlob(blob, filename)
    return filename
  } catch (err) {
    console.error('Image download failed:', err)
    throw new Error('Failed to download image. Check CORS policy.')
  }
}
