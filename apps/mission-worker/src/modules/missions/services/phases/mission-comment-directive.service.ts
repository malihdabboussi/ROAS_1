import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Job } from 'bullmq'
import { DatabaseService } from '../../../../lib/services/database.service'
import type { MissionJobData, MissionJobResult, MissionStatus } from '../../types'
import { normalizeIntentPartial, normalizePlanSubtask } from '../../utils/normalize-intent'
import { MissionOpenclawGateway } from '../gateways/mission-openclaw.gateway'
import { MissionStateRepository } from '../persistence/mission-state.repository'
import { SubtaskAbortRegistry } from '../subtask-abort-registry.service'

const VIBEY_DIRECTIVE_AGENT = 'vibey'

type DirectiveAction = Record<string, unknown>

export type DirectiveRetryAction = 'retry' | 'abort_and_retry' | 'already_retried'

export function resolveDirectiveRetryAction(
  initialStatus: string,
  currentStatus: string,
): DirectiveRetryAction {
  if (initialStatus && initialStatus !== 'in_progress' && currentStatus !== initialStatus) {
    return 'already_retried'
  }
  return currentStatus === 'in_progress' ? 'abort_and_retry' : 'retry'
}

@Injectable()
export class MissionCommentDirectiveService {
  private readonly logger = new Logger(MissionCommentDirectiveService.name)

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
    private readonly openclawGateway: MissionOpenclawGateway,
    private readonly stateRepo: MissionStateRepository,
    private readonly abortRegistry: SubtaskAbortRegistry,
  ) {}

  private resolveBaseUrl(): string {
    const callback = this.configService.get<string>('missionApi.callbackUrl') || ''
    return callback.replace('/api/internal/missions/callback', '').replace(/\/+$/, '')
  }

  private resolveToken(): string {
    return this.configService.get<string>('missionApi.internalToken') || ''
  }

  private async postManager(
    path: string,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const base = this.resolveBaseUrl()
    const token = this.resolveToken()
    const res = await fetch(`${base}/api/internal/missions${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const t = await res.text().catch(() => '')
      throw new Error(`Manager API ${path} failed ${res.status}: ${t.slice(0, 500)}`)
    }
    return (await res.json().catch(() => ({}))) as Record<string, unknown>
  }

  private actionType(a: DirectiveAction): string {
    const t = a.type ?? a.action
    return String(t || '')
      .toLowerCase()
      .replace(/-/g, '_')
  }

  private subtaskIdFromAction(a: DirectiveAction): string {
    const id =
      (typeof a.subtask_id === 'string' && a.subtask_id) ||
      (typeof a.subtaskId === 'string' && a.subtaskId) ||
      ''
    return id.trim()
  }

  async process(job: Job<MissionJobData>): Promise<MissionJobResult> {
    const { missionId, userId, commentId, commentMessage } = job.data
    const supabase = this.databaseService.getClient()
    const mission = await this.stateRepo.getMission(
      supabase,
      missionId,
      job.data.userId,
      job.data.orgId ?? null,
    )
    const plan = await this.stateRepo.getPlan(
      supabase,
      missionId,
      String(mission.user_id),
      mission.org_id ?? null,
    )
    const uid = String(userId || mission.user_id)
    const orgId = (mission.org_id as string | null | undefined) ?? job.data.orgId ?? null

    let triggeringComment = typeof commentMessage === 'string' ? commentMessage : ''
    if (commentId) {
      const { data: logRow } = await supabase
        .from('missions_logs')
        .select('payload')
        .eq('id', commentId)
        .eq('mission_id', missionId)
        .eq('event_type', 'user.comment')
        .maybeSingle()
      const payload = logRow?.payload as Record<string, unknown> | null
      const fromLog = typeof payload?.message === 'string' ? payload.message : ''
      if (fromLog) triggeringComment = fromLog
    }

    const { data: subtaskRows } = await supabase
      .from('mission_subtasks')
      .select('*')
      .eq('mission_id', missionId)
      .order('sort_order', { ascending: true })

    const subtasks = (subtaskRows || []) as Array<Record<string, unknown>>
    const initialSubtaskStatusById = new Map(
      subtasks.map((subtask) => [String(subtask.id || ''), String(subtask.status || '')]),
    )
    const userComments = await this.stateRepo.getRecentUserComments(
      supabase,
      missionId,
      String(mission.user_id),
      mission.org_id ?? null,
    )

    let parsed: Record<string, unknown>
    try {
      parsed = await this.openclawGateway.callOpenClawForCommentDirective(
        mission,
        plan,
        subtasks,
        triggeringComment,
        commentId || null,
        job.data.fromStatus,
        userComments,
      )
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      this.logger.error(`Comment directive OpenClaw failed mission=${missionId}: ${msg}`)
      await this.stateRepo.insertLog(
        supabase,
        mission,
        'mission.comment.directive.failed',
        String(mission.status || ''),
        String(mission.status || ''),
        { error: msg.slice(0, 500), comment_id: commentId || null },
        VIBEY_DIRECTIVE_AGENT,
      )
      return {
        missionId,
        success: false,
        status: mission.status as MissionStatus,
        processedAt: new Date().toISOString(),
        error: msg,
      }
    }

    const rawActions = parsed.actions
    const actions: DirectiveAction[] = Array.isArray(rawActions)
      ? (rawActions as DirectiveAction[])
      : []

    if (actions.length === 0) {
      const rationale =
        typeof parsed.rationale === 'string' ? parsed.rationale : 'No actions returned'
      await this.stateRepo.insertLog(
        supabase,
        mission,
        'mission.comment.directive.empty',
        String(mission.status || ''),
        String(mission.status || ''),
        { rationale, comment_id: commentId || null },
        VIBEY_DIRECTIVE_AGENT,
      )
      const missionAfter = await this.stateRepo.getMission(
        supabase,
        missionId,
        String(mission.user_id),
        mission.org_id ?? null,
      )
      return {
        missionId,
        success: true,
        status: missionAfter.status as MissionStatus,
        processedAt: new Date().toISOString(),
        output: { directive: 'empty', rationale },
      }
    }

    let hadReplan = false
    let hadApprove = false
    let hadMutation = false
    const idemBase = `directive-${job.id || missionId}`

    try {
      let createIndex = 0
      for (let i = 0; i < actions.length; i++) {
        const a = actions[i]
        const type = this.actionType(a)
        switch (type) {
          case 'note_only': {
            const message =
              typeof a.message === 'string' ? a.message : typeof a.note === 'string' ? a.note : ''
            await this.stateRepo.insertLog(
              supabase,
              mission,
              'mission.comment.directive.note',
              String(mission.status || ''),
              String(mission.status || ''),
              {
                message: message.slice(0, 4000),
                rationale:
                  typeof parsed.rationale === 'string' ? parsed.rationale.slice(0, 2000) : '',
                comment_id: commentId || null,
              },
              VIBEY_DIRECTIVE_AGENT,
            )
            break
          }
          case 'cancel_subtask': {
            const sid = this.subtaskIdFromAction(a)
            if (!sid) throw new Error('cancel_subtask missing subtask_id')
            hadMutation = true
            const supabase = this.databaseService.getClient()
            const { data: preCancel } = await supabase
              .from('mission_subtasks')
              .select('status')
              .eq('id', sid)
              .eq('mission_id', missionId)
              .maybeSingle()
            const wasInProgress = String(preCancel?.status) === 'in_progress'
            await this.postManager('/manager/cancel-subtask', {
              mission_id: missionId,
              user_id: uid,
              org_id: orgId,
              subtask_id: sid,
              idempotency_key: `${idemBase}-cancel-${sid}-${i}`,
            })
            if (wasInProgress) this.abortRegistry.abort(sid)
            break
          }
          case 'create_subtask': {
            const one = normalizePlanSubtask(a, triggeringComment, createIndex)
            createIndex++
            if (!one) throw new Error('create_subtask missing title or assignTo')
            hadMutation = true
            await this.postManager('/manager/append-subtasks', {
              mission_id: missionId,
              user_id: uid,
              org_id: orgId,
              subtasks: [one],
              idempotency_key: `${idemBase}-append-${i}`,
            })
            break
          }
          case 'edit_subtask': {
            const sid = this.subtaskIdFromAction(a)
            if (!sid) throw new Error('edit_subtask missing subtask_id')
            const title = typeof a.title === 'string' ? a.title.trim() : undefined
            const assigned =
              (typeof a.assigned_agent_key === 'string' && a.assigned_agent_key.trim()) ||
              (typeof a.assignTo === 'string' && a.assignTo.trim()) ||
              undefined
            const intent = normalizeIntentPartial(a.intent)
            if (!title && !assigned && !intent) {
              throw new Error('edit_subtask needs title, assigned_agent_key, or intent')
            }
            hadMutation = true
            const { data: preEdit } = await supabase
              .from('mission_subtasks')
              .select('status')
              .eq('id', sid)
              .eq('mission_id', missionId)
              .maybeSingle()
            const editWasInProgress = String(preEdit?.status) === 'in_progress'
            const body: Record<string, unknown> = {
              mission_id: missionId,
              user_id: uid,
              org_id: orgId,
              subtask_id: sid,
              idempotency_key: `${idemBase}-edit-${sid}-${i}`,
            }
            if (title) body.title = title
            if (assigned) body.assigned_agent_key = assigned
            if (intent) body.intent = intent
            await this.postManager('/manager/edit-subtask', body)
            if (editWasInProgress) this.abortRegistry.abort(sid)
            break
          }
          case 'reassign_subtask': {
            const sid = this.subtaskIdFromAction(a)
            const to =
              (typeof a.assignTo === 'string' && a.assignTo) ||
              (typeof a.assign_to === 'string' && a.assign_to) ||
              (typeof a.assigned_agent_key === 'string' && a.assigned_agent_key) ||
              ''
            if (!sid || !to.trim())
              throw new Error('reassign_subtask needs subtask_id and assignTo')
            hadMutation = true
            const supabaseRe = this.databaseService.getClient()
            const { data: preReassign } = await supabaseRe
              .from('mission_subtasks')
              .select('status')
              .eq('id', sid)
              .eq('mission_id', missionId)
              .maybeSingle()
            const preStatus = String(preReassign?.status)
            const reassignWasInProgress = preStatus === 'in_progress'
            await this.postManager('/manager/edit-subtask', {
              mission_id: missionId,
              user_id: uid,
              org_id: orgId,
              subtask_id: sid,
              assigned_agent_key: to.trim(),
              idempotency_key: `${idemBase}-reassign-edit-${sid}-${i}`,
            })
            if (reassignWasInProgress) this.abortRegistry.abort(sid)
            const retryableStatuses = new Set(['blocked', 'done', 'revision'])
            if (!retryableStatuses.has(preStatus)) {
              await supabaseRe
                .from('mission_subtasks')
                .update({ status: 'blocked', updated_at: new Date().toISOString() })
                .eq('id', sid)
                .eq('mission_id', missionId)
            }
            await this.postManager('/manager/retry-subtask', {
              mission_id: missionId,
              user_id: uid,
              org_id: orgId,
              subtask_id: sid,
              idempotency_key: `${idemBase}-reassign-retry-${sid}-${i}`,
            })
            break
          }
          case 'retry_subtask': {
            const sid = this.subtaskIdFromAction(a)
            if (!sid) throw new Error('retry_subtask missing subtask_id')
            const { data: preRetry } = await supabase
              .from('mission_subtasks')
              .select('status')
              .eq('id', sid)
              .eq('mission_id', missionId)
              .maybeSingle()
            const initialStatus = initialSubtaskStatusById.get(sid) || ''
            const currentStatus = String(preRetry?.status || '')
            const retryAction = resolveDirectiveRetryAction(initialStatus, currentStatus)
            if (retryAction === 'already_retried') {
              this.logger.log(
                `Directive retry converged mission=${missionId} subtask=${sid}: initial=${initialStatus} current=${currentStatus}`,
              )
              break
            }
            hadMutation = true
            if (retryAction === 'abort_and_retry') {
              this.abortRegistry.abort(sid)
            }
            await this.postManager('/manager/retry-subtask', {
              mission_id: missionId,
              user_id: uid,
              org_id: orgId,
              subtask_id: sid,
              idempotency_key: `${idemBase}-retry-${sid}-${i}`,
            })
            break
          }
          case 'amend_mission': {
            hadMutation = true
            const body: Record<string, unknown> = {
              mission_id: missionId,
              user_id: uid,
              org_id: orgId,
              idempotency_key: `${idemBase}-amend-${i}`,
            }
            if (typeof a.title === 'string' && a.title.trim()) body.title = a.title.trim()
            if (typeof a.brief === 'string') body.brief = a.brief
            const pr = a.priority
            if (pr === 'low' || pr === 'medium' || pr === 'high' || pr === 'urgent') {
              body.priority = pr
            }
            const hasAmend =
              body.title !== undefined || body.brief !== undefined || body.priority !== undefined
            if (!hasAmend) {
              throw new Error('amend_mission needs at least one of title, brief, priority')
            }
            await this.postManager('/manager/mission-fields', body)
            break
          }
          case 'replan': {
            hadReplan = true
            hadMutation = true
            const reason =
              typeof a.reason === 'string' && a.reason.trim()
                ? a.reason.trim()
                : 'User comment directive requested replan'
            await this.postManager('/manager/prepare-replan', {
              mission_id: missionId,
              user_id: uid,
              org_id: orgId,
              reason,
              idempotency_key: `${idemBase}-replan-${i}`,
            })
            break
          }
          case 'approve_mission':
          case 'complete_mission': {
            const { data: approveSubs } = await supabase
              .from('mission_subtasks')
              .select('id, status')
              .eq('mission_id', missionId)
            const activeSubs = (approveSubs || []).filter(
              (s: Record<string, unknown>) => String(s.status) !== 'cancelled',
            )
            const allDone =
              activeSubs.length === 0 ||
              activeSubs.every((s: Record<string, unknown>) => String(s.status) === 'done')
            if (!allDone) {
              throw new Error('approve_mission rejected: not all active subtasks are done')
            }
            hadApprove = true
            hadMutation = true
            const approveFeedback =
              typeof a.feedback === 'string' ? a.feedback : 'Approved via user directive'
            await this.stateRepo.updateMissionState(supabase, missionId, {
              status: 'done',
              current_agent_key: VIBEY_DIRECTIVE_AGENT,
              progress_notes: approveFeedback,
            })
            await this.stateRepo.insertLog(
              supabase,
              mission,
              'mission.progress',
              String(mission.status || 'review'),
              'done',
              {
                note: `Mission approved via comment directive: ${approveFeedback}`,
                source: 'comment_directive_approve',
                comment_id: commentId || null,
              },
              VIBEY_DIRECTIVE_AGENT,
            )
            break
          }
          default:
            throw new Error(`Unknown directive action type: ${type || '(missing)'}`)
        }
      }
    } catch (execErr) {
      const msg = execErr instanceof Error ? execErr.message : String(execErr)
      this.logger.error(`Comment directive execution failed mission=${missionId}: ${msg}`)
      await this.stateRepo.insertLog(
        supabase,
        mission,
        'mission.comment.directive.failed',
        String(mission.status || ''),
        String(mission.status || ''),
        { error: msg.slice(0, 500), comment_id: commentId || null },
        VIBEY_DIRECTIVE_AGENT,
      )
      return {
        missionId,
        success: false,
        status: mission.status as MissionStatus,
        processedAt: new Date().toISOString(),
        error: msg,
      }
    }

    const wasDone = String(mission.status || '') === 'done'

    if (hadMutation && !hadReplan && !hadApprove) {
      await this.stateRepo.enqueueReadySubtaskEvents(supabase, missionId, uid, orgId, {
        requested_by: 'comment_directive',
        ...(commentId ? { comment_id: commentId } : {}),
      })
      await this.stateRepo.recomputeMissionStatus(supabase, missionId)
    }

    if (wasDone && hadMutation) {
      const reopenedMission = await this.stateRepo.getMission(
        supabase,
        missionId,
        String(mission.user_id),
        mission.org_id ?? null,
      )
      await this.stateRepo.insertLog(
        supabase,
        reopenedMission,
        'mission.status.updated',
        'done',
        String(reopenedMission.status || ''),
        {
          source: 'comment_directive_reopen',
          reason: 'User sent directive on completed mission',
          comment_id: commentId || null,
        },
        VIBEY_DIRECTIVE_AGENT,
      )
      this.logger.log(
        `Mission ${missionId} reopened from done → ${reopenedMission.status} via comment directive`,
      )
    }

    const missionAfter = await this.stateRepo.getMission(
      supabase,
      missionId,
      String(mission.user_id),
      mission.org_id ?? null,
    )

    await this.stateRepo.insertLog(
      supabase,
      missionAfter,
      'mission.comment.directive.completed',
      String(missionAfter.status || ''),
      String(missionAfter.status || ''),
      {
        action_count: actions.length,
        had_replan: hadReplan,
        rationale: typeof parsed.rationale === 'string' ? parsed.rationale.slice(0, 2000) : '',
        comment_id: commentId || null,
      },
      VIBEY_DIRECTIVE_AGENT,
    )
    return {
      missionId,
      success: true,
      status: missionAfter.status as MissionStatus,
      processedAt: new Date().toISOString(),
      output: {
        directive_actions: actions.length,
        had_replan: hadReplan,
      },
    }
  }
}
