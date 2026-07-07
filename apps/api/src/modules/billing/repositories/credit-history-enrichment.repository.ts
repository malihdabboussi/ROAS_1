import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  enrichCreditHistoryRows,
  type CreditHistoryAgentRow,
  type CreditHistoryCampaignRow,
  type CreditHistoryConversationRow,
  type CreditHistoryEnrichedItem,
  type CreditHistoryRawRow,
} from '../utils/credit-history-enrich'

type SupabaseListResponse<T> = {
  data?: T[] | null
}

@Injectable()
export class CreditHistoryEnrichmentRepository {
  async enrichCreditHistoryRows(
    supabase: SupabaseClient,
    rows: CreditHistoryRawRow[],
  ): Promise<CreditHistoryEnrichedItem[]> {
    const convIds = [...new Set(rows.map((r) => r.conversation_id).filter(Boolean))] as string[]
    const campIds = [...new Set(rows.map((r) => r.campaign_id).filter(Boolean))] as string[]

    const [convsRes, campsRes] = await Promise.all([
      convIds.length
        ? (supabase
            .from('conversations')
            .select('id, title, agent_id, user_id, org_id')
            .in('id', convIds) as unknown as Promise<
            SupabaseListResponse<CreditHistoryConversationRow>
          >)
        : Promise.resolve({ data: [] as CreditHistoryConversationRow[] }),
      campIds.length
        ? (supabase.from('campaigns').select('id, name').in('id', campIds) as unknown as Promise<
            SupabaseListResponse<CreditHistoryCampaignRow>
          >)
        : Promise.resolve({ data: [] as CreditHistoryCampaignRow[] }),
    ])

    const uniqueAgentKeys = [
      ...new Set(
        (convsRes.data ?? [])
          .map((conversation) => conversation.agent_id)
          .filter((agentId): agentId is string => Boolean(agentId)),
      ),
    ]

    const agentsRes = uniqueAgentKeys.length
      ? ((await supabase
          .from('agents_registry')
          .select('agent_key, name, image_url, user_id, org_id')
          .in('agent_key', uniqueAgentKeys)) as SupabaseListResponse<CreditHistoryAgentRow>)
      : { data: [] as CreditHistoryAgentRow[] }

    return enrichCreditHistoryRows(rows, {
      conversations: convsRes.data ?? [],
      campaigns: campsRes.data ?? [],
      agents: agentsRes.data ?? [],
    })
  }
}
