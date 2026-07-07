import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryError = { message: string }
type AvatarImageContext = {
  avatarId: string
  campaignId: string | null
  personaData: Record<string, unknown>
}

@Injectable()
export class ArtifactLegacyMediaGenerateRepository {
  async findCampaignIdFromAd(
    supabase: SupabaseClient,
    input: { adId: string; userId: string },
  ): Promise<{ campaignId: string | null; source: 'ad' | 'ad_campaign' | null }> {
    const { data: ad } = await supabase
      .from('ads')
      .select('campaign_id, ad_set_id')
      .eq('id', input.adId)
      .eq('user_id', input.userId)
      .maybeSingle()
    if (ad?.campaign_id) return { campaignId: String(ad.campaign_id), source: 'ad' }
    if (!ad?.ad_set_id) return { campaignId: null, source: null }

    const { data: adSet } = await supabase
      .from('ad_sets')
      .select('ad_campaign_id')
      .eq('id', ad.ad_set_id)
      .eq('user_id', input.userId)
      .maybeSingle()
    if (!adSet?.ad_campaign_id) return { campaignId: null, source: null }

    const { data: adCampaign } = await supabase
      .from('ad_campaigns')
      .select('campaign_id')
      .eq('id', adSet.ad_campaign_id)
      .eq('user_id', input.userId)
      .maybeSingle()
    return adCampaign?.campaign_id
      ? { campaignId: String(adCampaign.campaign_id), source: 'ad_campaign' }
      : { campaignId: null, source: null }
  }

  async findCampaignConfig(
    supabase: SupabaseClient,
    campaignId: string,
  ): Promise<{ data: Record<string, unknown> | null }> {
    return (await supabase
      .from('campaigns')
      .select('config')
      .eq('id', campaignId)
      .maybeSingle()) as {
      data: Record<string, unknown> | null
    }
  }

  async findBrandingThemeStylePrompt(
    supabase: SupabaseClient,
    themeId: string,
  ): Promise<{ data: Record<string, unknown> | null }> {
    return (await supabase
      .from('branding_themes')
      .select('image_style_prompt')
      .eq('id', themeId)
      .maybeSingle()) as { data: Record<string, unknown> | null }
  }

  async resolveAvatarImageContext(
    supabase: SupabaseClient,
    input: { avatarId: string; userId: string; campaignId: string | null },
  ): Promise<{ data: AvatarImageContext | null; error: QueryError | null; failure?: string }> {
    const { data, error } = (await supabase
      .from('avatars')
      .select('id, campaign_id, persona_data')
      .eq('id', input.avatarId)
      .eq('user_id', input.userId)
      .maybeSingle()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
    if (error) return { data: null, error }
    if (!data) return { data: null, error: null, failure: 'avatar not found or access denied' }

    const avatarCampaignId = typeof data.campaign_id === 'string' ? data.campaign_id : null
    if (input.campaignId && avatarCampaignId && input.campaignId !== avatarCampaignId) {
      return {
        data: null,
        error: null,
        failure: 'avatar_id does not belong to the resolved campaign',
      }
    }
    const personaData =
      data.persona_data &&
      typeof data.persona_data === 'object' &&
      !Array.isArray(data.persona_data)
        ? (data.persona_data as Record<string, unknown>)
        : {}
    return {
      data: {
        avatarId: String(data.id),
        campaignId: input.campaignId ?? avatarCampaignId,
        personaData,
      },
      error: null,
    }
  }

  async attachAvatarImage(
    supabase: SupabaseClient,
    input: {
      avatarId: string
      userId: string
      personaData: Record<string, unknown>
      imageUrl: string
    },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('avatars')
      .update({ persona_data: { ...input.personaData, avatar_image: input.imageUrl } })
      .eq('id', input.avatarId)
      .eq('user_id', input.userId)
      .select()
      .maybeSingle()) as { data: Record<string, unknown> | null; error: QueryError | null }
  }
}
