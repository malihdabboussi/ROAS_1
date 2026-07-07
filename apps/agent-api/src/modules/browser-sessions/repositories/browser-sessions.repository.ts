import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'
import type { BrowserSessionSummary } from '../services/browser-sessions.service'

export interface BrowserSessionUpsertRow {
  user_id: string
  org_id: string | null
  domain: string
  encrypted_cookies: string
  cookie_count: number
  synced_at: string
  first_synced_at: string
  min_expires_at: string | null
  disabled_at: string | null
}

export interface ExistingBrowserSessionRow {
  first_synced_at: string | null
  disabled_at: string | null
}

export interface BrowserSessionCookieRow {
  encrypted_cookies: string
  disabled_at: string | null
}

@Injectable()
export class BrowserSessionsRepository {
  private readonly supabase: SupabaseClient

  constructor(svc: SupabaseServiceClient) {
    this.supabase = svc.client
  }

  async getUserConsent(userId: string): Promise<string | null> {
    const { data } = await this.supabase
      .from('profiles')
      .select('browser_session_consent_at')
      .eq('id', userId)
      .maybeSingle()
    return (
      (data as { browser_session_consent_at: string | null } | null)
        ?.browser_session_consent_at ?? null
    )
  }

  async recordUserConsent(userId: string, consentAt: string): Promise<string | null> {
    const { error } = await this.supabase
      .from('profiles')
      .update({ browser_session_consent_at: consentAt })
      .eq('id', userId)
    return error?.message ?? null
  }

  async getExistingSession(
    userId: string,
    orgId: string | null,
    domain: string,
  ): Promise<ExistingBrowserSessionRow | null> {
    let query = this.supabase
      .from('browser_sessions')
      .select('first_synced_at, disabled_at')
      .eq('user_id', userId)
      .eq('domain', domain.toLowerCase())
      .limit(1)
    if (orgId) query = query.eq('org_id', orgId)
    else query = query.is('org_id', null)
    const { data } = await query.maybeSingle()
    return (data as ExistingBrowserSessionRow | null) ?? null
  }

  async upsertSession(row: BrowserSessionUpsertRow, onConflict: string): Promise<string | null> {
    const { error } = await this.supabase.from('browser_sessions').upsert(row, { onConflict })
    return error?.message ?? null
  }

  async listSessions(
    userId: string,
    orgId: string | null,
  ): Promise<{ sessions: BrowserSessionSummary[]; errorMessage: string | null }> {
    let query = this.supabase
      .from('browser_sessions')
      .select('domain, cookie_count, synced_at, first_synced_at, min_expires_at, disabled_at')
      .eq('user_id', userId)
      .order('synced_at', { ascending: false })
    if (orgId) query = query.eq('org_id', orgId)
    else query = query.is('org_id', null)

    const { data, error } = await query
    return {
      sessions: (data ?? []) as BrowserSessionSummary[],
      errorMessage: error?.message ?? null,
    }
  }

  async setDomainDisabled(
    userId: string,
    orgId: string | null,
    domain: string,
    disabled: boolean,
  ): Promise<string | null> {
    let query = this.supabase
      .from('browser_sessions')
      .update({ disabled_at: disabled ? new Date().toISOString() : null })
      .eq('user_id', userId)
      .eq('domain', domain.toLowerCase())
    if (orgId) query = query.eq('org_id', orgId)
    else query = query.is('org_id', null)

    const { error } = await query
    return error?.message ?? null
  }

  async listEnabledDomains(): Promise<{ domains: string[]; errorMessage: string | null }> {
    const { data, error } = await this.supabase
      .from('browser_session_domain_config')
      .select('domain')
      .eq('enabled', true)
      .order('domain', { ascending: true })

    return {
      domains: (data ?? []).map((r) => (r as { domain: string }).domain),
      errorMessage: error?.message ?? null,
    }
  }

  async loadCookieRow(
    userId: string,
    orgId: string | null,
    domain: string,
  ): Promise<BrowserSessionCookieRow | null> {
    let query = this.supabase
      .from('browser_sessions')
      .select('encrypted_cookies, disabled_at')
      .eq('user_id', userId)
      .eq('domain', domain.toLowerCase())
      .limit(1)

    if (orgId) {
      query = query.eq('org_id', orgId)
    } else {
      query = query.is('org_id', null)
    }

    const { data, error } = await query.maybeSingle()
    if (error || !data) return null
    return data as BrowserSessionCookieRow
  }

  async deleteCookies(userId: string, orgId: string | null, domain: string): Promise<void> {
    let query = this.supabase
      .from('browser_sessions')
      .delete()
      .eq('user_id', userId)
      .eq('domain', domain.toLowerCase())

    if (orgId) {
      query = query.eq('org_id', orgId)
    } else {
      query = query.is('org_id', null)
    }

    await query
  }
}
