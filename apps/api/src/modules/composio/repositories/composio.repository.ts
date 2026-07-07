import { Injectable } from '@nestjs/common'
import { SupabaseServiceClient } from '@vibey/api-shared'

type QueryError = {
  message: string
}

type QueryResponse<T> = Promise<{
  data: T | null
  error: QueryError | null
}>

export type ComposioToolkitCatalogUpsert = {
  toolkit_slug: string
  name: string
  description: string
  logo: string | null
  categories: string[]
  metadata: Record<string, unknown>
  embedding: number[] | null
  updated_at: string
}

export type ProjectComposioToolkitConfigRow = {
  integration_id: string
  toolkit_slug: string
  enabled: boolean
  metadata?: Record<string, unknown> | null
}

export type ExistingIntegrationCapabilityCopyRow = {
  display_name?: string | null
  description?: string | null
  metadata?: Record<string, unknown> | null
}

export type IntegrationCapabilityUpsert = {
  integration_id: string
  action_slug: string
  execution_mode: string
  display_name: string
  description: string
  parameters: Record<string, unknown>
  examples: Array<Record<string, unknown>>
  metadata: Record<string, unknown>
  domains: string[]
  embedding: number[] | null
  updated_at: string
  route_config?: Record<string, unknown> | null
}

@Injectable()
export class ComposioRepository {
  constructor(private readonly serviceClient: SupabaseServiceClient) {}

  async upsertToolkitCatalog(
    row: ComposioToolkitCatalogUpsert,
  ): Promise<{ error: QueryError | null }> {
    return this.serviceClient.client
      .from('composio_toolkits')
      .upsert(row, { onConflict: 'toolkit_slug' })
  }

  async searchToolkitCatalogByEmbedding(
    embedding: number[],
    limit: number,
  ): QueryResponse<Array<Record<string, unknown>>> {
    return this.serviceClient.client.rpc('search_composio_toolkits', {
      query_embedding: embedding,
      match_count: limit,
    })
  }

  async searchToolkitCatalogByText(
    query: string,
    limit: number,
  ): QueryResponse<Array<Record<string, unknown>>> {
    return this.serviceClient.client
      .from('composio_toolkits')
      .select('toolkit_slug, name, description, logo, metadata')
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .limit(limit)
  }

  async findSyncedIntegrationIds(): QueryResponse<Array<{ integration_id: string }>> {
    return this.serviceClient.client.from('integration_capabilities').select('integration_id')
  }

  async findProjectToolkitConfigs(): QueryResponse<ProjectComposioToolkitConfigRow[]> {
    return this.serviceClient.client
      .from('project_composio_toolkit_config')
      .select('integration_id, toolkit_slug, enabled, metadata')
  }

  async findIntegrationCapabilityCopy(
    integrationId: string,
    actionSlug: string,
  ): QueryResponse<ExistingIntegrationCapabilityCopyRow> {
    return this.serviceClient.client
      .from('integration_capabilities')
      .select('display_name, description, metadata')
      .eq('integration_id', integrationId)
      .eq('action_slug', actionSlug)
      .maybeSingle()
  }

  async upsertIntegrationCapability(
    row: IntegrationCapabilityUpsert,
  ): Promise<{ error: QueryError | null }> {
    return this.serviceClient.client
      .from('integration_capabilities')
      .upsert(row, { onConflict: 'integration_id,action_slug' })
  }
}
