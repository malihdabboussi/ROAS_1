import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { DatabaseService } from '../../../lib/services/database.service'
import { normalizeIntentPartial } from '../utils/normalize-intent'
import { AgentSignalService } from './agent-signal.service'

export type AwarenessMissionAction =
  | { type: 'retry_mission'; mission_id: string }
  | { type: 'manager_comment'; mission_id: string; message: string }
  | { type: 'set_progress_notes'; mission_id: string; note: string }
  | { type: 'reassign_mission'; mission_id: string; assigned_agent_key: string }
  | { type: 'request_subtask_execute'; mission_id: string; subtask_id: string }
  | { type: 'append_subtasks'; mission_id: string; subtasks: unknown[] }
  | { type: 'cancel_subtask'; mission_id: string; subtask_id: string }
  | {
      type: 'edit_subtask'
      mission_id: string
      subtask_id: string
      title?: string
      assigned_agent_key?: string
      intent?: Record<string, unknown>
    }
  | { type: 'retry_subtask'; mission_id: string; subtask_id: string }
  | { type: 'replan_mission'; mission_id: string; reason?: string }
  | { type: 'pause_mission'; mission_id: string }
  | {
      type: 'amend_mission'
      mission_id: string
      title?: string
      brief?: string
      priority?: string
    }

type AwarenessDecision = {
  decision: 'notify' | 'act' | 'wait'
  content?: string
  point_type?: string
  missions?: Array<{ title: string; brief: string; campaign_id: string }>
  actions?: unknown
  agentKey: string
  archetype?: string
}

const MAX_RETRY = 3
const MAX_COMMENT = 5
const MAX_REASSIGN = 3
const MAX_NUDGE = 5
const MAX_PROGRESS_NOTES = 3
const MAX_APPEND_SUBTASKS = 3
const MAX_CANCEL_SUBTASK = 5
const MAX_EDIT_SUBTASK = 5
const MAX_RETRY_SUBTASK = 3
const MAX_REPLAN_MISSION = 2
const MAX_PAUSE_MISSION = 2
const MAX_AMEND_MISSION = 3

@Injectable()
export class AwarenessActionDispatcher {
  private readonly logger = new Logger(AwarenessActionDispatcher.name)

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly agentSignalService: AgentSignalService,
    private readonly configService: ConfigService,
  ) {}

  private parseActionList(raw: unknown): AwarenessMissionAction[] {
    if (!Array.isArray(raw)) return []
    const out: AwarenessMissionAction[] = []
    for (const item of raw) {
      if (!item || typeof item !== 'object') continue
      const o = item as Record<string, unknown>
      const type = typeof o.type === 'string' ? o.type : ''
      if (type === 'retry_mission' && typeof o.mission_id === 'string') {
        out.push({ type: 'retry_mission', mission_id: o.mission_id })
        continue
      }
      if (
        type === 'manager_comment' &&
        typeof o.mission_id === 'string' &&
        typeof o.message === 'string' &&
        o.message.trim().length > 0
      ) {
        out.push({
          type: 'manager_comment',
          mission_id: o.mission_id,
          message: o.message.trim().slice(0, 4000),
        })
        continue
      }
      if (
        type === 'set_progress_notes' &&
        typeof o.mission_id === 'string' &&
        typeof o.note === 'string' &&
        o.note.trim().length > 0
      ) {
        out.push({
          type: 'set_progress_notes',
          mission_id: o.mission_id,
          note: o.note.trim().slice(0, 4000),
        })
        continue
      }
      if (
        type === 'reassign_mission' &&
        typeof o.mission_id === 'string' &&
        typeof o.assigned_agent_key === 'string' &&
        o.assigned_agent_key.trim().length > 0
      ) {
        out.push({
          type: 'reassign_mission',
          mission_id: o.mission_id,
          assigned_agent_key: o.assigned_agent_key.trim(),
        })
        continue
      }
      if (
        type === 'request_subtask_execute' &&
        typeof o.mission_id === 'string' &&
        typeof o.subtask_id === 'string'
      ) {
        out.push({
          type: 'request_subtask_execute',
          mission_id: o.mission_id,
          subtask_id: o.subtask_id,
        })
        continue
      }
      if (
        type === 'append_subtasks' &&
        typeof o.mission_id === 'string' &&
        Array.isArray(o.subtasks) &&
        o.subtasks.length > 0
      ) {
        out.push({
          type: 'append_subtasks',
          mission_id: o.mission_id,
          subtasks: o.subtasks,
        })
        continue
      }
      if (
        type === 'cancel_subtask' &&
        typeof o.mission_id === 'string' &&
        typeof o.subtask_id === 'string'
      ) {
        out.push({ type: 'cancel_subtask', mission_id: o.mission_id, subtask_id: o.subtask_id })
        continue
      }
      if (
        type === 'edit_subtask' &&
        typeof o.mission_id === 'string' &&
        typeof o.subtask_id === 'string'
      ) {
        const intent = normalizeIntentPartial(o.intent)
        const title = typeof o.title === 'string' ? o.title.trim() : undefined
        const agentKey =
          typeof o.assigned_agent_key === 'string' ? o.assigned_agent_key.trim() : undefined
        const hasField = !!title || !!agentKey || !!intent
        if (!hasField) continue
        out.push({
          type: 'edit_subtask',
          mission_id: o.mission_id,
          subtask_id: o.subtask_id,
          ...(title ? { title } : {}),
          ...(agentKey ? { assigned_agent_key: agentKey } : {}),
          ...(intent ? { intent } : {}),
        })
        continue
      }
      if (
        type === 'retry_subtask' &&
        typeof o.mission_id === 'string' &&
        typeof o.subtask_id === 'string'
      ) {
        out.push({ type: 'retry_subtask', mission_id: o.mission_id, subtask_id: o.subtask_id })
        continue
      }
      if (type === 'replan_mission' && typeof o.mission_id === 'string') {
        out.push({
          type: 'replan_mission',
          mission_id: o.mission_id,
          ...(typeof o.reason === 'string' ? { reason: o.reason } : {}),
        })
        continue
      }
      if (type === 'pause_mission' && typeof o.mission_id === 'string') {
        out.push({ type: 'pause_mission', mission_id: o.mission_id })
        continue
      }
      if (type === 'amend_mission' && typeof o.mission_id === 'string') {
        out.push({
          type: 'amend_mission',
          mission_id: o.mission_id,
          ...(typeof o.title === 'string' ? { title: o.title } : {}),
          ...(typeof o.brief === 'string' ? { brief: o.brief } : {}),
          ...(typeof o.priority === 'string' ? { priority: o.priority } : {}),
        })
      }
    }
    return out
  }

  private async postInternalAuthorizedJson(
    url: string,
    body: Record<string, unknown>,
    diagLabel: string,
  ): Promise<void> {
    const internalToken = this.configService.get<string>('missionApi.internalToken') || ''
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${internalToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        const msg = `[${diagLabel}] failed status=${res.status} body=${text.slice(0, 500)}`
        this.logger.error(msg)
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e)
      this.logger.error(`[${diagLabel}] fetch error: ${errMsg}`)
    }
  }

  private async postAwarenessInternal(path: string, body: Record<string, unknown>): Promise<void> {
    const callbackUrl = this.configService.get<string>('missionApi.callbackUrl') || ''
    const baseUrl = callbackUrl.replace('/api/internal/missions/callback', '')
    const url = `${baseUrl}/api/internal/missions${path}`
    await this.postInternalAuthorizedJson(url, body, `awareness_internal${path}`)
  }

  async dispatchCeoOpsAmendments(
    userId: string,
    sessionId: string,
    rawActions: unknown,
    orgId?: string | null,
  ): Promise<void> {
    await this.executeAwarenessActions(userId, sessionId, rawActions, 'ceo', orgId)
  }

  private async executeAwarenessActions(
    userId: string,
    sessionId: string,
    rawActions: unknown,
    archetype: string,
    orgId?: string | null,
  ): Promise<void> {
    const actions = this.parseActionList(rawActions)
    if (actions.length === 0) return

    let retries = 0
    let comments = 0
    let reassigns = 0
    let nudges = 0
    let notes = 0
    let appends = 0
    let cancels = 0
    let edits = 0
    let subtaskRetries = 0
    let replans = 0
    let pauses = 0
    let amends = 0
    const cappedActions: Record<string, boolean> = {}

    for (const action of actions) {
      const base = {
        user_id: userId,
        awareness_session_id: sessionId,
        org_id: orgId ?? null,
      }

      switch (action.type) {
        case 'retry_mission':
          if (retries >= MAX_RETRY) {
            cappedActions.retry_mission = true
            break
          }
          retries += 1
          await this.postAwarenessInternal('/awareness/retry', {
            ...base,
            mission_id: action.mission_id,
          })
          break
        case 'manager_comment':
          if (comments >= MAX_COMMENT) {
            cappedActions.manager_comment = true
            break
          }
          comments += 1
          await this.postAwarenessInternal('/awareness/comment', {
            ...base,
            mission_id: action.mission_id,
            message: action.message,
          })
          break
        case 'set_progress_notes':
          if (notes >= MAX_PROGRESS_NOTES) {
            cappedActions.set_progress_notes = true
            break
          }
          notes += 1
          await this.postAwarenessInternal('/awareness/progress-notes', {
            ...base,
            mission_id: action.mission_id,
            note: action.note,
          })
          break
        case 'reassign_mission':
          if (reassigns >= MAX_REASSIGN) {
            cappedActions.reassign_mission = true
            break
          }
          reassigns += 1
          await this.postAwarenessInternal('/awareness/reassign', {
            ...base,
            mission_id: action.mission_id,
            assigned_agent_key: action.assigned_agent_key,
          })
          break
        case 'request_subtask_execute':
          if (nudges >= MAX_NUDGE) {
            cappedActions.request_subtask_execute = true
            break
          }
          nudges += 1
          await this.postAwarenessInternal('/awareness/nudge-subtask', {
            ...base,
            mission_id: action.mission_id,
            subtask_id: action.subtask_id,
          })
          break
        case 'append_subtasks':
          if (appends >= MAX_APPEND_SUBTASKS) {
            cappedActions.append_subtasks = true
            break
          }
          appends += 1
          await this.postAwarenessInternal('/awareness/append-subtasks', {
            ...base,
            mission_id: action.mission_id,
            subtasks: action.subtasks,
          })
          break
        case 'cancel_subtask':
          if (cancels >= MAX_CANCEL_SUBTASK) {
            cappedActions.cancel_subtask = true
            break
          }
          cancels += 1
          await this.postAwarenessInternal('/awareness/cancel-subtask', {
            ...base,
            mission_id: action.mission_id,
            subtask_id: action.subtask_id,
          })
          break
        case 'edit_subtask':
          if (edits >= MAX_EDIT_SUBTASK) {
            cappedActions.edit_subtask = true
            break
          }
          edits += 1
          await this.postAwarenessInternal('/awareness/edit-subtask', {
            ...base,
            mission_id: action.mission_id,
            subtask_id: action.subtask_id,
            ...(action.title !== undefined ? { title: action.title } : {}),
            ...(action.assigned_agent_key !== undefined
              ? { assigned_agent_key: action.assigned_agent_key }
              : {}),
            ...(action.intent !== undefined ? { intent: action.intent } : {}),
          })
          break
        case 'retry_subtask':
          if (subtaskRetries >= MAX_RETRY_SUBTASK) {
            cappedActions.retry_subtask = true
            break
          }
          subtaskRetries += 1
          await this.postAwarenessInternal('/awareness/retry-subtask', {
            ...base,
            mission_id: action.mission_id,
            subtask_id: action.subtask_id,
          })
          break
        case 'replan_mission':
          if (replans >= MAX_REPLAN_MISSION) {
            cappedActions.replan_mission = true
            break
          }
          replans += 1
          await this.postAwarenessInternal('/awareness/replan', {
            ...base,
            mission_id: action.mission_id,
            ...(action.reason !== undefined ? { reason: action.reason } : {}),
          })
          break
        case 'pause_mission':
          if (pauses >= MAX_PAUSE_MISSION) {
            cappedActions.pause_mission = true
            break
          }
          pauses += 1
          await this.postAwarenessInternal('/awareness/pause', {
            ...base,
            mission_id: action.mission_id,
          })
          break
        case 'amend_mission':
          if (amends >= MAX_AMEND_MISSION) {
            cappedActions.amend_mission = true
            break
          }
          amends += 1
          await this.postAwarenessInternal('/awareness/amend', {
            ...base,
            mission_id: action.mission_id,
            ...(action.title !== undefined ? { title: action.title } : {}),
            ...(action.brief !== undefined ? { brief: action.brief } : {}),
            ...(action.priority !== undefined ? { priority: action.priority } : {}),
          })
          break
        default:
          break
      }
    }

    if (Object.keys(cappedActions).length > 0) {
      this.logger.log(
        `[awareness_capped_actions] user_id=${userId} session_id=${sessionId} archetype=${archetype} capped_actions=${JSON.stringify(cappedActions)}`,
      )
    }
  }

  async dispatch(
    userId: string,
    sessionId: string,
    triggerSignalIds: string[],
    decision: AwarenessDecision,
    orgId?: string | null,
  ): Promise<void> {
    const supabase = this.databaseService.getClient()
    const archetype = String(decision.archetype || 'ceo')

    if (decision.decision === 'wait') {
      await this.agentSignalService.decaySignals(triggerSignalIds)
      return
    }

    if (decision.decision === 'notify') {
      if (decision.content?.trim()) {
        await supabase.from('agent_awareness_points').insert({
          user_id: userId,
          agent_key: decision.agentKey,
          session_id: sessionId,
          content: decision.content,
          point_type: decision.point_type ?? 'observation',
          org_id: orgId ?? null,
        })
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('preferred_channel')
        .eq('id', userId)
        .maybeSingle()
      if (profile?.preferred_channel !== 'studio' && decision.content?.trim()) {
        const callbackUrl = this.configService.get<string>('missionApi.callbackUrl') || ''
        const baseUrl = callbackUrl.replace('/api/internal/missions/callback', '')
        await this.postInternalAuthorizedJson(
          `${baseUrl}/api/internal/missions/awareness/telegram-push`,
          {
            user_id: userId,
            agent_key: decision.agentKey,
            content: decision.content,
          },
          'awareness_telegram_push',
        )
      }
      await this.executeAwarenessActions(userId, sessionId, decision.actions, archetype, orgId)
      await this.agentSignalService.consumeSignals(triggerSignalIds)
      return
    }

    if (decision.decision === 'act') {
      const callbackUrl = this.configService.get<string>('missionApi.callbackUrl') || ''
      const baseUrl = callbackUrl.replace('/api/internal/missions/callback', '')
      for (const mission of decision.missions || []) {
        await this.postInternalAuthorizedJson(
          `${baseUrl}/api/internal/missions/create`,
          {
            user_id: userId,
            title: mission.title,
            brief: mission.brief,
            campaign_id: mission.campaign_id,
            org_id: orgId ?? null,
            input: { source: 'autonomous_ceo', awareness_session_id: sessionId },
          },
          'awareness_act_create_mission',
        )
      }
      await this.executeAwarenessActions(userId, sessionId, decision.actions, archetype, orgId)
      await this.agentSignalService.consumeSignals(triggerSignalIds)
    }
  }
}
