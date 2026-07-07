import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class GraphRequestRepository {
  async loadBrainScope(client: SupabaseClient, brainId: string): Promise<string | null> {
    const { data: brainRow } = await client
      .from('ns_brains')
      .select('scope')
      .eq('id', brainId)
      .maybeSingle()
    return (brainRow as { scope?: string } | null)?.scope ?? null
  }
}
