import { randomUUID } from 'crypto'
import { BadRequestException, Injectable } from '@nestjs/common'
import {
  getFlowCapability,
  searchFlowCapabilities,
  type FlowActionBlueprint,
  type FlowBuilderContext,
  type FlowBuildPlan,
  type FlowBuildPlanStep,
  type FlowBuildTraceEvent,
} from '@vibey/api-shared'
import { AutomationActionSchema } from '../dto'
import type { FlowCreatePlanDto } from '../dto/flow-builder.dto'
import { assertAutomationValidWhenEnabled } from './space-automation-publishable'

type JsonRecord = Record<string, unknown>

@Injectable()
export class SpaceFlowBuilderPlanService {
  buildPlan(
    dto: FlowCreatePlanDto,
    context: FlowBuilderContext,
    trace: FlowBuildTraceEvent[],
  ): FlowBuildPlan {
    const searched = searchFlowCapabilities({ query: dto.intent, limit: 10 })
    trace.push({
      type: 'capabilities_searched',
      message: 'Searched bounded capability catalog before drafting.',
      at: new Date().toISOString(),
      data: { query: dto.intent, total: searched.total },
    })
    const targetAutomationId = dto.target_automation_id ?? null
    if (targetAutomationId) {
      const targetFlow = context.existing_flows.find((flow) => flow.id === targetAutomationId)
      trace.push({
        type: 'context_loaded',
        message: `Selected ${targetFlow?.name ?? 'existing flow'} as the update target.`,
        at: new Date().toISOString(),
        data: {
          mode: 'update',
          target_automation_id: targetAutomationId,
          target_flow_name: targetFlow?.name ?? null,
        },
      })
    }
    const trigger = dto.trigger
      ? this.stepFromPayload('trigger', dto.trigger, 'user supplied trigger')
      : this.inferTriggerStep(dto.intent)
    const actions =
      dto.actions && dto.actions.length > 0
        ? dto.actions.map((action, index) =>
            this.stepFromPayload('action', action, `user supplied action ${index + 1}`),
          )
        : this.inferActionSteps(dto.intent, trigger, context, dto.prefer_custom === true, trace)
    return {
      name: dto.name ?? this.nameFromIntent(dto.intent),
      intent: dto.intent,
      status: 'planned',
      trigger,
      actions,
      trace_events: trace,
      validation_errors: [],
      context_hash: context.context_hash,
      target_automation_id: targetAutomationId,
    }
  }

  inferTriggerStep(intent: string): FlowBuildPlanStep {
    const normalized = intent.toLowerCase()
    if (normalized.includes('github') || normalized.includes('repo')) {
      return this.stepFromCapabilityId(
        'trigger.external_app_event.GITHUB_ISSUE_CREATED_TRIGGER',
        'GitHub issue event inferred from request.',
      )
    }
    if (normalized.includes('form') || normalized.includes('lead')) {
      return this.stepFromCapabilityId('trigger.form_submitted', 'Form submission inferred.')
    }
    if (
      normalized.includes('schedule') ||
      normalized.includes('every day') ||
      normalized.includes('daily')
    ) {
      return this.stepFromCapabilityId('trigger.schedule', 'Schedule inferred.')
    }
    if (
      normalized.includes('done') ||
      normalized.includes('complete') ||
      normalized.includes('status')
    ) {
      const step = this.stepFromCapabilityId('trigger.status_change', 'Status change inferred.')
      step.payload.to = normalized.includes('review') ? 'in_review' : 'done'
      step.missing_fields = step.missing_fields.filter((field) => field !== 'to')
      return step
    }
    return this.stepFromCapabilityId('trigger.task_created', 'Defaulted to task created.')
  }

  inferActionSteps(
    intent: string,
    trigger: FlowBuildPlanStep | null,
    context: FlowBuilderContext,
    preferCustom: boolean,
    trace: FlowBuildTraceEvent[],
  ): FlowBuildPlanStep[] {
    const normalized = intent.toLowerCase()
    const matchingBlueprint = preferCustom ? this.matchBlueprint(intent, context.blueprints) : null
    if (matchingBlueprint) {
      trace.push({
        type: 'custom_blueprint_selected',
        message: `Selected custom blueprint ${matchingBlueprint.name}.`,
        at: new Date().toISOString(),
        data: { blueprint_id: matchingBlueprint.id },
      })
      return [this.stepFromBlueprint(matchingBlueprint)]
    }
    if (preferCustom && !matchingBlueprint) {
      trace.push({
        type: 'unsupported_request_detected',
        message: 'No active custom blueprint matched this request.',
        at: new Date().toISOString(),
      })
      return [this.unsupportedStep('No matching custom blueprint exists yet.')]
    }
    const steps: FlowBuildPlanStep[] = []
    if (normalized.includes('github') || normalized.includes('code') || normalized.includes('pr')) {
      if (trigger?.payload.type !== 'task_created') {
        steps.push(
          this.stepFromCapabilityId('action.create_task', 'Create a task before code work.'),
        )
      }
      steps.push(
        this.stepFromCapabilityId('action.send_to_cursor', 'Send the development task to Cursor.'),
      )
      return steps
    }
    if (normalized.includes('lead') || normalized.includes('contact')) {
      steps.push(
        this.stepFromCapabilityId('action.create_contact', 'Create or update contact context.'),
      )
      steps.push(this.stepFromCapabilityId('action.create_task', 'Create a follow-up task.'))
      return steps
    }
    if (
      normalized.includes('agent') ||
      normalized.includes('review') ||
      normalized.includes('summar')
    ) {
      if (
        normalized.includes('agents') ||
        normalized.includes('parallel') ||
        normalized.includes('multiple')
      ) {
        steps.push(
          this.stepFromCapabilityId(
            'action.send_to_agents',
            'Ask multiple agents to review the task in parallel.',
          ),
        )
        return steps
      }
      steps.push(
        this.stepFromCapabilityId('action.send_to_agent', 'Ask an agent to review the task.'),
      )
      return steps
    }
    if (normalized.includes('slack')) {
      steps.push(
        this.stepFromCapabilityId('action.send_slack_message', 'Send a Slack notification.'),
      )
      return steps
    }
    steps.push(this.stepFromCapabilityId('action.add_comment', 'Add an internal flow comment.'))
    return steps
  }

  stepFromPayload(
    kind: 'trigger' | 'action',
    payload: JsonRecord,
    description: string,
  ): FlowBuildPlanStep {
    const type = String(payload.type ?? '')
    const capabilityId =
      kind === 'trigger' &&
      type === 'external_app_event' &&
      typeof payload.trigger_slug === 'string'
        ? `trigger.external_app_event.${payload.trigger_slug}`
        : `${kind}.${type}`
    const capability = getFlowCapability(capabilityId)
    const missingFields = capability ? this.missingFields(capability.requiredFields, payload) : []
    return {
      id: randomUUID(),
      kind,
      title: capability?.label ?? (type || 'Unknown step'),
      description,
      source: capability ? 'premade' : 'unsupported_candidate',
      capability_id: capability?.id ?? null,
      action_type: kind === 'action' ? type : null,
      payload: { ...payload },
      missing_fields: missingFields,
      compatibility_warnings: capability
        ? []
        : [`Capability ${capabilityId} is not in the catalog.`],
    }
  }

  stepFromCapabilityId(capabilityId: string, description: string): FlowBuildPlanStep {
    const capability = getFlowCapability(capabilityId)
    if (!capability) return this.unsupportedStep(`Capability ${capabilityId} is not supported.`)
    const payload = { ...capability.example }
    const step: FlowBuildPlanStep = {
      id: randomUUID(),
      kind: capability.kind,
      title: capability.label,
      description,
      source: 'premade',
      capability_id: capability.id,
      action_type: capability.kind === 'action' ? capability.type : null,
      payload,
      missing_fields: this.missingFields(capability.requiredFields, payload),
      compatibility_warnings: [],
    }
    if (capability.kind === 'action' && capability.type === 'create_task') {
      step.payload.title_template = 'Follow up: {{trigger.payload}}'
      step.missing_fields = step.missing_fields.filter((field) => field !== 'title_template')
    }
    return step
  }

  stepFromBlueprint(blueprint: FlowActionBlueprint): FlowBuildPlanStep {
    return {
      id: randomUUID(),
      kind: 'custom_blueprint',
      title: blueprint.name,
      description: blueprint.description ?? 'Custom reusable flow action.',
      source: 'custom_blueprint',
      blueprint_id: blueprint.id,
      action_type: String(blueprint.action_template.type ?? ''),
      payload: { ...blueprint.action_template },
      missing_fields: [],
      compatibility_warnings: [],
    }
  }

  unsupportedStep(reason: string): FlowBuildPlanStep {
    return {
      id: randomUUID(),
      kind: 'custom_blueprint',
      title: 'Unsupported custom action',
      description: reason,
      source: 'unsupported_candidate',
      action_type: null,
      payload: {},
      missing_fields: [],
      compatibility_warnings: [reason],
    }
  }

  validatePlanCandidate(plan: FlowBuildPlan) {
    try {
      assertAutomationValidWhenEnabled({
        ...this.planToAutomationCandidate(plan),
        is_draft: false,
        enabled: true,
      })
      return { valid: true, errors: [] as string[] }
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Flow plan validation failed'],
      }
    }
  }

  validateBlueprintAction(action: JsonRecord) {
    const parsed = AutomationActionSchema.safeParse(action)
    if (parsed.success) return { valid: true, errors: [] as string[] }
    return {
      valid: false,
      errors: parsed.error.issues.map((issue) =>
        issue.path.length ? `${issue.path.join('.')}: ${issue.message}` : issue.message,
      ),
    }
  }

  planToAutomationCandidate(plan: FlowBuildPlan) {
    if (!plan.trigger) throw new BadRequestException('Flow plan is missing a trigger')
    const actions = plan.actions
      .filter((step) => step.source !== 'unsupported_candidate')
      .map((step) => step.payload)
    if (actions.length === 0) throw new BadRequestException('Flow plan is missing actions')
    return { name: plan.name, trigger: plan.trigger.payload, actions }
  }

  nameFromIntent(intent: string) {
    const clean = intent.replace(/\s+/g, ' ').trim()
    if (!clean) return 'Untitled flow plan'
    return clean.length > 80 ? `${clean.slice(0, 77)}...` : clean
  }

  private matchBlueprint(intent: string, blueprints: FlowActionBlueprint[]) {
    const normalized = intent.toLowerCase()
    return (
      blueprints.find(
        (blueprint) =>
          blueprint.status === 'active' &&
          (normalized.includes(blueprint.name.toLowerCase()) ||
            normalized.includes(blueprint.category.toLowerCase())),
      ) ?? null
    )
  }

  private missingFields(requiredFields: string[], payload: JsonRecord) {
    return requiredFields.filter((field) => isMissingPayloadValue(payload[field]))
  }
}

function isMissingPayloadValue(value: unknown): boolean {
  if (value == null) return true
  if (typeof value !== 'string') return false
  const normalized = value.trim().toLowerCase()
  if (!normalized) return true
  return [
    'connected_account_id',
    'custom_field_id',
    'form_id',
    'channel_id',
    'tag_name',
    'agent_brain_id',
    'https://github.com/acme/repo',
  ].includes(normalized)
}
