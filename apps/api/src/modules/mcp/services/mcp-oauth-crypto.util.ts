import { createHash, timingSafeEqual } from 'crypto'

export const TOKEN_TYPE = 'Bearer'

export function secondsFromEnv(name: string, fallback: number): number {
  const parsed = Number(process.env[name])
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function base64Url(input: Buffer): string {
  return input.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export function hashSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex')
}

export function safeCompare(a: string, b: string): boolean {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  return aBuf.length === bBuf.length && timingSafeEqual(aBuf, bBuf)
}
