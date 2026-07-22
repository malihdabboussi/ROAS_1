import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Job } from 'bullmq'
import { DatabaseService } from '../../../../lib/services/database.service'
import {
  priorityToRank,
  type AgentKey,
  type MissionJobData,
  type MissionJobResult,
  type MissionStatus,
} from '../../types'
import { humanizeMissionError } from '../../utils/mission-humanize-error'
import {
  isHiddenCampaignAction,
  resolveLabel,
  resolveToolUpdateDetail,
} from '../../utils/tool-labels'
import { MissionContextService } from '../context/mission-context.service'
import {
  OpenClawNonRetryableError,
  SubtaskExecutionInvalidatedError,
} from '../gateways/mission-openclaw-errors'
import { MissionOpenclawGateway } from '../gateways/mission-openclaw.gateway'
import { MissionExecBroadcastService } from '../mission-exec-broadcast.service'
import { shouldWriteMissionExecutionLease } from '../mission-execution-lease'
import { MissionDeliverablesRepository } from '../persistence/mission-deliverables.repository'
import type {
  MissionContractVerificationResult,
  MissionOutputContract,
} from '../persistence/mission-output-contract.types'
import { MissionStateRepository } from '../persistence/mission-state.repository'
import { SubtaskAbortRegistry } from '../subtask-abort-registry.service'
import { MissionJsonService } from '../utils/mission-json.service'
import { resolveMissionEffectiveDomains } from './mission-action-policy'
import {
  activeSubtasksAllDone,
  buildContractCorrectionContext,
  CONTRACT_ACTION_DOMAINS,
  evaluateSubtaskOutputAlignment,
  extractToolDeliverableReceipt,
  normalizeOutputContract,
  prepareExecutionStateForContractCorrection,
  resolveMissionStatusWhileSubtaskRuns,
  type MissionPreflightDomain,
} from './mission-execute-helpers'
import { MissionPhaseSupportService } from './mission-phase-support.service'

const HUMAN_SUBTASK_SLA_MS = 48 * 60 * 60 * 1000

@Injectable()
export class MissionExecutePhaseService {
  private readonly logger = new Logger(MissionExecutePhaseService.name)

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly stateRepo: MissionStateRepository,
    private readonly deliverablesRepo: MissionDeliverablesRepository,
    private readonly openclawGateway: MissionOpenclawGateway,
    private readonly contextService: MissionContextService,
    private readonly jsonService: MissionJsonService,
    private readonly support: MissionPhaseSupportService,
    private readonly abortRegistry: SubtaskAbortRegistry,
    private readonly broadcast: MissionExecBroadcastService,
  ) {}

  async process(job: Job<MissionJobData>): Promise<MissionJobResult> {
    const { missionId, subtaskId } = job.data

    if (subtaskId) {
      return this.processSubtaskExecution(job)
    }

    const supabase = this.databaseService.getClient()
    const hasSubtasks = await this.stateRepo.missionHasSubtasks(
      supabase,
      missionId,
      job.data.userId,
      job.data.orgId ?? null,
    )
    if (hasSubtasks) {
      const mission = await this.stateRepo.getMission(
        supabase,
        missionId,
        job.data.userId,
        job.data.orgId ?? null,
      )
      this.logger.warn(
        `Skipping legacy execute for mission ${missionId}: mission has subtasks and must use subtask flow`,
      )
      return {
        missionId,
        success: true,
        status: mission.status as MissionStatus,
        processedAt: new Date().toISOString(),
        output: { skipped_legacy_execute: true, reason: 'mission_has_subtasks' },
      }
    }

    return this.processLegacyExecutePhase(job)
  }

  private async processSubtaskExecution(job: Job<MissionJobData>): Promise<MissionJobResult> {
    const { missionId, subtaskId } = job.data
    const supabase = this.databaseService.getClient()
    const mission = await this.stateRepo.getMission(
      supabase,
      missionId,
      job.data.userId,
      job.data.orgId ?? null,
    )
    const nonRunnableMissionStatuses = new Set(['done', 'backlog'])
    if (nonRunnableMissionStatuses.has(String(mission.status))) {
      return {
        missionId,
        subtaskId,
        success: true,
        status: mission.status as MissionStatus,
        processedAt: new Date().toISOString(),
        output: { skipped_subtask_execute: true, reason: 'mission_not_runnable_for_execute' },
      }
    }
    const executionTimeoutMs = this.support.getTimeoutMs()
    const executionAbsoluteMaxMs = this.support.getExecutionAbsoluteMaxMs()

    const { data: subtask, error: stErr } = await supabase
      .from('mission_subtasks')
      .select('*')
      .eq('id', subtaskId)
      .eq('mission_id', missionId)
      .single()
    if (stErr || !subtask) throw new Error(`Subtask ${subtaskId} not found`)
    if (String(subtask.status) === 'cancelled') {
      return {
        missionId,
        subtaskId,
        success: true,
        status: 'cancelled' as MissionStatus,
        processedAt: new Date().toISOString(),
        output: { skipped_subtask_execute: true, reason: 'subtask_cancelled' },
      }
    }
    if (String(subtask.status) === 'done') {
      const { data: allSubs } = await supabase
        .from('mission_subtasks')
        .select('status')
        .eq('mission_id', missionId)
      const everyDone = activeSubtasksAllDone(allSubs || [])

      if (everyDone) {
        await this.stateRepo.enqueueMissionOutboxEvent(supabase, {
          missionId,
          userId: String(mission.user_id),
          orgId: mission.org_id ?? null,
          eventType: 'mission.review.requested',
          dedupeKey: `mission:${missionId}:review:already-done-recovery`,
          requeueExistingDedupeKey: true,
          payload: { phase: 'review', requested_by: 'subtask_already_done_recovery' },
        })
      } else {
        await this.stateRepo.enqueueReadySubtaskEvents(
          supabase,
          missionId,
          String(mission.user_id),
          mission.org_id ?? null,
          {
            reason: 'subtask_already_done_recovery',
            source_subtask_id: String(subtaskId),
          },
        )
      }

      return {
        missionId,
        subtaskId,
        success: true,
        status: everyDone ? 'review' : 'in_progress',
        processedAt: new Date().toISOString(),
        output: { skipped_subtask_execute: true, reason: 'subtask_already_done' },
      }
    }
    if (String(subtask.status) === 'blocked') {
      return {
        missionId,
        subtaskId,
        success: true,
        status: 'blocked' as MissionStatus,
        processedAt: new Date().toISOString(),
        output: { skipped_subtask_execute: true, reason: 'subtask_blocked' },
      }
    }
    if (subtask.assignee_type === 'human' || String(subtask.status) === 'awaiting_human') {
      // Humans are pulled-by-owner, not pushed by the execute worker. The awaiting_human
      // outbox event + human-subtask-notifier handle notification; the execute worker
      // must never call OpenClaw or claim the row as in_progress for a human assignee.
      const nowIso = new Date().toISOString()
      if (String(subtask.status) === 'pending') {
        const { error } = await supabase
          .from('mission_subtasks')
          .update({
            status: 'awaiting_human',
            awaiting_human_since: nowIso,
            sla_escalate_at: new Date(Date.now() + HUMAN_SUBTASK_SLA_MS).toISOString(),
            updated_at: nowIso,
          })
          .eq('id', subtaskId)
          .eq('mission_id', missionId)
          .eq('status', 'pending')
          .select('id')
        if (error) throw error
      }
      await this.stateRepo.enqueueMissionOutboxEvent(supabase, {
        missionId,
        userId: String(mission.user_id),
        orgId: mission.org_id ?? null,
        eventType: 'mission.subtask.awaiting_human.requested',
        dedupeKey: `mission:${missionId}:subtask:${subtaskId}:awaiting_human:execute`,
        priorityRank: priorityToRank(mission.priority),
        payload: {
          phase: 'awaiting_human',
          subtask_id: subtaskId,
          assigned_user_id: subtask.assigned_user_id ?? null,
          requested_by: 'execute_human_subtask_activation',
        },
      })
      await this.stateRepo.recomputeMissionStatus(supabase, missionId)
      this.logger.log(
        `Skipping execute phase for human subtask ${subtaskId} (status=${subtask.status})`,
      )
      return {
        missionId,
        subtaskId,
        success: true,
        status: 'awaiting_human' as MissionStatus,
        processedAt: new Date().toISOString(),
        output: {
          skipped_subtask_execute: true,
          reason: 'human_subtask_skipped_by_execute_worker',
        },
      }
    }

    const assignedAgent = (subtask.assigned_agent_key ||
      mission.assigned_agent_key ||
      'vibey') as AgentKey
    const preflightContract = normalizeOutputContract(subtask.output_contract)
    if (preflightContract) {
      const preflight = await this.preflightContractAction(
        supabase,
        mission,
        assignedAgent,
        preflightContract.required_action,
      )
      if (!preflight.allowed) {
        return await this.handleContractPreflightFailure(
          supabase,
          mission,
          missionId,
          subtask,
          String(subtaskId),
          assignedAgent,
          preflightContract,
          preflight.reason,
        )
      }
    }

    try {
      const claimAt = new Date().toISOString()
      const { data: claimedRows } = await supabase
        .from('mission_subtasks')
        .update({ status: 'in_progress', updated_at: claimAt })
        .eq('id', subtaskId)
        .eq('mission_id', missionId)
        .in('status', ['pending', 'revision', 'blocked'])
        .select('id')
      if (!claimedRows?.length) {
        return {
          missionId,
          subtaskId,
          success: true,
          status: mission.status as MissionStatus,
          processedAt: new Date().toISOString(),
          output: { skipped_subtask_execute: true, reason: 'subtask_claim_failed' },
        }
      }

      await this.stateRepo.updateMissionState(supabase, missionId, {
        status: resolveMissionStatusWhileSubtaskRuns(mission.status as MissionStatus),
        current_agent_key: assignedAgent,
        progress_notes: `Working on subtask: ${subtask.title}`,
      })
      await this.stateRepo.updateAgentStatus(supabase, mission.user_id, assignedAgent, 'working')

      const depOutputs = await this.stateRepo.getSubtaskDependencyOutputs(
        supabase,
        subtask.depends_on || [],
      )
      const completedActionsContext = this.buildCompletedActionsContext(subtask.execution_state)
      const plan = await this.stateRepo.getPlan(
        supabase,
        missionId,
        String(mission.user_id),
        mission.org_id ?? null,
      )
      const userComments = await this.stateRepo.getRecentUserComments(
        supabase,
        missionId,
        String(mission.user_id),
        mission.org_id ?? null,
      )

      await this.stateRepo.insertLog(
        supabase,
        mission,
        'mission.progress',
        'in_progress',
        'in_progress',
        {
          note: `Executing subtask "${subtask.title}" assigned to ${assignedAgent}`,
          subtask_id: subtaskId,
        },
        assignedAgent,
      )

      const subtaskPrompt = await this.buildSubtaskExecutionPrompt(
        supabase,
        mission,
        plan,
        subtask,
        depOutputs,
        completedActionsContext,
        userComments,
      )

      const stId = String(subtaskId)
      await this.broadcast.init(stId)

      const baseState =
        subtask.execution_state && typeof subtask.execution_state === 'object'
          ? { ...(subtask.execution_state as Record<string, unknown>) }
          : {}
      const completedActions: unknown[] = Array.isArray(baseState.completed_actions)
        ? [...(baseState.completed_actions as unknown[])]
        : []

      const activeToolMeta: Record<string, { label: string; action?: string; startedAt: number }> =
        {}

      const MAX_RESULT_SUMMARY_BYTES = 2048
      const MAX_PARTIAL_OUTPUT_BYTES = 10240
      let partialOutputBuffer = ''

      const truncateResultSummary = (result: unknown): string | undefined => {
        if (result === undefined || result === null) return undefined
        try {
          const str = typeof result === 'string' ? result : JSON.stringify(result)
          return str.length > MAX_RESULT_SUMMARY_BYTES
            ? str.slice(0, MAX_RESULT_SUMMARY_BYTES) + '…'
            : str
        } catch {
          return undefined
        }
      }

      const persistExecState = async (patch?: Record<string, unknown>) => {
        const trimmedPartial =
          partialOutputBuffer.length > MAX_PARTIAL_OUTPUT_BYTES
            ? partialOutputBuffer.slice(-MAX_PARTIAL_OUTPUT_BYTES)
            : partialOutputBuffer
        const execution_state = {
          ...baseState,
          completed_actions: completedActions,
          last_checkpoint_at: new Date().toISOString(),
          ...(trimmedPartial.length > 0 ? { partial_output: trimmedPartial } : {}),
          ...patch,
        }
        Object.assign(baseState, execution_state)
        await supabase
          .from('mission_subtasks')
          .update({
            execution_state,
            updated_at: new Date().toISOString(),
          })
          .eq('id', subtaskId)
          .eq('mission_id', missionId)
          .eq('status', 'in_progress')
      }

      // Clear any prior-run zombie tool so the UI does not show a dead step while we warm the runtime.
      await persistExecState({
        current_tool: null,
        execution_status: 'starting',
      })
      let lastLeaseWriteAt = Date.now()
      let streamStarted = false

      const openClawExecOpts = (deadline: {
        signal: AbortSignal
        touch: () => void
        dispose: () => void
        controller?: AbortController
      }) => ({
        abortSignal: deadline.signal,
        subtaskId: stId,
        onStreamHeartbeat: async () => {
          deadline.touch()
          await job.updateProgress({ hb: Date.now() }).catch(() => {})
          const nowMs = Date.now()
          if (!streamStarted) {
            await persistExecState({ execution_status: 'streaming' })
            streamStarted = true
            lastLeaseWriteAt = nowMs
          }
          const shouldWriteLease = shouldWriteMissionExecutionLease(lastLeaseWriteAt, nowMs)
          const currentResult = shouldWriteLease
            ? await supabase
                .from('mission_subtasks')
                .update({ updated_at: new Date(nowMs).toISOString() })
                .eq('id', subtaskId)
                .eq('mission_id', missionId)
                .eq('status', 'in_progress')
                .select('status, assigned_agent_key')
                .maybeSingle()
            : await supabase
                .from('mission_subtasks')
                .select('status, assigned_agent_key')
                .eq('id', subtaskId)
                .eq('mission_id', missionId)
                .maybeSingle()
          if (currentResult.error) {
            throw new Error(
              `Failed to renew subtask execution lease: ${currentResult.error.message}`,
            )
          }
          const current = currentResult.data
          if (shouldWriteLease && current) lastLeaseWriteAt = nowMs
          const rowAgent =
            typeof current?.assigned_agent_key === 'string' && current.assigned_agent_key.trim()
              ? current.assigned_agent_key.trim()
              : ''
          const effectiveAssigned =
            rowAgent ||
            (typeof mission.assigned_agent_key === 'string' && mission.assigned_agent_key.trim()
              ? mission.assigned_agent_key.trim()
              : '') ||
            'vibey'
          if (
            !current ||
            String(current.status) !== 'in_progress' ||
            effectiveAssigned !== assignedAgent
          ) {
            deadline.dispose()
            throw new SubtaskExecutionInvalidatedError(
              `Subtask ${subtaskId} invalidated during execution (status: ${current?.status})`,
            )
          }
        },
        onToolStart: async (name: string, args?: Record<string, unknown>, toolCallId?: string) => {
          deadline.touch()
          const resolved = resolveLabel(name, args)
          const key = toolCallId || name
          activeToolMeta[key] = {
            label: resolved.label,
            action: resolved.action,
            startedAt: Date.now(),
          }
          if (resolved.hidden) {
            return
          }
          await persistExecState({
            execution_status: 'streaming',
            current_tool: {
              name,
              label: resolved.label,
              ...(resolved.action ? { action: resolved.action } : {}),
              ...(toolCallId ? { tool_call_id: toolCallId } : {}),
              startedAt: Date.now(),
            },
          })
          if (!resolved.hidden) {
            this.broadcast.emitToolStart(stId, {
              name,
              label: resolved.label,
              action: resolved.action,
              tool_call_id: toolCallId,
            })
          }
        },
        onToolUpdate: async (name: string, partialResult?: unknown, toolCallId?: string) => {
          deadline.touch()
          const key = toolCallId || name
          if (isHiddenCampaignAction(name, activeToolMeta[key]?.action)) return
          const detail = resolveToolUpdateDetail(name, partialResult)
          if (detail) {
            this.broadcast.emitToolUpdate(stId, {
              name,
              detail,
              tool_call_id: toolCallId,
            })
          }
        },
        onToolDone: async (
          name: string,
          toolCallId?: string,
          isError?: boolean,
          action?: string,
          result?: unknown,
        ) => {
          deadline.touch()
          const key = toolCallId || name
          const meta = activeToolMeta[key]
          const label = meta?.label || resolveLabel(name).label
          const toolAction = action || meta?.action
          if (isHiddenCampaignAction(name, toolAction)) {
            delete activeToolMeta[key]
            await persistExecState({ current_tool: null })
            return
          }
          const resultSummary = truncateResultSummary(result)
          const deliverableReceipt = isError ? null : extractToolDeliverableReceipt(result)
          completedActions.push({
            action: name,
            title: deliverableReceipt?.title || toolCallId || 'done',
            label,
            ...(toolAction ? { toolAction } : {}),
            ...(resultSummary ? { result_summary: resultSummary } : {}),
            ...(deliverableReceipt ?? {}),
            state: isError ? 'failed' : 'complete',
            startedAt: meta?.startedAt ?? Date.now(),
            endedAt: new Date().toISOString(),
          })
          delete activeToolMeta[key]
          await persistExecState({ current_tool: null })
          this.broadcast.emitToolDone(stId, {
            name,
            label,
            action: toolAction,
            status: isError ? 'failed' : 'completed',
            tool_call_id: toolCallId,
          })
        },
        onThinkingDelta: async (delta: string, text: string) => {
          deadline.touch()
          this.broadcast.emitThinkingDelta(stId, { delta, text })
        },
        onOutputTextDelta: async (delta: string) => {
          deadline.touch()
          partialOutputBuffer += delta
          this.broadcast.emitAssistantDelta(stId, { delta })
        },
      })

      const execDeadline = this.support.createExecutionDeadline({
        inactivityMs: executionTimeoutMs,
        absoluteMaxMs: executionAbsoluteMaxMs,
        timeoutMessage: `Subtask "${subtask.title}" timed out`,
        absoluteTimeoutMessage: `Subtask "${subtask.title}" exceeded maximum execution time`,
      })
      this.abortRegistry.register(String(subtaskId), execDeadline.controller)
      let output: Record<string, unknown>
      try {
        output = await execDeadline.wrap(
          this.openclawGateway.callOpenClawRaw(
            mission,
            assignedAgent,
            subtaskPrompt.campaignContext,
            subtaskPrompt.taskUserMessage,
            undefined,
            'mission_execute',
            openClawExecOpts(execDeadline),
          ),
        )
      } finally {
        execDeadline.dispose()
        this.abortRegistry.unregister(String(subtaskId))
      }

      let parsedOutput = this.jsonService.tryParseJson(output.content as string)
      if (
        assignedAgent === 'atlas' &&
        parsedOutput &&
        String((parsedOutput as Record<string, unknown>).kind) === 'brain_routing_conflict'
      ) {
        return await this.handleAtlasBrainRoutingConflict(
          supabase,
          mission,
          missionId,
          subtask,
          String(subtaskId),
          assignedAgent,
          parsedOutput as Record<string, unknown>,
        )
      }

      if (parsedOutput && String((parsedOutput as Record<string, unknown>).kind) === 'blocked') {
        return await this.handleAgentReportedBlocked(
          supabase,
          mission,
          missionId,
          subtask,
          String(subtaskId),
          assignedAgent,
          parsedOutput as Record<string, unknown>,
        )
      }

      const latestComment =
        userComments.length > 0 ? userComments[userComments.length - 1] || '' : ''
      const alignment = evaluateSubtaskOutputAlignment(subtask, parsedOutput, latestComment)
      if (!alignment.ok) {
        const correctionDeadline = this.support.createExecutionDeadline({
          inactivityMs: executionTimeoutMs,
          absoluteMaxMs: executionAbsoluteMaxMs,
          timeoutMessage: `Subtask "${subtask.title}" alignment correction timed out`,
          absoluteTimeoutMessage: `Subtask "${subtask.title}" alignment correction exceeded maximum execution time`,
        })
        let correctedOutput: Record<string, unknown>
        try {
          correctedOutput = await correctionDeadline.wrap(
            this.openclawGateway.callOpenClawRaw(
              mission,
              assignedAgent,
              subtaskPrompt.campaignContext,
              `${subtaskPrompt.taskUserMessage}\n\nALIGNMENT_CORRECTION:\nYour previous output missed critical task alignment: ${alignment.reason}\nRevise the deliverable so it fully addresses the current subtask intent and latest user intent.`,
              undefined,
              'mission_execute',
              openClawExecOpts(correctionDeadline),
            ),
          )
        } finally {
          correctionDeadline.dispose()
        }
        parsedOutput = this.jsonService.tryParseJson(correctedOutput.content as string)
      }

      const outputContract = normalizeOutputContract(subtask.output_contract)
      if (outputContract) {
        const preferredDeliverableIds = this.extractArtifactManifestDeliverableIds(
          parsedOutput,
          outputContract,
        )
        const contractVerification = await this.deliverablesRepo.verifyOutputContract(
          supabase,
          String(mission.id),
          outputContract,
          preferredDeliverableIds,
        )
        if (!contractVerification.ok) {
          return await this.handleContractVerificationFailure(
            supabase,
            mission,
            missionId,
            subtask,
            String(subtaskId),
            assignedAgent,
            parsedOutput,
            contractVerification,
            baseState,
          )
        }
        parsedOutput = {
          ...parsedOutput,
          contract_verification: contractVerification,
        }
      }

      const { data: doneRows } = await supabase
        .from('mission_subtasks')
        .update({
          status: 'done',
          output: parsedOutput,
          ...(outputContract
            ? {
                contract_status: 'verified',
                contract_verification: parsedOutput.contract_verification,
              }
            : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id', subtaskId)
        .eq('mission_id', missionId)
        .eq('status', 'in_progress')
        .select('id')

      if (!doneRows?.length) {
        this.logger.warn(
          `Discarding output for subtask ${subtaskId}: status changed during execution`,
        )
        await this.stateRepo.updateAgentStatus(supabase, mission.user_id, assignedAgent, 'idle')
        await this.stateRepo.enqueueReadySubtaskEvents(
          supabase,
          missionId,
          String(mission.user_id),
          mission.org_id ?? null,
          {
            reason: 'output_discard_subtask_changed',
            source_subtask_id: String(subtaskId),
          },
        )
        await this.stateRepo.recomputeMissionStatus(supabase, missionId)
        const missionAfterDiscard = await this.stateRepo.getMission(
          supabase,
          missionId,
          String(mission.user_id),
          mission.org_id ?? null,
        )
        return {
          missionId,
          subtaskId,
          success: true,
          status: missionAfterDiscard.status as MissionStatus,
          processedAt: new Date().toISOString(),
          output: { discarded: true, reason: 'subtask_no_longer_in_progress' },
        }
      }

      const deliverableId =
        this.resolveSubtaskDeliverableId(parsedOutput, outputContract) ||
        (await this.deliverablesRepo.getLatestToolAuthoredDeliverableId(
          supabase,
          String(mission.id),
        ))
      if (deliverableId) {
        await supabase
          .from('mission_subtasks')
          .update({
            deliverable_id: deliverableId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', subtaskId)
          .eq('mission_id', missionId)
          .eq('status', 'done')
      } else {
        this.logger.warn(
          `[deliverable_missing] mission=${mission.id} subtask=${subtaskId} agent=${assignedAgent} reason=no_tool_authored_deliverable`,
        )
      }

      await this.stateRepo.insertLog(
        supabase,
        mission,
        'mission.progress',
        'in_progress',
        'in_progress',
        {
          note: `Completed subtask "${subtask.title}"`,
          subtask_id: subtaskId,
        },
        assignedAgent,
      )

      await this.stateRepo.updateAgentStatus(supabase, mission.user_id, assignedAgent, 'idle')

      const { data: allSubtasks } = await supabase
        .from('mission_subtasks')
        .select('status')
        .eq('mission_id', missionId)
      const allDone = allSubtasks != null && activeSubtasksAllDone(allSubtasks)

      if (allDone) {
        await this.stateRepo.updateMissionState(supabase, missionId, {
          status: 'review',
          current_agent_key: null,
          progress_notes: 'All subtasks completed — ready for review',
        })
        await this.stateRepo.insertLog(
          supabase,
          mission,
          'mission.execution.completed',
          'in_progress',
          'review',
          {
            note: `All subtasks completed`,
          },
        )
        await this.stateRepo.enqueueMissionOutboxEvent(supabase, {
          missionId,
          userId: String(mission.user_id),
          orgId: mission.org_id ?? null,
          eventType: 'mission.review.requested',
          dedupeKey: `mission:${missionId}:review:all-subtasks-done`,
          requeueExistingDedupeKey: true,
          payload: {
            phase: 'review',
            requested_by: 'all_subtasks_done',
          },
        })
      } else {
        await this.stateRepo.enqueueReadySubtaskEvents(
          supabase,
          missionId,
          String(mission.user_id),
          mission.org_id ?? null,
          {
            reason: 'subtask_completed',
            source_subtask_id: String(subtaskId),
          },
        )
      }

      await persistExecState({ execution_status: 'complete', current_tool: null })
      await this.broadcast.emitExecComplete(stId)
      await this.broadcast.dispose(stId)

      return {
        missionId,
        subtaskId,
        success: true,
        status: allDone ? 'review' : 'in_progress',
        processedAt: new Date().toISOString(),
        output: parsedOutput,
      }
    } catch (error) {
      await this.broadcast
        .emitExecFailed(String(subtaskId), {
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        .catch(() => {})
      await this.broadcast.dispose(String(subtaskId)).catch(() => {})

      if (error instanceof SubtaskExecutionInvalidatedError) {
        await this.stateRepo.updateAgentStatus(supabase, mission.user_id, assignedAgent, 'idle')
        await this.stateRepo.enqueueReadySubtaskEvents(
          supabase,
          missionId,
          String(mission.user_id),
          mission.org_id ?? null,
          {
            reason: 'subtask_invalidated_mid_execution',
            source_subtask_id: String(subtaskId),
          },
        )
        await this.stateRepo.recomputeMissionStatus(supabase, missionId)
        const missionAfterInv = await this.stateRepo.getMission(
          supabase,
          missionId,
          String(mission.user_id),
          mission.org_id ?? null,
        )
        return {
          missionId,
          subtaskId,
          success: true,
          status: missionAfterInv.status as MissionStatus,
          processedAt: new Date().toISOString(),
          output: { subtask_invalidated: true },
        }
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown subtask execute error'
      const retryable = !(error instanceof OpenClawNonRetryableError)
      const attempts = Number(job.opts.attempts || 3)
      const nextRetryCount = Number(job.attemptsMade || 0) + 1
      const isFinalAttempt = nextRetryCount >= attempts
      const humanFeedback = humanizeMissionError(errorMessage, assignedAgent, isFinalAttempt)
      this.logger.error(
        `[mission_execute_error] hop=worker correlation_id=${String(mission.correlation_id ?? '')} mission_id=${missionId} subtask_id=${subtaskId} retryable=${retryable} ${errorMessage}`,
      )
      const priorOutput =
        subtask.output && typeof subtask.output === 'object' && !Array.isArray(subtask.output)
          ? (subtask.output as Record<string, unknown>)
          : {}
      await supabase
        .from('mission_subtasks')
        .update({
          status: 'blocked',
          feedback: humanFeedback,
          output: {
            ...priorOutput,
            _internal_error: errorMessage.slice(0, 2000),
            error_summary: humanFeedback,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', subtaskId)
        .eq('mission_id', missionId)
        .eq('status', 'in_progress')

      await this.stateRepo.insertLog(
        supabase,
        mission,
        'mission.subtask.execute.failed',
        mission.status,
        'blocked',
        {
          subtask_id: subtaskId,
          title: subtask.title,
          note: `Subtask "${subtask.title}" blocked`,
          error: humanFeedback,
          _internal_error: errorMessage.slice(0, 2000),
          retryCount: nextRetryCount,
          attempts,
        },
        assignedAgent,
      )

      await this.stateRepo.enqueueMissionOutboxEvent(supabase, {
        missionId,
        userId: String(mission.user_id),
        orgId: mission.org_id ?? null,
        eventType: 'mission.subtask.triage.requested',
        dedupeKey: `mission:${missionId}:subtask:${subtaskId}:triage:execute_err:${Date.now()}`,
        payload: {
          phase: 'triage',
          subtask_id: subtaskId,
          requested_by: 'execute_failure',
        },
      })

      await this.stateRepo.updateAgentStatus(supabase, mission.user_id, assignedAgent, 'idle')

      await this.stateRepo.enqueueReadySubtaskEvents(
        supabase,
        missionId,
        String(mission.user_id),
        mission.org_id ?? null,
        {
          reason: 'execute_error_siblings',
          source_subtask_id: String(subtaskId),
        },
      )

      await this.stateRepo.recomputeMissionStatus(supabase, missionId)

      const missionAfterErr = await this.stateRepo.getMission(
        supabase,
        missionId,
        String(mission.user_id),
        mission.org_id ?? null,
      )

      return {
        missionId,
        subtaskId,
        success: true,
        status: missionAfterErr.status as MissionStatus,
        processedAt: new Date().toISOString(),
        output: { triage_enqueued: true, error: errorMessage },
      }
    }
  }

  private async processLegacyExecutePhase(job: Job<MissionJobData>): Promise<MissionJobResult> {
    const { missionId } = job.data
    const supabase = this.databaseService.getClient()
    const mission = await this.stateRepo.getMission(
      supabase,
      missionId,
      job.data.userId,
      job.data.orgId ?? null,
    )
    const assignedAgent = (mission.assigned_agent_key || 'vibey') as AgentKey
    const executionTimeoutMs = this.support.getTimeoutMs()

    try {
      await this.stateRepo.updateMissionState(supabase, missionId, {
        status: 'in_progress',
        current_agent_key: assignedAgent,
      })
      await this.stateRepo.updateAgentStatus(supabase, mission.user_id, assignedAgent, 'working')
      const plan = await this.stateRepo.getPlan(
        supabase,
        missionId,
        String(mission.user_id),
        mission.org_id ?? null,
      )
      const steps = (plan?.content as any)?.steps as
        | Array<{ id: string; title: string }>
        | undefined
      const stepCount = steps?.length || 0
      await this.stateRepo.insertLog(
        supabase,
        mission,
        'mission.progress',
        mission.status,
        'in_progress',
        {
          note:
            stepCount > 0
              ? `Picking up the mission. I have ${stepCount} steps to work through.`
              : `Picking up the mission. Working on the full deliverable now.`,
        },
        assignedAgent,
      )

      let output: Record<string, unknown>

      if (steps && steps.length > 0) {
        output = await this.executeStepByStep(
          supabase,
          mission,
          plan,
          steps,
          assignedAgent,
          executionTimeoutMs,
        )
      } else {
        output = await this.support.withTimeout(
          this.openclawGateway.callOpenClawForExecution(mission, plan),
          executionTimeoutMs,
          `Execute phase timed out after ${Math.floor(executionTimeoutMs / 1000)}s`,
        )
      }

      const hasToolAuthored = await this.deliverablesRepo.hasToolAuthoredDeliverables(
        supabase,
        String(mission.id),
      )
      if (!hasToolAuthored) {
        this.logger.warn(
          `[deliverable_missing] mission=${mission.id} agent=${assignedAgent} reason=no_tool_authored_deliverable`,
        )
      }

      await this.stateRepo.updateMissionState(supabase, missionId, {
        status: 'review',
        output,
        current_agent_key: assignedAgent,
      })
      await this.stateRepo.insertLog(
        supabase,
        mission,
        'mission.execution.completed',
        'in_progress',
        'review',
        {
          output,
        },
      )
      await this.stateRepo.enqueueMissionOutboxEvent(supabase, {
        missionId,
        userId: String(mission.user_id),
        orgId: mission.org_id ?? null,
        eventType: 'mission.review.requested',
        dedupeKey: `mission:${missionId}:review:legacy-execute`,
        payload: {
          phase: 'review',
          requested_by: 'legacy_execute_completed',
        },
      })
      await this.stateRepo.updateAgentStatus(supabase, mission.user_id, assignedAgent, 'idle')

      return {
        missionId,
        success: true,
        status: 'review',
        processedAt: new Date().toISOString(),
        output,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown execute phase error'
      await this.support.handlePhaseError(supabase, mission, assignedAgent, errorMessage, job)
      throw error
    }
  }

  private async executeStepByStep(
    supabase: SupabaseClient,
    mission: Record<string, any>,
    plan: Record<string, any>,
    steps: Array<{ id: string; title: string }>,
    agentKey: AgentKey,
    timeoutMs: number,
  ): Promise<Record<string, unknown>> {
    const stepOutputs: Array<{ stepId: string; title: string; output: string }> = []

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]
      const priorWork = stepOutputs.map((s) => `[${s.title}]\n${s.output}`).join('\n\n')

      await this.stateRepo.updateMissionState(supabase, mission.id, {
        status: 'in_progress',
        progress_notes: `Working on step ${i + 1}/${steps.length}: ${step.title}`,
      })

      const stepResult = await this.support.withTimeout(
        this.openclawGateway.callOpenClawForStep(mission, plan, step, priorWork, agentKey),
        timeoutMs,
        `Step "${step.title}" timed out`,
      )

      const stepContent = (stepResult.content as string) || ''
      stepOutputs.push({ stepId: step.id, title: step.title, output: stepContent })

      await this.stateRepo.updateMissionState(supabase, mission.id, {
        status: 'in_progress',
        progress_notes: `Completed step ${i + 1}/${steps.length}: ${step.title}`,
      })

      const preview = stepContent.length > 200 ? stepContent.slice(0, 200) + '...' : stepContent
      await this.stateRepo.insertLog(
        supabase,
        mission,
        'mission.progress',
        'in_progress',
        'in_progress',
        {
          note: `Completed "${step.title}" (step ${i + 1}/${steps.length}). ${preview}`,
          step_id: step.id,
          step_title: step.title,
          step_index: i + 1,
          total_steps: steps.length,
        },
        agentKey,
      )
    }

    const combinedContent = stepOutputs
      .map((s) => `## ${s.title}\n\n${s.output}`)
      .join('\n\n---\n\n')
    return {
      content: combinedContent,
      steps_completed: stepOutputs.length,
      step_outputs: stepOutputs,
    }
  }

  private async buildSubtaskExecutionPrompt(
    supabase: SupabaseClient,
    mission: Record<string, any>,
    plan: Record<string, any> | null,
    subtask: Record<string, any>,
    depOutputs: Array<{ title: string; output: string }>,
    completedActionsContext: string,
    userComments: string[],
  ): Promise<{ campaignContext: string; taskUserMessage: string }> {
    const agentKey = subtask.assigned_agent_key || 'vibey'
    const isRevision = subtask.status === 'revision'
    const feedbackContext = subtask.feedback ? `\n\nManager Feedback:\n${subtask.feedback}` : ''
    const latestComment = userComments.length > 0 ? userComments[userComments.length - 1] || '' : ''
    const planSummary = (plan?.content as any)?.summary || ''
    await this.openclawGateway.assertMissionHasCredits(supabase, mission)
    const campaignContext = await this.contextService.buildCampaignContext(
      supabase,
      mission,
      agentKey,
      subtask.title,
    )
    const guaranteedContext = await this.buildGuaranteedSubtaskContext(
      supabase,
      mission,
      agentKey,
      subtask,
      depOutputs,
      latestComment,
    )

    const intent = (subtask.intent || {}) as Record<string, string>
    const hasIntent =
      intent.why && intent.story && intent.sensory && intent.endState && intent.ecology

    const atlasBrainIntentBlock =
      agentKey === 'atlas'
        ? [
            '',
            '[ATLAS_BRAIN_INTENT — READ BEFORE ANY vibey_backend BRAIN WRITE]',
            'You are Atlas (Brain Scholar). Before calling save_user_memory, ingest_agent_brain_*, transfer_brain_node, or delete_brain_node:',
            '',
            '## Why the Manager plan can be wrong (read this)',
            'Missions usually carry campaign_id. The Manager may bias ingest missions toward project context even when the user explicitly asked for **main / user / default brain**. Subtask wording is NOT authoritative — the mission **brief** is. If you follow a wrong subtask title and write to the wrong layer, you ship bad data.',
            '',
            '## Mandatory check (no exceptions)',
            `1) Parse the user's requested brain layer from mission title + brief + description (ignore subtask title if it conflicts).`,
            '2) Durable layers: **user** (main/default brain — save_user_memory on user scope) vs **agent** (that worker brain — ingest_agent_brain_* + resolved brain_id). Campaign/Space context is active project context, not a Brain write target.',
            '3) If your subtask title, plan summary, or intent packet implies a different target than the brief, you MUST NOT execute brain writes.',
            '',
            '## When to stop and hand off to Vibey (Manager)',
            'If there is ANY mismatch between what the user asked (brief) and what the plan/subtask says, return ONLY this JSON (no tools, no prose):',
            '{',
            '  "kind": "brain_routing_conflict",',
            '  "user_requested_target": "user | agent | campaign_context",',
            '  "plan_or_subtask_implies": "user | agent | campaign_context",',
            '  "mismatch_summary": "one sentence",',
            '  "why_planner_misfires": "short explanation for Vibey: campaign_id present, copywriter habit, ambiguous wording, etc.",',
            '  "vibey_handoff": "Concrete replan instructions for Vibey/manager: fix summary + subtasks + intent so the next Atlas run targets the correct layer."',
            '}',
            '',
            'If the plan aligns with the brief, proceed: use the correct tool per layer; do **not** use save_user_memory for named-agent-brain requests or campaign/Space context.',
            'If intent is ambiguous after re-reading the brief, use brain_routing_conflict with vibey_handoff asking the user to pick a layer — do not guess.',
            '',
            `Mission title: ${mission.title ?? ''}`,
            `Mission brief: ${mission.brief ?? ''}`,
            `Mission description: ${mission.description ?? ''}`,
            '',
          ].join('\n')
        : ''

    const missionControl = [
      '[MISSION_CONTROL — SUBTASK_EXECUTION MODE]',
      `You are the ${agentKey} agent for Vibey Mission Control.`,
      isRevision
        ? 'Your previous work was reviewed and needs revision. Read the feedback carefully and improve your output.'
        : 'Execute the assigned subtask. Produce the deliverable.',
      '',
      hasIntent
        ? 'You are acting from the INTENT below. Every creative decision should align with the WHY, serve the STORY, produce the SENSORY EVIDENCE, move toward the END-STATE, and respect the ECOLOGY.'
        : 'Focus on quality and completeness.',
      '',
      'Use GUARANTEED_CONTEXT as the default source of truth.',
      'Use ALREADY_COMPLETED_ACTIONS to resume work after retry/failure.',
      'If and only if required facts are missing, perform targeted fetches via vibey_backend for specific gaps.',
      'Do NOT do broad exploratory fetch loops.',
      'Dependency outputs are authoritative for already-completed upstream work. Do not rewrite finished upstream deliverables.',
      'Do not recreate artifacts that already exist in ALREADY_COMPLETED_ACTIONS. Continue from pending work only.',
      '',
      'DELIVERABLE PUBLISHING (MANDATORY):',
      'You MUST call the appropriate vibey_backend tool to publish your final deliverable (save_document, create_pdf, create_docx, generate_image, generate_video, create_offer, create_funnel, create_website, create_presentation, create_sequence, create_blog_post, create_social_post, create_ad, create_avatar).',
      'The "content" field in your JSON response is for internal tracking only — it will NOT be shown to the user.',
      'If you do not call a creation tool, no deliverable is created and the user sees nothing.',
      'Do NOT put full source code, TSX, page files, or implementation code in the content field — those are not deliverables.',
      'When assets are published, return their deliverable_id values in artifact_manifest.',
      '',
      'BLOCKER REPORTING (USE WHEN YOU CANNOT COMPLETE THE TASK):',
      'If you hit a hard blocker that prevents you from completing the subtask — such as a disabled integration, missing permissions, an external service refusing your request, or a prerequisite that only a human can fulfill — you MUST report it instead of pretending you succeeded.',
      'Return ONLY this JSON: { "kind": "blocked", "feedback": "Clear explanation of what blocked you and what the user needs to do to unblock it" }',
      'Do NOT return kind:blocked for soft issues you can work around. Only use it for genuine blockers that make completing the subtask impossible.',
      '',
      'SUCCESS RESPONSE (when subtask is completed):',
      'Respond with ONLY valid JSON (no markdown, no backticks):',
      '{ "content": "short internal summary of what you did", "summary": "brief summary", "memory_update": "", "assertion_evidence": [{"assertion_key":"A-001","evidence":"specific proof from the created output","artifact_refs":["deliverable_id or tool action"]}], "artifact_manifest": [{"deliverable_id":"uuid","action":"save_document|create_pdf|create_docx|generate_image|generate_video|process_media|create_offer|create_funnel|create_website|create_presentation|create_sequence|create_blog_post|create_social_post|create_ad|create_avatar","type":"doc|pdf|file|image|video|offer|funnel|website|presentation|sequence|blog_post|social_post|ad|avatar","title":"artifact title","file_url":"optional"}] }',
    ].join('\n')

    const intentBlock = hasIntent
      ? [
          '\nINTENT:',
          `- WHY: ${intent.why}`,
          `- STORY: ${intent.story}`,
          `- SENSORY EVIDENCE: ${intent.sensory}`,
          `- END-STATE: ${intent.endState}`,
          `- ECOLOGY: ${intent.ecology}`,
        ].join('\n')
      : this.buildSubtaskIntentDelta(subtask, latestComment)

    const outputContract = normalizeOutputContract(subtask.output_contract)
    const outputContractExclusivity =
      outputContract?.required_action === 'save_document'
        ? 'Publish only the native editable Doc. Do not create PDF, DOCX, or other file-export companions unless the output contract explicitly requires that file action.'
        : ''
    const outputContractBlock = outputContract
      ? [
          '\nOUTPUT_CONTRACT:',
          `- artifact_kind: ${outputContract.artifact_kind}`,
          `- required_action: ${outputContract.required_action}`,
          `- required_artifact_type: ${outputContract.required_artifact_type}`,
          `- expected: ${JSON.stringify(outputContract.expected ?? {})}`,
          '',
          'This contract is verified by code after your run. You are not done until the required artifact exists.',
          `Call ${outputContract.required_action} for the final output. Do not use a different artifact type as a fallback.`,
          outputContractExclusivity,
        ].join('\n')
      : ''
    const contractCorrectionContext = buildContractCorrectionContext(subtask.execution_state)
    const assertionContext = this.buildSubtaskAssertionContext(plan, subtask)

    const taskUserMessage = [
      missionControl,
      atlasBrainIntentBlock,
      intentBlock,
      assertionContext,
      outputContractBlock,
      contractCorrectionContext,
      guaranteedContext,
      completedActionsContext,
      `Mission: ${mission.title}`,
      `Brief: ${mission.brief || ''}`,
      `Plan summary: ${planSummary}`,
      ``,
      `Your subtask: ${subtask.title}`,
      feedbackContext,
    ]
      .filter(Boolean)
      .join('\n')

    return { campaignContext, taskUserMessage }
  }

  private buildSubtaskAssertionContext(
    plan: Record<string, any> | null,
    subtask: Record<string, any>,
  ): string {
    const content =
      plan?.content && typeof plan.content === 'object' && !Array.isArray(plan.content)
        ? (plan.content as Record<string, unknown>)
        : {}
    const harness =
      content.harness && typeof content.harness === 'object' && !Array.isArray(content.harness)
        ? (content.harness as Record<string, unknown>)
        : null
    if (!harness) return ''

    const assertions = Array.isArray(harness.assertions)
      ? (harness.assertions as Array<Record<string, unknown>>)
      : []
    if (assertions.length === 0) return ''

    const subtaskId = String(subtask.id || '')
    const directMap =
      harness.subtaskAssertionKeys &&
      typeof harness.subtaskAssertionKeys === 'object' &&
      !Array.isArray(harness.subtaskAssertionKeys)
        ? (harness.subtaskAssertionKeys as Record<string, unknown>)
        : {}
    const directKeys = Array.isArray(directMap[subtaskId])
      ? (directMap[subtaskId] as unknown[]).filter((key): key is string => typeof key === 'string')
      : []

    const coverageKeys = Array.isArray(harness.assertionCoverage)
      ? (harness.assertionCoverage as Array<Record<string, unknown>>)
          .filter((row) => {
            const implementedBy = Array.isArray(row.implementedBy) ? row.implementedBy : []
            return implementedBy.map(String).includes(subtaskId)
          })
          .map((row) => String(row.assertionKey || row.assertion_key || '').trim())
          .filter(Boolean)
      : []

    const keys = [...new Set([...directKeys, ...coverageKeys])]
    if (keys.length === 0) return ''

    const assertionByKey = new Map(
      assertions.map((assertion) => [
        String(assertion.assertionKey || assertion.assertion_key || '').trim(),
        assertion,
      ]),
    )
    const lines = keys
      .map((key) => {
        const assertion = assertionByKey.get(key)
        if (!assertion) return `- ${key}: assertion details missing from plan harness.`
        const priority = String(assertion.priority || 'must')
        const category = String(assertion.category || 'general')
        const statement = String(assertion.statement || '').trim()
        const validatorType = String(assertion.validatorType || assertion.validator_type || '')
        const evidence = String(
          assertion.evidenceRequirement || assertion.evidence_requirement || '',
        ).trim()
        return [
          `- ${key} [${priority}/${category}] ${statement}`,
          validatorType ? `  validator: ${validatorType}` : '',
          evidence ? `  evidence_required: ${evidence}` : '',
        ]
          .filter(Boolean)
          .join('\n')
      })
      .join('\n')

    return [
      '\nASSERTIONS_FOR_THIS_SUBTASK:',
      lines,
      '',
      'EVIDENCE RULE:',
      'When you return success JSON, include assertion_evidence for each assertion above. Cite the concrete deliverable, section, copy passage, form, link, or tool action that proves the assertion.',
    ].join('\n')
  }

  private buildCompletedActionsContext(executionState: unknown): string {
    const state =
      executionState && typeof executionState === 'object'
        ? (executionState as Record<string, unknown>)
        : {}
    const completedActionsRaw = Array.isArray(state.completed_actions)
      ? (state.completed_actions as Array<Record<string, unknown>>)
      : []
    const completedActions = completedActionsRaw
      .map((entry) => {
        const action = typeof entry.action === 'string' ? entry.action : 'unknown_action'
        const title = typeof entry.title === 'string' ? entry.title : '(untitled)'
        const deliverableId =
          typeof entry.deliverable_id === 'string' ? entry.deliverable_id : '(missing)'
        const fileName = typeof entry.file_name === 'string' ? entry.file_name : ''
        const fileUrl = typeof entry.file_url === 'string' ? entry.file_url : ''
        const resultSummary = typeof entry.result_summary === 'string' ? entry.result_summary : ''
        const extras = [
          fileName ? `file_name=${fileName}` : '',
          fileUrl ? `file_url=${fileUrl}` : '',
        ]
          .filter(Boolean)
          .join(' ')
        const mainLine = `- action=${action} deliverable_id=${deliverableId} title="${title}"${extras ? ` ${extras}` : ''}`
        return resultSummary ? `${mainLine}\n  result: ${resultSummary}` : mainLine
      })
      .filter((line) => line.trim().length > 0)
    const checkpointAt =
      typeof state.last_checkpoint_at === 'string' ? String(state.last_checkpoint_at) : '(none)'

    const partialOutput =
      typeof state.partial_output === 'string' && state.partial_output.length > 0
        ? state.partial_output
        : ''

    const sections = [
      '\nALREADY_COMPLETED_ACTIONS:',
      `- last_checkpoint_at: ${checkpointAt}`,
      '- actions:',
      completedActions.length > 0 ? completedActions.join('\n') : '- (none)',
      '- resume_rule: Never recreate these artifacts. Continue from remaining required work.',
    ]

    if (partialOutput) {
      sections.push(
        '',
        'PREVIOUS_PARTIAL_OUTPUT:',
        '(You were interrupted mid-execution. Below is the output you produced before interruption. Continue from where you left off.)',
        '---',
        partialOutput as string,
      )
    }

    return sections.join('\n')
  }

  private extractArtifactManifestDeliverableIds(
    output: Record<string, unknown> | null | undefined,
    outputContract?: MissionOutputContract | null,
  ): string[] {
    const manifest = this.getArtifactManifestRows(output)
    const ids = manifest
      .map((entry) => {
        const deliverableId = entry.deliverable_id
        return typeof deliverableId === 'string' && deliverableId.trim() ? deliverableId.trim() : ''
      })
      .filter(Boolean)
    if (!outputContract) return [...new Set(ids)]

    const matchingIds = manifest
      .filter((entry) => {
        const action = typeof entry.action === 'string' ? entry.action.trim() : ''
        const type = typeof entry.type === 'string' ? entry.type.trim() : ''
        return (
          (!action || action === outputContract.required_action) &&
          (!type || type === outputContract.required_artifact_type)
        )
      })
      .map((entry) => {
        const deliverableId = entry.deliverable_id
        return typeof deliverableId === 'string' && deliverableId.trim() ? deliverableId.trim() : ''
      })
      .filter(Boolean)

    return [...new Set([...matchingIds, ...ids])]
  }

  private resolveSubtaskDeliverableId(
    output: Record<string, unknown> | null | undefined,
    outputContract?: MissionOutputContract | null,
  ): string | null {
    const verification =
      output?.contract_verification &&
      typeof output.contract_verification === 'object' &&
      !Array.isArray(output.contract_verification)
        ? (output.contract_verification as Record<string, unknown>)
        : null
    const verifiedId =
      typeof verification?.found_artifact_id === 'string' && verification.found_artifact_id.trim()
        ? verification.found_artifact_id.trim()
        : ''
    if (verifiedId) return verifiedId

    const preferredIds = this.extractArtifactManifestDeliverableIds(output, outputContract)
    return preferredIds[0] || null
  }

  private getArtifactManifestRows(
    output: Record<string, unknown> | null | undefined,
  ): Array<Record<string, unknown>> {
    const manifest = output?.artifact_manifest
    if (!Array.isArray(manifest)) return []
    return manifest.filter(
      (entry): entry is Record<string, unknown> =>
        !!entry && typeof entry === 'object' && !Array.isArray(entry),
    )
  }

  private buildSubtaskIntentDelta(subtask: Record<string, any>, latestComment: string): string {
    const lines: string[] = ['\nINTENT_DELTA (newest-first):']
    lines.push(`- Current subtask focus: ${String(subtask.title || '')}`)
    if (subtask.status === 'revision' && subtask.feedback) {
      lines.push(`- Revision requested: ${String(subtask.feedback)}`)
    }
    if (latestComment.trim().length > 0) {
      lines.push(`- Latest user intent: ${latestComment}`)
    }
    return lines.join('\n')
  }

  private async buildGuaranteedSubtaskContext(
    supabase: SupabaseClient,
    mission: Record<string, any>,
    agentKey: string,
    subtask: Record<string, any>,
    depOutputs: Array<{ title: string; output: string }>,
    latestComment: string,
  ): Promise<string> {
    const context = await this.contextService.buildCampaignContext(
      supabase,
      mission,
      agentKey,
      subtask.title,
    )
    const relevantFacts = this.contextService.extractTopRelevantCampaignFacts(context, 12)
    const dependencyLines =
      depOutputs.length > 0
        ? depOutputs.map((d) => `- ${d.title}: ${d.output.slice(0, 320)}`).join('\n')
        : '- none'
    const latestCommentLine = latestComment.trim().length > 0 ? latestComment : '(none)'

    return [
      '\nGUARANTEED_CONTEXT:',
      `- task_intent: ${String(subtask.title || '')}`,
      `- mission_brief: ${String(mission.brief || '')}`,
      `- latest_user_comment: ${latestCommentLine}`,
      '- dependency_outputs:',
      dependencyLines,
      '- top_relevant_campaign_facts:',
      relevantFacts.length > 0 ? relevantFacts.map((f) => `- ${f}`).join('\n') : '- (none)',
    ].join('\n')
  }

  private async handleAtlasBrainRoutingConflict(
    supabase: SupabaseClient,
    mission: Record<string, any>,
    missionId: string,
    subtask: Record<string, any>,
    subtaskId: string,
    assignedAgent: AgentKey,
    parsedOutput: Record<string, unknown>,
  ): Promise<MissionJobResult> {
    const handoff =
      typeof parsedOutput.vibey_handoff === 'string' && parsedOutput.vibey_handoff.trim().length > 0
        ? parsedOutput.vibey_handoff.trim()
        : typeof parsedOutput.mismatch_summary === 'string'
          ? parsedOutput.mismatch_summary.trim()
          : 'Brain routing conflict — plan does not match the user-requested brain layer. Vibey must replan.'

    await supabase
      .from('mission_subtasks')
      .update({
        status: 'blocked',
        feedback: handoff,
        output: parsedOutput,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subtaskId)
      .eq('mission_id', missionId)

    await this.stateRepo.insertLog(
      supabase,
      mission,
      'mission.atlas.brain_routing_conflict',
      String(mission.status),
      String(mission.status),
      {
        note: handoff,
        subtask_id: subtaskId,
        subtask_title: subtask.title,
        user_requested_target: parsedOutput.user_requested_target,
        plan_or_subtask_implies: parsedOutput.plan_or_subtask_implies,
        why_planner_misfires: parsedOutput.why_planner_misfires,
        mismatch_summary: parsedOutput.mismatch_summary,
      },
      assignedAgent,
    )

    await this.stateRepo.enqueueMissionOutboxEvent(supabase, {
      missionId,
      userId: String(mission.user_id),
      orgId: mission.org_id ?? null,
      eventType: 'mission.subtask.triage.requested',
      dedupeKey: `mission:${missionId}:subtask:${subtaskId}:triage:atlas`,
      requeueExistingDedupeKey: true,
      payload: {
        phase: 'triage',
        subtask_id: subtaskId,
        requested_by: 'atlas_brain_routing_conflict',
      },
    })

    await this.stateRepo.updateAgentStatus(supabase, mission.user_id, assignedAgent, 'idle')

    await this.stateRepo.enqueueReadySubtaskEvents(
      supabase,
      missionId,
      String(mission.user_id),
      mission.org_id ?? null,
      {
        reason: 'atlas_conflict_siblings',
        source_subtask_id: String(subtaskId),
      },
    )

    await this.stateRepo.recomputeMissionStatus(supabase, missionId)

    const missionAfterAtlas = await this.stateRepo.getMission(
      supabase,
      missionId,
      String(mission.user_id),
      mission.org_id ?? null,
    )

    return {
      missionId,
      subtaskId,
      success: true,
      status: missionAfterAtlas.status as MissionStatus,
      processedAt: new Date().toISOString(),
      output: parsedOutput,
    }
  }

  private async handleAgentReportedBlocked(
    supabase: SupabaseClient,
    mission: Record<string, any>,
    missionId: string,
    subtask: Record<string, any>,
    subtaskId: string,
    assignedAgent: AgentKey,
    parsedOutput: Record<string, unknown>,
  ): Promise<MissionJobResult> {
    const feedback =
      typeof parsedOutput.feedback === 'string' && parsedOutput.feedback.trim().length > 0
        ? parsedOutput.feedback.trim()
        : 'Agent reported a blocker that prevents completing this subtask.'

    await supabase
      .from('mission_subtasks')
      .update({
        status: 'blocked',
        feedback,
        output: parsedOutput,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subtaskId)
      .eq('mission_id', missionId)
      .eq('status', 'in_progress')

    await this.stateRepo.insertLog(
      supabase,
      mission,
      'mission.subtask.agent_blocked',
      'in_progress',
      'in_progress',
      {
        note: `Agent ${assignedAgent} reported blocker on "${subtask.title}": ${feedback.slice(0, 400)}`,
        subtask_id: subtaskId,
        subtask_title: subtask.title,
      },
      assignedAgent,
    )

    await this.stateRepo.enqueueMissionOutboxEvent(supabase, {
      missionId,
      userId: String(mission.user_id),
      orgId: mission.org_id ?? null,
      eventType: 'mission.subtask.triage.requested',
      dedupeKey: `mission:${missionId}:subtask:${subtaskId}:triage:agent_blocked:${Date.now()}`,
      payload: {
        phase: 'triage',
        subtask_id: subtaskId,
        requested_by: 'agent_reported_blocked',
      },
    })

    await this.stateRepo.updateAgentStatus(supabase, mission.user_id, assignedAgent, 'idle')

    await this.stateRepo.enqueueReadySubtaskEvents(
      supabase,
      missionId,
      String(mission.user_id),
      mission.org_id ?? null,
      {
        reason: 'agent_blocked_siblings',
        source_subtask_id: String(subtaskId),
      },
    )

    await this.stateRepo.recomputeMissionStatus(supabase, missionId)

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
      output: parsedOutput,
    }
  }

  private async preflightContractAction(
    supabase: SupabaseClient,
    mission: Record<string, any>,
    agentKey: string,
    action: string,
  ): Promise<{ allowed: boolean; reason: string; requiredDomain?: MissionPreflightDomain }> {
    const requiredDomain = CONTRACT_ACTION_DOMAINS[action]
    if (!requiredDomain) {
      return { allowed: false, reason: `Unknown required action "${action}".` }
    }
    const orgId = mission.org_id ? String(mission.org_id) : null
    let query = supabase
      .from('agents_registry')
      .select('agent_key, role, level, config, team_id, is_active')
      .eq('agent_key', agentKey)
    if (orgId) {
      query = query.eq('org_id', orgId).is('user_id', null)
    } else {
      query = query.eq('user_id', mission.user_id).is('org_id', null)
    }
    const { data: agent, error } = await query.maybeSingle()
    if (error) return { allowed: false, reason: `Agent lookup failed: ${error.message}` }
    if (!agent) return { allowed: false, reason: `Agent "${agentKey}" is not registered.` }
    if ((agent as { is_active?: boolean | null }).is_active === false) {
      return { allowed: false, reason: `Agent "${agentKey}" is deactivated.` }
    }

    const teamId = typeof agent.team_id === 'string' ? agent.team_id : ''
    const teamGrants = teamId ? await this.loadActionDomainGrants(supabase, teamId) : []
    const overrides = await this.loadActionDomainOverrides(supabase, agentKey, mission)
    const isSystem = ['vibey', 'atlas', 'brain_scholar', 'hr'].includes(agentKey)
    const effectiveDomains = resolveMissionEffectiveDomains(
      agent as Record<string, unknown>,
      agentKey,
      isSystem ? [] : teamGrants,
      isSystem ? [] : overrides.allowExtra,
      isSystem ? [] : overrides.deny,
    )
    if (overrides.deny.includes(requiredDomain)) {
      return {
        allowed: false,
        reason: `Action "${action}" is denied by agent override for domain "${requiredDomain}".`,
        requiredDomain,
      }
    }
    const allowed = effectiveDomains.has(requiredDomain)
    if (!allowed) {
      const missionGrantAllowed = await this.loadMissionAccessGrant(
        supabase,
        String(mission.id),
        agentKey,
        requiredDomain,
      )
      if (missionGrantAllowed) {
        return {
          allowed: true,
          reason: `Action "${action}" is allowed by mission access approval for domain "${requiredDomain}".`,
          requiredDomain,
        }
      }
    }
    return {
      allowed,
      reason: allowed
        ? `Action "${action}" is allowed for domain "${requiredDomain}".`
        : `Action "${action}" requires action domain "${requiredDomain}".`,
      requiredDomain,
    }
  }

  private async loadMissionAccessGrant(
    supabase: SupabaseClient,
    missionId: string,
    agentKey: string,
    requiredDomain: MissionPreflightDomain,
  ): Promise<boolean> {
    const { data } = await supabase
      .from('mission_agent_access_requests')
      .select('id, expires_at')
      .eq('mission_id', missionId)
      .eq('agent_key', agentKey)
      .eq('capability_kind', 'action_domain')
      .eq('capability_id', requiredDomain)
      .eq('status', 'approved')
      .order('approved_at', { ascending: false })
      .limit(1)

    const grant = data?.[0] as { expires_at?: string | null } | undefined
    if (!grant) return false
    if (!grant.expires_at) return true
    return new Date(grant.expires_at).getTime() > Date.now()
  }

  private async loadActionDomainGrants(
    supabase: SupabaseClient,
    teamId: string,
  ): Promise<string[]> {
    const { data } = await supabase
      .from('agent_team_grants')
      .select('capability_kind, capability_id')
      .eq('team_id', teamId)
    return (data ?? [])
      .filter((row: any) => row.capability_kind === 'action_domain')
      .map((row: any) => String(row.capability_id))
  }

  private async loadActionDomainOverrides(
    supabase: SupabaseClient,
    agentKey: string,
    mission: Record<string, any>,
  ): Promise<{ allowExtra: string[]; deny: string[] }> {
    let query = supabase
      .from('agent_overrides')
      .select('capability_kind, capability_id, mode')
      .eq('agent_key', agentKey)
      .eq('capability_kind', 'action_domain')
    if (mission.org_id) {
      query = query.eq('org_id', mission.org_id).is('user_id', null)
    } else {
      query = query.eq('user_id', mission.user_id).is('org_id', null)
    }
    const { data } = await query
    const allowExtra: string[] = []
    const deny: string[] = []
    for (const row of data ?? []) {
      const domain = String(row.capability_id)
      if (row.mode === 'allow_extra') allowExtra.push(domain)
      if (row.mode === 'deny') deny.push(domain)
    }
    return { allowExtra, deny }
  }

  private async handleContractPreflightFailure(
    supabase: SupabaseClient,
    mission: Record<string, any>,
    missionId: string,
    subtask: Record<string, any>,
    subtaskId: string,
    assignedAgent: AgentKey,
    outputContract: MissionOutputContract,
    reason: string,
  ): Promise<MissionJobResult> {
    const attempts = Number(subtask.preflight_attempts ?? 0)
    const requiredDomain = CONTRACT_ACTION_DOMAINS[outputContract.required_action]
    if (
      requiredDomain &&
      reason ===
        `Action "${outputContract.required_action}" requires action domain "${requiredDomain}".`
    ) {
      return this.handleMissionAccessApprovalRequired(
        supabase,
        mission,
        missionId,
        subtask,
        subtaskId,
        assignedAgent,
        outputContract,
        requiredDomain,
        reason,
      )
    }

    const nextAttempts = attempts + 1
    const shouldReplan = nextAttempts <= 2
    const verification: MissionContractVerificationResult = {
      ok: false,
      reason,
      expected_action: outputContract.required_action,
      expected_artifact_type: outputContract.required_artifact_type,
      recovery: shouldReplan ? 'vibey_replan' : 'block_user',
    }

    await supabase
      .from('mission_subtasks')
      .update({
        status: 'blocked',
        feedback: `Preflight failed: ${reason}`,
        contract_status: 'preflight_failed',
        contract_verification: verification,
        preflight_attempts: nextAttempts,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subtaskId)
      .eq('mission_id', missionId)

    await this.stateRepo.insertLog(
      supabase,
      mission,
      'mission.subtask.preflight_failed',
      String(mission.status),
      shouldReplan ? String(mission.status) : 'blocked',
      {
        subtask_id: subtaskId,
        subtask_title: subtask.title,
        assigned_agent_key: assignedAgent,
        output_contract: outputContract,
        reason,
        preflight_attempts: nextAttempts,
        recovery: verification.recovery,
      },
      assignedAgent,
    )

    if (shouldReplan) {
      await this.stateRepo.enqueueMissionOutboxEvent(supabase, {
        missionId,
        userId: String(mission.user_id),
        orgId: mission.org_id ?? null,
        eventType: 'mission.subtask.triage.requested',
        dedupeKey: `mission:${missionId}:subtask:${subtaskId}:triage:preflight:${nextAttempts}`,
        requeueExistingDedupeKey: true,
        payload: {
          phase: 'triage',
          subtask_id: subtaskId,
          requested_by: 'preflight_failed',
          preflight: verification,
        },
      })
    } else {
      await this.stateRepo.updateMissionState(supabase, missionId, {
        status: 'blocked',
        current_agent_key: null,
        progress_notes: `No capable path found after ${nextAttempts} preflight attempts: ${reason}`,
      })
    }

    await this.stateRepo.recomputeMissionStatus(supabase, missionId)
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
      output: {
        preflight_failed: true,
        verification,
      },
    }
  }

  private async handleMissionAccessApprovalRequired(
    supabase: SupabaseClient,
    mission: Record<string, any>,
    missionId: string,
    subtask: Record<string, any>,
    subtaskId: string,
    assignedAgent: AgentKey,
    outputContract: MissionOutputContract,
    requiredDomain: MissionPreflightDomain,
    reason: string,
  ): Promise<MissionJobResult> {
    const nowIso = new Date().toISOString()
    const { data: existingRequest } = await supabase
      .from('mission_agent_access_requests')
      .select('*')
      .eq('mission_id', missionId)
      .eq('subtask_id', subtaskId)
      .eq('agent_key', assignedAgent)
      .eq('capability_kind', 'action_domain')
      .eq('capability_id', requiredDomain)
      .in('status', ['pending', 'approved'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let accessRequest = existingRequest as Record<string, any> | null
    if (!accessRequest) {
      const { data, error } = await supabase
        .from('mission_agent_access_requests')
        .insert({
          mission_id: missionId,
          subtask_id: subtaskId,
          user_id: mission.user_id,
          org_id: mission.org_id ?? null,
          agent_key: assignedAgent,
          capability_kind: 'action_domain',
          capability_id: requiredDomain,
          reason,
          status: 'pending',
          requested_by: 'mission_preflight',
          metadata: {
            required_action: outputContract.required_action,
            required_artifact_type: outputContract.required_artifact_type,
            subtask_title: subtask.title,
          },
        })
        .select('*')
        .single()
      if (error) throw new Error(`Failed to create mission access request: ${error.message}`)
      accessRequest = data as Record<string, any>
    }

    if (String(accessRequest.status) === 'approved') {
      await supabase
        .from('mission_subtasks')
        .update({
          status: 'pending',
          feedback: null,
          contract_status: null,
          updated_at: nowIso,
        })
        .eq('id', subtaskId)
        .eq('mission_id', missionId)

      await this.stateRepo.enqueueMissionOutboxEvent(supabase, {
        missionId,
        userId: String(mission.user_id),
        orgId: mission.org_id ?? null,
        eventType: 'mission.subtask.execute.requested',
        dedupeKey: `mission:${missionId}:subtask:${subtaskId}:access-approved:${accessRequest.id}`,
        requeueExistingDedupeKey: true,
        payload: {
          phase: 'execute',
          subtask_id: subtaskId,
          requested_by: 'mission_access_already_approved',
          access_request_id: accessRequest.id,
        },
      })

      return {
        missionId,
        subtaskId,
        success: true,
        status: 'todo' as MissionStatus,
        processedAt: nowIso,
        output: { access_already_approved: true, access_request_id: accessRequest.id },
      }
    }

    const verification: MissionContractVerificationResult = {
      ok: false,
      reason,
      expected_action: outputContract.required_action,
      expected_artifact_type: outputContract.required_artifact_type,
      recovery: 'block_user',
    }

    await supabase
      .from('mission_subtasks')
      .update({
        status: 'awaiting_human',
        awaiting_human_since: nowIso,
        feedback: `Access approval required: ${reason}`,
        contract_status: 'awaiting_access_approval',
        contract_verification: verification,
        updated_at: nowIso,
      })
      .eq('id', subtaskId)
      .eq('mission_id', missionId)

    await this.stateRepo.updateMissionState(supabase, missionId, {
      status: 'awaiting_access_approval',
      current_agent_key: null,
      progress_notes: `${assignedAgent} needs approval for ${requiredDomain} before continuing.`,
    })

    await this.stateRepo.insertLog(
      supabase,
      mission,
      'mission.access_approval.requested',
      String(mission.status),
      'awaiting_access_approval',
      {
        access_request_id: accessRequest.id,
        subtask_id: subtaskId,
        subtask_title: subtask.title,
        assigned_agent_key: assignedAgent,
        capability_kind: 'action_domain',
        capability_id: requiredDomain,
        output_contract: outputContract,
        reason,
      },
      assignedAgent,
    )

    return {
      missionId,
      subtaskId,
      success: true,
      status: 'awaiting_access_approval' as MissionStatus,
      processedAt: nowIso,
      output: {
        access_approval_required: true,
        access_request_id: accessRequest.id,
        capability_kind: 'action_domain',
        capability_id: requiredDomain,
        verification,
      },
    }
  }

  private async handleContractVerificationFailure(
    supabase: SupabaseClient,
    mission: Record<string, any>,
    missionId: string,
    subtask: Record<string, any>,
    subtaskId: string,
    assignedAgent: AgentKey,
    parsedOutput: Record<string, unknown>,
    contractVerification: MissionContractVerificationResult,
    executionState: Record<string, unknown>,
  ): Promise<MissionJobResult> {
    const correctionAttempts = Number(subtask.correction_attempts ?? 0)
    const canCorrect =
      contractVerification.recovery === 'corrective_run' && Number.isFinite(correctionAttempts)
        ? correctionAttempts < 2
        : false
    const feedback = `Contract verification failed: ${
      contractVerification.reason ?? 'required output was not created'
    }`
    const outputContract = normalizeOutputContract(subtask.output_contract)
    const correctedExecutionState =
      canCorrect && outputContract
        ? prepareExecutionStateForContractCorrection(
            executionState,
            outputContract.required_action,
            contractVerification,
          )
        : executionState

    await supabase
      .from('mission_subtasks')
      .update({
        status: canCorrect ? 'pending' : 'blocked',
        output: {
          ...(parsedOutput || {}),
          contract_verification: contractVerification,
        },
        feedback,
        contract_status: 'failed',
        contract_verification: contractVerification,
        correction_attempts: correctionAttempts + 1,
        execution_state: correctedExecutionState,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subtaskId)
      .eq('mission_id', missionId)
      .eq('status', 'in_progress')

    await this.stateRepo.insertLog(
      supabase,
      mission,
      'mission.subtask.contract_verification_failed',
      'in_progress',
      canCorrect ? 'todo' : 'blocked',
      {
        subtask_id: subtaskId,
        subtask_title: subtask.title,
        assigned_agent_key: assignedAgent,
        verification: contractVerification,
        correction_attempt: correctionAttempts + 1,
      },
      assignedAgent,
    )

    if (canCorrect) {
      await this.stateRepo.enqueueMissionOutboxEvent(supabase, {
        missionId,
        userId: String(mission.user_id),
        orgId: mission.org_id ?? null,
        eventType: 'mission.subtask.execute.requested',
        dedupeKey: `mission:${missionId}:subtask:${subtaskId}:contract-correction:${correctionAttempts + 1}`,
        requeueExistingDedupeKey: true,
        payload: {
          phase: 'execute',
          subtask_id: subtaskId,
          requested_by: 'contract_correction',
          contract_verification: contractVerification,
        },
      })
    } else {
      await this.stateRepo.enqueueMissionOutboxEvent(supabase, {
        missionId,
        userId: String(mission.user_id),
        orgId: mission.org_id ?? null,
        eventType: 'mission.subtask.triage.requested',
        dedupeKey: `mission:${missionId}:subtask:${subtaskId}:triage:contract:${Date.now()}`,
        payload: {
          phase: 'triage',
          subtask_id: subtaskId,
          requested_by: 'contract_verification_failed',
          contract_verification: contractVerification,
        },
      })
    }

    await this.stateRepo.updateAgentStatus(supabase, mission.user_id, assignedAgent, 'idle')
    await this.stateRepo.recomputeMissionStatus(supabase, missionId)
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
      output: {
        contract_verification_failed: true,
        correction_enqueued: canCorrect,
        verification: contractVerification,
      },
    }
  }
}
