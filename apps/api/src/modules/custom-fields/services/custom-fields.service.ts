import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { CreateCustomFieldInput, CustomFieldDefinition, UpdateCustomFieldInput } from '../dto'
import { CustomFieldsRepository } from '../repositories/custom-fields.repository'

@Injectable()
export class CustomFieldsService {
  private readonly logger = new Logger(CustomFieldsService.name)

  constructor(private readonly customFieldsRepository: CustomFieldsRepository) {}

  async getCustomFields(
    supabase: SupabaseClient,
    orgId?: string | null,
  ): Promise<{ fields: CustomFieldDefinition[] }> {
    const fields = await this.customFieldsRepository.findAll(supabase, orgId)
    const now = new Date().toISOString()
    const systemFields: CustomFieldDefinition[] = [
      {
        id: 'system_first_name',
        user_id: '00000000-0000-0000-0000-000000000000',
        name: 'First Name',
        field_key: 'first_name',
        field_type: 'text',
        options: [],
        default_value: null,
        is_required: false,
        is_system: true,
        display_order: 0,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'system_name',
        user_id: '00000000-0000-0000-0000-000000000000',
        name: 'Name',
        field_key: 'name',
        field_type: 'text',
        options: [],
        default_value: null,
        is_required: false,
        is_system: true,
        display_order: 1,
        created_at: now,
        updated_at: now,
      },
    ]

    return { fields: [...systemFields, ...fields] }
  }

  async getCustomFieldById(
    supabase: SupabaseClient,
    fieldId: string,
    orgId?: string | null,
  ): Promise<{ field: CustomFieldDefinition }> {
    const field = await this.customFieldsRepository.findById(supabase, fieldId, orgId)
    if (!field) {
      throw new Error('Custom field not found')
    }
    return { field }
  }

  async createCustomField(
    supabase: SupabaseClient,
    userId: string,
    data: CreateCustomFieldInput,
    orgId?: string | null,
  ): Promise<{ field: CustomFieldDefinition }> {
    const existing = await this.customFieldsRepository.findByName(supabase, data.name, orgId)
    if (existing) {
      throw new Error('Custom field name already exists')
    }

    const field = await this.customFieldsRepository.create(supabase, userId, data, orgId)
    this.logger.log(`Custom field created: ${field.id} (${field.name}) by user ${userId}`)
    return { field }
  }

  async updateCustomField(
    supabase: SupabaseClient,
    fieldId: string,
    data: UpdateCustomFieldInput,
    orgId?: string | null,
  ): Promise<{ field: CustomFieldDefinition }> {
    if (data.name) {
      const existing = await this.customFieldsRepository.findByName(supabase, data.name, orgId)
      if (existing && existing.id !== fieldId) {
        throw new Error('Custom field name already exists')
      }
    }

    const field = await this.customFieldsRepository.update(supabase, fieldId, data, orgId)
    if (!field) {
      throw new Error('Custom field not found')
    }

    this.logger.log(`Custom field updated: ${fieldId}`)
    return { field }
  }

  async deleteCustomField(
    supabase: SupabaseClient,
    fieldId: string,
    orgId?: string | null,
  ): Promise<{ success: boolean }> {
    await this.customFieldsRepository.delete(supabase, fieldId, orgId)
    this.logger.log(`Custom field deleted: ${fieldId}`)
    return { success: true }
  }
}
