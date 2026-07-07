import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { applyOwnerScope } from '@vibey/api-shared'

type MappingScope = { userId: string; orgId?: string | null }

@Injectable()
export class DriveFolderMappingsRepository {
  private applyScope(query: any, scope: MappingScope) {
    return applyOwnerScope(query, { userId: scope.userId, orgId: scope.orgId ?? null })
  }

  async findSpaceById(
    supabase: SupabaseClient,
    spaceId: string,
    scope: MappingScope,
  ): Promise<Record<string, unknown> | null> {
    let query = supabase.from('spaces').select('*').eq('id', spaceId)
    query = this.applyScope(query, scope)
    const { data, error } = await query.maybeSingle()
    if (error) throw new BadRequestException(error.message)
    return (data as Record<string, unknown> | null) ?? null
  }

  async listMappings(
    supabase: SupabaseClient,
    spaceId: string,
    scope: MappingScope,
  ): Promise<Record<string, unknown>[]> {
    let query = supabase
      .from('space_drive_folder_mappings')
      .select('*')
      .eq('space_id', spaceId)
      .order('created_at', { ascending: false })
    query = this.applyScope(query, scope)
    const { data, error } = await query
    if (error) throw new BadRequestException(error.message)
    return (data as Record<string, unknown>[]) ?? []
  }

  async getMapping(
    supabase: SupabaseClient,
    spaceId: string,
    mappingId: string,
    scope: MappingScope,
  ): Promise<Record<string, unknown> | null> {
    let query = supabase
      .from('space_drive_folder_mappings')
      .select('*')
      .eq('id', mappingId)
      .eq('space_id', spaceId)
    query = this.applyScope(query, scope)
    const { data, error } = await query.maybeSingle()
    if (error) throw new BadRequestException(error.message)
    return (data as Record<string, unknown> | null) ?? null
  }

  async insertMapping(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const { data, error } = await supabase
      .from('space_drive_folder_mappings')
      .insert(payload)
      .select('*')
      .single()
    if (error) throw new BadRequestException(error.message)
    return data as Record<string, unknown>
  }

  async updateMapping(
    supabase: SupabaseClient,
    mappingId: string,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const { data, error } = await supabase
      .from('space_drive_folder_mappings')
      .update(payload)
      .eq('id', mappingId)
      .select('*')
      .single()
    if (error) throw new BadRequestException(error.message)
    return data as Record<string, unknown>
  }

  async deleteMapping(supabase: SupabaseClient, mappingId: string): Promise<void> {
    const { error } = await supabase
      .from('space_drive_folder_mappings')
      .delete()
      .eq('id', mappingId)
    if (error) throw new BadRequestException(error.message)
  }

  async createRootSpaceItem(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const { data, error } = await supabase.from('space_items').insert(payload).select('*').single()
    if (error) throw new BadRequestException(error.message)
    return data as Record<string, unknown>
  }

  async deleteSpaceItem(supabase: SupabaseClient, itemId: string, spaceId: string): Promise<void> {
    const { error } = await supabase
      .from('space_items')
      .delete()
      .eq('id', itemId)
      .eq('space_id', spaceId)
    if (error) throw new BadRequestException(error.message)
  }

  async setNextSyncAtNow(supabase: SupabaseClient, mappingId: string): Promise<void> {
    const { error } = await supabase
      .from('space_drive_folder_mappings')
      .update({ next_sync_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', mappingId)
    if (error) throw new BadRequestException(error.message)
  }

  async claimMappingForSync(
    supabase: SupabaseClient,
    mappingId: string,
  ): Promise<Record<string, unknown> | null> {
    const nowIso = new Date().toISOString()
    const { data, error } = await supabase
      .from('space_drive_folder_mappings')
      .update({
        sync_status: 'syncing',
        last_sync_error: null,
        updated_at: nowIso,
      })
      .eq('id', mappingId)
      .eq('enabled', true)
      .eq('sync_status', 'idle')
      .select('*')
      .maybeSingle()
    if (error) throw new BadRequestException(error.message)
    return (data as Record<string, unknown> | null) ?? null
  }

  async getMappingByIdForSync(
    supabase: SupabaseClient,
    mappingId: string,
  ): Promise<Record<string, unknown> | null> {
    const { data, error } = await supabase
      .from('space_drive_folder_mappings')
      .select('*')
      .eq('id', mappingId)
      .maybeSingle()
    if (error) throw new BadRequestException(error.message)
    return (data as Record<string, unknown> | null) ?? null
  }

  async markMappingSynced(
    supabase: SupabaseClient,
    mappingId: string,
    syncIntervalSeconds: number,
  ): Promise<void> {
    const now = Date.now()
    const { error } = await supabase
      .from('space_drive_folder_mappings')
      .update({
        sync_status: 'idle',
        last_synced_at: new Date(now).toISOString(),
        next_sync_at: new Date(now + syncIntervalSeconds * 1000).toISOString(),
        last_sync_error: null,
        updated_at: new Date(now).toISOString(),
      })
      .eq('id', mappingId)
    if (error) throw new BadRequestException(error.message)
  }

  async markMappingError(
    supabase: SupabaseClient,
    mappingId: string,
    errorMessage: string,
    retryInSeconds = 60,
  ): Promise<void> {
    const now = Date.now()
    const { error } = await supabase
      .from('space_drive_folder_mappings')
      .update({
        sync_status: 'error',
        last_sync_error: errorMessage.slice(0, 2000),
        next_sync_at: new Date(now + retryInSeconds * 1000).toISOString(),
        updated_at: new Date(now).toISOString(),
      })
      .eq('id', mappingId)
    if (error) throw new BadRequestException(error.message)
  }

  async listSpaceItemsForMapping(
    supabase: SupabaseClient,
    spaceId: string,
    mappingId: string,
  ): Promise<Record<string, unknown>[]> {
    const { data, error } = await supabase
      .from('space_items')
      .select('*')
      .eq('space_id', spaceId)
      .eq('custom_data->>_drive_folder_mapping_id', mappingId)
    if (error) throw new BadRequestException(error.message)
    return (data as Record<string, unknown>[]) ?? []
  }

  async insertSpaceItem(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const { data, error } = await supabase.from('space_items').insert(payload).select('*').single()
    if (error) throw new BadRequestException(error.message)
    return data as Record<string, unknown>
  }

  async updateSpaceItem(
    supabase: SupabaseClient,
    itemId: string,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const { data, error } = await supabase
      .from('space_items')
      .update(payload)
      .eq('id', itemId)
      .select('*')
      .single()
    if (error) throw new BadRequestException(error.message)
    return data as Record<string, unknown>
  }

  async deleteSpaceItemsByIds(supabase: SupabaseClient, itemIds: string[]): Promise<void> {
    if (itemIds.length === 0) return
    const { error } = await supabase.from('space_items').delete().in('id', itemIds)
    if (error) throw new BadRequestException(error.message)
  }

  async upsertPushChannel(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const mappingId = String(payload.mapping_id ?? '')
    const { data: existing, error: readError } = await supabase
      .from('space_drive_push_channels')
      .select('*')
      .eq('mapping_id', mappingId)
      .eq('active', true)
      .maybeSingle()
    if (readError) throw new BadRequestException(readError.message)

    if (existing) {
      const { data, error } = await supabase
        .from('space_drive_push_channels')
        .update(payload)
        .eq('id', String(existing.id))
        .select('*')
        .single()
      if (error) throw new BadRequestException(error.message)
      return data as Record<string, unknown>
    }

    const { data, error } = await supabase
      .from('space_drive_push_channels')
      .insert(payload)
      .select('*')
      .single()
    if (error) throw new BadRequestException(error.message)
    return data as Record<string, unknown>
  }

  async getPushChannelByChannelId(
    supabase: SupabaseClient,
    channelId: string,
  ): Promise<Record<string, unknown> | null> {
    const { data, error } = await supabase
      .from('space_drive_push_channels')
      .select('*')
      .eq('channel_id', channelId)
      .eq('active', true)
      .maybeSingle()
    if (error) throw new BadRequestException(error.message)
    return (data as Record<string, unknown> | null) ?? null
  }

  async listExpiringPushChannels(
    supabase: SupabaseClient,
    beforeIso: string,
    limit = 100,
  ): Promise<Record<string, unknown>[]> {
    const { data, error } = await supabase
      .from('space_drive_push_channels')
      .select('*')
      .eq('active', true)
      .lte('expiration_at', beforeIso)
      .order('expiration_at', { ascending: true })
      .limit(limit)
    if (error) throw new BadRequestException(error.message)
    return (data as Record<string, unknown>[]) ?? []
  }

  async markPushChannelNotified(
    supabase: SupabaseClient,
    channelId: string,
    notifiedAtIso: string,
  ): Promise<void> {
    const { error } = await supabase
      .from('space_drive_push_channels')
      .update({ last_notified_at: notifiedAtIso, updated_at: notifiedAtIso })
      .eq('channel_id', channelId)
    if (error) throw new BadRequestException(error.message)
  }
}
