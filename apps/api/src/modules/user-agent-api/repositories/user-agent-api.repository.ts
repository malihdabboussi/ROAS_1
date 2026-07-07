import { Injectable } from '@nestjs/common'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class UserAgentApiRepository {
  private serviceRoleClient: SupabaseClient | null = null

  getServiceRoleClient(): SupabaseClient {
    if (this.serviceRoleClient) return this.serviceRoleClient
    const url = process.env.SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }
    this.serviceRoleClient = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    return this.serviceRoleClient
  }

  setServiceRoleClientForTesting(client: SupabaseClient): void {
    this.serviceRoleClient = client
  }

  async markMachineUnknown(machineStatusColumn: string, userId: string): Promise<void> {
    const supabase = this.getServiceRoleClient()
    await supabase
      .from('profiles')
      .update({ [machineStatusColumn]: 'unknown' })
      .eq('id', userId)
  }

  async getProfileMachineRow(
    selectFields: string,
    userId: string,
  ): Promise<Record<string, unknown> | null> {
    const supabase = this.getServiceRoleClient()
    const { data } = await supabase
      .from('profiles')
      .select(selectFields)
      .eq('id', userId)
      .maybeSingle()
    return (data as Record<string, unknown> | null) ?? null
  }
}
