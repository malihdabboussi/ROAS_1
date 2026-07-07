import { createHmac } from 'crypto'

export function signFunnelPreviewToken(pageId: string, secret: string): string {
  const ts = Math.floor(Date.now() / 1000)
  const payload = `${pageId}:${ts}`
  const sig = createHmac('sha256', secret).update(payload).digest('hex').slice(0, 16)
  return `${ts}.${sig}`
}

export function verifyFunnelPreviewToken(pageId: string, token: string, secret: string): boolean {
  const parts = token.split('.')
  if (parts.length !== 2) return false

  const [tsStr, sig] = parts
  const ts = parseInt(tsStr!, 10)
  if (Number.isNaN(ts)) return false
  if (Date.now() / 1000 - ts > 3600) return false

  const expected = createHmac('sha256', secret)
    .update(`${pageId}:${ts}`)
    .digest('hex')
    .slice(0, 16)
  return sig === expected
}
