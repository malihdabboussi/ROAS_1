import { Injectable } from '@nestjs/common'
import { DatabaseService } from '../../lib/services/database.service'
import type { DreamOpsOperationType, DreamOpsSettingRow } from './types'

@Injectable()
export class DreamOpsEligibilityService {
  constructor(private readonly database: DatabaseService) {}

  async hasEvidence(input: {
    setting: DreamOpsSettingRow
    windowStart: string
    windowEnd: string
  }): Promise<boolean> {
    if (input.setting.operation_type === 'company_daily_dream') {
      return this.hasCompanyEvidence(input.setting.org_id, input.windowStart, input.windowEnd)
    }
    if (input.setting.operation_type === 'agent_learning_dream') {
      return this.hasAgentEvidence(
        input.setting.org_id,
        input.setting.subject_key,
        input.windowStart,
        input.windowEnd,
      )
    }
    return false
  }

  private async hasCompanyEvidence(
    orgId: string,
    windowStart: string,
    windowEnd: string,
  ): Promise<boolean> {
    const checks = [
      this.exists('messages', { orgId, windowStart, windowEnd, orgRelation: 'conversations.org_id' }),
      this.exists('channel_messages', { orgId, windowStart, windowEnd, orgRelation: 'channels.org_id' }),
      this.exists('space_item_activity', { orgId, windowStart, windowEnd }),
      this.exists('space_item_deliverables', { orgId, windowStart, windowEnd }),
      this.exists('conversation_documents', {
        orgId,
        windowStart,
        windowEnd,
        orgRelation: 'conversations.org_id',
      }),
    ]
    return (await Promise.all(checks)).some(Boolean)
  }

  private async hasAgentEvidence(
    orgId: string,
    agentKey: string,
    windowStart: string,
    windowEnd: string,
  ): Promise<boolean> {
    const checks = [
      this.exists('skill_recommendation_events', { orgId, agentKey, windowStart, windowEnd }),
      this.exists('agent_turn_feedback', { orgId, agentKey, windowStart, windowEnd }),
      this.exists('vb_agent_traces', { orgId, agentKey, windowStart, windowEnd }),
      this.exists('space_item_activity', {
        orgId,
        windowStart,
        windowEnd,
        payloadAgentKey: agentKey,
      }),
      this.exists('missions_logs', { orgId, agentKey, windowStart, windowEnd }),
    ]
    return (await Promise.all(checks)).some(Boolean)
  }

  private async exists(
    table: string,
    input: {
      orgId: string
      agentKey?: string
      windowStart: string
      windowEnd: string
      orgRelation?: string
      payloadAgentKey?: string
    },
  ): Promise<boolean> {
    const select = input.orgRelation ? this.relationExistsSelect(input.orgRelation) : 'id'
    let query = this.database.getClient().from(table).select(select).limit(1)
    query = input.orgRelation
      ? query.eq(input.orgRelation, input.orgId)
      : query.eq('org_id', input.orgId)
    query = query.gte('created_at', input.windowStart).lt('created_at', input.windowEnd)
    if (input.agentKey) query = query.eq('agent_key', input.agentKey)
    if (input.payloadAgentKey) query = query.eq('actor_kind', 'agent')
    const { data, error } = await query
    if (error) throw new Error(`Failed Dream Ops ${table} eligibility check: ${error.message}`)
    return Array.isArray(data) && data.length > 0
  }

  private relationExistsSelect(orgRelation: string): string {
    const [relation, column] = orgRelation.split('.')
    return `id, ${relation}!inner(${column})`
  }
}
