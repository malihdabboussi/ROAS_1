import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryError = { message: string }

@Injectable()
export class ArtifactCustomObjectsRepository {
  async defineObjectType(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase.from('user_object_types').insert(payload).select('*').single()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async listObjectTypes(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    return (await supabase
      .from('user_object_types')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })) as {
      data: Array<Record<string, unknown>> | null
      error: QueryError | null
    }
  }

  async findObjectType(
    supabase: SupabaseClient,
    input: { userId: string; objectTypeId: string; slug: string },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    let query = supabase.from('user_object_types').select('*').eq('user_id', input.userId)
    query = input.objectTypeId ? query.eq('id', input.objectTypeId) : query.eq('slug', input.slug)
    return (await query.maybeSingle()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async updateObjectType(
    supabase: SupabaseClient,
    input: { userId: string; objectTypeId: string; fields: unknown[] },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('user_object_types')
      .update({ fields: input.fields, updated_at: new Date().toISOString() })
      .eq('user_id', input.userId)
      .eq('id', input.objectTypeId)
      .select('*')
      .maybeSingle()) as { data: Record<string, unknown> | null; error: QueryError | null }
  }

  async createObject(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase.from('user_object_records').insert(payload).select('*').single()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async findObjectData(
    supabase: SupabaseClient,
    input: { userId: string; objectId: string },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('user_object_records')
      .select('data')
      .eq('user_id', input.userId)
      .eq('id', input.objectId)
      .is('deleted_at', null)
      .maybeSingle()) as { data: Record<string, unknown> | null; error: QueryError | null }
  }

  async updateObject(
    supabase: SupabaseClient,
    input: { userId: string; objectId: string; data: Record<string, unknown> },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('user_object_records')
      .update({ data: input.data, updated_at: new Date().toISOString() })
      .eq('user_id', input.userId)
      .eq('id', input.objectId)
      .select('*')
      .maybeSingle()) as { data: Record<string, unknown> | null; error: QueryError | null }
  }

  async resolveObjectTypeId(
    supabase: SupabaseClient,
    input: { userId: string; slug: string },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('user_object_types')
      .select('id')
      .eq('user_id', input.userId)
      .eq('slug', input.slug)
      .maybeSingle()) as { data: Record<string, unknown> | null; error: QueryError | null }
  }

  async listObjects(
    supabase: SupabaseClient,
    input: { userId: string; objectTypeId: string; campaignId: string | null; limit: number },
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    let query = supabase
      .from('user_object_records')
      .select('*')
      .eq('user_id', input.userId)
      .eq('object_type_id', input.objectTypeId)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .limit(input.limit)
    if (input.campaignId) query = query.eq('campaign_id', input.campaignId)
    return (await query) as { data: Array<Record<string, unknown>> | null; error: QueryError | null }
  }

  async getObject(
    supabase: SupabaseClient,
    input: { userId: string; objectId: string },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('user_object_records')
      .select('*')
      .eq('user_id', input.userId)
      .eq('id', input.objectId)
      .is('deleted_at', null)
      .maybeSingle()) as { data: Record<string, unknown> | null; error: QueryError | null }
  }

  async deleteObject(
    supabase: SupabaseClient,
    input: { userId: string; objectId: string },
  ): Promise<{ error: QueryError | null }> {
    return (await supabase
      .from('user_object_records')
      .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('user_id', input.userId)
      .eq('id', input.objectId)) as { error: QueryError | null }
  }
}
