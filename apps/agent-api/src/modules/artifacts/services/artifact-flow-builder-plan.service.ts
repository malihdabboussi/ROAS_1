import { Injectable } from '@nestjs/common'
import { evaluateFlowBuild, type FlowBuildPlan } from '@vibey/api-shared/types/flow-builder'
import { ArtifactFlowBuilderRepository } from '../repositories/artifact-flow-builder.repository'
import {
  normalizePlanStatus,
  planFromData,
  planToCandidate,
  validatePlanShape,
} from './artifact-flow-builder-plan.util'
import {
  isPlaceholderFlowDraftName,
  planHasExecutableSteps,
  resolveFlowDraftNameFromPlan,
} from '@vibey/api-shared/types/flow-builder'
import { ArtifactFlowBuilderSessionService } from './artifact-flow-builder-session.service'
import { objectValue, stringValue, type JsonRecord } from './artifact-flow-builder-values'

function isFlowDraftPlaceholderRow(flow: JsonRecord): boolean {
  const trigger = objectValue(flow.trigger)
  const actions = Array.isArray(flow.actions) ? flow.actions : []
  if (stringValue(trigger.type) === 'choose_action') return true
  if (actions.length === 0) return true
  return actions.every((row) => {
    const action = objectValue(row)
    return stringValue(action.type) === 'choose_action'
  })
}

@Injectable()
export class ArtifactFlowBuilderPlanService {
  constructor(
    private readonly repository: ArtifactFlowBuilderRepository = new ArtifactFlowBuilderRepository(),
    private readonly sessionService: ArtifactFlowBuilderSessionService = new ArtifactFlowBuilderSessionService(
      repository,
    ),
  ) {}

  async createPlan(target: Record<string, any>, data: JsonRecord, sessionKey?: string) {
    const userId = this.sessionService.resolveUserId(target, sessionKey)
    const spaceId = stringValue(data.space_id)
    const intent = stringValue(data.intent)
    if (!spaceId || !intent) return { success: false, error: 'space_id and intent are required' }
    const supabase = await this.sessionService.getUserClient(target, userId, sessionKey)
    const space = await this.sessionService.getSpace(supabase, spaceId)
    const plan = planFromData(data, intent)
    const targetAutomationId = stringValue(plan.target_automation_id)
    if (targetAutomationId) {
      const targetFlow = await this.sessionService.getFlowRow(supabase, spaceId, targetAutomationId)
      if (!targetFlow) return { success: false, error: 'Target flow not found in Space' }
    }
    const reusableSession = await this.sessionService.getReusablePlaceholderSession(
      target,
      supabase,
      spaceId,
      sessionKey,
    )
    if (reusableSession) {
      plan.id = String(reusableSession.id)
      const reusablePlan = objectValue(reusableSession.plan) as unknown as FlowBuildPlan
      if (!plan.target_automation_id && reusablePlan.target_automation_id) {
        plan.target_automation_id = reusablePlan.target_automation_id
      }
      const stored = await this.sessionService.persistSessionPlan(supabase, spaceId, plan.id, plan)
      await this.sessionService.ensureConversationLinked(supabase, spaceId, plan.id, sessionKey)
      this.sessionService.setActiveFlowBuild(target, sessionKey, {
        sessionId: plan.id,
        spaceId,
        targetAutomationId: plan.target_automation_id,
      })
      return { success: true, session: stored, plan, evaluation: evaluateFlowBuild({ plan }) }
    }
    const conversationId = this.sessionService.conversationIdFromSessionKey(sessionKey)
    const { data: session, error } = await this.repository.createBuildSession(supabase, {
      org_id: space.org_id ?? null,
      space_id: spaceId,
      created_by: userId,
      conversation_id: conversationId,
      status: plan.status,
      intent,
      plan,
      trace_events: plan.trace_events,
      clarification_questions: [],
      validation_errors: plan.validation_errors,
    })
    if (error) return { success: false, error: error.message }
    plan.id = String((session as JsonRecord).id)
    const stored = await this.sessionService.persistSessionPlan(supabase, spaceId, plan.id, plan)
    await this.sessionService.ensureConversationLinked(supabase, spaceId, plan.id, sessionKey)
    this.sessionService.setActiveFlowBuild(target, sessionKey, {
      sessionId: plan.id,
      spaceId,
      targetAutomationId: plan.target_automation_id,
    })
    return { success: true, session: stored, plan, evaluation: evaluateFlowBuild({ plan }) }
  }

  async updatePlan(target: Record<string, any>, data: JsonRecord, sessionKey?: string) {
    const planResult = await this.sessionService.loadPlan(target, data, sessionKey)
    if (!planResult.success) return planResult
    const sessionId = String(planResult.session.id)
    const spaceId = String(planResult.session.space_id)
    const supabase = planResult.supabase
    const plan = objectValue(data.plan) as unknown as FlowBuildPlan
    const nextPlan: FlowBuildPlan = {
      ...plan,
      id: sessionId,
      status: normalizePlanStatus(plan.status),
      trace_events: Array.isArray(plan.trace_events) ? plan.trace_events : [],
      validation_errors: Array.isArray(plan.validation_errors) ? plan.validation_errors : [],
      target_automation_id:
        stringValue(plan.target_automation_id) ?? planResult.plan.target_automation_id ?? null,
    }
    const row = await this.sessionService.persistSessionPlan(supabase, spaceId, sessionId, nextPlan)
    this.sessionService.setActiveFlowBuild(target, sessionKey, {
      sessionId,
      spaceId,
      targetAutomationId: nextPlan.target_automation_id,
    })
    return { success: true, session: row, plan: nextPlan }
  }

  async validatePlan(target: Record<string, any>, data: JsonRecord, sessionKey?: string) {
    const planResult = await this.sessionService.loadPlan(target, data, sessionKey)
    if (!planResult.success) return planResult
    const plan = planResult.plan
    const validation = validatePlanShape(plan)
    const traceEvent = {
      type: validation.valid ? 'schema_validation_passed' : 'schema_validation_failed',
      message: validation.valid ? 'Plan passed publish validation.' : validation.errors.join('; '),
      at: new Date().toISOString(),
    } as const
    const nextPlan: FlowBuildPlan = {
      ...plan,
      status: validation.valid ? 'validated' : plan.status,
      validation_errors: validation.errors,
      trace_events: [...plan.trace_events, traceEvent],
    }
    const session = await this.sessionService.persistSessionPlan(
      planResult.supabase,
      String(planResult.session.space_id),
      String(planResult.session.id),
      nextPlan,
    )
    this.sessionService.setActiveFlowBuild(target, sessionKey, {
      sessionId: String(planResult.session.id),
      spaceId: String(planResult.session.space_id),
      targetAutomationId: nextPlan.target_automation_id,
    })
    return {
      success: true,
      session,
      plan: nextPlan,
      validation,
      evaluation: evaluateFlowBuild({ plan: nextPlan }),
    }
  }

  async compilePlan(target: Record<string, any>, data: JsonRecord, sessionKey?: string) {
    const userId = this.sessionService.resolveUserId(target, sessionKey)
    const planResult = await this.sessionService.loadPlan(target, data, sessionKey)
    if (!planResult.success) return planResult
    const spaceId = String(planResult.session.space_id)
    const sessionId = String(planResult.session.id)
    const validation = validatePlanShape(planResult.plan)
    if (!validation.valid && data.allow_invalid_draft !== true) {
      return { success: false, validation }
    }
    const supabase = planResult.supabase
    const candidate = planToCandidate(planResult.plan)
    const existingFlowId =
      stringValue(planResult.plan.automation_id) ??
      stringValue(planResult.plan.target_automation_id)

    if (existingFlowId && planHasExecutableSteps(planResult.plan)) {
      const existingFlow = await this.sessionService.getFlowRow(supabase, spaceId, existingFlowId)
      if (existingFlow) {
        const patch: JsonRecord = {
          trigger: candidate.trigger,
          actions: candidate.actions,
          enabled: false,
          is_draft: true,
          updated_at: new Date().toISOString(),
        }
        const derivedName = resolveFlowDraftNameFromPlan(planResult.plan)
        if (derivedName && isPlaceholderFlowDraftName(existingFlow.name)) {
          patch.name = derivedName
        }
        const { data: flow, error } = await this.repository.updateSpaceAutomation(supabase, {
          spaceId,
          automationId: existingFlowId,
          patch,
        })
        if (error) return { success: false, error: error.message }
        const nextPlan: FlowBuildPlan = {
          ...planResult.plan,
          status: 'compiled',
          automation_id: existingFlowId,
          validation_errors: validation.errors,
          trace_events: [
            ...planResult.plan.trace_events,
            {
              type: 'flow_draft_compiled',
              message: 'Compiled the plan into a disabled flow draft.',
              at: new Date().toISOString(),
              data: { automation_id: existingFlowId },
            },
          ],
        }
        const session = await this.sessionService.persistSessionPlan(
          supabase,
          spaceId,
          sessionId,
          nextPlan,
          {
            automation_id: existingFlowId,
          },
        )
        this.sessionService.setActiveFlowBuild(target, sessionKey, {
          sessionId,
          spaceId,
          targetAutomationId: nextPlan.target_automation_id,
        })
        return { success: true, flow, session, plan: nextPlan, validation }
      }
    }

    if (planResult.plan.automation_id && planHasExecutableSteps(planResult.plan)) {
      const compiledId = stringValue(planResult.plan.automation_id)
      const compiledFlow = compiledId
        ? await this.sessionService.getFlowRow(supabase, spaceId, compiledId)
        : null
      if (compiledFlow && !isFlowDraftPlaceholderRow(compiledFlow)) {
        this.sessionService.setActiveFlowBuild(target, sessionKey, {
          sessionId,
          spaceId,
          targetAutomationId: planResult.plan.target_automation_id,
        })
        return {
          success: true,
          flow: { id: compiledId },
          session: planResult.session,
          plan: planResult.plan,
          validation,
        }
      }
    }
    const space = await this.sessionService.getSpace(supabase, spaceId)
    const resolvedName =
      resolveFlowDraftNameFromPlan(planResult.plan) ?? candidate.name ?? 'Untitled flow draft'
    const { data: flow, error } = await this.repository.createSpaceAutomation(supabase, {
      space_id: spaceId,
      user_id: space.user_id,
      org_id: space.org_id ?? null,
      created_by: userId,
      name: resolvedName,
      trigger: candidate.trigger,
      actions: candidate.actions,
      enabled: false,
      is_draft: true,
    })
    if (error) return { success: false, error: error.message }
    const flowId = String((flow as JsonRecord).id)
    const nextPlan: FlowBuildPlan = {
      ...planResult.plan,
      status: 'compiled',
      automation_id: flowId,
      validation_errors: validation.errors,
      trace_events: [
        ...planResult.plan.trace_events,
        {
          type: 'flow_draft_compiled',
          message: 'Compiled the plan into a disabled flow draft.',
          at: new Date().toISOString(),
          data: { automation_id: flowId },
        },
      ],
    }
    const session = await this.sessionService.persistSessionPlan(
      supabase,
      spaceId,
      String(planResult.session.id),
      nextPlan,
      {
        automation_id: flowId,
      },
    )
    this.sessionService.setActiveFlowBuild(target, sessionKey, {
      sessionId: String(planResult.session.id),
      spaceId,
      targetAutomationId: nextPlan.target_automation_id,
    })
    return { success: true, flow, session, plan: nextPlan, validation }
  }

  async evaluatePlan(target: Record<string, any>, data: JsonRecord, sessionKey?: string) {
    const userId = this.sessionService.resolveUserId(target, sessionKey)
    const planResult = await this.sessionService.loadPlan(target, data, sessionKey)
    if (!planResult.success) return planResult
    const spaceId = String(planResult.session.space_id)
    const sessionId = String(planResult.session.id)
    const summary = evaluateFlowBuild({ plan: planResult.plan })
    const supabase = planResult.supabase
    const { data: row, error } = await this.repository.createEvaluation(supabase, {
      session_id: sessionId,
      space_id: spaceId,
      created_by: userId,
      scenario_key: stringValue(data.scenario_key),
      prompt: stringValue(data.prompt) ?? planResult.plan.intent,
      trace_events: planResult.plan.trace_events,
      summary,
      score: summary.score,
      rank: summary.rank,
    })
    if (error) return { success: false, error: error.message }
    const session = await this.sessionService.persistSessionPlan(supabase, spaceId, sessionId, planResult.plan, {
      evaluation_summary: summary,
    })
    this.sessionService.setActiveFlowBuild(target, sessionKey, {
      sessionId,
      spaceId,
      targetAutomationId: planResult.plan.target_automation_id,
    })
    return { success: true, session, evaluation: row, summary }
  }
}
