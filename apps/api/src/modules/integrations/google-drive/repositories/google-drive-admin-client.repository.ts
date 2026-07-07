import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'

@Injectable()
export class GoogleDriveAdminClientRepository {
  constructor(private readonly serviceClient: SupabaseServiceClient) {}

  getClient(): SupabaseClient {
    return this.serviceClient.client
  }
}
