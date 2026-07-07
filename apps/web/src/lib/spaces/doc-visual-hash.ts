export async function hashDocSource(html: string | null | undefined): Promise<string | null> {
  const text = (html ?? '').trim()
  if (!text) return null
  const buffer = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
}
