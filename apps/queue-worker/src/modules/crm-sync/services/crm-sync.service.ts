import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { SupabaseClient } from '@supabase/supabase-js'
import { DatabaseService } from '../../../lib/services/database.service'
import { decryptVaultValue } from '../../../lib/services/vault-decrypt'
import { GhlEmailHelper } from '../../shared/helpers/ghl-email.helper'
import type { CrmSyncJobResult } from '../types/crm-sync.types'

const AC_PROVIDER = 'active_campaign'
const LABEL_API_URL = 'api_url'
const LABEL_API_KEY = 'api_key'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type ContactImportRow = {
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  contact_source: string | null
}

@Injectable()
export class CrmSyncService {
  private readonly logger = new Logger(CrmSyncService.name)
  private readonly pageSize = 100

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
    private readonly ghlEmailHelper: GhlEmailHelper,
  ) {}

  async processJob(crmSyncJobId: string): Promise<CrmSyncJobResult> {
    const supabase = this.databaseService.getClient()

    const { data: row, error: loadErr } = await supabase
      .from('crm_sync_jobs')
      .select('*')
      .eq('id', crmSyncJobId)
      .single()

    if (loadErr || !row) {
      const msg = loadErr?.message || 'Job not found'
      this.logger.error(`crm_sync_jobs ${crmSyncJobId}: ${msg}`)
      return {
        crmSyncJobId,
        success: false,
        imported: 0,
        skipped: 0,
        fetched: 0,
        error: msg,
      }
    }

    const status = row.status as string
    if (status === 'succeeded') {
      return {
        crmSyncJobId,
        success: true,
        imported: (row.imported as number) ?? 0,
        skipped: (row.skipped as number) ?? 0,
        fetched: (row.fetched as number) ?? 0,
      }
    }
    if (status === 'failed') {
      return {
        crmSyncJobId,
        success: false,
        imported: (row.imported as number) ?? 0,
        skipped: (row.skipped as number) ?? 0,
        fetched: (row.fetched as number) ?? 0,
        error: (row.last_error as string) || 'failed',
      }
    }

    const userId = row.user_id as string
    const source = row.source as string
    const now = () => new Date().toISOString()

    if (status === 'queued') {
      await supabase
        .from('crm_sync_jobs')
        .update({ status: 'processing', started_at: now(), updated_at: now() })
        .eq('id', crmSyncJobId)
    }

    try {
      if (source === 'activecampaign') {
        await this.runActiveCampaignSync(supabase, crmSyncJobId, userId)
      } else if (source === 'gohighlevel') {
        await this.runGhlSync(supabase, crmSyncJobId, userId)
      } else {
        throw new Error(`Unknown CRM sync source: ${source}`)
      }

      const { data: final } = await supabase
        .from('crm_sync_jobs')
        .select('imported, skipped, fetched')
        .eq('id', crmSyncJobId)
        .single()

      await supabase
        .from('crm_sync_jobs')
        .update({ status: 'succeeded', completed_at: now(), updated_at: now() })
        .eq('id', crmSyncJobId)

      return {
        crmSyncJobId,
        success: true,
        imported: (final?.imported as number) ?? 0,
        skipped: (final?.skipped as number) ?? 0,
        fetched: (final?.fetched as number) ?? 0,
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      this.logger.error(`CRM sync ${crmSyncJobId} failed: ${msg}`)
      await supabase
        .from('crm_sync_jobs')
        .update({
          status: 'failed',
          last_error: msg,
          completed_at: now(),
          updated_at: now(),
        })
        .eq('id', crmSyncJobId)
      return {
        crmSyncJobId,
        success: false,
        imported: (row.imported as number) ?? 0,
        skipped: (row.skipped as number) ?? 0,
        fetched: (row.fetched as number) ?? 0,
        error: msg,
      }
    }
  }

  private async getActiveCampaignCreds(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<{ apiUrl: string; apiKey: string }> {
    const keyHex = this.configService.get<string>('vault.encryptionKey') || ''
    if (!keyHex || Buffer.from(keyHex, 'hex').length !== 32) {
      throw new Error('VAULT_ENCRYPTION_KEY must be 64 hex characters (32 bytes)')
    }

    const { data: secrets, error } = await supabase
      .from('vault_secrets')
      .select('label, encrypted_value')
      .eq('user_id', userId)
      .eq('provider', AC_PROVIDER)
      .in('label', [LABEL_API_URL, LABEL_API_KEY])

    if (error) throw new Error(`Vault read failed: ${error.message}`)

    let apiUrl: string | null = null
    let apiKey: string | null = null
    for (const s of secrets ?? []) {
      const label = s.label as string
      const raw = s.encrypted_value as string
      const plain = decryptVaultValue(raw, keyHex)
      if (label === LABEL_API_URL) apiUrl = plain
      if (label === LABEL_API_KEY) apiKey = plain
    }
    if (!apiUrl?.trim() || !apiKey?.trim()) {
      throw new Error('ActiveCampaign is not connected (missing vault credentials)')
    }
    return { apiUrl: apiUrl.trim(), apiKey: apiKey.trim() }
  }

  private async fetchActiveCampaignPage(
    apiUrl: string,
    apiKey: string,
    offset: number,
    limit: number,
  ): Promise<{
    contacts: Array<{
      id: string
      email: string
      firstName: string
      lastName: string
      phone: string
    }>
    total: number
  }> {
    const base = apiUrl.replace(/\/+$/, '')
    const url = new URL(`${base}/api/3/contacts`)
    url.searchParams.set('limit', String(limit))
    url.searchParams.set('offset', String(offset))

    const res = await fetch(url.toString(), {
      headers: {
        'Api-Token': apiKey,
        Accept: 'application/json',
      },
    })
    const text = await res.text()
    if (!res.ok) {
      throw new Error(`ActiveCampaign API ${res.status}: ${text.slice(0, 400)}`)
    }
    const data = JSON.parse(text) as {
      contacts?: Array<Record<string, unknown>>
      meta?: { total?: string | number }
    }
    const raw = data.contacts ?? []
    const metaTotal = data.meta?.total
    const total =
      typeof metaTotal === 'number'
        ? metaTotal
        : parseInt(String(metaTotal ?? ''), 10) || offset + raw.length

    const contacts = raw
      .map((c) => ({
        id: String(c.id ?? ''),
        email: typeof c.email === 'string' ? c.email : '',
        firstName: typeof c.firstName === 'string' ? c.firstName : '',
        lastName: typeof c.lastName === 'string' ? c.lastName : '',
        phone: typeof c.phone === 'string' ? c.phone : '',
      }))
      .filter((c) => c.id.length > 0)

    return { contacts, total }
  }

  private async runActiveCampaignSync(
    supabase: SupabaseClient,
    jobId: string,
    userId: string,
  ): Promise<void> {
    const { apiUrl, apiKey } = await this.getActiveCampaignCreds(supabase, userId)
    let offset = 0
    let totalRemote: number | null = null

    for (;;) {
      const page = await this.fetchActiveCampaignPage(apiUrl, apiKey, offset, this.pageSize)
      if (totalRemote === null) totalRemote = page.total

      const items = this.mapAcToImportRows(page.contacts)
      const { imported, skipped } = await this.importContactsBatchForUser(supabase, userId, items)

      const { data: cur } = await supabase
        .from('crm_sync_jobs')
        .select('fetched, imported, skipped')
        .eq('id', jobId)
        .single()

      const ts = new Date().toISOString()
      await supabase
        .from('crm_sync_jobs')
        .update({
          fetched: Number(cur?.fetched ?? 0) + page.contacts.length,
          imported: Number(cur?.imported ?? 0) + imported,
          skipped: Number(cur?.skipped ?? 0) + skipped,
          total_remote: totalRemote,
          updated_at: ts,
        })
        .eq('id', jobId)

      if (page.contacts.length === 0) break
      offset += page.contacts.length
      if (offset >= page.total) break
    }
  }

  private mapAcToImportRows(
    contacts: Array<{
      email: string
      firstName: string
      lastName: string
      phone: string
    }>,
  ): ContactImportRow[] {
    const out: ContactImportRow[] = []
    for (const c of contacts) {
      const email = (c.email || '').trim().toLowerCase()
      if (!email || !EMAIL_RE.test(email)) continue
      out.push({
        email,
        first_name: c.firstName?.trim() || null,
        last_name: c.lastName?.trim() || null,
        phone: c.phone?.trim() || null,
        contact_source: 'ActiveCampaign',
      })
    }
    return out
  }

  private async runGhlSync(supabase: SupabaseClient, jobId: string, userId: string): Promise<void> {
    let startAfterId: string | undefined
    let totalRemote: number | null = null

    for (;;) {
      const page = await this.ghlEmailHelper.listContactsPageForCrmSync(userId, {
        limit: this.pageSize,
        startAfterId,
      })

      if (totalRemote === null) totalRemote = null

      const items: ContactImportRow[] = []
      for (const c of page.contacts) {
        const email = (c.email || '').trim().toLowerCase()
        if (!email || !EMAIL_RE.test(email)) continue
        const first = c.firstName?.trim() || null
        const last = c.lastName?.trim() || null
        items.push({
          email,
          first_name: first,
          last_name: last,
          phone: c.phone?.trim() || null,
          contact_source: 'GoHighLevel',
        })
      }

      const { imported, skipped } = await this.importContactsBatchForUser(supabase, userId, items)

      const { data: cur } = await supabase
        .from('crm_sync_jobs')
        .select('fetched, imported, skipped')
        .eq('id', jobId)
        .single()

      const ts = new Date().toISOString()
      await supabase
        .from('crm_sync_jobs')
        .update({
          fetched: Number(cur?.fetched ?? 0) + page.contacts.length,
          imported: Number(cur?.imported ?? 0) + imported,
          skipped: Number(cur?.skipped ?? 0) + skipped,
          total_remote: totalRemote,
          updated_at: ts,
        })
        .eq('id', jobId)

      if (page.contacts.length === 0 || !page.nextStartAfterId) break
      startAfterId = page.nextStartAfterId
    }
  }

  /**
   * Same rules as LeadsRepository.importContactsBatch: dedupe batch by email, skip existing for user, insert new.
   */
  private async importContactsBatchForUser(
    supabase: SupabaseClient,
    userId: string,
    items: ContactImportRow[],
  ): Promise<{ imported: number; skipped: number }> {
    if (items.length === 0) return { imported: 0, skipped: 0 }

    const byEmail = new Map<string, ContactImportRow>()
    for (const i of items) {
      const email = i.email.trim().toLowerCase()
      if (!email || byEmail.has(email)) continue
      byEmail.set(email, {
        email,
        first_name: i.first_name?.trim() || null,
        last_name: i.last_name?.trim() || null,
        phone: i.phone?.trim() || null,
        contact_source: i.contact_source ?? 'Import',
      })
    }

    const unique = [...byEmail.values()]
    if (unique.length === 0) return { imported: 0, skipped: items.length }

    const emails = unique.map((u) => u.email)
    const { data: existing, error: exErr } = await supabase
      .from('contacts')
      .select('email')
      .eq('user_id', userId)
      .in('email', emails)
    if (exErr) throw new Error(`DB error: ${exErr.message}`)

    const existingSet = new Set(
      (existing ?? []).map((r: { email: string }) => r.email.toLowerCase()),
    )
    const toInsert = unique.filter((u) => !existingSet.has(u.email))
    const skipped = unique.length - toInsert.length

    if (toInsert.length === 0) return { imported: 0, skipped }

    const rows = toInsert.map((n) => ({
      user_id: userId,
      email: n.email,
      first_name: n.first_name,
      last_name: n.last_name,
      phone: n.phone,
      source: 'import' as const,
      contact_source: n.contact_source,
      tags: [] as string[],
    }))

    const { error: insErr } = await supabase.from('contacts').insert(rows)
    if (insErr) throw new Error(`DB error: ${insErr.message}`)
    return { imported: toInsert.length, skipped }
  }
}
