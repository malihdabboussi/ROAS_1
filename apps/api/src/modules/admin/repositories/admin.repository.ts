import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'

@Injectable()
export class AdminRepository {
  constructor(private readonly svc: SupabaseServiceClient) {}

  getServiceClient(): SupabaseClient {
    return this.svc.client
  }

  serviceTable(tableName: string): any {
    return this.svc.client.from(tableName)
  }

  table(client: SupabaseClient, tableName: string): any {
    return client.from(tableName)
  }

  rpc(functionName: string, args?: Record<string, unknown>): any {
    return this.svc.client.rpc(functionName, args)
  }

  listAuthUsers(params: { page?: number; perPage?: number }) {
    return this.svc.client.auth.admin.listUsers(params)
  }

  getAuthUserById(userId: string) {
    return this.svc.client.auth.admin.getUserById(userId)
  }
}
