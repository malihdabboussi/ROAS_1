import { BadRequestException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ErrorReporter, reportAppError } from '@vibey/api-shared'
import type {
  FathomMeetingList,
  FathomOAuthTokenResponse,
  FathomWebhook,
} from '../types/fathom.types'

@Injectable()
export class FathomIntegration {
  private readonly clientId: string
  private readonly clientSecret: string
  private readonly redirectUri: string

  private readonly AUTH_BASE = 'https://fathom.video/external/v1/oauth2/authorize'
  private readonly TOKEN_URL = 'https://fathom.video/external/v1/oauth2/token'
  private readonly API_BASE = 'https://api.fathom.ai/external/v1'

  private readonly SCOPES = ['public_api']

  constructor(
    private readonly config: ConfigService,
    private readonly errorReporter: ErrorReporter,
  ) {
    this.clientId = this.config.get<string>('FATHOM_CLIENT_ID') || ''
    this.clientSecret = this.config.get<string>('FATHOM_CLIENT_SECRET') || ''
    this.redirectUri = this.config.get<string>('FATHOM_REDIRECT_URI') || ''
  }

  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret && this.redirectUri)
  }

  private throwApiError(status: number, detail: string, path: string): never {
    const message = `Fathom API error (${status}): ${detail}`
    const err = new BadRequestException(message)
    reportAppError(
      this.errorReporter,
      {
        app: process.env.APP_NAME ?? 'api',
        category: 'integration',
        feature: 'integrations/fathom',
        error_code: `upstream_http_${status}`,
        message,
        context: { path, status },
      },
      err,
    )
    throw err
  }

  buildAuthorizationUrl(state: string): string {
    if (!this.isConfigured()) {
      throw new BadRequestException('Missing Fathom OAuth configuration')
    }
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: this.SCOPES.join(' '),
      state,
    })
    return `${this.AUTH_BASE}?${params.toString()}`
  }

  async exchangeCodeForTokens(code: string): Promise<FathomOAuthTokenResponse> {
    const res = await fetch(this.TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
      }),
    })
    if (!res.ok) {
      const text = await res.text()
      this.throwApiError(res.status, text || 'token exchange failed', '/oauth2/token')
    }
    return res.json() as Promise<FathomOAuthTokenResponse>
  }

  async refreshAccessToken(refreshToken: string): Promise<FathomOAuthTokenResponse> {
    const res = await fetch(this.TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
      }),
    })
    if (!res.ok) {
      const text = await res.text()
      this.throwApiError(res.status, text || 'token refresh failed', '/oauth2/token')
    }
    return res.json() as Promise<FathomOAuthTokenResponse>
  }

  async listMeetings(accessToken: string, cursor?: string): Promise<FathomMeetingList> {
    const params = new URLSearchParams()
    if (cursor) params.set('cursor', cursor)

    const url = `${this.API_BASE}/meetings${params.toString() ? `?${params.toString()}` : ''}`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) {
      const text = await res.text()
      let detail = text
      try {
        const json = JSON.parse(text) as { error?: string; message?: string; detail?: string }
        detail = json.error ?? json.message ?? json.detail ?? text
      } catch {
        /* use raw text */
      }
      this.throwApiError(res.status, detail || 'Failed to list Fathom meetings', '/meetings')
    }
    return res.json() as Promise<FathomMeetingList>
  }

  async listTeams(accessToken: string): Promise<Array<{ name: string }>> {
    const res = await fetch(`${this.API_BASE}/teams`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) {
      const text = await res.text()
      this.throwApiError(res.status, text || 'Failed to list Fathom teams', '/teams')
    }
    const body = (await res.json()) as { items?: Array<{ name?: string }> }
    return (body.items ?? [])
      .filter((team): team is { name: string } => typeof team.name === 'string')
      .map((team) => ({ name: team.name.trim() }))
      .filter((team) => team.name.length > 0)
  }

  async getRecordingTranscript(
    accessToken: string,
    recordingId: string | number,
  ): Promise<{
    transcript: Array<{ speaker?: { display_name?: string }; text?: string; timestamp?: string }>
  }> {
    const id = String(recordingId)
    const res = await fetch(`${this.API_BASE}/recordings/${id}/transcript`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) {
      const text = await res.text()
      let detail = text
      try {
        const json = JSON.parse(text) as { error?: string; message?: string; detail?: string }
        detail = json.error ?? json.message ?? json.detail ?? text
      } catch {
        /* use raw text */
      }
      this.throwApiError(
        res.status,
        detail || 'Failed to get transcript',
        `/recordings/${id}/transcript`,
      )
    }
    return res.json() as Promise<{
      transcript: Array<{ speaker?: { display_name?: string }; text?: string; timestamp?: string }>
    }>
  }

  async getRecordingSummary(
    accessToken: string,
    recordingId: string | number,
  ): Promise<{
    summary: { template_name?: string; markdown_formatted?: string } | null
  }> {
    const id = String(recordingId)
    const res = await fetch(`${this.API_BASE}/recordings/${id}/summary`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) {
      const text = await res.text()
      let detail = text
      try {
        const json = JSON.parse(text) as { error?: string; message?: string; detail?: string }
        detail = json.error ?? json.message ?? json.detail ?? text
      } catch {
        /* use raw text */
      }
      this.throwApiError(res.status, detail || 'Failed to get summary', `/recordings/${id}/summary`)
    }
    return res.json() as Promise<{
      summary: { template_name?: string; markdown_formatted?: string } | null
    }>
  }

  async createWebhook(
    accessToken: string,
    opts: {
      destinationUrl: string
      triggeredFor: string[]
      includeTranscript?: boolean
      includeSummary?: boolean
      includeActionItems?: boolean
      includeCrmMatches?: boolean
    },
  ): Promise<FathomWebhook> {
    const reqBody = {
      destination_url: opts.destinationUrl,
      triggered_for: opts.triggeredFor,
      include_transcript: opts.includeTranscript ?? false,
      include_summary: opts.includeSummary ?? false,
      include_action_items: opts.includeActionItems ?? false,
      include_crm_matches: opts.includeCrmMatches ?? false,
    }
    const res = await fetch(`${this.API_BASE}/webhooks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reqBody),
    })
    if (!res.ok) {
      const text = await res.text()
      this.throwApiError(res.status, text || 'Failed to create Fathom webhook', '/webhooks')
    }
    return res.json() as Promise<FathomWebhook>
  }

  async listWebhooks(accessToken: string): Promise<FathomWebhook[]> {
    const res = await fetch(`${this.API_BASE}/webhooks`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) this.throwApiError(res.status, 'Failed to list Fathom webhooks', '/webhooks')
    const data = (await res.json()) as { items: FathomWebhook[] }
    return data.items ?? []
  }

  async deleteWebhook(accessToken: string, webhookId: string): Promise<void> {
    const res = await fetch(`${this.API_BASE}/webhooks/${webhookId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok)
      this.throwApiError(res.status, 'Failed to delete Fathom webhook', `/webhooks/${webhookId}`)
  }
}
