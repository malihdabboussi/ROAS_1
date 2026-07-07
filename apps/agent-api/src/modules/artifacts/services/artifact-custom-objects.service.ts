import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ArtifactCustomObjectsRepository } from '../repositories/artifact-custom-objects.repository'
import type { ArtifactActionHandler } from './artifact-action.registry'

@Injectable()
export class ArtifactCustomObjectsService {
  constructor(
    private readonly repository: ArtifactCustomObjectsRepository = new ArtifactCustomObjectsRepository(),
  ) {}

  getHandlers(target: Record<string, any>): Record<string, ArtifactActionHandler> {
    return {
      define_object_type: (data, sessionKey) => this.defineObjectType(target, data, sessionKey),
      list_object_types: (data, sessionKey) => this.listObjectTypes(target, data, sessionKey),
      get_object_type: (data, sessionKey) => this.getObjectType(target, data, sessionKey),
      update_object_type: (data, sessionKey) => this.updateObjectType(target, data, sessionKey),
      create_object: (data, sessionKey) => this.createObject(target, data, sessionKey),
      update_object: (data, sessionKey) => this.updateObject(target, data, sessionKey),
      list_objects: (data, sessionKey) => this.listObjects(target, data, sessionKey),
      get_object: (data, sessionKey) => this.getObject(target, data, sessionKey),
      delete_object: (data, sessionKey) => this.deleteObject(target, data, sessionKey),
    }
  }

  private async userClient(target: Record<string, any>, sessionKey?: string) {
    const userId = target.resolveUserId(sessionKey)
    const supabase = (await target.getUserClient(userId, sessionKey as string)) as SupabaseClient
    return { userId, supabase }
  }

  private async defineObjectType(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const { userId, supabase } = await this.userClient(target, sessionKey)
    const name = String(data.name ?? '').trim()
    const slug = String(data.slug ?? name.toLowerCase().replace(/[^a-z0-9]+/g, '-')).trim()
    const fields = Array.isArray(data.fields) ? data.fields : []
    if (!name || !slug || fields.length === 0) {
      return { success: false, error: 'name, slug, fields are required' }
    }
    const { data: row, error } = await this.repository.defineObjectType(supabase, {
      user_id: userId,
      name,
      slug,
      fields,
      icon: typeof data.icon === 'string' ? data.icon : null,
    })
    if (error) return { success: false, error: error.message }
    return { success: true, object_type: row }
  }

  private async listObjectTypes(
    target: Record<string, any>,
    _data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const { userId, supabase } = await this.userClient(target, sessionKey)
    const { data, error } = await this.repository.listObjectTypes(supabase, userId)
    if (error) return { success: false, error: error.message }
    return { success: true, object_types: data ?? [] }
  }

  private async getObjectType(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const { userId, supabase } = await this.userClient(target, sessionKey)
    const objectTypeId = String(data.object_type_id ?? '').trim()
    const slug = String(data.slug ?? '').trim()
    if (!objectTypeId && !slug)
      return { success: false, error: 'object_type_id or slug is required' }

    const { data: row, error } = await this.repository.findObjectType(supabase, {
      userId,
      objectTypeId,
      slug,
    })
    if (error) return { success: false, error: error.message }
    return { success: true, object_type: row }
  }

  private async updateObjectType(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const { userId, supabase } = await this.userClient(target, sessionKey)
    const objectTypeId = String(data.object_type_id ?? '').trim()
    const fields = Array.isArray(data.fields) ? data.fields : null
    if (!objectTypeId || !fields)
      return { success: false, error: 'object_type_id and fields are required' }
    const { data: row, error } = await this.repository.updateObjectType(supabase, {
      userId,
      objectTypeId,
      fields,
    })
    if (error) return { success: false, error: error.message }
    if (!row) return { success: false, error: 'Object type not found' }
    return { success: true, object_type: row }
  }

  private async createObject(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const { userId, supabase } = await this.userClient(target, sessionKey)
    const objectTypeId = String(data.object_type_id ?? '').trim()
    const payload =
      data.data && typeof data.data === 'object' && !Array.isArray(data.data) ? data.data : null
    if (!objectTypeId || !payload)
      return { success: false, error: 'object_type_id and data are required' }
    const { data: row, error } = await this.repository.createObject(supabase, {
      user_id: userId,
      object_type_id: objectTypeId,
      data: payload,
      created_by_agent: String(target.parseAgentIdFromSessionKey?.(sessionKey) ?? ''),
      campaign_id: typeof data.campaign_id === 'string' ? data.campaign_id : null,
    })
    if (error) return { success: false, error: error.message }
    return { success: true, object: row }
  }

  private async updateObject(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const { userId, supabase } = await this.userClient(target, sessionKey)
    const objectId = String(data.object_id ?? '').trim()
    const payload =
      data.data && typeof data.data === 'object' && !Array.isArray(data.data) ? data.data : null
    if (!objectId || !payload) return { success: false, error: 'object_id and data are required' }
    const { data: existing, error: existingError } = await this.repository.findObjectData(
      supabase,
      { userId, objectId },
    )
    if (existingError) return { success: false, error: existingError.message }
    if (!existing) return { success: false, error: 'Object not found' }
    const merged = { ...((existing.data as Record<string, unknown> | null) ?? {}), ...payload }
    const { data: row, error } = await this.repository.updateObject(supabase, {
      userId,
      objectId,
      data: merged,
    })
    if (error) return { success: false, error: error.message }
    if (!row) return { success: false, error: 'Object not found' }
    return { success: true, object: row }
  }

  private async listObjects(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const { userId, supabase } = await this.userClient(target, sessionKey)
    const objectTypeId = String(data.object_type_id ?? '').trim()
    const slug = String(data.object_type ?? '')
      .trim()
      .toLowerCase()
    const limitRaw = Number(data.limit ?? 25)
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 25
    let resolvedTypeId = objectTypeId
    if (!resolvedTypeId && slug) {
      const { data: typeRow } = await this.repository.resolveObjectTypeId(supabase, {
        userId,
        slug,
      })
      resolvedTypeId = String(typeRow?.id ?? '')
    }
    if (!resolvedTypeId)
      return { success: false, error: 'object_type_id or object_type is required' }
    const campaignId = typeof data.campaign_id === 'string' ? data.campaign_id : null
    const { data: rows, error } = await this.repository.listObjects(supabase, {
      userId,
      objectTypeId: resolvedTypeId,
      campaignId,
      limit,
    })
    if (error) return { success: false, error: error.message }
    return { success: true, objects: rows ?? [] }
  }

  private async getObject(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const { userId, supabase } = await this.userClient(target, sessionKey)
    const objectId = String(data.object_id ?? '').trim()
    if (!objectId) return { success: false, error: 'object_id is required' }
    const { data: row, error } = await this.repository.getObject(supabase, { userId, objectId })
    if (error) return { success: false, error: error.message }
    return { success: true, object: row }
  }

  private async deleteObject(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const { userId, supabase } = await this.userClient(target, sessionKey)
    const objectId = String(data.object_id ?? '').trim()
    if (!objectId) return { success: false, error: 'object_id is required' }
    const { error } = await this.repository.deleteObject(supabase, { userId, objectId })
    if (error) return { success: false, error: error.message }
    return { success: true }
  }
}
