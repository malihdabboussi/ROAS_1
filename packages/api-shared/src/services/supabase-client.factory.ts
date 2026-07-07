import { Injectable } from '@nestjs/common'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { createResilientFetch } from './supabase-resilient-fetch'

/**
 * Supabase Client Factory
 * Creates RLS-enforced clients scoped to authenticated user JWT.
 */
@Injectable()
export class SupabaseClientFactory {
  private readonly supabaseFetch = createResilientFetch({
    label: 'supabase_client_factory',
    maxRetries: 2,
    timeoutMs: 60000,
  })

  createUserClient(token: string): SupabaseClient {
    const url = process.env.SUPABASE_URL
    const anonKey = process.env.SUPABASE_ANON_KEY

    if (!url || !anonKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY')
    }

    return createClient(url, anonKey, {
      global: {
        headers: { Authorization: `Bearer ${token}` },
        fetch: this.supabaseFetch,
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }
}
