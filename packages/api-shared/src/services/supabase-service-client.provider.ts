import { Injectable } from '@nestjs/common'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { createResilientFetch } from './supabase-resilient-fetch'

const serviceRoleFetch = createResilientFetch({
  label: 'service_role',
  maxRetries: 2,
  timeoutMs: 60000,
})

@Injectable()
export class SupabaseServiceClient {
  public readonly client: SupabaseClient

  constructor() {
    const url = process.env.SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }
    this.client = createClient(url, serviceKey, {
      global: { fetch: serviceRoleFetch },
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
}
