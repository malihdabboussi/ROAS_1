import { SupabaseClient } from '@supabase/supabase-js';
export declare class SupabaseClientFactory {
    private readonly supabaseFetch;
    createUserClient(token: string): SupabaseClient;
}
