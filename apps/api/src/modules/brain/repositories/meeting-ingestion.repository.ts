import { Injectable } from '@nestjs/common'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class MeetingIngestionRepository {
  private adminClient: SupabaseClient | null = null

  getAdminClient(): SupabaseClient {
    if (this.adminClient) return this.adminClient
    const url = process.env.SUPABASE_URL || ''
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    this.adminClient = createClient(url, serviceKey)
    return this.adminClient
  }
}
