import { BadRequestException, Injectable } from '@nestjs/common'
import type { OpenAICodexTokenBundle } from '../types/openai-codex.types'

const CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann'
const AUTHORIZE_URL = 'https://auth.openai.com/oauth/authorize'
const TOKEN_URL = 'https://auth.openai.com/oauth/token'
const REDIRECT_URI = 'http://localhost:1455/auth/callback'
const SCOPE = 'openid profile email offline_access'
const JWT_CLAIM_PATH = 'https://api.openai.com/auth'

type OpenAICodexTokenResponse = {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  id_token?: string
}

@Injectable()
export class OpenAICodexIntegration {
  buildAuthorizationUrl(input: { state: string; codeChallenge: string }): string {
    const url = new URL(AUTHORIZE_URL)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('client_id', CLIENT_ID)
    url.searchParams.set('redirect_uri', REDIRECT_URI)
    url.searchParams.set('scope', SCOPE)
    url.searchParams.set('code_challenge', input.codeChallenge)
    url.searchParams.set('code_challenge_method', 'S256')
    url.searchParams.set('state', input.state)
    url.searchParams.set('id_token_add_organizations', 'true')
    url.searchParams.set('codex_cli_simplified_flow', 'true')
    url.searchParams.set('originator', 'vibey')
    return url.toString()
  }

  async exchangeAuthorizationCode(input: {
    code: string
    codeVerifier: string
  }): Promise<OpenAICodexTokenBundle> {
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        code: input.code,
        code_verifier: input.codeVerifier,
        redirect_uri: REDIRECT_URI,
      }),
    })

    if (!response.ok) {
      throw new BadRequestException('OpenAI Codex token exchange failed')
    }

    const json = (await response.json()) as OpenAICodexTokenResponse
    if (!json.access_token || !json.refresh_token || typeof json.expires_in !== 'number') {
      throw new BadRequestException('OpenAI Codex token response was incomplete')
    }

    const metadata = this.decodeTokenMetadata(json.access_token)
    if (!metadata.accountId) {
      throw new BadRequestException('OpenAI Codex account id was missing from token')
    }

    return {
      access: json.access_token,
      refresh: json.refresh_token,
      expires: Date.now() + json.expires_in * 1000,
      accountId: metadata.accountId,
      email: metadata.email,
    }
  }

  decodeTokenMetadata(accessToken: string): { accountId: string | null; email: string | null } {
    const payload = this.decodeJwtPayload(accessToken)
    const auth = payload?.[JWT_CLAIM_PATH]
    const accountId =
      auth && typeof auth === 'object' ? (auth as Record<string, unknown>).chatgpt_account_id : null
    const email = typeof payload?.email === 'string' ? payload.email : null
    return {
      accountId: typeof accountId === 'string' && accountId.length > 0 ? accountId : null,
      email,
    }
  }

  private decodeJwtPayload(token: string): Record<string, unknown> | null {
    try {
      const payload = token.split('.')[1]
      if (!payload) return null
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
      const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=')
      return JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as Record<string, unknown>
    } catch {
      return null
    }
  }
}
