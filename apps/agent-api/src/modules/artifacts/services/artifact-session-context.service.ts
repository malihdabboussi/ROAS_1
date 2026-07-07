import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class ArtifactSessionContextService {
  resolveUserId(target: object, sessionKey?: string): string {
    return (target as any).resolveUserId(sessionKey)
  }

  parseAgentIdFromSessionKey(target: object, sessionKey?: string): string | null {
    return (target as any).parseAgentIdFromSessionKey(sessionKey)
  }

  parseCampaignIdFromSessionKey(target: object, sessionKey?: string): string | null {
    return (target as any).parseCampaignIdFromSessionKey(sessionKey)
  }

  parseConversationId(target: object, sessionKey?: string): string | null {
    return (target as any).parseConversationId(sessionKey)
  }

  async getUserClient(target: object, userId: string, sessionKey: string): Promise<SupabaseClient> {
    return (target as any).getUserClient(userId, sessionKey)
  }
}
