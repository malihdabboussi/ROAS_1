import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryError = { message: string }

@Injectable()
export class ArtifactCanvasRepository {
  async listNodesByCanvasId(
    supabase: SupabaseClient,
    input: { canvasId: string; userId: string },
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    return (await supabase
      .from('ad_creative_nodes')
      .select('id, kind, status, payload, ad_id, image_asset_id, parent_node_id, parent_image_node_id')
      .eq('canvas_id', input.canvasId)
      .eq('user_id', input.userId)
      .order('created_at', { ascending: true })) as {
      data: Array<Record<string, unknown>> | null
      error: QueryError | null
    }
  }

  async findCanvasByAdSet(
    supabase: SupabaseClient,
    input: { adSetId: string; userId: string },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('ad_creative_canvases')
      .select('id')
      .eq('ad_set_id', input.adSetId)
      .eq('user_id', input.userId)
      .maybeSingle()) as { data: Record<string, unknown> | null; error: QueryError | null }
  }

  async findMediaAsset(
    supabase: SupabaseClient,
    input: { assetId: string; userId: string },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('media_assets')
      .select('public_url, bucket_name, file_path')
      .eq('id', input.assetId)
      .eq('user_id', input.userId)
      .maybeSingle()) as { data: Record<string, unknown> | null; error: QueryError | null }
  }

  async findAdSet(
    supabase: SupabaseClient,
    input: { adSetId: string; userId: string },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('ad_sets')
      .select('id, ad_campaign_id, name, space_id')
      .eq('id', input.adSetId)
      .eq('user_id', input.userId)
      .maybeSingle()) as { data: Record<string, unknown> | null; error: QueryError | null }
  }

  async findAdCampaign(
    supabase: SupabaseClient,
    adCampaignId: string,
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('ad_campaigns')
      .select('campaign_id, space_id')
      .eq('id', adCampaignId)
      .maybeSingle()) as { data: Record<string, unknown> | null; error: QueryError | null }
  }

  async createAd(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase.from('ads').insert(payload).select('*').single()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async findCanvasNodePayload(
    supabase: { from: (table: string) => any },
    input: { canvasNodeId: string; userId: string },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('ad_creative_nodes')
      .select('payload')
      .eq('id', input.canvasNodeId)
      .eq('user_id', input.userId)
      .maybeSingle()) as { data: Record<string, unknown> | null; error: QueryError | null }
  }

  async updateCanvasNodeFromImage(
    supabase: { from: (table: string) => any },
    input: { canvasNodeId: string; userId: string; payload: Record<string, unknown> },
  ): Promise<{ error: QueryError | null }> {
    return (await supabase
      .from('ad_creative_nodes')
      .update(input.payload)
      .eq('id', input.canvasNodeId)
      .eq('user_id', input.userId)) as { error: QueryError | null }
  }
}
