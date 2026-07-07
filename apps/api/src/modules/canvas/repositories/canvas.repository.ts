import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  AdCreativeCanvasRow,
  AdCreativeNodeRow,
  CreateAdCreativeNodeInput,
  ReactFlowGraph,
  ReactFlowViewport,
  UpdateAdCreativeNodePatch,
} from '../types'

@Injectable()
export class CanvasRepository {
  async getOrCreateCanvas(
    supabase: SupabaseClient,
    adSetId: string,
    userId: string,
    orgId?: string | null,
  ): Promise<AdCreativeCanvasRow> {
    const existing = await this.getCanvasByAdSetId(supabase, adSetId, userId, orgId)
    if (existing) return existing

    const { data, error } = await supabase
      .from('ad_creative_canvases')
      .insert({
        ad_set_id: adSetId,
        user_id: userId,
        org_id: orgId ?? null,
      })
      .select('*')
      .single()

    if (error) throw new BadRequestException(error.message)
    return data as AdCreativeCanvasRow
  }

  async getCanvasByAdSetId(
    supabase: SupabaseClient,
    adSetId: string,
    userId: string,
    orgId?: string | null,
  ): Promise<AdCreativeCanvasRow | null> {
    let qb = supabase
      .from('ad_creative_canvases')
      .select('*')
      .eq('ad_set_id', adSetId)
      .eq('user_id', userId)
    if (orgId !== undefined) {
      qb = orgId ? qb.eq('org_id', orgId) : qb.is('org_id', null)
    }
    const { data, error } = await qb.maybeSingle()
    if (error) throw new BadRequestException(error.message)
    return (data as AdCreativeCanvasRow | null) ?? null
  }

  async getCanvasById(
    supabase: SupabaseClient,
    canvasId: string,
    userId: string,
  ): Promise<AdCreativeCanvasRow | null> {
    const { data, error } = await supabase
      .from('ad_creative_canvases')
      .select('*')
      .eq('id', canvasId)
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw new BadRequestException(error.message)
    return (data as AdCreativeCanvasRow | null) ?? null
  }

  async updateCanvasLayout(
    supabase: SupabaseClient,
    canvasId: string,
    graph: ReactFlowGraph,
    viewport: ReactFlowViewport,
    defaultModelId?: string,
  ): Promise<AdCreativeCanvasRow> {
    const updates: Record<string, unknown> = { graph, viewport }
    if (defaultModelId) updates.default_model_id = defaultModelId

    const { data, error } = await supabase
      .from('ad_creative_canvases')
      .update(updates)
      .eq('id', canvasId)
      .select('*')
      .single()

    if (error) throw new BadRequestException(error.message)
    return data as AdCreativeCanvasRow
  }

  async listNodes(supabase: SupabaseClient, canvasId: string): Promise<AdCreativeNodeRow[]> {
    const { data, error } = await supabase
      .from('ad_creative_nodes')
      .select('*')
      .eq('canvas_id', canvasId)
      .order('created_at', { ascending: true })

    if (error) throw new BadRequestException(error.message)
    return (data ?? []) as AdCreativeNodeRow[]
  }

  async getNode(supabase: SupabaseClient, nodeId: string): Promise<AdCreativeNodeRow | null> {
    const { data, error } = await supabase
      .from('ad_creative_nodes')
      .select('*')
      .eq('id', nodeId)
      .maybeSingle()

    if (error) throw new BadRequestException(error.message)
    return (data as AdCreativeNodeRow | null) ?? null
  }

  async createNode(
    supabase: SupabaseClient,
    input: CreateAdCreativeNodeInput,
  ): Promise<AdCreativeNodeRow> {
    const { data, error } = await supabase
      .from('ad_creative_nodes')
      .insert({
        canvas_id: input.canvas_id,
        user_id: input.user_id,
        org_id: input.org_id ?? null,
        kind: input.kind,
        status: input.status ?? 'idle',
        parent_node_id: input.parent_node_id ?? null,
        parent_image_node_id: input.parent_image_node_id ?? null,
        ad_id: input.ad_id ?? null,
        image_asset_id: input.image_asset_id ?? null,
        payload: input.payload ?? {},
        position_x: input.position_x ?? 0,
        position_y: input.position_y ?? 0,
      })
      .select('*')
      .single()

    if (error) throw new BadRequestException(error.message)
    return data as AdCreativeNodeRow
  }

  async updateNode(
    supabase: SupabaseClient,
    nodeId: string,
    patch: UpdateAdCreativeNodePatch,
  ): Promise<AdCreativeNodeRow> {
    const existing = await this.getNode(supabase, nodeId)
    if (!existing) throw new NotFoundException('Node not found')

    const updates: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(patch)) {
      if (value !== undefined) {
        updates[key] = value
      }
    }

    const { data, error } = await supabase
      .from('ad_creative_nodes')
      .update(updates)
      .eq('id', nodeId)
      .select('*')
      .single()

    if (error) throw new BadRequestException(error.message)
    return data as AdCreativeNodeRow
  }

  async deleteNode(supabase: SupabaseClient, nodeId: string): Promise<void> {
    const { error } = await supabase.from('ad_creative_nodes').delete().eq('id', nodeId)
    if (error) throw new BadRequestException(error.message)
  }

  async patchNodePayload(
    supabase: SupabaseClient,
    nodeId: string,
    payloadPatch: Record<string, unknown>,
  ): Promise<AdCreativeNodeRow> {
    const existing = await this.getNode(supabase, nodeId)
    if (!existing) throw new NotFoundException('Node not found')

    const nextPayload = {
      ...(existing.payload ?? {}),
      ...payloadPatch,
    }

    return this.updateNode(supabase, nodeId, { payload: nextPayload })
  }

  async createPromotedAd(
    supabase: SupabaseClient,
    adFields: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const { data, error } = await supabase.from('ads').insert(adFields).select('*').single()
    if (error) throw new BadRequestException(error.message)
    return data as Record<string, unknown>
  }
}
