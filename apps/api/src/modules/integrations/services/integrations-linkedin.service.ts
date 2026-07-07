import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'
import { ComposioService } from '../../composio/services/composio.service'
import { IntegrationsRepository } from '../repositories/integrations.repository'
import { IntegrationsCoreService } from './integrations-core.service'

export type LinkedInAdministeredOrganization = {
  urn: string
  name: string
  role?: string
}

function normalizeMetadata(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>
  return {}
}

/** Parse Composio LINKEDIN_GET_COMPANY_INFO payload into selectable company pages. */
export function parseLinkedInCompanyInfoResponse(
  res: Record<string, unknown> | null,
): LinkedInAdministeredOrganization[] {
  if (!res || typeof res !== 'object') return []

  const data = (res as Record<string, unknown>).data
  const payload =
    data && typeof data === 'object' && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : res

  const responseDict = payload.response_dict
  const root =
    responseDict && typeof responseDict === 'object' && !Array.isArray(responseDict)
      ? (responseDict as Record<string, unknown>)
      : payload

  const elements = root.elements ?? root.values
  if (!Array.isArray(elements)) return []

  const out: LinkedInAdministeredOrganization[] = []
  const seen = new Set<string>()

  for (const item of elements) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>

    const urnRaw =
      row.organization ?? row.organizationalTarget ?? row['organizationalTarget~'] ?? row.target
    const urn = typeof urnRaw === 'string' ? urnRaw.trim() : ''
    if (!urn.startsWith('urn:li:organization:')) continue
    if (seen.has(urn)) continue

    const orgExpand = row['organization~']
    const orgObj =
      orgExpand && typeof orgExpand === 'object' && !Array.isArray(orgExpand)
        ? (orgExpand as Record<string, unknown>)
        : null

    const nameCandidates = [
      row.organizationName,
      row.localizedOrganizationName,
      orgObj?.localizedName,
      orgObj?.name,
      orgObj?.vanityName,
    ]
    let name = ''
    for (const c of nameCandidates) {
      if (typeof c === 'string' && c.trim()) {
        name = c.trim()
        break
      }
    }
    if (!name) {
      const idPart = urn.split(':').pop()
      name = idPart ? `Organization ${idPart}` : 'LinkedIn company page'
    }

    const role = typeof row.role === 'string' ? row.role : undefined
    seen.add(urn)
    out.push({ urn, name, role })
  }

  return out
}

@Injectable()
export class IntegrationsLinkedInService {
  private readonly logger = new Logger(IntegrationsLinkedInService.name)

  constructor(
    private readonly repository: IntegrationsRepository,
    private readonly composio: ComposioService,
    private readonly core: IntegrationsCoreService,
  ) {}

  async listAdministeredOrganizations(
    supabase: SupabaseClient,
    user: { id: string },
    scope: RequestScope,
    options: { user_integration_id: string },
  ): Promise<Record<string, unknown>> {
    const rowId = options.user_integration_id?.trim()
    if (!rowId) {
      return { success: false, error: 'user_integration_id is required', organizations: [] }
    }

    const row = await this.core.getIntegrationRowForScope(supabase, scope, rowId)
    if (!row) {
      return { success: false, error: 'Integration connection not found', organizations: [] }
    }

    if (String(row.integration_id ?? '').toLowerCase() !== 'linkedin') {
      return {
        success: false,
        error: 'Connection is not a LinkedIn integration',
        organizations: [],
      }
    }

    if (String(row.status ?? '').toLowerCase() !== 'connected') {
      return { success: false, error: 'LinkedIn is not connected', organizations: [] }
    }

    const metadata = normalizeMetadata(row.metadata)
    const connectedAccountId =
      typeof metadata.composio_connected_account_id === 'string'
        ? metadata.composio_connected_account_id.trim()
        : ''
    const hasOrgUrn =
      typeof metadata.linkedin_organization_urn === 'string' &&
      metadata.linkedin_organization_urn.startsWith('urn:li:organization:')
    if (!connectedAccountId) {
      return { success: false, error: 'Missing Composio connected account', organizations: [] }
    }

    try {
      const raw = (await this.composio.executeTool(
        'LINKEDIN_GET_COMPANY_INFO',
        user.id,
        { role: 'ADMINISTRATOR', state: 'APPROVED', count: 50 },
        connectedAccountId,
      )) as Record<string, unknown> | null

      const organizations = parseLinkedInCompanyInfoResponse(raw)
      if (raw?.successful === false) {
        return {
          success: false,
          error:
            'LinkedIn did not grant company page admin access for this connection. Reconnect LinkedIn and approve company page access.',
          organizations: [],
        }
      }
      if (organizations.length === 0) {
        return {
          success: true,
          organizations: [],
          hint: 'We could not find any LinkedIn company pages for this connection. Make sure this LinkedIn profile is an admin on the company page, then reconnect LinkedIn and approve company page access.',
        }
      }

      return { success: true, organizations }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to list LinkedIn company pages'
      this.logger.warn(`[linkedin] LINKEDIN_GET_COMPANY_INFO failed: ${message}`)
      return { success: false, error: message, organizations: [] }
    }
  }

  async setSelectedOrganization(
    supabase: SupabaseClient,
    user: { id: string },
    scope: RequestScope,
    body: {
      user_integration_id: string
      organization_urn: string
      organization_name: string
    },
  ): Promise<Record<string, unknown>> {
    const rowId = body.user_integration_id?.trim()
    const urn = body.organization_urn?.trim()
    const name = body.organization_name?.trim()

    if (!rowId || !urn || !name) {
      return {
        success: false,
        error: 'user_integration_id, organization_urn, and organization_name are required',
      }
    }
    if (!urn.startsWith('urn:li:organization:')) {
      return { success: false, error: 'organization_urn must start with urn:li:organization:' }
    }

    const row = await this.core.getIntegrationRowForScope(supabase, scope, rowId)
    if (!row) return { success: false, error: 'Integration connection not found' }
    if (String(row.integration_id ?? '').toLowerCase() !== 'linkedin') {
      return { success: false, error: 'Connection is not a LinkedIn integration' }
    }

    const metadata = normalizeMetadata(row.metadata)
    const connectedAccountId =
      typeof metadata.composio_connected_account_id === 'string'
        ? metadata.composio_connected_account_id.trim()
        : ''

    const nextMetadata = {
      ...metadata,
      linkedin_organization_urn: urn,
      linkedin_organization_name: name,
      organizational_entity: urn,
    }

    const { error } = await this.core.updateIntegrationById(supabase, rowId, {
      metadata: nextMetadata,
    })
    if (error) return { success: false, error: error.message }

    if (connectedAccountId) {
      let cicQuery = this.repository
        .table(supabase, 'campaign_integration_connections')
        .select('id, metadata')
        .eq('integration_id', 'linkedin')
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
        const { error: cicError } = await this.repository
          .table(supabase, 'campaign_integration_connections')
          .update({
            metadata: {
              ...cicMd,
              linkedin_organization_urn: urn,
              linkedin_organization_name: name,
              organizational_entity: urn,
            },
            updated_at: now,
          })
          .eq('id', cic.id)
        if (cicError) {
          this.logger.warn(
            `[linkedin] campaign_integration_connections metadata sync failed id=${cic.id}: ${cicError.message}`,
          )
        }
      }
    }

    return {
      success: true,
      user_integration_id: rowId,
      linkedin_organization_urn: urn,
      linkedin_organization_name: name,
    }
  }
}
