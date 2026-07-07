import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class ArtifactsRepository {
  table(supabase: SupabaseClient, tableName: string): any {
    return supabase.from(tableName)
  }
}
