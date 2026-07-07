import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { BrowserSessionSummary } from '../services/browser-sessions.service'

@Injectable()
export class BrowserSessionsRepository {
  async getConsent(supabase: SupabaseClient, userId: string) {
    return supabase
      .from('profiles')
      .select('browser_session_consent_at')
      .eq('id', userId)
      .maybeSingle()
  }

  async setConsent(supabase: SupabaseClient, userId: string, consentAt: string) {
    return supabase
      .from('profiles')
      .update({ browser_session_consent_at: consentAt })
      .eq('id', userId)
  }

  async listEnabledDomains(supabase: SupabaseClient) {
    return supabase
      .from('browser_session_domain_config')
      .select('domain')
      .eq('enabled', true)
      .order('domain', { ascending: true })
  }

  async listSessions(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
  ): Promise<{ data: BrowserSessionSummary[] | null; error: { message: string } | null }> {
    let query = supabase
      .from('browser_sessions')
      .select('domain, cookie_count, synced_at, first_synced_at, min_expires_at, disabled_at')
      .eq('user_id', userId)
      .order('domain', { ascending: true })
    query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)

    const { data, error } = await query
    return {
      data: (data as BrowserSessionSummary[] | null) ?? null,
      error: error ? { message: error.message } : null,
    }
  }

  async findSessionForSync(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
    domain: string,
  ) {
    const existingQuery = supabase
      .from('browser_sessions')
      .select('id, first_synced_at')
      .eq('user_id', userId)
      .eq('domain', domain)
    return orgId
      ? existingQuery.eq('org_id', orgId).maybeSingle()
      : existingQuery.is('org_id', null).maybeSingle()
  }

  async updateSession(
    supabase: SupabaseClient,
    id: string,
    patch: {
      encrypted_cookies: string
      cookie_count: number
      synced_at: string
      min_expires_at: string | null
      disabled_at: string | null
    },
  ) {
    return supabase.from('browser_sessions').update(patch).eq('id', id)
  }

  async insertSession(
    supabase: SupabaseClient,
    input: {
      user_id: string
      org_id: string | null
      domain: string
      encrypted_cookies: string
      cookie_count: number
      synced_at: string
      first_synced_at: string
      min_expires_at: string | null
      disabled_at: string | null
    },
  ) {
    return supabase.from('browser_sessions').insert(input)
  }

  async deleteSession(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
    domain: string,
  ) {
    let query = supabase
      .from('browser_sessions')
      .delete()
      .eq('user_id', userId)
      .eq('domain', domain)
    query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    return query
  }

  async setDisabled(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
    domain: string,
    disabledAt: string | null,
  ) {
    let query = supabase
      .from('browser_sessions')
      .update({ disabled_at: disabledAt })
      .eq('user_id', userId)
      .eq('domain', domain)
    query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    return query.select('id')
  }

  async listExpiringSessions(
    supabase: SupabaseClient,
    input: { nowIso: string; thresholdIso: string },
  ) {
    return supabase
      .from('browser_sessions')
      .select('user_id, org_id, domain, min_expires_at')
      .gte('min_expires_at', input.nowIso)
      .lte('min_expires_at', input.thresholdIso)
      .is('disabled_at', null)
  }

  async findRecentExpiringNotification(
    supabase: SupabaseClient,
    input: { userId: string; domain: string; dedupeIso: string },
  ) {
    return supabase
      .from('user_notifications')
      .select('id')
      .eq('user_id', input.userId)
      .eq('type', 'browser_session_expiring')
      .gte('created_at', input.dedupeIso)
      .contains('channel_sent', { domain: input.domain })
      .limit(1)
      .maybeSingle()
  }

  async insertExpiringNotification(
    supabase: SupabaseClient,
    input: {
      user_id: string
      org_id: string | null
      type: string
      title: string
      body: string
      action_url: string
      channel_sent: { domain: string }
    },
  ) {
    return supabase.from('user_notifications').insert(input)
  }
}
