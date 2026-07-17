import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Job } from 'bullmq'
import { DatabaseService } from '../../../../lib/services/database.service'
import type { MissionJobData, MissionJobResult, MissionStatus } from '../../types'
import { normalizeIntentFull, normalizePlanSubtask } from '../../utils/normalize-intent'
import { MissionOpenclawGateway } from '../gateways/mission-openclaw.gateway'
import { MissionStateRepository } from '../persistence/mission-state.repository'

type TriageSiblingRow = {
  id: string
  title?: string | null
  status?: string | null
  assigned_agent_key?: string | null
  depends_on?: string[] | null
  intent?: Record<string, unknown> | null
  output_contract?: Record<string, unknown> | null
  scheduled_at?: string | null
}

function isValidationTriageSubtask(row: TriageSiblingRow): boolean {
  const title = String(row.title || '').toLowerCase()
  const agentKey = String(row.assigned_agent_key || '').toLowerCase()
  return (
    /assertion|validation|quality gate|quality report|validator/.test(title) ||
    (agentKey === 'niko' && /review|qa|quality|validation/.test(title))
  )
}

export function shouldReplanTriageReplacement(
  rows: TriageSiblingRow[],
  dependentIds: Set<string>,
  rootId: string,
): boolean {
  return rows.some((row) => {
    const id = String(row.id)
    if (id === rootId || !dependentIds.has(id)) return false
    if (String(row.status) === 'cancelled') return false
    return !isValidationTriageSubtask(row)
  })
}

export function shouldSweepReadySubtasksAfterTriage(decision: string): boolean {
  return decision === 'cancel' || decision === 'replace'
}

@Injectable()
export class MissionSubtaskTriageService {
  private readonly logger = new Logger(MissionSubtaskTriageService.name)

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
    private readonly openclawGateway: MissionOpenclawGateway,
    private readonly stateRepo: MissionStateRepository,
  ) {}

  private resolveBaseUrl(): string {
    const callback = this.configService.get<string>('missionApi.callbackUrl') || ''
    return callback.replace('/api/internal/missions/callback', '').replace(/\/+$/, '')
  }

  private resolveToken(): string {
    return this.configService.get<string>('missionApi.internalToken') || ''
  }

  /**
   * Product matrix — triage OpenClaw runs only when:
   * | Mission status   | Subtask status | triage? |
   * | todo             | blocked        | yes     |
   * | in_progress      | blocked        | yes     |
   * | review           | blocked        | yes     |
   * | blocked          | blocked        | yes     |
   * | error            | blocked        | yes     |
   * | failed           | blocked        | yes     |
   * | inbox/planning/backlog/done/archived | any | no |
   * | any              | not blocked    | no      |
   */
  private isTriageEligible(missionStatus: string, subtaskStatus: string): boolean {
    if (String(subtaskStatus) !== 'blocked') return false
    const allowedMission = new Set(['todo', 'in_progress', 'review', 'blocked', 'error', 'failed'])
    return allowedMission.has(String(missionStatus))
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

  async process(job: Job<MissionJobData>): Promise<MissionJobResult> {
    const { missionId, subtaskId, userId } = job.data
    if (!subtaskId) throw new Error('triage job missing subtaskId')
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

    const { data: blockedSt, error: stErr } = await supabase
      .from('mission_subtasks')
      .select('*')
      .eq('id', subtaskId)
      .single()
    if (stErr || !blockedSt) throw new Error(`Triage: subtask ${subtaskId} not found`)

    const missionStatus = String(mission.status || '')
    const subtaskStatus = String(blockedSt.status || '')
    if (!this.isTriageEligible(missionStatus, subtaskStatus)) {
      this.logger.warn(
        `Triage skipped mission=${missionId} subtask=${subtaskId}: mission_status=${missionStatus} subtask_status=${subtaskStatus}`,
      )
      return {
        missionId,
        subtaskId,
        success: true,
        status: mission.status as MissionStatus,
        processedAt: new Date().toISOString(),
        output: {
          skipped_triage: true,
          reason: 'not_triage_eligible',
          mission_status: missionStatus,
          subtask_status: subtaskStatus,
        },
      }
    }

    const { data: siblings } = await supabase
      .from('mission_subtasks')
      .select(
        'id, title, status, assigned_agent_key, depends_on, intent, output_contract, scheduled_at',
      )
      .eq('mission_id', missionId)
      .order('sort_order', { ascending: true })

    const userComments = await this.stateRepo.getRecentUserComments(
      supabase,
      missionId,
      String(mission.user_id),
      mission.org_id ?? null,
    )
    const managerKey = await this.stateRepo.resolveManagerKey(
      supabase,
      String(mission.user_id),
      mission.org_id ?? null,
    )

    let parsed: Record<string, unknown>
    try {
      parsed = await this.openclawGateway.callOpenClawForSubtaskTriage(
        mission,
        plan,
        blockedSt,
        siblings || [],
        managerKey,
        userComments,
      )
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      this.logger.error(`Triage OpenClaw failed mission=${missionId} subtask=${subtaskId}: ${msg}`)
      await this.stateRepo.updateMissionState(supabase, missionId, {
        status: 'blocked',
        current_agent_key: managerKey,
        progress_notes: `Subtask triage failed: ${msg.slice(0, 400)}`,
      })
      return {
        missionId,
        subtaskId,
        success: false,
        status: 'blocked',
        processedAt: new Date().toISOString(),
        error: msg,
      }
    }

    const decision = String(parsed.decision || '').toLowerCase()
    const uid = String(userId || mission.user_id)
    const orgId = (mission.org_id as string | null | undefined) ?? job.data.orgId ?? null

    try {
      switch (decision) {
        case 'retry':
          await this.postManager('/manager/retry-subtask', {
            mission_id: missionId,
            user_id: uid,
            org_id: orgId,
            subtask_id: subtaskId,
            idempotency_key: `triage-retry-${subtaskId}-${job.id}`,
          })
          break
        case 'reassign': {
          const to = typeof parsed.reassignTo === 'string' ? parsed.reassignTo.trim() : ''
          if (!to) throw new Error('reassign requires reassignTo')
          await this.postManager('/manager/edit-subtask', {
            mission_id: missionId,
            user_id: uid,
            org_id: orgId,
            subtask_id: subtaskId,
            assigned_agent_key: to,
            idempotency_key: `triage-edit-${subtaskId}-${job.id}`,
          })
          await this.postManager('/manager/retry-subtask', {
            mission_id: missionId,
            user_id: uid,
            org_id: orgId,
            subtask_id: subtaskId,
            idempotency_key: `triage-retry-after-reassign-${subtaskId}-${job.id}`,
          })
          break
        }
        case 'cancel':
          await this.postManager('/manager/cancel-subtask', {
            mission_id: missionId,
            user_id: uid,
            org_id: orgId,
            subtask_id: subtaskId,
            idempotency_key: `triage-cancel-${subtaskId}-${job.id}`,
          })
          break
        case 'replace': {
          const siblingRows = ((siblings || []) as TriageSiblingRow[]).map((row) => ({
            ...row,
            id: String(row.id),
          }))
          const dependentIds = this.collectDependentSubtaskIds(siblingRows, String(subtaskId))
          const validationDependents = this.collectDependentValidationSubtasks(
            siblingRows,
            dependentIds,
            String(subtaskId),
          )
          const rawAdd = parsed.addSubtasks
          if (!Array.isArray(rawAdd) || rawAdd.length === 0) {
            throw new Error('replace requires addSubtasks array')
          }
          const fallback = `Triage replacement for subtask ${subtaskId}`
          const normalized = rawAdd
            .map((s, idx) =>
              s && typeof s === 'object'
                ? normalizePlanSubtask(s as Record<string, unknown>, fallback, idx)
                : null,
            )
            .filter((st): st is NonNullable<typeof st> => st !== null)
          if (normalized.length === 0) {
            throw new Error('replace: none of the addSubtasks could be normalised')
          }
          if (
            shouldReplanTriageReplacement(siblingRows, dependentIds, String(subtaskId))
          ) {
            const rationale =
              typeof parsed.feedback === 'string' && parsed.feedback.trim()
                ? parsed.feedback.trim()
                : `Replacement of subtask ${subtaskId} affects ordinary downstream work`
            await this.postManager('/manager/prepare-replan', {
              mission_id: missionId,
              user_id: uid,
              org_id: orgId,
              reason: `${rationale}. Preserving the full downstream mission requires a replan.`.slice(
                0,
                2000,
              ),
              idempotency_key: `triage-replace-replan-${subtaskId}-${job.id}`,
            })
            break
          }
          await this.postManager('/manager/cancel-subtask', {
            mission_id: missionId,
            user_id: uid,
            org_id: orgId,
            subtask_id: subtaskId,
            idempotency_key: `triage-replace-cancel-${subtaskId}-${job.id}`,
          })
          const replacementIds = normalized
            .map((st) => (typeof st.id === 'string' ? st.id : ''))
            .filter(Boolean)
          const validationReplacements = validationDependents
            .slice(0, Math.max(0, 5 - normalized.length))
            .map((st, idx) =>
              this.cloneValidationSubtaskForReplacement(st, replacementIds, dependentIds, idx),
            )
          await this.postManager('/manager/append-subtasks', {
            mission_id: missionId,
            user_id: uid,
            org_id: orgId,
            subtasks: [...normalized, ...validationReplacements],
            idempotency_key: `triage-append-${subtaskId}-${job.id}`,
          })
          break
        }
        case 'replan':
          await this.postManager('/manager/prepare-replan', {
            mission_id: missionId,
            user_id: uid,
            org_id: orgId,
            reason:
              typeof parsed.replanReason === 'string'
                ? parsed.replanReason
                : 'Subtask triage requested full replan',
            idempotency_key: `triage-replan-${subtaskId}-${job.id}`,
          })
          break
        case 'escalate': {
          const escMsg =
            typeof parsed.escalateMessage === 'string'
              ? parsed.escalateMessage
              : typeof parsed.feedback === 'string'
                ? parsed.feedback
                : 'Escalated from subtask triage — user input required'
          await this.stateRepo.updateMissionState(supabase, missionId, {
            status: 'blocked',
            current_agent_key: managerKey,
            progress_notes: escMsg.slice(0, 4000),
          })
          break
        }
        default:
          throw new Error(`Unknown triage decision: ${decision}`)
      }
    } catch (execErr) {
      const msg = execErr instanceof Error ? execErr.message : String(execErr)
      this.logger.error(`Triage execution failed: ${msg}`)
      await this.stateRepo.updateMissionState(supabase, missionId, {
        status: 'blocked',
        current_agent_key: managerKey,
        progress_notes: `Triage decision failed: ${msg.slice(0, 400)}`,
      })
      return {
        missionId,
        subtaskId,
        success: false,
        status: 'blocked',
        processedAt: new Date().toISOString(),
        error: msg,
      }
    }

    if (decision !== 'escalate' && decision !== 'replan') {
      if (shouldSweepReadySubtasksAfterTriage(decision)) {
        await this.stateRepo.enqueueReadySubtaskEvents(supabase, missionId, uid, orgId, {
          requested_by: 'subtask_triage',
          source_subtask_id: String(subtaskId),
        })
      }
      await this.stateRepo.recomputeMissionStatus(supabase, missionId)
    }

    const missionAfter = await this.stateRepo.getMission(
      supabase,
      missionId,
      String(mission.user_id),
      mission.org_id ?? null,
    )
    return {
      missionId,
      subtaskId,
      success: true,
      status: missionAfter.status as MissionStatus,
      processedAt: new Date().toISOString(),
      output: { triage_decision: decision },
    }
  }

  private collectDependentSubtaskIds(rows: TriageSiblingRow[], rootId: string): Set<string> {
    const toCancel = new Set<string>([rootId])
    let changed = true
    while (changed) {
      changed = false
      for (const row of rows) {
        const rowId = String(row.id)
        if (toCancel.has(rowId)) continue
        const deps = Array.isArray(row.depends_on) ? row.depends_on.map(String) : []
        if (deps.some((depId) => toCancel.has(depId))) {
          toCancel.add(rowId)
          changed = true
        }
      }
    }
    return toCancel
  }

  private collectDependentValidationSubtasks(
    rows: TriageSiblingRow[],
    dependentIds: Set<string>,
    rootId: string,
  ): TriageSiblingRow[] {
    return rows.filter((row) => {
      const id = String(row.id)
      if (id === rootId) return false
      if (!dependentIds.has(id)) return false
      if (String(row.status) === 'cancelled') return false
      return this.isValidationSubtask(row)
    })
  }

  private isValidationSubtask(row: TriageSiblingRow): boolean {
    return isValidationTriageSubtask(row)
  }

  private cloneValidationSubtaskForReplacement(
    row: TriageSiblingRow,
    replacementIds: string[],
    dependentIds: Set<string>,
    index: number,
  ): Record<string, unknown> {
    const originalDeps = Array.isArray(row.depends_on) ? row.depends_on.map(String) : []
    const retainedDeps = originalDeps.filter((depId) => !dependentIds.has(depId))
    const dependsOn = [...new Set([...retainedDeps, ...replacementIds])]
    const fallback = String(row.title || 'Validate replacement work')
    return {
      id: `validation-replacement-${index}-${Date.now()}`,
      title: String(row.title || 'Assertion Harness Validation Report'),
      assignTo: String(row.assigned_agent_key || 'niko'),
      dependsOn,
      intent: normalizeIntentFull(row.intent, fallback),
      ...(row.scheduled_at ? { scheduledAt: row.scheduled_at } : {}),
      ...(row.output_contract ? { outputContract: row.output_contract } : {}),
    }
  }
}
