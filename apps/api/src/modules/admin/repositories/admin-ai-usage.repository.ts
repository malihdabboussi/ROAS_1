import { Injectable } from '@nestjs/common'
import { SupabaseServiceClient } from '@vibey/api-shared'
import type {
  AdminAiUsageAttemptRow,
  AdminAiUsageBillingCheckRow,
  AdminAiUsageTraceRow,
} from '../types/admin-ai-usage.types'

const PAGE_SIZE = 1000
const MAX_ROWS = 50000

@Injectable()
export class AdminAiUsageRepository {
  constructor(private readonly serviceClient: SupabaseServiceClient) {}

  findRecentTraces(since: string): Promise<AdminAiUsageTraceRow[]> {
    return this.findRecentRows<AdminAiUsageTraceRow>(
      'vb_agent_traces',
      'id, created_at, status, channel, model, total_tokens, cost_usd',
      since,
    )
  }

  findRecentProviderAttempts(since: string): Promise<AdminAiUsageAttemptRow[]> {
    return this.findRecentRows<AdminAiUsageAttemptRow>(
      'provider_billing_attempts',
      [
        'id',
        'created_at',
        'status',
        'source_app',
        'source_path',
        'feature',
        'action',
        'provider',
        'requested_model',
        'resolved_model',
        'total_tokens',
        'final_cost_usd',
        'provider_cost_usd',
        'estimated_cost_usd',
        'ai_usage_event_id',
        'metadata_json',
      ].join(', '),
      since,
    )
  }

  async findRecentBillingChecks(limit: number): Promise<AdminAiUsageBillingCheckRow[]> {
    const { data, error } = await this.serviceClient.client
      .from('billing_health_checks')
      .select(
        'check_date, created_at, status, openrouter_reported_cost, db_computed_cost, delta_percent',
      )
      .order('check_date', { ascending: false })
      .limit(limit)
    if (error) throw error
    return (data ?? []) as AdminAiUsageBillingCheckRow[]
  }

  private async findRecentRows<T extends { created_at: string }>(
    table: string,
    columns: string,
    since: string,
  ): Promise<T[]> {
    const rows: T[] = []
    for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
      const { data, error } = await this.serviceClient.client
        .from(table)
        .select(columns)
        .order('created_at', { ascending: false })
        .range(from, from + PAGE_SIZE - 1)
      if (error) throw error
      const page = (data ?? []) as unknown as T[]
      rows.push(...page.filter((row) => row.created_at >= since))
      if (page.length < PAGE_SIZE || page.at(-1)!.created_at < since) break
    }
    return rows
  }
}
