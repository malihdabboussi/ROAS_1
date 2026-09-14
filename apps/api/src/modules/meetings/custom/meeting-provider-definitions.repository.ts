import { Injectable } from '@nestjs/common'
import { SupabaseServiceClient } from '@vibey/api-shared'
import type { CustomMeetingProviderId } from '../providers/transcript-source.types'
import type {
  NoteTakerDefinition,
  NoteTakerDefinitionInput,
  NoteTakerDefinitionUpdate,
} from './note-taker-definition.schema'

const COLUMNS =
  'id, slug, display_name, description, logo_url, signature, event, field_map, is_active, created_by, created_at, updated_at'

@Injectable()
export class MeetingProviderDefinitionsRepository {
  constructor(private readonly serviceClient: SupabaseServiceClient) {}

  async listActive(): Promise<NoteTakerDefinition[]> {
    const { data, error } = await this.serviceClient.client
      .from('meeting_provider_definitions')
      .select(COLUMNS)
      .eq('is_active', true)
      .order('display_name', { ascending: true })
    if (error) throw new Error(`Failed to list note-taker definitions: ${error.message}`)
    return ((data ?? []) as Array<Record<string, unknown>>).map(toDefinition)
  }

  async listActiveSlugs(): Promise<CustomMeetingProviderId[]> {
    const { data, error } = await this.serviceClient.client
      .from('meeting_provider_definitions')
      .select('slug')
      .eq('is_active', true)
    if (error) throw new Error(`Failed to list note-taker slugs: ${error.message}`)
    return ((data ?? []) as Array<{ slug: string }>).map(
      (row) => row.slug as CustomMeetingProviderId,
    )
  }

  async findBySlug(
    slug: string,
    options: { activeOnly?: boolean } = {},
  ): Promise<NoteTakerDefinition | null> {
    let query = this.serviceClient.client
      .from('meeting_provider_definitions')
      .select(COLUMNS)
      .eq('slug', slug)
    if (options.activeOnly) query = query.eq('is_active', true)
    const { data, error } = await query.maybeSingle()
    if (error) throw new Error(`Failed to read note-taker definition: ${error.message}`)
    return data ? toDefinition(data as Record<string, unknown>) : null
  }

  async insert(
    slug: CustomMeetingProviderId,
    input: NoteTakerDefinitionInput,
    createdBy: string,
  ): Promise<NoteTakerDefinition> {
    const { data, error } = await this.serviceClient.client
      .from('meeting_provider_definitions')
      .insert({ slug, created_by: createdBy, ...toRow(input) })
      .select(COLUMNS)
      .single()
    if (error) throw new Error(`Failed to save note-taker definition: ${error.message}`)
    return toDefinition(data as Record<string, unknown>)
  }

  async update(slug: string, input: NoteTakerDefinitionUpdate): Promise<NoteTakerDefinition> {
    const { data, error } = await this.serviceClient.client
      .from('meeting_provider_definitions')
      .update({ ...toRow(input), updated_at: new Date().toISOString() })
      .eq('slug', slug)
      .select(COLUMNS)
      .single()
    if (error) throw new Error(`Failed to update note-taker definition: ${error.message}`)
    return toDefinition(data as Record<string, unknown>)
  }

  async setActive(slug: string, isActive: boolean): Promise<void> {
    const now = new Date().toISOString()
    const { error } = await this.serviceClient.client
      .from('meeting_provider_definitions')
      .update({ is_active: isActive, updated_at: now })
      .eq('slug', slug)
    if (error) throw new Error(`Failed to update note-taker definition: ${error.message}`)
    const { error: catalogError } = await this.serviceClient.client
      .from('integrations_available')
      .update({ is_available: isActive, updated_at: now })
      .eq('id', slug)
    if (catalogError) {
      throw new Error(`Failed to update integration catalog: ${catalogError.message}`)
    }
  }

  /** `user_integrations.integration_id` references this table, so every definition needs a row. */
  async upsertCatalogRow(definition: NoteTakerDefinition): Promise<void> {
    const { error } = await this.serviceClient.client.from('integrations_available').upsert(
      {
        id: definition.slug,
        provider: definition.slug,
        name: definition.displayName,
        description: definition.description ?? null,
        auth_type: 'api_key',
        is_available: definition.isActive,
        metadata: {
          connection_mode: 'pasted_webhook',
          managed_by: 'roas',
          kind: 'note_taker',
          logo_url: definition.logoUrl ?? null,
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )
    if (error) throw new Error(`Failed to save integration catalog row: ${error.message}`)
  }
}

function toRow(input: NoteTakerDefinitionUpdate): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  if (input.displayName !== undefined) row.display_name = input.displayName
  if (input.description !== undefined) row.description = input.description ?? null
  if (input.logoUrl !== undefined) row.logo_url = input.logoUrl ?? null
  if (input.signature !== undefined) row.signature = input.signature
  if (input.event !== undefined) row.event = input.event
  if (input.fieldMap !== undefined) row.field_map = input.fieldMap
  return row
}

function toDefinition(row: Record<string, unknown>): NoteTakerDefinition {
  return {
    id: String(row.id),
    slug: String(row.slug) as CustomMeetingProviderId,
    displayName: String(row.display_name ?? ''),
    description: typeof row.description === 'string' ? row.description : undefined,
    logoUrl: typeof row.logo_url === 'string' ? row.logo_url : undefined,
    signature: row.signature as NoteTakerDefinition['signature'],
    event: (row.event ?? {}) as NoteTakerDefinition['event'],
    fieldMap: row.field_map as NoteTakerDefinition['fieldMap'],
    isActive: row.is_active !== false,
    createdBy: String(row.created_by ?? ''),
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
  }
}
