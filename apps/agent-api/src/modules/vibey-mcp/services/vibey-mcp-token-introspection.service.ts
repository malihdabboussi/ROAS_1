import { Injectable, UnauthorizedException } from '@nestjs/common'
import type { VibeyMcpTokenClaims } from '../types/vibey-mcp.types'

interface CachedClaims {
  claims: VibeyMcpTokenClaims
  expiresAtMs: number
}

@Injectable()
export class VibeyMcpTokenIntrospectionService {
  private readonly cache = new Map<string, CachedClaims>()

  async introspect(accessToken: string): Promise<VibeyMcpTokenClaims> {
    const cached = this.cache.get(accessToken)
    if (cached && cached.expiresAtMs > Date.now()) return cached.claims

    const baseUrl = (process.env.MAIN_API_URL ?? 'http://localhost:3001').replace(/\/$/, '')
    const response = await fetch(`${baseUrl}/api/mcp/oauth/introspect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token': process.env.INTERNAL_API_TOKEN ?? '',
      },
      body: JSON.stringify({ token: accessToken }),
    })
    if (!response.ok) throw new UnauthorizedException('Invalid MCP access token')
    const body = (await response.json()) as Partial<VibeyMcpTokenClaims> & {
      active?: boolean
      scope?: string
    }
    if (
      !body.active ||
      !body.user_id ||
      !body.client_id ||
      !body.supabase_access_token ||
      !body.exp
    ) {
      throw new UnauthorizedException('Invalid MCP access token')
    }
    const claims: VibeyMcpTokenClaims = {
      user_id: body.user_id,
      org_id: body.org_id ?? null,
      client_id: body.client_id,
      scopes: Array.isArray(body.scopes)
        ? body.scopes
        : typeof body.scope === 'string'
          ? body.scope.split(/\s+/).filter(Boolean)
          : [],
      exp: body.exp,
      supabase_access_token: body.supabase_access_token,
      supabase_refresh_token: body.supabase_refresh_token ?? null,
    }
    this.cache.set(accessToken, {
      claims,
      expiresAtMs: Math.min(claims.exp * 1000, Date.now() + 60_000),
    })
    return claims
  }
}
