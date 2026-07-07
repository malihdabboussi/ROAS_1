import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type TransferRepositoryError = { message: string } | null

@Injectable()
export class TransferCampaignCopyRepository {
  async copyRow(
    supabase: SupabaseClient,
    table: string,
    source: any,
    overrides: Record<string, any>,
  ): Promise<{ data: any | null; error: TransferRepositoryError }> {
    const { id: _id, created_at: _ca, updated_at: _ua, deleted_at: _da, ...rest } = source
    const { data, error } = await supabase
      .from(table)
      .insert({ ...rest, ...overrides })
      .select()
      .single()

    return { data: data ?? null, error }
  }

  async listCampaignRows(
    supabase: SupabaseClient,
    table: string,
    campaignId: string,
  ): Promise<any[]> {
    const { data } = await supabase.from(table).select('*').eq('campaign_id', campaignId)
    return data ?? []
  }

  async insertCopiedRow(
    supabase: SupabaseClient,
    table: string,
    copy: Record<string, any>,
  ): Promise<{ data: any | null; error: TransferRepositoryError }> {
    const { data, error } = await supabase.from(table).insert(copy).select('id').single()
    return { data: data ?? null, error }
  }

  async insertCopiedFunnel(
    supabase: SupabaseClient,
    copy: Record<string, any>,
  ): Promise<any | null> {
    const { data } = await supabase.from('funnels').insert(copy).select().single()
    return data ?? null
  }

  async listFunnelPages(supabase: SupabaseClient, funnelId: string): Promise<any[]> {
    const { data } = await supabase.from('funnel_pages').select('*').eq('funnel_id', funnelId)
    return data ?? []
  }

  async listRowsByParentIds(
    supabase: SupabaseClient,
    table: string,
    parentFkCol: string,
    parentIds: string[],
  ): Promise<any[]> {
    const { data } = await supabase.from(table).select('*').in(parentFkCol, parentIds)
    return data ?? []
  }

  async insertRow(
    supabase: SupabaseClient,
    table: string,
    copy: Record<string, any>,
  ): Promise<{ error: TransferRepositoryError }> {
    const { error } = await supabase.from(table).insert(copy)
    return { error }
  }

  async insertRows(
    supabase: SupabaseClient,
    table: string,
    copies: Array<Record<string, any>>,
  ): Promise<{ error: TransferRepositoryError }> {
    const { error } = await supabase.from(table).insert(copies)
    return { error }
  }

  async insertConfigRows(
    supabase: SupabaseClient,
    table: string,
    copies: Array<Record<string, any>>,
  ): Promise<{ error: TransferRepositoryError }> {
    return this.insertRows(supabase, table, copies)
  }
}
