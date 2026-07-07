import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class ArtifactNotificationsRepository {
  async insertUserNotification(
    serviceClient: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await serviceClient.from('user_notifications').insert(payload)
  }
}
