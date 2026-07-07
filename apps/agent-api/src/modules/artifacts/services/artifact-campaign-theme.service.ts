import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class ArtifactCampaignThemeService {
  async resolveCampaignId(
    target: object,
    supabase: SupabaseClient,
    input: Record<string, unknown>,
    userId: string,
    sessionKey?: string,
  ): Promise<string | null> {
    return (target as any).resolveCampaignId(supabase, input, userId, sessionKey)
  }

  async getThemeTableName(target: object): Promise<'branding_themes' | 'themes'> {
    return (target as any).getThemeTableName()
  }

  async validateThemeOwnership(
    target: object,
    supabase: SupabaseClient,
    themeId: string,
    userId: string,
  ): Promise<boolean> {
    return (target as any).validateThemeOwnership(supabase, themeId, userId)
  }

  async resolveThemeId(
    target: object,
    supabase: SupabaseClient,
    input: Record<string, unknown>,
    userId: string,
  ): Promise<string | null> {
    return (target as any).resolveThemeId(supabase, input, userId)
  }
}
