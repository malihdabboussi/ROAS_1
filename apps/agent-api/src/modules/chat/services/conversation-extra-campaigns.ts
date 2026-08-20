import type { SupabaseClient } from '@supabase/supabase-js'

export const EXTRA_CAMPAIGN_PRELOAD_LIMIT = 2

export async function listAdditionalConversationCampaignIds(
  supabase: SupabaseClient,
  conversationId: string,
  primaryCampaignId?: string | null,
): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('conversation_connections')
      .select('entity_id')
      .eq('conversation_id', conversationId)
      .eq('entity_type', 'campaign')
    if (error || !Array.isArray(data)) return []
    const primary = primaryCampaignId?.trim() || null
    const ids: string[] = []
    for (const row of data) {
      const id = typeof row?.entity_id === 'string' ? row.entity_id.trim() : ''
      if (!id || id === primary || ids.includes(id)) continue
      ids.push(id)
      if (ids.length >= EXTRA_CAMPAIGN_PRELOAD_LIMIT) break
    }
    return ids
  } catch {
    return []
  }
}
