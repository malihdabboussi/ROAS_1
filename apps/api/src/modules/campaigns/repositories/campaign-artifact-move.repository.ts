import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class CampaignArtifactMoveRepository {
  async getCampaignAssetSummary(
    supabase: SupabaseClient,
    campaignId: string,
  ): Promise<{
    offers: Array<Record<string, unknown>>
    funnels: Array<Record<string, unknown>>
    ads: Array<Record<string, unknown>>
    sequences: Array<Record<string, unknown>>
    presentations: Array<Record<string, unknown>>
    avatars: Array<Record<string, unknown>>
  }> {
    const [offers, funnels, ads, sequences, presentations, avatars] = await Promise.all([
      this.listAssetSummaryRows(supabase, 'offers', 'id, name', campaignId),
      this.listAssetSummaryRows(supabase, 'funnels', 'id, name', campaignId),
      this.listAssetSummaryRows(supabase, 'ads', 'id, headline', campaignId),
      this.listAssetSummaryRows(supabase, 'sequences', 'id, name', campaignId),
      this.listAssetSummaryRows(supabase, 'presentations', 'id, name', campaignId),
      this.listAssetSummaryRows(supabase, 'avatars', 'id, name', campaignId),
    ])
    return { offers, funnels, ads, sequences, presentations, avatars }
  }

  async moveArtifactToCampaign(
    supabase: SupabaseClient,
    table: string,
    artifactId: string,
    targetCampaignId: string,
  ) {
    const { error } = await supabase
      .from(table)
      .update({ campaign_id: targetCampaignId, updated_at: new Date().toISOString() })
      .eq('id', artifactId)
    if (error) throw new Error(`Failed to move artifact: ${error.message}`)
  }

  async findArtifactRow(supabase: SupabaseClient, table: string, artifactId: string) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('id', artifactId)
      .maybeSingle()
    if (error || !data) return null
    return data as Record<string, unknown>
  }

  async insertArtifactCopy(
    supabase: SupabaseClient,
    table: string,
    payload: Record<string, unknown>,
  ) {
    const { data, error } = await supabase.from(table).insert(payload).select('id').single()
    if (error) throw new Error(`Failed to copy artifact: ${error.message}`)
    return data as Record<string, unknown>
  }

  async listSequenceEmailRows(supabase: SupabaseClient, sequenceId: string) {
    const { data } = await supabase
      .from('sequence_emails')
      .select('*')
      .eq('sequence_id', sequenceId)
    return (data ?? []) as Array<Record<string, unknown>>
  }

  async insertSequenceEmailRows(supabase: SupabaseClient, rows: Array<Record<string, unknown>>) {
    const { error } = await supabase.from('sequence_emails').insert(rows)
    if (error) throw new Error(`Failed to copy sequence emails: ${error.message}`)
  }

  async insertPresentationFileRows(supabase: SupabaseClient, rows: Array<Record<string, unknown>>) {
    const { error } = await supabase.from('presentation_files').insert(rows)
    if (error) throw new Error(`Failed to copy presentation files: ${error.message}`)
  }

  async insertPresentationAssetRows(
    supabase: SupabaseClient,
    rows: Array<Record<string, unknown>>,
  ) {
    const { error } = await supabase.from('presentation_assets').insert(rows)
    if (error) throw new Error(`Failed to copy presentation assets: ${error.message}`)
  }

  async findLineageStart(supabase: SupabaseClient, table: string, artifactId: string) {
    const { data, error } = await supabase
      .from(table)
      .select('id, campaign_id, copied_from_id')
      .eq('id', artifactId)
      .maybeSingle()
    if (error || !data) return null
    return data as Record<string, unknown>
  }

  async findLineageParent(supabase: SupabaseClient, table: string, parentId: string) {
    const { data } = await supabase
      .from(table)
      .select('id, copied_from_id')
      .eq('id', parentId)
      .maybeSingle()
    return (data as Record<string, unknown> | null) ?? null
  }

  async listLineageChildren(supabase: SupabaseClient, table: string, id: string) {
    const { data } = await supabase.from(table).select('id').eq('copied_from_id', id)
    return (data ?? []) as Array<{ id?: string }>
  }

  async listLineageCampaignRows(supabase: SupabaseClient, table: string, ids: string[]) {
    const { data, error } = await supabase.from(table).select('campaign_id').in('id', ids)
    if (error) return []
    return (data ?? []) as Array<{ campaign_id?: string | null }>
  }

  private async listAssetSummaryRows(
    supabase: SupabaseClient,
    table: string,
    select: string,
    campaignId: string,
  ): Promise<Array<Record<string, unknown>>> {
    const { data } = await supabase
      .from(table)
      .select(select)
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
    return (data ?? []) as unknown as Array<Record<string, unknown>>
  }
}
