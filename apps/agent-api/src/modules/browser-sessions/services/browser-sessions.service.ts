import * as crypto from 'crypto'
import { randomUUID } from 'crypto'
import { mkdtemp, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { BrowserSessionsRepository } from '../repositories/browser-sessions.repository'

export interface BrowserCookie {
  name: string
  value: string
  domain?: string
  path?: string
  expires?: number
  httpOnly?: boolean
  secure?: boolean
  sameSite?: 'Lax' | 'None' | 'Strict'
}

export interface BrowserSessionSummary {
  domain: string
  cookie_count: number
  synced_at: string
  first_synced_at: string | null
  min_expires_at: string | null
  disabled_at: string | null
}

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const TAG_LENGTH = 16

@Injectable()
export class BrowserSessionsService {
  private readonly logger = new Logger(BrowserSessionsService.name)

  constructor(private readonly repository: BrowserSessionsRepository) {}

  private get encryptionKey(): Buffer {
    const raw = process.env.BROWSER_SESSION_ENCRYPTION_KEY ?? ''
    if (!raw) {
      return crypto.createHash('sha256').update('vibey-browser-sessions-dev-key').digest()
    }
    return crypto.createHash('sha256').update(raw).digest()
  }

  private encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv(ALGORITHM, this.encryptionKey, iv)
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    return Buffer.concat([iv, tag, encrypted]).toString('base64')
  }

  private decrypt(ciphertext: string): string {
    const buf = Buffer.from(ciphertext, 'base64')
    const iv = buf.subarray(0, IV_LENGTH)
    const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
    const encrypted = buf.subarray(IV_LENGTH + TAG_LENGTH)
    const decipher = crypto.createDecipheriv(ALGORITHM, this.encryptionKey, iv)
    decipher.setAuthTag(tag)
    return decipher.update(encrypted) + decipher.final('utf8')
  }

  private minExpiresAtFromCookies(cookies: BrowserCookie[]): Date | null {
    const expiries = cookies
      .map((c) => c.expires)
      .filter((e): e is number => typeof e === 'number' && Number.isFinite(e) && e > 0)
    if (expiries.length === 0) return null
    return new Date(Math.min(...expiries) * 1000)
  }

  async syncCookies(
    userId: string,
    orgId: string | null,
    domain: string,
    cookies: BrowserCookie[],
  ): Promise<{ ok: boolean; error?: string }> {
    const consent = await this.getUserConsent(userId)
    if (!consent) {
      return { ok: false, error: 'browser_session_consent_required' }
    }

    const disabledRow = await this.repository.getExistingSession(userId, orgId, domain)
    if (disabledRow?.disabled_at) {
      return { ok: false, error: 'domain_disabled_by_user' }
    }

    const encrypted = this.encrypt(JSON.stringify(cookies))
    const minExpiresAt = this.minExpiresAtFromCookies(cookies)
    const nowIso = new Date().toISOString()

    const row = {
      user_id: userId,
      org_id: orgId || null,
      domain: domain.toLowerCase(),
      encrypted_cookies: encrypted,
      cookie_count: cookies.length,
      synced_at: nowIso,
      first_synced_at: disabledRow?.first_synced_at ?? nowIso,
      min_expires_at: minExpiresAt ? minExpiresAt.toISOString() : null,
      disabled_at: null,
    }

    const errorMessage = await this.repository.upsertSession(
      row,
      orgId ? 'user_id,org_id,domain' : 'user_id,domain',
    )

    if (errorMessage) {
      this.logger.error(`Failed to sync browser session: ${errorMessage}`)
      return { ok: false, error: errorMessage }
    }

    this.logger.log(`Browser session synced for ${domain} (${cookies.length} cookies)`)
    return { ok: true }
  }

  async listSessions(
    userId: string,
    orgId: string | null,
  ): Promise<BrowserSessionSummary[]> {
    const { sessions, errorMessage } = await this.repository.listSessions(userId, orgId)
    if (errorMessage) {
      this.logger.error(`Failed to list browser sessions: ${errorMessage}`)
      return []
    }
    return sessions
  }

  async setDomainDisabled(
    userId: string,
    orgId: string | null,
    domain: string,
    disabled: boolean,
  ): Promise<{ ok: boolean; error?: string }> {
    const errorMessage = await this.repository.setDomainDisabled(userId, orgId, domain, disabled)
    if (errorMessage) return { ok: false, error: errorMessage }
    return { ok: true }
  }

  async getDomainConfig(): Promise<string[]> {
    const { domains, errorMessage } = await this.repository.listEnabledDomains()
    if (errorMessage) {
      this.logger.warn(`Failed to load domain config: ${errorMessage}`)
      return []
    }
    return domains
  }

  async recordUserConsent(userId: string): Promise<{ consent_at: string }> {
    const existingConsent = await this.getUserConsent(userId)
    if (existingConsent) {
      return { consent_at: existingConsent }
    }

    const nowIso = new Date().toISOString()
    const errorMessage = await this.repository.recordUserConsent(userId, nowIso)
    if (errorMessage) {
      this.logger.error(`Failed to record browser session consent: ${errorMessage}`)
    }
    return { consent_at: nowIso }
  }

  async getUserConsent(userId: string): Promise<string | null> {
    return this.repository.getUserConsent(userId)
  }

  async loadCookies(
    userId: string,
    orgId: string | null,
    domain: string,
  ): Promise<BrowserCookie[]> {
    const data = await this.repository.loadCookieRow(userId, orgId, domain)
    if (!data) return []
    if (data.disabled_at) return []

    try {
      const cookies = JSON.parse(this.decrypt(data.encrypted_cookies)) as BrowserCookie[]
      return Array.isArray(cookies) ? cookies : []
    } catch (err) {
      this.logger.error(`Failed to decrypt browser session: ${err}`)
      return []
    }
  }

  private netscapeLineForCookie(cookie: BrowserCookie): string | null {
    const domain = (cookie.domain ?? '').trim()
    if (!domain) return null
    const includeSubdomains = domain.startsWith('.') ? 'TRUE' : 'FALSE'
    const host = domain
    const path = cookie.path && cookie.path.trim() ? cookie.path : '/'
    const secure = cookie.secure ? 'TRUE' : 'FALSE'
    const expiry = typeof cookie.expires === 'number' && cookie.expires > 0 ? cookie.expires : 0
    const name = cookie.name
    const value = cookie.value
    return [host, includeSubdomains, path, secure, String(Math.floor(expiry)), name, value].join(
      '\t',
    )
  }

  async writeNetscapeCookieFile(
    cookies: BrowserCookie[],
    outputPath: string,
  ): Promise<{ path: string; lines: number }> {
    const header = '# Netscape HTTP Cookie File\n# Generated by Vibey (browser-sessions)\n'
    const lines = cookies
      .map((c) => this.netscapeLineForCookie(c))
      .filter((l): l is string => l !== null)
    const body = lines.join('\n') + (lines.length > 0 ? '\n' : '')
    await writeFile(outputPath, header + body, 'utf8')
    return { path: outputPath, lines: lines.length }
  }

  async loadCookiesForYtDlp(
    userIdOrSupabase: string | SupabaseClient,
    orgIdOrUserId: string | null,
    domainOrOrgId: string | null,
    legacyDomain?: string,
  ): Promise<string | null> {
    const userId = typeof userIdOrSupabase === 'string' ? userIdOrSupabase : orgIdOrUserId
    const orgId = typeof userIdOrSupabase === 'string' ? orgIdOrUserId : domainOrOrgId
    const domain = typeof userIdOrSupabase === 'string' ? domainOrOrgId : legacyDomain
    if (!userId || !domain) return null
    const cookies = await this.loadCookies(userId, orgId, domain)
    if (cookies.length === 0) return null
    const dir = await mkdtemp(join(tmpdir(), 'vibey-ytdlp-cookies-'))
    const filePath = join(dir, `cookies-${randomUUID()}.txt`)
    const { lines } = await this.writeNetscapeCookieFile(cookies, filePath)
    if (lines === 0) return null
    return filePath
  }

  async injectCookiesIntoGateway(
    userId: string,
    orgId: string | null,
    domain: string,
    sessionKey?: string,
  ): Promise<number> {
    const cookies = await this.loadCookies(userId, orgId, domain)
    if (cookies.length === 0) return 0

    const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL ?? 'http://localhost:18789'
    const gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN ?? ''
    const browserProfile = process.env.OPENCLAW_BROWSER_PROFILE?.trim() || undefined

    let injected = 0
    let targetId: string | undefined
    for (const cookie of cookies) {
      try {
        const res = await fetch(`${gatewayUrl}/tools/invoke`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${gatewayToken}`,
          },
          body: JSON.stringify({
            tool: 'browser',
            action: 'cookies_set',
            ...(sessionKey ? { sessionKey } : {}),
            args: {
              cookie,
              ...(targetId ? { targetId } : {}),
              ...(browserProfile ? { profile: browserProfile } : {}),
            },
          }),
          signal: AbortSignal.timeout(5_000),
        })
        if (!res.ok) continue
        const payload = (await res.json()) as {
          ok?: boolean
          result?: { details?: { targetId?: string } }
        }
        if (payload.ok) {
          injected++
          const nextTargetId = payload.result?.details?.targetId
          if (typeof nextTargetId === 'string' && nextTargetId.trim()) {
            targetId = nextTargetId.trim()
          }
        }
      } catch (err) {
        this.logger.warn(`Failed to inject cookie ${cookie.name}: ${err}`)
      }
    }

    this.logger.log(`Injected ${injected}/${cookies.length} cookies for ${domain}`)
    return injected
  }

  async deleteCookies(
    userId: string,
    orgId: string | null,
    domain: string,
  ): Promise<void> {
    await this.repository.deleteCookies(userId, orgId, domain)
  }
}
