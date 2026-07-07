import { Injectable } from '@nestjs/common'
import { DatabaseService } from '../../lib/services/database.service'
import type { AgentLearningDreamGroup } from './agent-learning-dream.types'

type CollectInput = {
  orgId: string
  agentKey: string
  windowStart: string
  windowEnd: string
}

type SourceRow = Record<string, unknown>

@Injectable()
export class AgentLearningDreamCollectorService {
  constructor(private readonly database: DatabaseService) {}

  async collect(input: CollectInput): Promise<{
    groups: AgentLearningDreamGroup[]
    sourceCounts: Record<string, number>
  }> {
    const client = this.database.getClient()
    const [events, feedback, traces, activity, missionLogs] = await Promise.all([
      client
        .from('skill_recommendation_events')
        .select('id, prompt_excerpt, tool_names, status, channel, trace_id, created_at')
        .eq('org_id', input.orgId)
        .eq('agent_key', input.agentKey)
        .gte('created_at', input.windowStart)
        .lt('created_at', input.windowEnd)
        .order('created_at', { ascending: false })
        .limit(200),
      client
        .from('agent_turn_feedback')
        .select('id, target_kind, target_id, thumbs_up, tags, feedback_text, created_at')
        .eq('org_id', input.orgId)
        .eq('agent_key', input.agentKey)
        .gte('created_at', input.windowStart)
        .lt('created_at', input.windowEnd)
        .order('created_at', { ascending: false })
        .limit(200),
      client
        .from('vb_agent_traces')
        .select('id, status, user_message, response, tool_steps, duration_ms, completed_at, created_at')
        .eq('org_id', input.orgId)
        .eq('agent_key', input.agentKey)
        .gte('created_at', input.windowStart)
        .lt('created_at', input.windowEnd)
        .order('created_at', { ascending: false })
        .limit(100),
      client
        .from('space_item_activity')
        .select('id, item_id, event_type, actor_kind, payload, created_at')
        .eq('org_id', input.orgId)
        .eq('actor_kind', 'agent')
        .gte('created_at', input.windowStart)
        .lt('created_at', input.windowEnd)
        .order('created_at', { ascending: false })
        .limit(100),
      client
        .from('missions_logs')
        .select('id, mission_id, event_type, agent_key, payload, created_at')
        .eq('org_id', input.orgId)
        .eq('agent_key', input.agentKey)
        .gte('created_at', input.windowStart)
        .lt('created_at', input.windowEnd)
        .order('created_at', { ascending: false })
        .limit(100),
    ])

    const eventRows = this.rows(events)
    const feedbackRows = this.rows(feedback)
    const traceRows = this.rows(traces)
    const activityRows = this.rows(activity)
    const missionLogRows = this.rows(missionLogs)

    return {
      groups: [
        ...eventRows.map((row) => this.eventGroup(row)),
        ...feedbackRows.map((row) => this.feedbackGroup(row)),
        ...traceRows.map((row) => this.traceGroup(row)),
        ...activityRows.map((row) => this.activityGroup(row)),
        ...missionLogRows.map((row) => this.missionLogGroup(row)),
      ],
      sourceCounts: {
        skill_recommendation_events: eventRows.length,
        agent_turn_feedback: feedbackRows.length,
        vb_agent_traces: traceRows.length,
        space_item_activity: activityRows.length,
        missions_logs: missionLogRows.length,
      },
    }
  }

  private eventGroup(row: SourceRow): AgentLearningDreamGroup {
    return {
      id: String(row.id),
      source: 'skill_recommendation_event',
      text: [
        `prompt: ${this.text(row.prompt_excerpt)}`,
        `tools: ${this.payload(row.tool_names)}`,
        `status: ${this.text(row.status)}`,
      ].join('\n'),
      metadata: { trace_id: row.trace_id ?? null, channel: row.channel ?? null },
    }
  }

  private feedbackGroup(row: SourceRow): AgentLearningDreamGroup {
    return {
      id: String(row.id),
      source: 'agent_turn_feedback',
      text: [
        `thumbs_up: ${String(row.thumbs_up)}`,
        `tags: ${this.payload(row.tags)}`,
        `feedback: ${this.text(row.feedback_text)}`,
      ].join('\n'),
      metadata: { target_kind: row.target_kind, target_id: row.target_id },
    }
  }

  private traceGroup(row: SourceRow): AgentLearningDreamGroup {
    return {
      id: String(row.id),
      source: 'trace',
      text: [
        `status: ${this.text(row.status)}`,
        `user: ${this.text(row.user_message)}`,
        `agent: ${this.text(row.response)}`,
        `tools: ${this.payload(row.tool_steps)}`,
      ].join('\n'),
      metadata: { duration_ms: row.duration_ms ?? null, completed_at: row.completed_at ?? null },
    }
  }

  private activityGroup(row: SourceRow): AgentLearningDreamGroup {
    return {
      id: String(row.id),
      source: 'space_item_activity',
      text: `${this.text(row.event_type)}: ${this.payload(row.payload)}`,
      metadata: { item_id: row.item_id ?? null },
    }
  }

  private missionLogGroup(row: SourceRow): AgentLearningDreamGroup {
    return {
      id: String(row.id),
      source: 'mission_log',
      text: `${this.text(row.event_type)}: ${this.payload(row.payload)}`,
      metadata: { mission_id: row.mission_id ?? null },
    }
  }

  private rows(result: unknown): SourceRow[] {
    const data = (result as { data?: unknown[] | null; error?: { message?: string } | null })?.data
    const error = (result as { error?: { message?: string } | null })?.error
    if (error) throw new Error(error.message ?? 'Agent Learning Dream source query failed')
    return Array.isArray(data) ? (data as SourceRow[]) : []
  }

  private text(value: unknown): string {
    return typeof value === 'string' ? value : ''
  }

  private payload(value: unknown): string {
    if (typeof value === 'string') return value
    if (value == null) return ''
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
}
