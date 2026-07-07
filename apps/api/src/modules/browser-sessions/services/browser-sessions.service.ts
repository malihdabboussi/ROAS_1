import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { BrowserSessionCookieInput, SyncCookiesInput } from '../dtos/browser-sessions.dtos'
import { BrowserSessionsRepository } from '../repositories/browser-sessions.repository'
import { BrowserSessionsCryptoService } from './browser-sessions-crypto.service'

export interface BrowserSessionSummary {
  domain: string
  cookie_count: number
  synced_at: string
  first_synced_at: string | null
  min_expires_at: string | null
  disabled_at: string | null
}

/**
 * Business logic for the browser-sessions surface consumed by the Chrome extension.
 *
 * All database operations run under the caller's RLS-enforced Supabase client
 * (passed in from the controller via the @Supabase() decorator). No service-role
 * key is used at runtime.
 *
 * Org scoping: when an X-Org-Id header is present, rows are saved under that org;
 * otherwise they land in the user's personal scope (org_id = null). The
 * browser_sessions table has separate unique indexes for each case.
 */
@Injectable()
export class BrowserSessionsService {
  private readonly logger = new Logger(BrowserSessionsService.name)

  constructor(
    private readonly crypto: BrowserSessionsCryptoService,
    private readonly browserSessionsRepository: BrowserSessionsRepository,
  ) {}

  async getConsent(supabase: SupabaseClient, userId: string): Promise<string | null> {
    const { data, error } = await this.browserSessionsRepository.getConsent(supabase, userId)
    if (error) {
      this.logger.error(`[getConsent] ${error.message}`)
      throw new BadRequestException('Failed to read consent status')
    }
    return (data?.browser_session_consent_at as string | null | undefined) ?? null
  }

  async setConsent(supabase: SupabaseClient, userId: string): Promise<string> {
    const nowIso = new Date().toISOString()
    const { error } = await this.browserSessionsRepository.setConsent(supabase, userId, nowIso)
    if (error) {
      this.logger.error(`[setConsent] ${error.message}`)
      throw new BadRequestException('Failed to record consent')
    }
    return nowIso
  }

  async getEnabledDomains(supabase: SupabaseClient): Promise<string[]> {
    const { data, error } = await this.browserSessionsRepository.listEnabledDomains(supabase)
    if (error) {
      this.logger.error(`[getEnabledDomains] ${error.message}`)
      throw new BadRequestException('Failed to load domain config')
    }
    return (data ?? []).map((row) => row.domain as string)
  }

  async listSessions(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
  ): Promise<BrowserSessionSummary[]> {
    const { data, error } = await this.browserSessionsRepository.listSessions(
      supabase,
      userId,
      orgId,
    )
    if (error) {
      this.logger.error(`[listSessions] ${error.message}`)
      throw new BadRequestException('Failed to list sessions')
    }
    return (data ?? []) as BrowserSessionSummary[]
  }

  async syncSession(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
    input: SyncCookiesInput,
  ): Promise<void> {
    const consentAt = await this.getConsent(supabase, userId)
    if (!consentAt) {
      throw new ConflictException('Consent required before syncing sessions')
    }

    const allowed = await this.getEnabledDomains(supabase)
    if (!allowed.includes(input.domain)) {
      throw new BadRequestException('Domain not in the approved list')
    }

    const cookies = input.cookies
    const encrypted = this.crypto.encrypt(JSON.stringify(cookies))
    const minExpires = computeMinExpiresIso(cookies)

    const existing = await this.browserSessionsRepository.findSessionForSync(
      supabase,
      userId,
      orgId,
      input.domain,
    )
    if (existing.error) {
      this.logger.error(`[syncSession.lookup] ${existing.error.message}`)
      throw new BadRequestException('Failed to sync session')
    }

    const nowIso = new Date().toISOString()
    const existingId = (existing.data?.id as string | null | undefined) ?? null
    const firstSyncedAt = (existing.data?.first_synced_at as string | null | undefined) ?? nowIso

    // Partial unique indexes on browser_sessions can't be used by Postgres
    // ON CONFLICT inference, so branch on the existence lookup above instead
    // of calling .upsert(). The partial indexes still enforce uniqueness at
    // the DB level for any racing concurrent inserts.
    if (existingId) {
      const { error } = await this.browserSessionsRepository.updateSession(supabase, existingId, {
        encrypted_cookies: encrypted,
        cookie_count: cookies.length,
        synced_at: nowIso,
        min_expires_at: minExpires,
        disabled_at: null,
      })
      if (error) {
        this.logger.error(`[syncSession.update] ${error.message}`)
        throw new BadRequestException('Failed to sync session')
      }
    } else {
      const { error } = await this.browserSessionsRepository.insertSession(supabase, {
        user_id: userId,
        org_id: orgId,
        domain: input.domain,
        encrypted_cookies: encrypted,
        cookie_count: cookies.length,
        synced_at: nowIso,
        first_synced_at: firstSyncedAt,
        min_expires_at: minExpires,
        disabled_at: null,
      })
      if (error) {
        this.logger.error(`[syncSession.insert] ${error.message}`)
        throw new BadRequestException('Failed to sync session')
      }
    }
  }

  async deleteSession(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
    domain: string,
  ): Promise<void> {
    const { error } = await this.browserSessionsRepository.deleteSession(
      supabase,
      userId,
      orgId,
      domain,
    )
    if (error) {
      this.logger.error(`[deleteSession] ${error.message}`)
      throw new BadRequestException('Failed to delete session')
    }
  }

  async setDisabled(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
    domain: string,
    disabled: boolean,
  ): Promise<void> {
    const { data, error } = await this.browserSessionsRepository.setDisabled(
      supabase,
      userId,
      orgId,
      domain,
      disabled ? new Date().toISOString() : null,
    )
    if (error) {
      this.logger.error(`[setDisabled] ${error.message}`)
      throw new BadRequestException('Failed to update session')
    }
    if (!data || data.length === 0) {
      throw new NotFoundException('Session not found')
    }
  }
}

function computeMinExpiresIso(cookies: BrowserSessionCookieInput[]): string | null {
  const expiries: number[] = []
  for (const cookie of cookies) {
    const expires = cookie.expires
    if (typeof expires === 'number' && Number.isFinite(expires) && expires > 0) {
      expiries.push(expires)
    }
  }
  if (expiries.length === 0) return null
  expiries.sort((a, b) => a - b)
  const representative = pickRepresentativeExpiry(expiries)
  return new Date(representative * 1000).toISOString()
}

function pickRepresentativeExpiry(sortedExpiries: number[]): number {
  // Ignore the lowest outliers (short-lived infra cookies like anti-bot/routing)
  // and track the lower quartile as a stable "session likely valid until" marker.
  if (sortedExpiries.length <= 4) return sortedExpiries[0]
  const quartileIndex = Math.floor(sortedExpiries.length * 0.25)
  return sortedExpiries[Math.min(Math.max(quartileIndex, 0), sortedExpiries.length - 1)]
}
