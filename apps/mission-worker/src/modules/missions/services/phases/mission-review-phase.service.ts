import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Job } from 'bullmq'
import { DatabaseService } from '../../../../lib/services/database.service'
import type { MissionJobData, MissionJobResult, MissionStatus } from '../../types'
import { AgentSignalService } from '../agent-signal.service'
import { MissionOpenclawGateway } from '../gateways/mission-openclaw.gateway'
import { MissionAgentStateService } from '../persistence/mission-agent-state.service'
import { MissionStateRepository } from '../persistence/mission-state.repository'
import { UserNotificationEmitterService } from '../user-notification-emitter.service'
import { MissionJsonService } from '../utils/mission-json.service'
import { MissionPhaseSupportService } from './mission-phase-support.service'

@Injectable()
export class MissionReviewPhaseService {
  private readonly logger = new Logger(MissionReviewPhaseService.name)

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly stateRepo: MissionStateRepository,
    private readonly openclawGateway: MissionOpenclawGateway,
    private readonly agentSignalService: AgentSignalService,
    private readonly agentStateService: MissionAgentStateService,
    private readonly jsonService: MissionJsonService,
    private readonly support: MissionPhaseSupportService,
    private readonly notificationEmitter: UserNotificationEmitterService,
    private readonly configService: ConfigService,
  ) {}

  async process(job: Job<MissionJobData>): Promise<MissionJobResult> {
    const { missionId } = job.data
    const supabase = this.databaseService.getClient()
    const mission = await this.stateRepo.getMission(
      supabase,
      missionId,
      job.data.userId,
      job.data.orgId ?? null,
    )
    if (mission.status !== 'review') {
      this.logger.warn(
        `Skipping stale review job for mission ${missionId}: current status is ${mission.status}`,
      )
      return {
        missionId,
        success: true,
        status: mission.status as MissionStatus,
        processedAt: new Date().toISOString(),
        output: { skipped_review: true, reason: 'mission_not_in_review' },
      }
    }
    const executionTimeoutMs = this.support.getTimeoutMs()
    const mgr = await this.stateRepo.resolveManagerKey(
      supabase,
      mission.user_id,
      mission.org_id ?? null,
    )

    const { data: subtasks } = await supabase
      .from('mission_subtasks')
      .select('*')
      .eq('mission_id', missionId)
      .order('sort_order', { ascending: true })

    const activeSubtasks = (subtasks || []).filter((st) => String(st.status) !== 'cancelled')
    const hasSubtasks = activeSubtasks.length > 0

    try {
      await this.stateRepo.updateAgentStatus(
        supabase,
        mission.user_id,
        mgr,
        'working',
        mission.org_id ?? null,
      )
      await this.stateRepo.insertLog(
        supabase,
        mission,
        'mission.progress',
        'review',
        'review',
        {
          note: hasSubtasks
            ? `Reviewing ${activeSubtasks.length} subtask deliverables...`
            : 'Reviewing the deliverable now...',
        },
        mgr,
      )

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

      let reviewResult: Record<string, unknown>

      if (hasSubtasks) {
        const incompleteSubtasks = activeSubtasks.filter((st) => String(st.status) !== 'done')
        if (incompleteSubtasks.length > 0) {
          const hasInProgress = incompleteSubtasks.some((st) => String(st.status) === 'in_progress')
          const resumeStatus: MissionStatus = hasInProgress ? 'in_progress' : 'todo'
          await this.stateRepo.updateMissionState(supabase, missionId, {
            status: resumeStatus,
            current_agent_key: null,
            progress_notes: `Waiting for ${incompleteSubtasks.length} subtask(s) to finish before review`,
          })
          await this.stateRepo.insertLog(
            supabase,
            mission,
            'mission.progress',
            'review',
            resumeStatus,
            {
              note: `Review deferred: ${incompleteSubtasks.length} subtask(s) are not done yet.`,
            },
            mgr,
          )
          if (resumeStatus === 'todo') {
            await this.stateRepo.enqueueReadySubtaskEvents(
              supabase,
              missionId,
              String(mission.user_id),
              mission.org_id ?? null,
              {
                reason: 'review_deferred_subtasks_not_done',
              },
            )
          }
          await this.stateRepo.updateAgentStatus(
            supabase,
            mission.user_id,
            mgr,
            'idle',
            mission.org_id ?? null,
          )
          return {
            missionId,
            success: true,
            status: resumeStatus,
            processedAt: new Date().toISOString(),
            output: {
              reason: 'subtasks_not_done',
              incomplete_subtask_count: incompleteSubtasks.length,
            },
          }
        }

        const unverifiedContractSubtasks = activeSubtasks.filter(
          (st) => st.output_contract && String(st.contract_status || '') !== 'verified',
        )
        if (unverifiedContractSubtasks.length > 0) {
          const note = `${unverifiedContractSubtasks.length} subtask(s) have unverified output contracts; review cannot approve missing or unchecked artifacts.`
          await this.stateRepo.updateMissionState(supabase, missionId, {
            status: 'blocked',
            current_agent_key: mgr,
            progress_notes: note,
          })
          await this.stateRepo.insertLog(
            supabase,
            mission,
            'mission.review.contracts_unverified',
            'review',
            'blocked',
            {
              note,
              subtask_ids: unverifiedContractSubtasks.map((st) => st.id),
            },
            mgr,
          )
          await this.stateRepo.updateAgentStatus(
            supabase,
            mission.user_id,
            mgr,
            'idle',
            mission.org_id ?? null,
          )
          return {
            missionId,
            success: true,
            status: 'blocked',
            processedAt: new Date().toISOString(),
            output: {
              reason: 'contracts_unverified',
              subtask_count: unverifiedContractSubtasks.length,
            },
          }
        }

        reviewResult = await this.support.withTimeout(
          this.openclawGateway.callOpenClawForSubtaskReview(
            mission,
            plan,
            activeSubtasks,
            mgr,
            userComments,
          ),
          executionTimeoutMs,
          `Review phase timed out after ${Math.floor(executionTimeoutMs / 1000)}s`,
        )

        const replanTriggered = await this.tryApplyReplan(
          reviewResult,
          missionId,
          String(mission.user_id),
          mission.org_id ?? null,
        )
        if (replanTriggered) {
          await this.stateRepo.updateAgentStatus(
            supabase,
            mission.user_id,
            mgr,
            'idle',
            mission.org_id ?? null,
          )
          return {
            missionId,
            success: true,
            status: 'planning' as MissionStatus,
            processedAt: new Date().toISOString(),
            output: {
              reason: 'full_replan_requested',
              replanReason: reviewResult.replanReason || null,
            },
          }
        }

        const reviewValidation = this.jsonService.validateSubtaskReviewPayload(
          activeSubtasks,
          (reviewResult.subtaskReviews || []) as unknown[],
        )
        if (!reviewValidation.valid) {
          const MAX_INVALID_REVIEW_RETRIES = 2
          const rawIn = mission.input
          const prevInput =
            rawIn && typeof rawIn === 'object' && !Array.isArray(rawIn)
              ? (rawIn as Record<string, unknown>)
              : {}
          const prevRetries = Number(prevInput._invalid_review_payload_retries || 0)
          const nextRetries = prevRetries + 1

          await supabase
            .from('missions')
            .update({
              input: { ...prevInput, _invalid_review_payload_retries: nextRetries },
              updated_at: new Date().toISOString(),
            })
            .eq('id', missionId)

          if (nextRetries > MAX_INVALID_REVIEW_RETRIES) {
            const blockedMsg = `Manager review response was invalid after ${nextRetries} attempts (${reviewValidation.reason}). Comment on the mission to continue.`
            await this.stateRepo.updateMissionState(supabase, missionId, {
              status: 'blocked',
              current_agent_key: mgr,
              progress_notes: blockedMsg,
            })
            await this.stateRepo.insertLog(
              supabase,
              mission,
              'mission.progress',
              'review',
              'blocked',
              { note: blockedMsg },
              mgr,
            )
            await this.notificationEmitter.emitBlocked(mission, blockedMsg, mgr)
            await this.stateRepo.updateAgentStatus(
              supabase,
              mission.user_id,
              mgr,
              'idle',
              mission.org_id ?? null,
            )
            return {
              missionId,
              success: true,
              status: 'blocked',
              processedAt: new Date().toISOString(),
              output: {
                reason: 'invalid_subtask_review_payload_exhausted',
                details: reviewValidation.reason,
              },
            }
          }

          await this.stateRepo.insertLog(
            supabase,
            mission,
            'mission.progress',
            'review',
            'review',
            {
              note: `Review payload invalid: ${reviewValidation.reason}. Scheduling retry (${nextRetries}/${MAX_INVALID_REVIEW_RETRIES}).`,
            },
            mgr,
          )
          await this.stateRepo.enqueueMissionOutboxEvent(supabase, {
            missionId,
            userId: String(mission.user_id),
            orgId: mission.org_id ?? null,
            eventType: 'mission.review.requested',
            dedupeKey: `mission:${missionId}:review:invalid-payload:${nextRetries}`,
            requeueExistingDedupeKey: true,
            payload: {
              requested_by: 'invalid_subtask_review_payload_retry',
              attempt: nextRetries,
              phase: 'review',
            },
          })
          await this.stateRepo.updateAgentStatus(
            supabase,
            mission.user_id,
            mgr,
            'idle',
            mission.org_id ?? null,
          )
          return {
            missionId,
            success: true,
            status: 'review',
            processedAt: new Date().toISOString(),
            output: {
              reason: 'invalid_subtask_review_payload',
              details: reviewValidation.reason,
              retry_scheduled: true,
            },
          }
        }

        await this.applyIncrementalScopeChanges(
          reviewResult,
          missionId,
          String(mission.user_id),
          mission.org_id ?? null,
        )

        const subtaskReviews = reviewValidation.reviews
        let anyRejected = false

        for (const review of subtaskReviews) {
          const st = activeSubtasks.find((s) => (s.id as string) === review.subtaskId)
          if (!st) continue

          if (review.approved) {
            await this.stateRepo.insertLog(
              supabase,
              mission,
              'subtask.review',
              'review',
              'review',
              {
                note: `Approved subtask "${st.title}"${review.feedback ? `: ${review.feedback}` : ''}`,
                subtask_id: review.subtaskId,
              },
              mgr,
            )
          } else {
            anyRejected = true
            const updates: Record<string, unknown> = {
              status: 'pending',
              feedback: review.feedback || 'Needs revision',
              updated_at: new Date().toISOString(),
            }
            if (review.reassignTo) updates.assigned_agent_key = review.reassignTo
            await supabase
              .from('mission_subtasks')
              .update(updates)
              .eq('id', review.subtaskId)
              .eq('status', 'done')

            await this.stateRepo.insertLog(
              supabase,
              mission,
              'subtask.review',
              'review',
              'todo',
              {
                note: `Rejected subtask "${st.title}": ${review.feedback || 'Needs revision'}`,
                subtask_id: review.subtaskId,
                reassigned_to: review.reassignTo || null,
              },
              mgr,
            )
          }
        }

        if (anyRejected) {
          await this.agentSignalService
            .emitSignal(
              String(mission.user_id),
              'mission_review_rejected',
              1.4,
              { mission_id: String(mission.id) },
              mission.campaign_id ? String(mission.campaign_id) : undefined,
              mission.org_id ?? null,
            )
            .catch(() => {})
          await this.stateRepo.updateMissionState(supabase, missionId, {
            status: 'todo',
            current_agent_key: null,
            progress_notes: 'Some subtasks need revision',
          })
          await this.agentStateService.patchAgentState(
            mission.user_id,
            mgr,
            'replace_line',
            {
              find: `Delegated "${mission.title}"`,
              replace: `- [${new Date().toISOString().split('T')[0]}] 🔄 "${mission.title}" — some subtasks sent back for revision (mission:${missionId})`,
            },
            mission.org_id ?? null,
          )
          await this.stateRepo.enqueueReadySubtaskEvents(
            supabase,
            missionId,
            String(mission.user_id),
            mission.org_id ?? null,
            {
              reason: 'review_rejected_subtasks',
            },
          )
          await this.stateRepo.updateAgentStatus(
            supabase,
            mission.user_id,
            mgr,
            'idle',
            mission.org_id ?? null,
          )

          return {
            missionId,
            success: true,
            status: 'todo',
            processedAt: new Date().toISOString(),
            output: reviewResult,
          }
        }

        const { data: freshSubtasks } = await supabase
          .from('mission_subtasks')
          .select('id, status')
          .eq('mission_id', missionId)
          .not('status', 'eq', 'cancelled')
        const pendingOrRunning = (freshSubtasks || []).filter(
          (st) => st.status === 'pending' || st.status === 'in_progress',
        )
        if (pendingOrRunning.length > 0) {
          const hasInProgress = pendingOrRunning.some((st) => st.status === 'in_progress')
          const resumeStatus: MissionStatus = hasInProgress ? 'in_progress' : 'todo'
          await this.stateRepo.updateMissionState(supabase, missionId, {
            status: resumeStatus,
            current_agent_key: null,
            progress_notes: `${pendingOrRunning.length} subtask(s) still need execution`,
          })
          await this.stateRepo.enqueueReadySubtaskEvents(
            supabase,
            missionId,
            String(mission.user_id),
            mission.org_id ?? null,
            { reason: 'review_found_unexecuted_subtasks' },
          )
          await this.stateRepo.updateAgentStatus(
            supabase,
            mission.user_id,
            mgr,
            'idle',
            mission.org_id ?? null,
          )
          return {
            missionId,
            success: true,
            status: resumeStatus,
            processedAt: new Date().toISOString(),
            output: {
              reason: 'new_subtasks_added_during_review',
              pending_count: pendingOrRunning.length,
            },
          }
        }

        let qualityEvalResult: Record<string, unknown> | null = null
        try {
          qualityEvalResult = await this.support.withTimeout(
            this.openclawGateway.callOpenClawForQualityEval(mission, activeSubtasks, plan),
            executionTimeoutMs,
            `Quality eval timed out after ${Math.floor(executionTimeoutMs / 1000)}s`,
          )
        } catch (err) {
          this.logger.warn(`Quality eval failed, falling back to manager scores: ${String(err)}`)
        }

        const evalQualityScore = qualityEvalResult
          ? Number(qualityEvalResult.qualityScore || reviewResult.qualityScore || 5)
          : Number(reviewResult.qualityScore || 5)
        const evalDimScores =
          qualityEvalResult?.dimensionScores &&
          typeof qualityEvalResult.dimensionScores === 'object'
            ? (qualityEvalResult.dimensionScores as Record<string, number>)
            : undefined

        const EVAL_REVISION_THRESHOLD = 5
        const rawIn = mission.input
        const prevInput =
          rawIn && typeof rawIn === 'object' && !Array.isArray(rawIn)
            ? (rawIn as Record<string, unknown>)
            : {}
        const alreadyDidEvalRevision = !!prevInput._eval_revision_applied

        const revisionGuidance = Array.isArray(qualityEvalResult?.revisionGuidance)
          ? (qualityEvalResult.revisionGuidance as Array<Record<string, unknown>>)
          : []
        const highPriorityRevisions = revisionGuidance.filter(
          (r) => r.priority === 'high' && Number(r.score || 10) < EVAL_REVISION_THRESHOLD,
        )

        if (
          !alreadyDidEvalRevision &&
          qualityEvalResult &&
          highPriorityRevisions.length > 0 &&
          evalQualityScore < EVAL_REVISION_THRESHOLD
        ) {
          const feedbackLines = highPriorityRevisions.map(
            (r) =>
              `[${r.dimension}] Score ${r.score}/10 — ${r.issue}\nGuidance: ${r.revision_guidance}\nExpected impact: ${r.expected_impact}`,
          )
          const structuredFeedback = `Quality evaluation found critical issues:\n\n${feedbackLines.join('\n\n')}`

          for (const st of activeSubtasks) {
            await supabase
              .from('mission_subtasks')
              .update({
                status: 'pending',
                feedback: structuredFeedback,
                updated_at: new Date().toISOString(),
              })
              .eq('id', st.id)
              .eq('status', 'done')
          }

          await supabase
            .from('missions')
            .update({
              input: { ...prevInput, _eval_revision_applied: true },
              updated_at: new Date().toISOString(),
            })
            .eq('id', missionId)

          await this.stateRepo.updateMissionState(supabase, missionId, {
            status: 'todo',
            current_agent_key: null,
            progress_notes: `Quality eval triggered targeted revision (score ${evalQualityScore}/10)`,
          })
          await this.stateRepo.insertLog(
            supabase,
            mission,
            'mission.progress',
            'review',
            'todo',
            {
              note: `Quality eval score ${evalQualityScore}/10 below threshold. Sending back for targeted revision.`,
              quality_eval: qualityEvalResult,
            },
            mgr,
          )
          await this.stateRepo.enqueueReadySubtaskEvents(
            supabase,
            missionId,
            String(mission.user_id),
            mission.org_id ?? null,
            { reason: 'quality_eval_revision' },
          )
          await this.stateRepo.updateAgentStatus(
            supabase,
            mission.user_id,
            mgr,
            'idle',
            mission.org_id ?? null,
          )

          return {
            missionId,
            success: true,
            status: 'todo',
            processedAt: new Date().toISOString(),
            output: {
              reason: 'quality_eval_revision',
              evalQualityScore,
              highPriorityRevisions,
            },
          }
        }

        await this.stateRepo.updateMissionState(supabase, missionId, {
          status: 'done',
          current_agent_key: mgr,
          progress_notes: 'All subtasks approved',
        })
        await this.agentStateService.patchAgentState(
          mission.user_id,
          mgr,
          'replace_line',
          {
            find: `Delegated "${mission.title}"`,
            replace: `- [${new Date().toISOString().split('T')[0]}] ✅ "${mission.title}" — all subtasks approved (mission:${missionId})`,
          },
          mission.org_id ?? null,
        )
        await this.stateRepo.insertLog(
          supabase,
          mission,
          'mission.progress',
          'review',
          'done',
          {
            note: `All subtasks approved. Quality: ${evalQualityScore}/10${qualityEvalResult ? ' (independent eval)' : ''}`,
            quality_eval: qualityEvalResult || undefined,
          },
          mgr,
        )

        const subtaskDimScores =
          evalDimScores ||
          (reviewResult.dimensionScores && typeof reviewResult.dimensionScores === 'object'
            ? (reviewResult.dimensionScores as Record<string, number>)
            : undefined)
        const subtaskAgentKeys = [
          ...new Set(
            activeSubtasks.map((st) => String(st.assigned_agent_key || '')).filter(Boolean),
          ),
        ]
        for (const agentKey of subtaskAgentKeys) {
          const agentSubtasks = activeSubtasks.filter(
            (st) => String(st.assigned_agent_key) === agentKey,
          )
          const revisions = agentSubtasks.reduce((sum, st) => sum + (st.feedback ? 1 : 0), 0)
          await this.scoreAgentAfterMission(
            supabase,
            mission.user_id,
            agentKey,
            evalQualityScore,
            revisions,
            mission.org_id ?? null,
            subtaskDimScores,
          ).catch((err) => this.logger.warn(`Failed to score agent ${agentKey}: ${String(err)}`))
        }

        if (qualityEvalResult) {
          await supabase
            .from('evaluation_drift')
            .insert({
              user_id: mission.user_id,
              org_id: mission.org_id ?? null,
              mission_id: missionId,
              agent_key: String(mission.assigned_agent_key || 'vibey'),
              model_quality_score: evalQualityScore,
              model_dimension_scores: evalDimScores || null,
              quality_eval_payload: qualityEvalResult,
            })
            .then(({ error }) => {
              if (error) this.logger.warn(`Failed to insert evaluation_drift: ${error.message}`)
            })
        }

        await this.stateRepo.updateAgentStatus(
          supabase,
          mission.user_id,
          mgr,
          'idle',
          mission.org_id ?? null,
        )
        await this.maybeEmitDeliverableCreatedSignal(supabase, mission)
        await this.maybeEmitAllAssignedWorkDone(
          supabase,
          String(mission.user_id),
          mission.campaign_id ? String(mission.campaign_id) : null,
          mission.org_id ?? null,
        )

        return {
          missionId,
          success: true,
          status: 'done',
          processedAt: new Date().toISOString(),
          output: reviewResult,
        }
      }

      reviewResult = await this.support.withTimeout(
        this.openclawGateway.callOpenClawForReview(mission, plan, mgr),
        executionTimeoutMs,
        `Review phase timed out after ${Math.floor(executionTimeoutMs / 1000)}s`,
      )

      const legacyReplanTriggered = await this.tryApplyReplan(
        reviewResult,
        missionId,
        String(mission.user_id),
        mission.org_id ?? null,
      )
      if (legacyReplanTriggered) {
        await this.stateRepo.updateAgentStatus(
          supabase,
          mission.user_id,
          mgr,
          'idle',
          mission.org_id ?? null,
        )
        return {
          missionId,
          success: true,
          status: 'planning' as MissionStatus,
          processedAt: new Date().toISOString(),
          output: {
            reason: 'full_replan_requested',
            replanReason: reviewResult.replanReason || null,
          },
        }
      }

      const isBlocked = reviewResult.blocked === true
      const approved = !isBlocked && reviewResult.approved !== false
      const feedback = String(reviewResult.feedback || '')
      const qualityNote = reviewResult.qualityScore
        ? ` Quality: ${reviewResult.qualityScore}/10.`
        : ''
      let finalStatus: MissionStatus

      if (!isBlocked) {
        await this.applyIncrementalScopeChanges(
          reviewResult,
          missionId,
          String(mission.user_id),
          mission.org_id ?? null,
        )
      }

      if (isBlocked) {
        finalStatus = 'blocked'
        await this.stateRepo.updateMissionState(supabase, missionId, {
          status: 'blocked',
          current_agent_key: mgr,
          progress_notes: feedback || 'Blocked — requires user input',
        })
        await this.stateRepo.insertLog(
          supabase,
          mission,
          'mission.progress',
          'review',
          'blocked',
          {
            note: `Blocked: ${feedback || 'Requires user input'}`,
          },
          mgr,
        )
        await this.notificationEmitter.emitBlocked(
          mission,
          feedback || 'Blocked — requires your input',
          mgr,
        )
      } else if (approved) {
        finalStatus = 'done'
        await this.stateRepo.updateMissionState(supabase, missionId, {
          status: 'done',
          current_agent_key: mgr,
          progress_notes: feedback || 'Approved',
        })
        await this.stateRepo.insertLog(
          supabase,
          mission,
          'mission.progress',
          'review',
          'done',
          {
            note: `Approved.${qualityNote} ${feedback}`.trim(),
          },
          mgr,
        )

        const legacyDimScores =
          reviewResult.dimensionScores && typeof reviewResult.dimensionScores === 'object'
            ? (reviewResult.dimensionScores as Record<string, number>)
            : undefined
        await this.scoreAgentAfterMission(
          supabase,
          mission.user_id,
          String(mission.assigned_agent_key || 'vibey'),
          Number(reviewResult.qualityScore || 5),
          Number(mission.retry_count || 0),
          mission.org_id ?? null,
          legacyDimScores,
        ).catch((err) => this.logger.warn(`Failed to score agent: ${String(err)}`))

        await this.agentStateService.patchAgentState(
          mission.user_id,
          mgr,
          'replace_line',
          {
            find: `Delegated "${mission.title}"`,
            replace: `- [${new Date().toISOString().split('T')[0]}] ✅ "${mission.title}" approved (mission:${missionId})`,
          },
          mission.org_id ?? null,
        )
        await this.maybeEmitDeliverableCreatedSignal(supabase, mission)
      } else {
        finalStatus = 'todo'
        await this.stateRepo.updateMissionState(supabase, missionId, {
          status: 'todo',
          current_agent_key: null,
          progress_notes: `Revision requested: ${feedback || 'Needs improvement'}`,
        })
        await this.stateRepo.insertLog(
          supabase,
          mission,
          'mission.progress',
          'review',
          'todo',
          {
            note: `Sending back for revision.${qualityNote} ${feedback}`.trim(),
          },
          mgr,
        )
        await this.stateRepo.enqueueMissionOutboxEvent(supabase, {
          missionId,
          userId: String(mission.user_id),
          orgId: mission.org_id ?? null,
          eventType: 'mission.execute.requested',
          dedupeKey: `mission:${missionId}:execute:review-revision`,
          requeueExistingDedupeKey: true,
          payload: {
            phase: 'execute',
            requested_by: 'review_revision',
          },
        })

        await this.agentStateService.patchAgentState(
          mission.user_id,
          mgr,
          'replace_line',
          {
            find: `Delegated "${mission.title}"`,
            replace: `- [${new Date().toISOString().split('T')[0]}] 🔄 "${mission.title}" sent back for revision (mission:${missionId})`,
          },
          mission.org_id ?? null,
        )
      }

      await this.stateRepo.updateAgentStatus(
        supabase,
        mission.user_id,
        mgr,
        'idle',
        mission.org_id ?? null,
      )
      if (finalStatus === 'done') {
        await this.maybeEmitAllAssignedWorkDone(
          supabase,
          String(mission.user_id),
          mission.campaign_id ? String(mission.campaign_id) : null,
          mission.org_id ?? null,
        )
      }

      return {
        missionId,
        success: true,
        status: finalStatus,
        processedAt: new Date().toISOString(),
        output: reviewResult,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown review phase error'
      await this.support.handlePhaseError(supabase, mission, mgr, errorMessage, job)
      throw error
    }
  }

  private isScopeAmendEnabled(): boolean {
    return !!this.configService.get<boolean>('missions.managerScopeAmendEnabled')
  }

  private async callInternalRoute(path: string, body: Record<string, unknown>): Promise<boolean> {
    const callbackUrl = this.configService.get<string>('missionApi.callbackUrl') || ''
    const internalToken = this.configService.get<string>('missionApi.internalToken') || ''
    const baseUrl = callbackUrl.replace('/api/internal/missions/callback', '')
    const url = `${baseUrl}/api/internal/missions/${path}`
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
        this.logger.error(`Internal route ${path} failed (${res.status}): ${text}`)
        return false
      }
      return true
    } catch (error) {
      this.logger.error(`Internal route ${path} error: ${(error as Error).message}`)
      return false
    }
  }

  private async tryApplyReplan(
    reviewResult: Record<string, unknown>,
    missionId: string,
    userId: string,
    orgId?: string | null,
  ): Promise<boolean> {
    if (!this.isScopeAmendEnabled()) return false
    if (reviewResult.fullReplan !== true) return false

    const reason =
      typeof reviewResult.replanReason === 'string' ? reviewResult.replanReason : undefined
    const ok = await this.callInternalRoute('manager/prepare-replan', {
      mission_id: missionId,
      user_id: userId,
      org_id: orgId ?? null,
      reason,
      idempotency_key: `scope:${missionId}:${Date.now()}:replan`,
    })
    if (!ok) {
      throw new Error(`Failed to prepare replan for mission ${missionId}`)
    }
    return true
  }

  private async applyIncrementalScopeChanges(
    reviewResult: Record<string, unknown>,
    missionId: string,
    userId: string,
    orgId?: string | null,
  ): Promise<void> {
    if (!this.isScopeAmendEnabled()) return

    const idempotencyBase = `scope:${missionId}:${Date.now()}`

    const missionUpdates = this.jsonService.validateMissionUpdates(reviewResult.missionUpdates)
    if (missionUpdates) {
      await this.callInternalRoute('manager/mission-fields', {
        mission_id: missionId,
        user_id: userId,
        org_id: orgId ?? null,
        ...missionUpdates,
        idempotency_key: `${idempotencyBase}:amend`,
      })
    }

    if (Array.isArray(reviewResult.addSubtasks) && reviewResult.addSubtasks.length > 0) {
      const validation = this.jsonService.validateAddSubtasks(reviewResult.addSubtasks)
      if (validation.valid) {
        await this.callInternalRoute('manager/append-subtasks', {
          mission_id: missionId,
          user_id: userId,
          org_id: orgId ?? null,
          subtasks: validation.subtasks,
          idempotency_key: `${idempotencyBase}:append`,
        })
      } else {
        this.logger.warn(`addSubtasks validation failed: ${validation.reason}`)
      }
    }
  }

  private async scoreAgentAfterMission(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    qualityScore: number,
    revisionCount: number,
    orgId?: string | null,
    dimensionScores?: Record<string, number>,
  ) {
    let fetchQuery = supabase
      .from('agents_registry')
      .select('stats')
      .eq('user_id', userId)
      .eq('agent_key', agentKey)
    if (orgId !== undefined)
      fetchQuery = orgId ? fetchQuery.eq('org_id', orgId) : fetchQuery.is('org_id', null)
    const { data: agent } = await fetchQuery.maybeSingle()

    if (!agent) return

    const current = (agent.stats || {}) as Record<string, number>
    const scored = Math.max(0, current.missions_scored || 0)
    const weight = Math.min(scored, 9) / 10

    const lerp = (prev: number, next: number) =>
      scored === 0 ? next : Math.round((prev * weight + next * (1 - weight)) * 10) / 10

    const clamp = (v: number) => Math.min(10, Math.max(0, v))
    const ds = dimensionScores || {}

    const quality = clamp(qualityScore)
    const reliability = clamp(10 - revisionCount * 2.5)
    const intentAlignment = clamp(ds.intent_alignment ?? quality)
    const craft = clamp(ds.craft ?? quality)
    const originality = clamp(ds.originality ?? quality)
    const brandCoherence = clamp(ds.brand_coherence ?? quality)
    const completeness = clamp(ds.completeness ?? quality)
    const learningRate = clamp(Math.min(10, 3 + (scored + 1) * 0.4))
    const executionSpeed = current.execution_speed || 5

    const next = {
      execution_speed: lerp(current.execution_speed || 5, executionSpeed),
      quality: lerp(current.quality || 0, quality),
      reliability: lerp(current.reliability || 0, reliability),
      intent_alignment: lerp(current.intent_alignment || 0, intentAlignment),
      craft: lerp(current.craft || 0, craft),
      originality: lerp(current.originality || 0, originality),
      brand_coherence: lerp(current.brand_coherence || 0, brandCoherence),
      completeness: lerp(current.completeness || 0, completeness),
      learning_rate: lerp(current.learning_rate || 0, learningRate),
      missions_scored: scored + 1,
      last_scored_at: new Date().toISOString(),
    }
    const overall =
      Math.round(
        ((next.quality +
          next.reliability +
          next.intent_alignment +
          next.craft +
          next.originality +
          next.brand_coherence +
          next.completeness) /
          7) *
          10,
      ) / 10

    let updateQuery = supabase
      .from('agents_registry')
      .update({ stats: { ...next, overall } })
      .eq('user_id', userId)
      .eq('agent_key', agentKey)
    if (orgId !== undefined)
      updateQuery = orgId ? updateQuery.eq('org_id', orgId) : updateQuery.is('org_id', null)
    await updateQuery
  }

  private async maybeEmitDeliverableCreatedSignal(
    supabase: SupabaseClient,
    mission: Record<string, any>,
  ): Promise<void> {
    const { count, error } = await supabase
      .from('mission_deliverables')
      .select('id', { count: 'exact', head: true })
      .eq('mission_id', mission.id)
    if (error || !count || count < 1) return
    await this.agentSignalService
      .emitSignal(
        String(mission.user_id),
        'mission_deliverable_created',
        0.2,
        { mission_id: String(mission.id) },
        mission.campaign_id ? String(mission.campaign_id) : undefined,
        mission.org_id ?? null,
      )
      .catch(() => {})
  }

  private async maybeEmitAllAssignedWorkDone(
    supabase: SupabaseClient,
    userId: string,
    campaignId: string | null,
    orgId?: string | null,
  ): Promise<void> {
    if (!campaignId) return

    const { data: missions, error: missionsError } = await supabase
      .from('missions')
      .select('status')
      .eq('user_id', userId)
      .eq('campaign_id', campaignId)
      .not('status', 'in', '("archived","cancelled")')
    if (missionsError) return

    if (!missions || missions.length === 0) return
    const allDone = missions.every((row: any) => String(row.status) === 'done')
    if (!allDone) return

    const cooldownCutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const { data: recentSignal } = await supabase
      .from('agent_signals')
      .select('id')
      .eq('user_id', userId)
      .eq('campaign_id', campaignId)
      .eq('signal_type', 'all_assigned_work_done')
      .gte('created_at', cooldownCutoff)
      .limit(1)
    if (recentSignal && recentSignal.length > 0) return

    await this.agentSignalService
      .emitSignal(userId, 'all_assigned_work_done', 1.6, {}, campaignId, orgId)
      .catch(() => {})
  }
}
