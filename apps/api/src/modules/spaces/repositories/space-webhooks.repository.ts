import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'

export type SpaceWebhookEndpointRecord = {
  id: string
  org_id: string | null
  space_id: string
  created_by: string
  name: string
  public_token: string
  vault_secret_label: string
  status: 'active' | 'disabled'
  field_mappings: unknown
  sample_payload: unknown
  last_received_at: string | null
  created_at: string
  updated_at: string
}

export type SpaceWebhookEventRecord = {
  id: string
  endpoint_id: string
  org_id: string | null
  space_id: string
  idempotency_key: string | null
  payload: unknown
  fields: Record<string, unknown>
  status: string
  matched_automation_ids: string[]
  error_message: string | null
  created_at: string
  processed_at: string | null
}

@Injectable()
export class SpaceWebhooksRepository {
  constructor(private readonly serviceClient: SupabaseServiceClient) {}

  getServiceClient(): SupabaseClient {
    return this.serviceClient.client as SupabaseClient
  }

  async listEndpoints(
    supabase: SupabaseClient,
    spaceId: string,
  ): Promise<SpaceWebhookEndpointRecord[]> {
    const { data, error } = await supabase
      .from('space_webhook_endpoints')
      .select('*')
      .eq('space_id', spaceId)
      .order('created_at', { ascending: true })
    if (error) throw new BadRequestException(error.message)
    return (data ?? []) as SpaceWebhookEndpointRecord[]
  }

  async findEndpoint(
    supabase: SupabaseClient,
    spaceId: string,
    endpointId: string,
  ): Promise<SpaceWebhookEndpointRecord | null> {
    const { data, error } = await supabase
      .from('space_webhook_endpoints')
      .select('*')
      .eq('space_id', spaceId)
      .eq('id', endpointId)
      .maybeSingle()
    if (error) throw new BadRequestException(error.message)
    return (data ?? null) as SpaceWebhookEndpointRecord | null
  }

  async findActiveEndpointByPublicToken(
    publicToken: string,
  ): Promise<SpaceWebhookEndpointRecord | null> {
    const { data, error } = await this.getServiceClient()
      .from('space_webhook_endpoints')
      .select('*')
      .eq('public_token', publicToken)
      .eq('status', 'active')
      .maybeSingle()
    if (error) throw new BadRequestException(error.message)
    return (data ?? null) as SpaceWebhookEndpointRecord | null
  }

  async createEndpoint(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<SpaceWebhookEndpointRecord> {
    const { data, error } = await supabase
      .from('space_webhook_endpoints')
      .insert(payload)
      .select()
      .single()
    if (error) throw new BadRequestException(error.message)
    return data as SpaceWebhookEndpointRecord
  }

  async updateEndpoint(
    supabase: SupabaseClient,
    endpointId: string,
    patch: Record<string, unknown>,
  ): Promise<SpaceWebhookEndpointRecord> {
    const { data, error } = await supabase
      .from('space_webhook_endpoints')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', endpointId)
      .select()
      .single()
    if (error) throw new BadRequestException(error.message)
    return data as SpaceWebhookEndpointRecord
  }

  async markEndpointReceived(
    supabase: SupabaseClient,
    endpointId: string,
    receivedAt: string,
  ): Promise<void> {
    const { error } = await supabase
      .from('space_webhook_endpoints')
      .update({ last_received_at: receivedAt, updated_at: receivedAt })
      .eq('id', endpointId)
    if (error) throw new BadRequestException(error.message)
  }

  async insertEvent(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<{
    data: SpaceWebhookEventRecord | null
    error: { code?: string; message: string } | null
  }> {
    const { data, error } = await supabase
      .from('space_webhook_events')
      .insert(payload)
      .select()
      .single()
    return {
      data: (data ?? null) as SpaceWebhookEventRecord | null,
      error: error ? { code: error.code, message: error.message } : null,
    }
  }

  async updateEvent(
    supabase: SupabaseClient,
    eventId: string,
    patch: Record<string, unknown>,
  ): Promise<void> {
    const { error } = await supabase.from('space_webhook_events').update(patch).eq('id', eventId)
    if (error) throw new BadRequestException(error.message)
  }

  async listEvents(
    supabase: SupabaseClient,
    endpointId: string,
    limit: number,
  ): Promise<SpaceWebhookEventRecord[]> {
    const { data, error } = await supabase
      .from('space_webhook_events')
      .select(
        'id, endpoint_id, org_id, space_id, idempotency_key, fields, status, matched_automation_ids, error_message, created_at, processed_at',
      )
      .eq('endpoint_id', endpointId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw new BadRequestException(error.message)
    return (data ?? []) as SpaceWebhookEventRecord[]
  }
}
