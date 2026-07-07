import { Injectable } from '@nestjs/common'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class EmailCampaignsRepository {
  getAdminClient(): SupabaseClient {
    return createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '')
  }

  table(client: SupabaseClient, tableName: string): any {
    return client.from(tableName)
  }
}
