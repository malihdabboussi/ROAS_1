import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  evaluateFlowBuild,
  isPlaceholderFlowDraftName,
  planHasExecutableSteps,
  resolveFlowBuildInspectorStage,
  resolveFlowBuildRequiredNextAction,
  resolveFlowDraftNameFromPlan,
  type FlowBuildClarification,
  type FlowBuildEvaluationSummary,
  type FlowBuildPlan,
  type FlowBuildPlanStep,
  type FlowBuildSessionStatus,
  type FlowBuildSessionSummary,
  type FlowBuildTraceEvent,
} from '@vibey/api-shared'
import { CreateDraftAutomationSchema, type CreateAutomationDto } from '../dto'
import type {
  FlowClarificationAnswerDto,
  FlowCompilePlanDto,
  FlowCreateBlueprintDto,
  FlowCreateBuildSessionDto,
  FlowCreateClarificationsDto,
  FlowCreatePlanDto,
  FlowEvaluatePlanDto,
  FlowUpdatePlanDto,
} from '../dto/flow-builder.dto'
import { SpaceAutomationsRepository } from '../repositories/space-automations.repository'
import { SpaceFlowBuilderRepository } from '../repositories/space-flow-builder.repository'
import { SpacesRepository } from '../repositories/spaces.repository'
import { SpaceFlowBuilderContextService } from './space-flow-builder-context.service'
import { SpaceFlowBuilderPlanService } from './space-flow-builder-plan.service'

type JsonRecord = Record<string, unknown>

@Injectable()
export class SpaceFlowBuilderService {
  constructor(
    private readonly contextService: SpaceFlowBuilderContextService,
    private readonly builderRepo: SpaceFlowBuilderRepository,
    private readonly automationsRepo: SpaceAutomationsRepository,
    private readonly spacesRepo: SpacesRepository,
    private readonly planService: SpaceFlowBuilderPlanService,
  ) {}

  getContext(supabase: SupabaseClient, input: { spaceId: string; orgId?: string | null }) {
    return this.contextService.buildContext(supabase, input)
  }

  async createPlan(
    supabase: SupabaseClient,
    input: { spaceId: string; orgId?: string | null; userId: string; dto: FlowCreatePlanDto },
  ) {
    const context = await this.getContext(supabase, input)
    const trace: FlowBuildTraceEvent[] = [
      {
        type: 'context_loaded',
        message: 'Loaded Space schema, existing flows, capabilities, and custom blueprints.',
        at: new Date().toISOString(),
        data: { context_hash: context.context_hash },
      },
    ]
    const plan = this.planService.buildPlan(input.dto, context, trace)
    if (
      plan.target_automation_id &&
      !context.existing_flows.some((flow) => flow.id === plan.target_automation_id)
    ) {
      throw new BadRequestException('Target flow not found in Space')
    }
    const session = await this.builderRepo.createSession(supabase, {
      org_id: input.orgId ?? context.space.org_id ?? null,
      space_id: input.spaceId,
      created_by: input.userId,
      status: 'planned',
      intent: plan.intent,
      plan: plan as unknown as JsonRecord,
      context_hash: context.context_hash,
      trace_events: plan.trace_events as unknown as JsonRecord[],
      clarification_questions: [],
      validation_errors: plan.validation_errors,
    })
    plan.id = String(session.id)
    const stored = await this.builderRepo.updateSession(supabase, input.spaceId, plan.id, {
      plan,
    })
    return { session: stored, plan, context, evaluation: evaluateFlowBuild({ plan }) }
  }

  async createBuildSession(
    supabase: SupabaseClient,
    input: {
      spaceId: string
      orgId?: string | null
      userId: string
      dto: FlowCreateBuildSessionDto
    },
  ): Promise<FlowBuildSessionSummary> {
    const context = await this.getContext(supabase, input)
    if (
      input.dto.target_automation_id &&
      !context.existing_flows.some((flow) => flow.id === input.dto.target_automation_id)
    ) {
      throw new BadRequestException('Target flow not found in Space')
    }
    const trace: FlowBuildTraceEvent[] = [
      {
        type: 'context_loaded',
        message: 'Loaded Space schema, existing flows, capabilities, and custom blueprints.',
        at: new Date().toISOString(),
        data: {
          context_hash: context.context_hash,
          mode: input.dto.mode ?? 'create',
          target_automation_id: input.dto.target_automation_id ?? null,
        },
      },
    ]
    const session = await this.builderRepo.createSession(supabase, {
      org_id: input.orgId ?? context.space.org_id ?? null,
      space_id: input.spaceId,
      created_by: input.userId,
      conversation_id: input.dto.conversation_id ?? null,
      status: 'intake',
      intent: input.dto.intent,
      plan: {
        target_automation_id: input.dto.target_automation_id ?? null,
        name: input.dto.name ?? this.planService.nameFromIntent(input.dto.intent),
      },
      context_hash: context.context_hash,
      trace_events: trace as unknown as JsonRecord[],
      clarification_questions: [],
      validation_errors: [],
    })
    return this.sessionSummary(supabase, input.spaceId, session)
  }

  async getPlan(supabase: SupabaseClient, spaceId: string, sessionId: string) {
    const session = await this.builderRepo.getSession(supabase, spaceId, sessionId)
    if (!session) throw new BadRequestException('Flow build session not found')
    return { session, plan: this.planFromSession(session) }
  }

  async getBuildSession(
    supabase: SupabaseClient,
    spaceId: string,
    sessionId: string,
  ): Promise<FlowBuildSessionSummary> {
    const session = await this.builderRepo.getSession(supabase, spaceId, sessionId)
    if (!session) throw new BadRequestException('Flow build session not found')
    return this.sessionSummary(supabase, spaceId, session)
  }

  async deleteBuildSession(supabase: SupabaseClient, spaceId: string, sessionId: string) {
    return this.builderRepo.deleteSession(supabase, spaceId, sessionId)
  }

  async getLatestPlan(
    supabase: SupabaseClient,
    spaceId: string,
    conversationId?: string | null,
  ): Promise<FlowBuildSessionSummary | null> {
    const session = conversationId
      ? await this.builderRepo.getLatestSessionForConversation(supabase, spaceId, conversationId)
      : await this.builderRepo.getLatestSession(supabase, spaceId)
    if (!session) return null
    return this.sessionSummary(supabase, spaceId, session)
  }

  async listBuildSessionLinks(supabase: SupabaseClient, spaceId: string) {
    const rows = await this.builderRepo.listSessions(supabase, spaceId)
    return rows.map((row) => {
      const plan = (row.plan ?? {}) as JsonRecord
      return {
        id: String(row.id),
        space_id: typeof row.space_id === 'string' ? row.space_id : spaceId,
        conversation_id: typeof row.conversation_id === 'string' ? row.conversation_id : null,
        automation_id: typeof row.automation_id === 'string' ? row.automation_id : null,
        target_automation_id:
          typeof plan.target_automation_id === 'string' ? plan.target_automation_id : null,
        status: typeof row.status === 'string' ? row.status : 'intake',
        plan_name: typeof plan.name === 'string' ? plan.name : null,
        plan_description: typeof plan.description === 'string' ? plan.description : null,
        updated_at: typeof row.updated_at === 'string' ? row.updated_at : null,
      }
    })
  }

  private async sessionSummary(
    supabase: SupabaseClient,
    spaceId: string,
    session: JsonRecord,
  ): Promise<FlowBuildSessionSummary> {
    const plan = this.planFromSession(session)
    const clarifications = (await this.builderRepo.listClarificationsForSession(supabase, {
      spaceId,
      sessionId: String(session.id),
    })) as unknown as FlowBuildClarification[]
    const openClarifications = clarifications.filter((row) => row.status === 'open').length
    const sessionEvaluation = asRecord(session.evaluation_summary)
    const evaluations = Object.keys(sessionEvaluation).length
      ? []
      : await this.builderRepo.listEvaluationsForSession(supabase, String(session.id), 1)
    const latestEvaluation = asRecord(evaluations[0]?.summary)
    const evaluation = (Object.keys(sessionEvaluation).length
      ? sessionEvaluation
      : latestEvaluation) as unknown as FlowBuildEvaluationSummary | null
    const summaryEvaluation = evaluation && Object.keys(evaluation).length ? evaluation : null
    return {
      session: session as FlowBuildSessionSummary['session'],
      plan,
      clarifications,
      evaluation: summaryEvaluation,
      required_next_action: resolveFlowBuildRequiredNextAction({
        plan,
        sessionStatus: this.sessionStatus(session.status),
        openClarifications,
        evaluation: summaryEvaluation,
      }),
      inspector_stage: resolveFlowBuildInspectorStage({
        plan,
        sessionStatus: this.sessionStatus(session.status),
        openClarifications,
        evaluation: summaryEvaluation,
      }),
    }
  }

  async updatePlan(
    supabase: SupabaseClient,
    input: { spaceId: string; sessionId: string; dto: FlowUpdatePlanDto },
  ) {
    const { plan } = await this.getSessionPlan(supabase, input.spaceId, input.sessionId)
    const next: FlowBuildPlan = {
      ...plan,
      name: input.dto.name ?? plan.name,
      status: input.dto.status ?? plan.status,
      trigger:
        input.dto.trigger === undefined
          ? plan.trigger
          : input.dto.trigger
            ? this.planService.stepFromPayload(
                'trigger',
                input.dto.trigger,
                'manual trigger update',
              )
            : null,
      actions:
        input.dto.actions === undefined
          ? plan.actions
          : input.dto.actions.map((action, index) =>
              this.planService.stepFromPayload('action', action, `manual action ${index + 1}`),
            ),
    }
    return this.persistPlan(supabase, input.spaceId, input.sessionId, next)
  }

  async answerClarifications(
    supabase: SupabaseClient,
    input: { spaceId: string; sessionId: string; dto: FlowClarificationAnswerDto },
  ) {
    await this.builderRepo.answerClarifications(
      supabase,
      input.sessionId,
      input.dto.answers as JsonRecord,
    )
    const session = await this.builderRepo.updateSession(supabase, input.spaceId, input.sessionId, {
      status: 'planning',
      trace_events: [
        ...(await this.sessionTraceEvents(supabase, input.spaceId, input.sessionId)),
        {
          type: 'clarification_answered',
          message: 'User answered Loop clarification questions.',
          at: new Date().toISOString(),
          data: { answered_question_ids: Object.keys(input.dto.answers) },
        },
      ],
    })
    return this.sessionSummary(supabase, input.spaceId, session)
  }

  async createClarifications(
    supabase: SupabaseClient,
    input: {
      spaceId: string
      sessionId: string
      orgId?: string | null
      userId: string
      dto: FlowCreateClarificationsDto
    },
  ) {
    const session = await this.builderRepo.getSession(supabase, input.spaceId, input.sessionId)
    if (!session) throw new BadRequestException('Flow build session not found')
    await this.builderRepo.createClarifications(supabase, {
      session_id: input.sessionId,
      org_id: input.orgId ?? null,
      space_id: input.spaceId,
      created_by: input.userId,
      questions: input.dto.questions as unknown as JsonRecord[],
    })
    const updated = await this.builderRepo.updateSession(supabase, input.spaceId, input.sessionId, {
      status: 'clarifying',
      trace_events: [
        ...this.traceEventsFromSession(session),
        {
          type: 'clarification_required',
          message: 'Loop created pre-plan clarification questions.',
          at: new Date().toISOString(),
          data: {
            question_count: input.dto.questions.length,
            render_mode: input.dto.questions.length <= 3 ? 'chat' : 'tab',
          },
        },
      ],
    })
    return this.sessionSummary(supabase, input.spaceId, updated)
  }

  async validatePlan(supabase: SupabaseClient, spaceId: string, sessionId: string) {
    const { plan } = await this.getSessionPlan(supabase, spaceId, sessionId)
    const validation = this.planService.validatePlanCandidate(plan)
    const traceEvent: FlowBuildTraceEvent = {
      type: validation.valid ? 'schema_validation_passed' : 'schema_validation_failed',
      message: validation.valid ? 'Plan passed publish validation.' : validation.errors.join('; '),
      at: new Date().toISOString(),
    }
    const nextPlan: FlowBuildPlan = {
      ...plan,
      status: validation.valid ? 'validated' : plan.status,
      validation_errors: validation.errors,
      trace_events: [...plan.trace_events, traceEvent],
    }
    const persisted = await this.persistPlan(supabase, spaceId, sessionId, nextPlan)
    return { ...persisted, validation }
  }

  async compilePlan(
    supabase: SupabaseClient,
    input: {
      spaceId: string
      sessionId: string
      userId: string
      dto: FlowCompilePlanDto
    },
  ) {
    const { session, plan } = await this.getSessionPlan(supabase, input.spaceId, input.sessionId)
    const validation = this.planService.validatePlanCandidate(plan)
    if (!validation.valid && input.dto.allow_invalid_draft !== true) {
      throw new BadRequestException(validation.errors[0] ?? 'Flow plan is not valid')
    }
    const candidate = this.planService.planToAutomationCandidate(plan)
    const existingFlowId =
      (typeof plan.automation_id === 'string' ? plan.automation_id : null) ??
      (typeof plan.target_automation_id === 'string' ? plan.target_automation_id : null) ??
      (typeof session.automation_id === 'string' ? session.automation_id : null)

    if (existingFlowId && planHasExecutableSteps(plan)) {
      const existingFlow = await this.automationsRepo.findById(
        supabase,
        input.spaceId,
        existingFlowId,
      )
      if (existingFlow) {
        const patch: JsonRecord = {
          trigger: candidate.trigger,
          actions: candidate.actions,
          enabled: false,
          is_draft: true,
        }
        const derivedName = resolveFlowDraftNameFromPlan(plan)
        if (derivedName && isPlaceholderFlowDraftName(existingFlow.name)) {
          patch.name = derivedName
        }
        if (typeof plan.description === 'string') {
          patch.description = plan.description
        }
        const automation = await this.automationsRepo.update(
          supabase,
          input.spaceId,
          existingFlowId,
          patch,
        )
        const traceEvent: FlowBuildTraceEvent = {
          type: 'flow_draft_compiled',
          message: 'Compiled the plan into a disabled flow draft.',
          at: new Date().toISOString(),
          data: { automation_id: existingFlowId },
        }
        const nextPlan: FlowBuildPlan = {
          ...plan,
          status: 'compiled',
          automation_id: existingFlowId,
          validation_errors: validation.errors,
          trace_events: [...plan.trace_events, traceEvent],
        }
        const persisted = await this.persistPlan(
          supabase,
          input.spaceId,
          input.sessionId,
          nextPlan,
          {
            automation_id: existingFlowId,
          },
        )
        return { ...persisted, automation, validation }
      }
    }

    if (plan.automation_id && planHasExecutableSteps(plan)) {
      const compiledFlow = await this.automationsRepo.findById(
        supabase,
        input.spaceId,
        plan.automation_id,
      )
      if (compiledFlow && !this.isFlowDraftPlaceholderRow(compiledFlow)) {
        return {
          ...(await this.getPlan(supabase, input.spaceId, input.sessionId)),
          automation: compiledFlow,
          validation,
        }
      }
    }

    const draft = CreateDraftAutomationSchema.parse({
      is_draft: true,
      enabled: false,
      name: resolveFlowDraftNameFromPlan(plan) ?? candidate.name,
      description: typeof plan.description === 'string' ? plan.description : null,
      trigger: candidate.trigger,
      actions: candidate.actions,
    }) as CreateAutomationDto
    const space = await this.spacesRepo.findSpaceByIdForAccess(supabase, input.spaceId)
    if (!space) throw new BadRequestException('Space not found')
    const automation = (await this.automationsRepo.create(
      supabase,
      space as { id: string; user_id: string; org_id?: string | null },
      input.userId,
      draft,
    )) as JsonRecord
    const traceEvent: FlowBuildTraceEvent = {
      type: 'flow_draft_compiled',
      message: 'Compiled the plan into a disabled flow draft.',
      at: new Date().toISOString(),
      data: { automation_id: automation.id },
    }
    const nextPlan: FlowBuildPlan = {
      ...plan,
      status: 'compiled',
      automation_id: String(automation.id),
      validation_errors: validation.errors,
      trace_events: [...plan.trace_events, traceEvent],
    }
    const persisted = await this.persistPlan(supabase, input.spaceId, input.sessionId, nextPlan, {
      automation_id: automation.id,
    })
    return { ...persisted, automation, validation }
  }

  private isFlowDraftPlaceholderRow(flow: JsonRecord): boolean {
    const trigger = asRecord(flow.trigger)
    const actions = Array.isArray(flow.actions) ? flow.actions : []
    if (trigger.type === 'choose_action') return true
    if (actions.length === 0) return true
    return actions.every((row) => asRecord(row).type === 'choose_action')
  }

  async listBlueprints(
    supabase: SupabaseClient,
    input: { spaceId: string; orgId?: string | null; status?: string; limit?: number },
  ) {
    return this.builderRepo.listBlueprints(supabase, {
      space_id: input.spaceId,
      org_id: input.orgId ?? null,
      status: input.status,
      limit: input.limit,
    })
  }

  async createBlueprint(
    supabase: SupabaseClient,
    input: { spaceId: string; orgId?: string | null; userId: string; dto: FlowCreateBlueprintDto },
  ) {
    const validation = this.planService.validateBlueprintAction(input.dto.action_template)
    const row = await this.builderRepo.createBlueprint(supabase, {
      org_id: input.orgId ?? null,
      space_id: input.spaceId,
      created_by: input.userId,
      name: input.dto.name,
      description: input.dto.description ?? null,
      category: input.dto.category ?? 'Custom',
      input_schema: input.dto.input_schema ?? {},
      action_template: input.dto.action_template,
      required_contexts: input.dto.required_contexts ?? [],
      output_contexts: input.dto.output_contexts ?? [],
    })
    return { blueprint: row, validation }
  }

  async validateBlueprint(supabase: SupabaseClient, spaceId: string, blueprintId: string) {
    const row = await this.builderRepo.getBlueprint(supabase, spaceId, blueprintId)
    if (!row) throw new BadRequestException('Flow action blueprint not found')
    return {
      blueprint: row,
      validation: this.planService.validateBlueprintAction(asRecord(row.action_template)),
    }
  }

  async activateBlueprint(supabase: SupabaseClient, spaceId: string, blueprintId: string) {
    const { validation } = await this.validateBlueprint(supabase, spaceId, blueprintId)
    if (!validation.valid) throw new BadRequestException(validation.errors[0])
    const blueprint = await this.builderRepo.updateBlueprintStatus(supabase, blueprintId, 'active')
    return { blueprint, validation }
  }

  async evaluatePlan(
    supabase: SupabaseClient,
    input: {
      spaceId: string
      sessionId: string
      userId: string
      orgId?: string | null
      dto: FlowEvaluatePlanDto
    },
  ) {
    const { plan } = await this.getSessionPlan(supabase, input.spaceId, input.sessionId)
    const clarifications = await this.builderRepo.listClarificationsForSession(supabase, {
      spaceId: input.spaceId,
      sessionId: input.sessionId,
    })
    const summary = evaluateFlowBuild({
      plan,
      required_clarifications: clarifications.length,
    })
    const evaluation = await this.builderRepo.createEvaluation(supabase, {
      session_id: input.sessionId,
      org_id: input.orgId ?? null,
      space_id: input.spaceId,
      created_by: input.userId,
      scenario_key: input.dto.scenario_key ?? null,
      prompt: input.dto.prompt ?? plan.intent,
      trace_events: plan.trace_events as unknown as JsonRecord[],
      summary: summary as unknown as JsonRecord,
      score: summary.score,
      rank: summary.rank,
    })
    await this.builderRepo.updateSession(supabase, input.spaceId, input.sessionId, {
      evaluation_summary: summary,
    })
    return { evaluation, summary }
  }

  private async persistPlan(
    supabase: SupabaseClient,
    spaceId: string,
    sessionId: string,
    plan: FlowBuildPlan,
    extra: JsonRecord = {},
  ) {
    const session = await this.builderRepo.updateSession(supabase, spaceId, sessionId, {
      ...extra,
      status: plan.status,
      plan: plan as unknown as JsonRecord,
      trace_events: plan.trace_events as unknown as JsonRecord[],
      clarification_questions: [],
      validation_errors: plan.validation_errors,
    })
    return { session, plan, evaluation: evaluateFlowBuild({ plan }) }
  }

  private async getSessionPlan(supabase: SupabaseClient, spaceId: string, sessionId: string) {
    const session = await this.builderRepo.getSession(supabase, spaceId, sessionId)
    if (!session) throw new BadRequestException('Flow build session not found')
    const plan = this.planFromSession(session)
    if (!plan) throw new BadRequestException('Flow build session has no plan yet')
    return { session, plan }
  }

  private planFromSession(session: JsonRecord): FlowBuildPlan | null {
    const raw = asRecord(session.plan)
    if (typeof raw.name !== 'string' || typeof raw.intent !== 'string') return null
    const status = raw.status
    if (
      status !== 'planned' &&
      status !== 'validated' &&
      status !== 'compiled' &&
      status !== 'blocked'
    ) {
      return null
    }
    return {
      ...raw,
      status,
      trigger: asRecord(raw.trigger).id ? (raw.trigger as FlowBuildPlanStep) : null,
      actions: Array.isArray(raw.actions) ? (raw.actions as FlowBuildPlanStep[]) : [],
      trace_events: Array.isArray(raw.trace_events)
        ? (raw.trace_events as FlowBuildTraceEvent[])
        : this.traceEventsFromSession(session),
      validation_errors: Array.isArray(raw.validation_errors)
        ? (raw.validation_errors as string[])
        : [],
    } as FlowBuildPlan
  }

  private traceEventsFromSession(session: JsonRecord): FlowBuildTraceEvent[] {
    return Array.isArray(session.trace_events)
      ? (session.trace_events as FlowBuildTraceEvent[])
      : []
  }

  private async sessionTraceEvents(
    supabase: SupabaseClient,
    spaceId: string,
    sessionId: string,
  ): Promise<FlowBuildTraceEvent[]> {
    const session = await this.builderRepo.getSession(supabase, spaceId, sessionId)
    return session ? this.traceEventsFromSession(session) : []
  }

  private sessionStatus(value: unknown): FlowBuildSessionStatus {
    if (value === 'needs_clarification') return 'clarifying'
    return value === 'intake' ||
      value === 'clarifying' ||
      value === 'planning' ||
      value === 'planned' ||
      value === 'validated' ||
      value === 'compiled' ||
      value === 'blocked'
      ? value
      : 'intake'
  }
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {}
}
