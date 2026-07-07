function sanitizeFilename(title: string, fallback = 'export'): string {
  const slugify = (value: string): string =>
    String(value ?? '')
      .trim()
      .normalize('NFKD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

  const primary = slugify(title)
  if (primary) return primary
  const fb = slugify(fallback)
  return fb || 'export'
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

export function downloadJSON(data: unknown, title: string, filenameFallback?: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const filename = `${sanitizeFilename(title, filenameFallback ?? 'export')}.json`
  downloadBlob(blob, filename)
  return filename
}

export function downloadMarkdown(content: string, title: string, filenameFallback?: string) {
  const blob = new Blob([content], { type: 'text/markdown' })
  const filename = `${sanitizeFilename(title, filenameFallback ?? 'export')}.md`
  downloadBlob(blob, filename)
  return filename
}
