import { randomUUID } from 'crypto'
import { Injectable, Logger, Optional } from '@nestjs/common'
import {
  buildAgentAccessSummary,
  buildDisabledNativeActions,
  buildEnabledToolkits,
} from '../../agent-policy/agent-access-summary'
import type { ResolvedAgentPolicy } from '../../agent-policy/agent-policy.types'
import { AgentPolicyService } from '../../agent-policy/services/agent-policy.service'
import { AgentRuntimeReadinessService } from '../../agent-sync/services/agent-runtime-readiness.service'
import { AgentRuntimeSkillScopeService } from '../../agent-sync/services/agent-runtime-skill-scope.service'
import {
  CAMPAIGN_CONTEXT_POLICY_ACTIONS,
  PERSONAL_BRAIN_POLICY_ACTIONS,
} from '../../artifacts/services/artifact-access-policy-actions'
import { BrainContextService } from '../../brain/services/brain-context.service'
import {
  OpenClawProxyService,
  type OpenClawInputMessage,
  type TraceRecoveryEvent,
} from '../../chat/services/openclaw-proxy.service'
import { TracingService } from '../../chat/services/tracing.service'
import { AgentRuntimeService } from '../../shared/services/agent-runtime.service'
import { isRetryableAgentFailure } from '../is-retryable-agent-failure'
import { TaskAgentRepository } from '../repositories/task-agent.repository'
import {
  openClawInputToTrace,
  type CancelTaskAgentPayload,
  type InvokePayload,
} from '../task-agent.types'
import { TaskAgentArtifactOutputsService } from './task-agent-artifact-outputs.service'
import { TaskAgentCancelRegistry } from './task-agent-cancel-registry.service'
import { TaskAgentInputService } from './task-agent-input.service'
import { TaskAgentProgressService } from './task-agent-progress.service'
import { TaskAgentRequestContextService } from './task-agent-request-context.service'
import {
  TaskAgentSuggestionsService,
  type PostCallDraft,
  type PostCallDraftPayload,
  type SuggestedTask,
  type SuggestMeetingTitlePayload,
  type SuggestTasksPayload,
} from './task-agent-suggestions.service'

export type {
  PostCallDraft,
  PostCallDraftPayload,
  SuggestedTask,
  SuggestMeetingTitlePayload,
  SuggestTasksPayload,
}

const INVOKE_TIMEOUT_MS = 600_000
const AGENT_COLLABORATION_NATIVE_ACTIONS = ['ask_agent', 'delegate_to_agent', 'brainstorm_agents']

@Injectable()
export class TaskAgentService {
  private readonly logger = new Logger(TaskAgentService.name)
  private readonly inputService: TaskAgentInputService
  private readonly progressService: TaskAgentProgressService
  private readonly artifactOutputs: TaskAgentArtifactOutputsService
  private readonly suggestions: TaskAgentSuggestionsService
  private readonly cancelRegistry: TaskAgentCancelRegistry

  constructor(
    private readonly repository: TaskAgentRepository,
    private readonly openClaw: OpenClawProxyService,
    private readonly agentRuntime: AgentRuntimeService,
    private readonly runtimeReadiness: AgentRuntimeReadinessService,
    private readonly tracing: TracingService,
    private readonly brainContext: BrainContextService,
    private readonly agentPolicy?: AgentPolicyService,
    runtimeSkillScope?: AgentRuntimeSkillScopeService,
    inputService?: TaskAgentInputService,
    progressService?: TaskAgentProgressService,
    artifactOutputs?: TaskAgentArtifactOutputsService,
    suggestions?: TaskAgentSuggestionsService,
    @Optional() cancelRegistry?: TaskAgentCancelRegistry,
    @Optional() private readonly taskScopeContext?: TaskAgentRequestContextService,
  ) {
    this.inputService = inputService ?? new TaskAgentInputService(repository, runtimeSkillScope)
    this.progressService = progressService ?? new TaskAgentProgressService(repository)
    this.artifactOutputs = artifactOutputs ?? new TaskAgentArtifactOutputsService(repository)
    this.cancelRegistry = cancelRegistry ?? new TaskAgentCancelRegistry()
    this.suggestions =
      suggestions ??
      new TaskAgentSuggestionsService(
        repository,
        openClaw,
        agentRuntime,
        runtimeReadiness,
        this.inputService,
        this.brainContext,
      )
  }

  async draftPostCall(payload: PostCallDraftPayload): Promise<{ draft: PostCallDraft }> {
    return this.suggestions.draftPostCall(payload)
  }

  async suggestTasks(payload: SuggestTasksPayload): Promise<{ tasks: SuggestedTask[] }> {
    return this.suggestions.suggestTasks(payload)
  }

  async suggestMeetingTitle(
    payload: SuggestMeetingTitlePayload,
  ): Promise<{ title: string | null }> {
    return this.suggestions.suggestMeetingTitle(payload)
  }
  async cancel(payload: CancelTaskAgentPayload) {
    const result = this.cancelRegistry.cancel(payload.space_id, payload.item_id)
    return { accepted: true, cancelled: result.cancelled, activity_id: result.activityId }
  }
  async invoke(payload: InvokePayload): Promise<void> {
    const { item_id, space_id, agent_key, user_id, org_id, prompt } = payload
    const supabase = this.repository.client
    const { data: item, error: itemErr } = await this.repository.findSpaceItem(item_id, space_id)

    if (itemErr || !item) {
      this.logger.error(`Space item not found: ${item_id} — ${itemErr?.message}`)
      return
    }

    const taskItem = item as Record<string, unknown>
    const { data: space } = await this.repository.findSpace(space_id)

    const spaceRecord = (space as Record<string, unknown> | null) ?? null
    const spaceTitle = String(spaceRecord?.title ?? 'Space')
    const campaignId =
      typeof payload.campaign_id === 'string' && payload.campaign_id.trim().length > 0
        ? payload.campaign_id.trim()
        : typeof spaceRecord?.campaign_id === 'string' && spaceRecord.campaign_id.trim().length > 0
          ? spaceRecord.campaign_id.trim()
          : null

    const { data: activityRows } = await this.repository.listActivityRows(item_id)

    const runtime = await this.agentRuntime.resolveConversationRuntime(
      supabase,
      user_id,
      agent_key,
      org_id,
    )
    const requestedSkillKeys = this.inputService.requestedSkillKeys(payload)
    const resolvedSlashSkills = await this.inputService
      .resolveTaskSlashSkills({
        userId: user_id,
        agentKey: runtime.agentKey,
        keys: requestedSkillKeys,
        orgId: org_id,
      })
      .catch((err) => {
        this.logger.warn(`Task slash skill resolution failed: ${err}`)
        return []
      })
    const requiredSkillFiles = resolvedSlashSkills.flatMap((skill) => skill.requiredSkillFiles)
    await this.runtimeReadiness.ensureRuntimeReady({
      userId: user_id,
      orgId: org_id,
      agentKey: runtime.agentKey,
      gatewayAgentId: runtime.gatewayAgentId,
      requiredSkillFiles,
    })

    const sessionKey = this.agentRuntime.buildChatSessionKey({
      gatewayAgentId: runtime.gatewayAgentId,
      agentKey: runtime.agentKey,
      userId: user_id,
      conversationId: `task-${item_id}`,
      campaignId: campaignId ?? undefined,
      spaceId: space_id,
      orgId: org_id ?? undefined,
      includeScopeSegments: true,
    })

    const policyScope = { orgId: org_id ?? null, userId: org_id ? null : user_id }
    let resolvedPolicy: ResolvedAgentPolicy | null = null
    let hasCampaignAccess = false
    let userBrainAccess = false
    if (this.agentPolicy) {
      try {
        resolvedPolicy = await this.agentPolicy.resolveAgentPolicy(runtime.agentKey, policyScope)
        hasCampaignAccess = resolvedPolicy.effective.has('campaign_context:*')
        userBrainAccess = await this.agentPolicy.canAgentUseCapability(
          runtime.agentKey,
          'brain_access',
          'personal',
          policyScope,
        )
      } catch (err) {
        this.logger.warn(`Task agent policy resolve failed: ${err}`)
      }
    }
    const agentBrainPresence = await this.brainContext
      .resolveAgentBrainPresence(user_id, runtime.agentKey, org_id)
      .catch((err) => {
        this.logger.warn(`Task agent brain presence resolve failed: ${err}`)
        return { hasAgentBrain: false, brainId: null }
      })
    const policyDisabledNativeActions = buildDisabledNativeActions({
      hasUserBrain: userBrainAccess,
      hasCampaignContext: hasCampaignAccess,
      personalBrainActions: PERSONAL_BRAIN_POLICY_ACTIONS,
      campaignContextActions: CAMPAIGN_CONTEXT_POLICY_ACTIONS,
    })
    const collaborationDisabled = payload.agent_collaboration === 'disabled'
    const disabledNativeActions = [
      ...new Set([
        ...policyDisabledNativeActions,
        ...(collaborationDisabled ? AGENT_COLLABORATION_NATIVE_ACTIONS : []),
      ]),
    ]
    const enabledToolkitsForGateway = buildEnabledToolkits(resolvedPolicy)
    const accessSummary =
      (process.env.AGENT_ACCESS_SUMMARY_IN_CONTEXT ?? 'true').toLowerCase() !== 'false'
        ? buildAgentAccessSummary({
            agentKey: runtime.agentKey,
            hasUserBrain: userBrainAccess,
            hasCampaignContext: hasCampaignAccess,
            hasOwnAgentBrain: agentBrainPresence.hasAgentBrain,
            deniedBrainActions: !userBrainAccess ? PERSONAL_BRAIN_POLICY_ACTIONS : undefined,
            deniedCampaignActions: !hasCampaignAccess ? CAMPAIGN_CONTEXT_POLICY_ACTIONS : undefined,
          })
        : ''
    const taskContext = this.inputService.buildTaskContext(taskItem, spaceTitle, payload.include)
    const activityHistory = this.inputService.buildActivityHistory(
      activityRows as Array<Record<string, unknown>> | null,
    )
    const conversationRefsContext = await this.inputService.buildConversationRefsContext(
      payload.conversation_refs ?? [],
      user_id,
      org_id,
    )
    const brainSummary = await this.brainContext
      .buildFullContext(user_id, runtime.agentKey, prompt, org_id, false, userBrainAccess)
      .catch((err) => {
        this.logger.warn(`Task agent brain context failed: ${err}`)
        return ''
      })
    const contextSummary = [accessSummary, brainSummary].filter(Boolean).join('\n\n')

    const gatewayInstructions = [
      `TASK_ID=${item_id}`,
      `SPACE_ID=${space_id}`,
      ...(campaignId ? [`CAMPAIGN_ID=${campaignId}`] : []),
      `You are responding to an @mention in a task's activity feed from the "${spaceTitle}" space.`,
      'You have full visibility of the task details and all prior activity.',
      'Respond conversationally and helpfully. Use your tools when needed.',
      collaborationDisabled
        ? 'Agent-to-agent collaboration is disabled for this automation run. Do not ask, delegate, or brainstorm with other agents.'
        : '',
    ].join('\n')

    const input: OpenClawInputMessage[] = [
      ...(contextSummary
        ? [
            {
              type: 'message' as const,
              role: 'user' as const,
              content: `[CONTEXT]\n${contextSummary}`,
            },
            {
              type: 'message' as const,
              role: 'assistant' as const,
              content: 'Context received.',
            },
          ]
        : []),
      {
        type: 'message',
        role: 'user',
        content: `[TASK CONTEXT]\n${taskContext}`,
      },
      {
        type: 'message',
        role: 'assistant',
        content: 'Task context received.',
      },
    ]

    if (activityHistory) {
      input.push(
        {
          type: 'message',
          role: 'user',
          content: `[ACTIVITY_HISTORY]\nThe following is a transcript of prior activity on this task. Use this to understand the full context.\n\n${activityHistory}`,
        },
        {
          type: 'message',
          role: 'assistant',
          content: 'Activity history received.',
        },
      )
    }

    if (conversationRefsContext) {
      input.push(
        {
          type: 'message',
          role: 'user',
          content: conversationRefsContext,
        },
        {
          type: 'message',
          role: 'assistant',
          content: 'Tagged conversation metadata received.',
        },
      )
    }

    const slashSkillContext = this.inputService.buildSlashSkillContext(resolvedSlashSkills)
    const resolvedSkillKeys = resolvedSlashSkills.map((skill) => skill.key)
    const cleanedPrompt = this.inputService.stripResolvedSlashTokens(prompt, resolvedSkillKeys)
    const effectivePrompt = slashSkillContext
      ? `${slashSkillContext}\n\n${cleanedPrompt || prompt}`
      : prompt

    input.push({
      type: 'message',
      role: 'user',
      content: effectivePrompt,
    })

    let activityId = payload.activity_id ?? null
    if (!activityId) {
      const { data: actRow } = await this.repository.insertActivity({
        item_id,
        space_id,
        user_id,
        org_id,
        event_type: 'agent_task_execution',
        payload: {
          status: 'running',
          agent_key,
          phase: 'thinking',
          content: '',
          content_blocks_ordered: [],
          ...(payload.execution_batch_id ? { execution_batch_id: payload.execution_batch_id } : {}),
          ...(payload.execution_batch_agent_keys?.length
            ? { execution_batch_agent_keys: payload.execution_batch_agent_keys }
            : {}),
        },
      })
      activityId = actRow?.id ?? null
    }

    if (!activityId) {
      this.logger.error(`Failed to create activity row for task ${item_id}`)
      await this.progressService.setItemExecutionStatus(item_id, space_id, 'failed')
      return
    }

    let responseContent = ''
    const progressTracker = this.progressService.createTracker({
      activityId,
      itemId: item_id,
      agentKey: agent_key,
      logger: this.logger,
    })
    const progressSend = progressTracker.send

    const streamStartedAt = Date.now()
    const requestId = randomUUID()
    const traceId = await this.tracing
      .startTrace({
        userId: user_id,
        conversationId: `task-${item_id}`,
        requestId,
        sessionKey,
        userMessage: effectivePrompt,
        systemPrompt: gatewayInstructions,
        historyLength: input.length,
        channel: 'studio',
        agentKey: agent_key,
        orgId: org_id,
        gatewayAgentId: runtime.gatewayAgentId,
      })
      .catch(() => null)
    const recoveryEvents: TraceRecoveryEvent[] = []
    const abortController = new AbortController()
    const timeoutHandle = setTimeout(() => {
      abortController.abort(new Error('Task agent timed out'))
    }, INVOKE_TIMEOUT_MS)
    timeoutHandle.unref?.()
    const unregisterCancel = this.cancelRegistry.register({
      spaceId: space_id,
      itemId: item_id,
      activityId,
      controller: abortController,
    })
    this.taskScopeContext?.setScope({
      itemId: item_id,
      userId: user_id,
      campaignId,
      spaceId: space_id,
      orgId: org_id,
    })
    const isUserCancelled = () => this.cancelRegistry.isCancelled(space_id, item_id, activityId)
    const completeCancelled = async () => {
      const finalContent = responseContent || progressTracker.getResponseContent()
      this.tracing
        .failTrace(traceId, 'cancelled', {
          terminalStatus: 'cancelled',
          userVisibleOutcome: 'cancelled',
          recoveryStatus: 'cancelled',
          recoveryEvents,
          observability: { request_id: requestId, item_id, space_id },
        })
        .catch(() => {})
      await this.progressService.completeActivity(
        activityId,
        agent_key,
        'cancelled',
        finalContent || 'Stopped by user.',
        progressTracker.finalBlocks(),
      )
      await this.progressService.finalizeItemExecution(
        item_id,
        space_id,
        'cancelled',
        this.logger,
        payload.execution_batch_id,
      )
    }

    try {
      let result = await this.openClaw.streamCompletion({
        input,
        instructions: gatewayInstructions,
        send: progressSend,
        agentId: runtime.gatewayAgentId,
        sessionKey,
        conversationId: `task-${item_id}`,
        traceId,
        requestId,
        userId: user_id,
        signal: abortController.signal,
        enabledToolkits: enabledToolkitsForGateway,
        disabledNativeActions,
        strictDisabledNativeActions: collaborationDisabled,
      })

      if (result.failed && isRetryableAgentFailure(result.failed) && !result.content.trim()) {
        const retryReason = result.failed
        this.logger.warn(
          `Task agent retrying: agent=${agent_key} item=${item_id} reason=${result.failed}`,
        )
        responseContent = ''
        progressTracker.resetResponseContent()
        result = await this.openClaw.streamCompletion({
          input,
          instructions: gatewayInstructions,
          send: progressSend,
          agentId: runtime.gatewayAgentId,
          sessionKey: `${sessionKey}::retry`,
          conversationId: `task-${item_id}`,
          traceId,
          requestId,
          userId: user_id,
          signal: abortController.signal,
          enabledToolkits: enabledToolkitsForGateway,
          disabledNativeActions,
          strictDisabledNativeActions: collaborationDisabled,
        })
        recoveryEvents.push({
          type: 'task_empty_failure_retry',
          status: result.failed ? 'failed' : 'recovered',
          reason: retryReason,
          at: new Date().toISOString(),
        })
      }

      responseContent = result.content || progressTracker.getResponseContent() || responseContent

      if (isUserCancelled()) {
        await completeCancelled()
        return
      }

      if (result.failed) {
        this.logger.error(`Task agent ${agent_key} failed: ${result.failed}`)
        this.tracing
          .failTrace(traceId, result.failed, {
            terminalStatus: 'failed',
            userVisibleOutcome: 'blocked',
            recoveryStatus: 'failed_unrecoverable',
            recoveryEvents: [...recoveryEvents, ...(result.recoveryEvents ?? [])],
            observability: { request_id: requestId, item_id, space_id },
          })
          .catch(() => {})
        await this.progressService.completeActivity(
          activityId,
          agent_key,
          'failed',
          responseContent,
          progressTracker.finalBlocks(),
          result.failed,
        )
        await this.progressService.finalizeItemExecution(
          item_id,
          space_id,
          'failed',
          this.logger,
          payload.execution_batch_id,
        )
        return
      }

      if (!responseContent.trim()) {
        this.logger.warn(`Task agent ${agent_key} produced empty response for item ${item_id}`)
        this.tracing
          .failTrace(traceId, 'empty_response', {
            terminalStatus: 'failed',
            userVisibleOutcome: 'blocked',
            recoveryStatus: 'failed_unrecoverable',
            recoveryEvents: [...recoveryEvents, ...(result.recoveryEvents ?? [])],
            observability: { request_id: requestId, item_id, space_id },
          })
          .catch(() => {})
        await this.progressService.completeActivity(
          activityId,
          agent_key,
          'failed',
          '',
          [],
          'Agent produced an empty response',
        )
        await this.progressService.finalizeItemExecution(
          item_id,
          space_id,
          'failed',
          this.logger,
          payload.execution_batch_id,
        )
        return
      }

      const finalBlocks = await this.artifactOutputs.reconcile({
        blocks: progressTracker.finalBlocks(),
        outputBlocks: result.artifactOutputBlocks,
        itemId: item_id,
        spaceId: space_id,
        userId: user_id,
        orgId: org_id,
        campaignId,
        startedAt: streamStartedAt,
      })
      const toolSteps = progressTracker.toolSteps(finalBlocks)
      const durationMs = Date.now() - streamStartedAt

      await this.progressService.completeActivity(
        activityId,
        agent_key,
        'done',
        responseContent,
        finalBlocks,
        undefined,
        toolSteps,
        durationMs,
      )
      await this.progressService.finalizeItemExecution(
        item_id,
        space_id,
        'done',
        this.logger,
        payload.execution_batch_id,
      )

      const allRecoveryEvents = [...recoveryEvents, ...(result.recoveryEvents ?? [])]
      const recovered = allRecoveryEvents.some((event) => event.status === 'recovered')
      this.tracing
        .completeTrace(traceId, {
          response: responseContent.trim(),
          toolSteps,
          usage: result.usage,
          durationMs,
          fullSystemPrompt: result.fullSystemPrompt,
          llmInput: { task_openclaw_request: { input: openClawInputToTrace(input), item_id } },
          llmOutput: result.llmOutput,
          terminalStatus: 'done',
          userVisibleOutcome: recovered ? 'recovered_output' : 'output_visible',
          recoveryStatus: recovered ? 'recovered' : 'none',
          recoveryEvents: allRecoveryEvents,
          observability: { request_id: requestId, item_id, space_id },
        })
        .catch(() => {})

      this.logger.log(`Task agent ${agent_key} completed task ${item_id} in space ${space_id}`)
    } catch (err) {
      if (isUserCancelled()) {
        await completeCancelled()
        return
      }
      const msg = err instanceof Error ? err.message : String(err)
      this.logger.error(`Task agent invocation failed: ${msg}`)
      this.tracing
        .failTrace(traceId, msg, {
          terminalStatus: 'failed',
          userVisibleOutcome: 'blocked',
          recoveryStatus: 'failed_unrecoverable',
          recoveryEvents,
          observability: { request_id: requestId, item_id, space_id },
        })
        .catch(() => {})
      await this.progressService.completeActivity(
        activityId,
        agent_key,
        'failed',
        responseContent,
        progressTracker.finalBlocks(),
        msg,
      )
      await this.progressService.finalizeItemExecution(
        item_id,
        space_id,
        'failed',
        this.logger,
        payload.execution_batch_id,
      )
    } finally {
      this.taskScopeContext?.clearScope(item_id)
      unregisterCancel()
      clearTimeout(timeoutHandle)
    }
  }
}
