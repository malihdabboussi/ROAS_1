import { SupabaseClient } from '@supabase/supabase-js'

export declare class SupabaseClientFactory {
  createUserClient(token: string): SupabaseClient
}
