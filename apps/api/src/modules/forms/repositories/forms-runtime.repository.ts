import { Injectable } from '@nestjs/common'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class FormsRuntimeRepository {
  createServiceClient(): SupabaseClient {
    const url = process.env.SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }
    return createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }

  async listSpaceTitlesByIds(
    supabase: SupabaseClient,
    spaceIds: string[],
  ): Promise<Array<{ id: string; title: string | null }>> {
    const { data, error } = await supabase.from('spaces').select('id, title').in('id', spaceIds)
    if (error) throw new Error(`DB error: ${error.message}`)
    return (data ?? []) as Array<{ id: string; title: string | null }>
  }

  async findGeneratedDomain(serviceClient: SupabaseClient, userId: string) {
    const { data } = await serviceClient
      .from('domains')
      .select('domain_name')
      .eq('user_id', userId)
      .eq('domain_type', 'generated')
      .eq('status', 'verified')
      .limit(1)
      .single()
    return data as { domain_name: string } | null
  }

  async findDomainConflict(serviceClient: SupabaseClient, subdomain: string) {
    const { data } = await serviceClient
      .from('domains')
      .select('id')
      .eq('domain_name', subdomain)
      .limit(1)
      .single()
    return data as { id: string } | null
  }

  async insertGeneratedDomain(
    serviceClient: SupabaseClient,
    row: {
      domain: string
      domain_name: string
      user_id: string
      domain_type: 'generated'
      status: 'verified'
      vercel_project_id: string
      org_id: string | null
    },
  ): Promise<void> {
    await serviceClient.from('domains').insert(row)
  }

  async findContactFields(
    supabase: SupabaseClient,
    contactId: string,
    columns: string[],
  ): Promise<Record<string, unknown>> {
    const { data, error } = await supabase
      .from('contacts')
      .select(columns.join(', '))
      .eq('id', contactId)
      .maybeSingle()
    if (error) throw new Error(`DB error: ${error.message}`)
    return (data ?? {}) as Record<string, unknown>
  }

  async updateContactFields(
    supabase: SupabaseClient,
    contactId: string,
    patch: Record<string, string | null>,
  ): Promise<void> {
    const { error } = await supabase.from('contacts').update(patch).eq('id', contactId)
    if (error) throw new Error(`DB error: ${error.message}`)
  }
}
