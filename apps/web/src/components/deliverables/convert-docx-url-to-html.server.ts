const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const BACKEND_URL = process.env.BACKEND_URL ?? ''

function isAllowedDocxPreviewUrl(fileUrl: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(fileUrl)
  } catch {
    return false
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false

  const host = parsed.hostname.toLowerCase()
  if (host.endsWith('.supabase.co')) return true

  if (SUPABASE_URL) {
    try {
      if (host === new URL(SUPABASE_URL).hostname) return true
    } catch {
      /* ignore invalid env */
    }
  }

  if (BACKEND_URL) {
    try {
      if (host === new URL(BACKEND_URL).hostname) return true
    } catch {
      /* ignore invalid env */
    }
  }

  return false
}

export async function convertDocxUrlToHtml(fileUrl: string): Promise<string> {
  if (!isAllowedDocxPreviewUrl(fileUrl)) {
    throw new Error('Preview URL not allowed')
  }

  const response = await fetch(fileUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch document (${response.status})`)
  }

  const buffer = await response.arrayBuffer()
  const mod = await import('mammoth')
  const mammoth = mod.default ?? mod
  const result = await mammoth.convertToHtml({ buffer: Buffer.from(buffer) })
  return result.value
}
