/**
 * Service-role Supabase client factory for the YC demo seeder.
 *
 * Service role bypasses RLS, which we need for bulk inserts across many
 * tables. Never use the anon key here.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { SeederEnv } from './env'

export function createServiceClient(env: SeederEnv): SupabaseClient {
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: 'public' },
  })
}

/**
 * Asserts that the Supabase URL we're about to write to is the one the
 * caller actually intends. The seeder is destructive in scope — we add many
 * rows under a single org — so it must never run against a misconfigured
 * project.
 */
export function assertExpectedProject(env: SeederEnv, expectedHost: string): void {
  const url = new URL(env.supabaseUrl)
  if (url.host !== expectedHost) {
    throw new Error(
      `Refusing to run: SUPABASE_URL host is ${url.host} but expected ${expectedHost}. ` +
        `Set EXPECTED_SUPABASE_HOST to override.`,
    )
  }
}
