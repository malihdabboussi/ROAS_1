import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseClientFactory } from '@vibey/api-shared'

@Injectable()
export class ChatAccessTokenService {
  constructor(private readonly clientFactory: SupabaseClientFactory) {}

  decodeJwtExpSeconds(token: string): number | null {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const payload = parts[1] ?? ''
    try {
      const padded = payload.replace(/-/g, '+').replace(/_/g, '/')
      const json = Buffer.from(padded, 'base64').toString('utf8')
      const parsed = JSON.parse(json) as { exp?: number }
      return typeof parsed.exp === 'number' ? parsed.exp : null
    } catch {
      return null
    }
  }

  isJwtExpiredOrNearExpiry(token: string, skewSeconds = 30): boolean {
    const exp = this.decodeJwtExpSeconds(token)
    if (!exp) return true
    const now = Math.floor(Date.now() / 1000)
    return exp <= now + skewSeconds
  }

  isJwtExpiredDbError(err: unknown): boolean {
    const msg = err instanceof Error ? err.message : String(err)
    return /jwt expired/i.test(msg) || /invalid jwt/i.test(msg)
  }

  createRlsClient(accessToken: string): SupabaseClient {
    return this.clientFactory.createUserClient(accessToken)
  }

  async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken?: string }> {
    const url = process.env.SUPABASE_URL ?? ''
    const anonKey = process.env.SUPABASE_ANON_KEY ?? ''
    if (!url || !anonKey) throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY')
    const res = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Failed to refresh Supabase token: ${res.status} ${text.slice(0, 200)}`)
    }
    const json = (await res.json()) as { access_token?: string; refresh_token?: string }
    if (!json.access_token)
      throw new Error('Failed to refresh Supabase token: missing access_token')
    return { accessToken: json.access_token, refreshToken: json.refresh_token }
  }
}
