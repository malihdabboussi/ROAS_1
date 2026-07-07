import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { CreateCustomFieldInput, CustomFieldDefinition, UpdateCustomFieldInput } from '../dto'

@Injectable()
export class CustomFieldsRepository {
  private readonly logger = new Logger(CustomFieldsRepository.name)
  private readonly tableName = 'contact_custom_field_definitions'

  private generateFieldKey(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
  }

  async findAll(supabase: SupabaseClient, orgId?: string | null): Promise<CustomFieldDefinition[]> {
    let query = supabase.from(this.tableName).select('*')
    if (orgId !== undefined) {
      query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    }
    const { data, error } = await query
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) {
      this.logger.error(`Failed to fetch custom fields: ${error.message}`)
      throw error
    }

    return data || []
  }

  async findById(
    supabase: SupabaseClient,
    id: string,
    orgId?: string | null,
  ): Promise<CustomFieldDefinition | null> {
    let query = supabase.from(this.tableName).select('*').eq('id', id)
    if (orgId !== undefined) {
      query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    }
    const { data, error } = await query.single()

    if (error) {
      if (error.code === 'PGRST116') return null
      this.logger.error(`Failed to find custom field: ${error.message}`)
      throw error
    }

    return data
  }

  async findByName(
    supabase: SupabaseClient,
    name: string,
    orgId?: string | null,
  ): Promise<CustomFieldDefinition | null> {
    let query = supabase.from(this.tableName).select('*').eq('name', name)
    if (orgId !== undefined) {
      query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    }
    const { data, error } = await query.single()

    if (error) {
      if (error.code === 'PGRST116') return null
      this.logger.error(`Failed to find custom field by name: ${error.message}`)
      throw error
    }

    return data
  }

  async create(
    supabase: SupabaseClient,
    userId: string,
    data: CreateCustomFieldInput,
    orgId?: string | null,
  ): Promise<CustomFieldDefinition> {
    const fieldKey = this.generateFieldKey(data.name)

    const { data: field, error } = await supabase
      .from(this.tableName)
      .insert({
        user_id: userId,
        name: data.name,
        field_key: fieldKey,
        field_type: data.field_type || 'text',
        options: data.options || [],
        default_value: data.default_value || null,
        is_required: data.is_required || false,
        org_id: orgId ?? null,
      })
      .select()
      .single()

    if (error) {
      this.logger.error(`Failed to create custom field: ${error.message}`)
      throw error
    }

    return field
  }

  async update(
    supabase: SupabaseClient,
    id: string,
    data: UpdateCustomFieldInput,
    orgId?: string | null,
  ): Promise<CustomFieldDefinition | null> {
    const updateData: Record<string, unknown> = { ...data }
    if (data.name) {
      updateData.field_key = this.generateFieldKey(data.name)
    }

    let query = supabase.from(this.tableName).update(updateData).eq('id', id)
    if (orgId !== undefined) {
      query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    }
    const { data: field, error } = await query.select().single()

    if (error) {
      if (error.code === 'PGRST116') return null
      this.logger.error(`Failed to update custom field: ${error.message}`)
      throw error
    }

    return field
  }

  async delete(supabase: SupabaseClient, id: string, orgId?: string | null): Promise<void> {
    let query = supabase.from(this.tableName).delete().eq('id', id)
    if (orgId !== undefined) {
      query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    }
    const { error } = await query

    if (error) {
      this.logger.error(`Failed to delete custom field: ${error.message}`)
      throw error
    }
  }
}
