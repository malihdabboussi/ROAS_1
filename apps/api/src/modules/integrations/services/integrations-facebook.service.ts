import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'
import { ComposioService } from '../../composio/services/composio.service'
import { IntegrationsRepository } from '../repositories/integrations.repository'
import { IntegrationsCoreService } from './integrations-core.service'

export type FacebookManagedPage = {
  id: string
  name: string
}

function normalizeMetadata(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>
  return {}
}

/** Parse Composio FACEBOOK_LIST_MANAGED_PAGES / FACEBOOK_GET_USER_PAGES payloads. */
export function parseFacebookManagedPagesResponse(
  res: Record<string, unknown> | null,
): FacebookManagedPage[] {
  if (!res || typeof res !== 'object') return []

  const candidates: unknown[] = [res]
  const data = (res as Record<string, unknown>).data
  if (data && typeof data === 'object') {
    candidates.push(data)
    const nested = (data as Record<string, unknown>).data
    if (nested) candidates.push(nested)
    const responseDict = (data as Record<string, unknown>).response_dict
    if (responseDict) candidates.push(responseDict)
  }

  const out: FacebookManagedPage[] = []
  const seen = new Set<string>()

  for (const node of candidates) {
    if (!node || typeof node !== 'object') continue
    const root = node as Record<string, unknown>
    const items = root.data ?? root.items ?? root.pages
    if (!Array.isArray(items)) continue

    for (const item of items) {
      if (!item || typeof item !== 'object') continue
      const row = item as Record<string, unknown>
      const idRaw = row.id ?? row.page_id
      const id =
        typeof idRaw === 'string' ? idRaw.trim() : typeof idRaw === 'number' ? String(idRaw) : ''
      if (!id || seen.has(id)) continue
      const name = typeof row.name === 'string' && row.name.trim() ? row.name.trim() : `Page ${id}`
      seen.add(id)
      out.push({ id, name })
    }
  }

  return out
}

@Injectable()
export class IntegrationsFacebookService {
  private readonly logger = new Logger(IntegrationsFacebookService.name)

  constructor(
    private readonly repository: IntegrationsRepository,
    private readonly composio: ComposioService,
    private readonly core: IntegrationsCoreService,
  ) {}

  async listManagedPages(
    supabase: SupabaseClient,
    user: { id: string },
    scope: RequestScope,
    options: { user_integration_id: string },
  ): Promise<Record<string, unknown>> {
    const rowId = options.user_integration_id?.trim()
    if (!rowId) {
      return { success: false, error: 'user_integration_id is required', pages: [] }
    }

    const row = await this.core.getIntegrationRowForScope(supabase, scope, rowId)
    if (!row) {
      return { success: false, error: 'Integration connection not found', pages: [] }
    }
    if (String(row.integration_id ?? '').toLowerCase() !== 'facebook') {
      return { success: false, error: 'Connection is not a Facebook integration', pages: [] }
    }
    if (String(row.status ?? '').toLowerCase() !== 'connected') {
      return { success: false, error: 'Facebook is not connected', pages: [] }
    }

    const metadata = normalizeMetadata(row.metadata)
    const connectedAccountId =
      typeof metadata.composio_connected_account_id === 'string'
        ? metadata.composio_connected_account_id.trim()
        : ''
    if (!connectedAccountId) {
      return { success: false, error: 'Missing Composio connected account', pages: [] }
    }

    try {
      let raw = (await this.composio.executeTool(
        'FACEBOOK_LIST_MANAGED_PAGES',
        user.id,
        { limit: 50 },
        connectedAccountId,
      )) as Record<string, unknown> | null

      let pages = parseFacebookManagedPagesResponse(raw)
      if (pages.length === 0) {
        raw = (await this.composio.executeTool(
          'FACEBOOK_GET_USER_PAGES',
          user.id,
          { user_id: 'me' },
          connectedAccountId,
        )) as Record<string, unknown> | null
        pages = parseFacebookManagedPagesResponse(raw)
      }

      if (pages.length === 0) {
        return {
          success: true,
          pages: [],
          hint: 'No Facebook Pages found. You need Page admin access and pages_read_engagement / read_insights scopes.',
        }
      }

      return { success: true, pages }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to list Facebook pages'
      this.logger.warn(`[facebook] list pages failed: ${message}`)
      return { success: false, error: message, pages: [] }
    }
  }

  async setSelectedPage(
    supabase: SupabaseClient,
    user: { id: string },
    scope: RequestScope,
    body: { user_integration_id: string; page_id: string; page_name: string },
  ): Promise<Record<string, unknown>> {
    const rowId = body.user_integration_id?.trim()
    const pageId = body.page_id?.trim()
    const pageName = body.page_name?.trim()

    if (!rowId || !pageId || !pageName) {
      return { success: false, error: 'user_integration_id, page_id, and page_name are required' }
    }

    const row = await this.core.getIntegrationRowForScope(supabase, scope, rowId)
    if (!row) return { success: false, error: 'Integration connection not found' }
    if (String(row.integration_id ?? '').toLowerCase() !== 'facebook') {
      return { success: false, error: 'Connection is not a Facebook integration' }
    }

    const metadata = normalizeMetadata(row.metadata)
    const connectedAccountId =
      typeof metadata.composio_connected_account_id === 'string'
        ? metadata.composio_connected_account_id.trim()
        : ''

    const nextMetadata = {
      ...metadata,
      facebook_page_id: pageId,
      facebook_page_name: pageName,
    }

    const { error } = await this.core.updateIntegrationById(supabase, rowId, {
      metadata: nextMetadata,
    })
    if (error) return { success: false, error: error.message }

    if (connectedAccountId) {
      let cicQuery = this.repository
        .table(supabase, 'campaign_integration_connections')
        .select('id, metadata')
        .eq('integration_id', 'facebook')
        .eq('composio_connected_account_id', connectedAccountId)
        .eq('status', 'connected')

      if (scope.orgId) {
        cicQuery = cicQuery.eq('org_id', scope.orgId)
      } else {
        cicQuery = cicQuery.eq('user_id', user.id).is('org_id', null)
      }

      const { data: cicRows } = await cicQuery
      const now = new Date().toISOString()
      for (const cic of cicRows ?? []) {
        const cicMd = normalizeMetadata(cic.metadata)
        await this.repository
          .table(supabase, 'campaign_integration_connections')
          .update({
            metadata: {
              ...cicMd,
              facebook_page_id: pageId,
              facebook_page_name: pageName,
            },
            updated_at: now,
          })
          .eq('id', cic.id)
      }
    }

    return {
      success: true,
      user_integration_id: rowId,
      facebook_page_id: pageId,
      facebook_page_name: pageName,
    }
  }
}
