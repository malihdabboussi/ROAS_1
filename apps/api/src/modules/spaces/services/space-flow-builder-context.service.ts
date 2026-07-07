import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  createFlowBuildContextHash,
  FLOW_BUILDER_TEMPLATE_TOKENS,
  FLOW_CAPABILITY_CATALOG,
  searchFlowCapabilities,
  searchWorkflowCapabilities,
  type FlowBuilderContext,
  type FlowBuilderFieldOptionRef,
  type FlowBuilderFieldRef,
  type FlowBuilderViewRef,
} from '@vibey/api-shared'
import { SpaceAutomationsRepository } from '../repositories/space-automations.repository'
import { SpaceFlowBuilderRepository } from '../repositories/space-flow-builder.repository'
import { SpacesRepository } from '../repositories/spaces.repository'

@Injectable()
export class SpaceFlowBuilderContextService {
  constructor(
    private readonly spacesRepo: SpacesRepository,
    private readonly automationsRepo: SpaceAutomationsRepository,
    private readonly builderRepo: SpaceFlowBuilderRepository,
  ) {}

  async buildContext(
    supabase: SupabaseClient,
    input: { spaceId: string; orgId?: string | null },
  ): Promise<FlowBuilderContext> {
    const space = (await this.spacesRepo.findSpaceByIdForAccess(supabase, input.spaceId)) as Record<
      string,
      unknown
    > | null
    if (!space) throw new BadRequestException('Space not found')

    const schema = asRecord(space.schema)
    const views = this.extractViews(schema)
    const fields = this.extractRootFields(schema, views)
    const existingFlows = await this.automationsRepo.listBySpace(supabase, input.spaceId)
    const blueprints = await this.builderRepo.listBlueprints(supabase, {
      space_id: input.spaceId,
      org_id: input.orgId ?? null,
      limit: 20,
    })
    const buckets = this.buildCapabilityBuckets()
    const sample = searchFlowCapabilities({ limit: 12 }).results
    const workflowCapabilities = searchWorkflowCapabilities({ limit: 12 })

    return {
      space: {
        id: String(space.id),
        title: String(space.title ?? 'Untitled Space'),
        org_id: typeof space.org_id === 'string' ? space.org_id : null,
      },
      views,
      fields,
      capabilities: {
        buckets,
        sample,
        total: FLOW_CAPABILITY_CATALOG.length,
      },
      workflow_capabilities: {
        ...workflowCapabilities,
        flow_capability_total: FLOW_CAPABILITY_CATALOG.length,
      },
      existing_flows: existingFlows.map((flow) =>
        this.existingFlowRef(flow as Record<string, unknown>),
      ),
      blueprints: blueprints.map((row) => ({
        id: String(row.id),
        org_id: stringOrNull(row.org_id),
        space_id: stringOrNull(row.space_id),
        created_by: stringOrNull(row.created_by),
        name: String(row.name ?? 'Untitled blueprint'),
        description: stringOrNull(row.description),
        category: String(row.category ?? 'Custom'),
        status: row.status === 'active' || row.status === 'archived' ? row.status : 'draft',
        input_schema: asRecord(row.input_schema),
        action_template: asRecord(row.action_template),
        required_contexts: Array.isArray(row.required_contexts)
          ? row.required_contexts.map(String)
          : [],
        output_contexts: Array.isArray(row.output_contexts) ? row.output_contexts.map(String) : [],
        promotion_score: typeof row.promotion_score === 'number' ? row.promotion_score : null,
        created_at: stringOrNull(row.created_at),
        updated_at: stringOrNull(row.updated_at),
      })),
      template_tokens: FLOW_BUILDER_TEMPLATE_TOKENS,
      context_hash: createFlowBuildContextHash({
        space_id: input.spaceId,
        view_count: views.length,
        field_count: fields.length,
        capability_total: FLOW_CAPABILITY_CATALOG.length,
        blueprint_count: blueprints.length,
      }),
    }
  }

  private extractViews(schema: Record<string, unknown>): FlowBuilderViewRef[] {
    const views = Array.isArray(schema.views) ? schema.views : []
    return views
      .filter((view) => view && typeof view === 'object')
      .map((view, index) => {
        const record = view as Record<string, unknown>
        const id = String(record.id ?? `view-${index + 1}`)
        return {
          id,
          title: String(record.title ?? record.name ?? `View ${index + 1}`),
          type: String(record.type ?? asRecord(record.custom_data)._view_type ?? 'task'),
          fields: this.extractFieldsFromContainer(record, id),
        }
      })
  }

  private extractRootFields(
    schema: Record<string, unknown>,
    views: FlowBuilderViewRef[],
  ): FlowBuilderFieldRef[] {
    const rootFields = this.extractFieldsFromContainer(schema, null)
    const byKey = new Map<string, FlowBuilderFieldRef>()
    for (const field of [...rootFields, ...views.flatMap((view) => view.fields)]) {
      byKey.set(`${field.view_id ?? 'root'}:${field.key}`, field)
    }
    return [...byKey.values()]
  }

  private extractFieldsFromContainer(
    container: Record<string, unknown>,
    viewId: string | null,
  ): FlowBuilderFieldRef[] {
    const rawFields = [
      ...(Array.isArray(container.fields) ? container.fields : []),
      ...(Array.isArray(container.custom_fields) ? container.custom_fields : []),
      ...(Array.isArray(container.columns) ? container.columns : []),
    ]
    return rawFields
      .filter((field) => field && typeof field === 'object')
      .map((field, index) => {
        const record = field as Record<string, unknown>
        const key = String(record.key ?? record.id ?? record.name ?? `field_${index + 1}`)
        const optionRefs = extractOptionRefs(record.options)
        return {
          id: String(record.id ?? key),
          key,
          label: String(record.label ?? record.name ?? record.title ?? key),
          type: String(record.type ?? record.field_type ?? 'text'),
          view_id: viewId,
          required: record.required === true,
          custom: record.custom === true || record.is_custom === true,
          options: optionRefs.length ? optionRefs.map((option) => option.label) : undefined,
          option_refs: optionRefs.length ? optionRefs : undefined,
        }
      })
  }

  private buildCapabilityBuckets() {
    const buckets = new Map<string, { category: string; triggers: number; actions: number }>()
    for (const capability of FLOW_CAPABILITY_CATALOG) {
      const current = buckets.get(capability.category) ?? {
        category: capability.category,
        triggers: 0,
        actions: 0,
      }
      if (capability.kind === 'trigger') current.triggers += 1
      else current.actions += 1
      buckets.set(capability.category, current)
    }
    return [...buckets.values()]
  }

  private existingFlowRef(flow: Record<string, unknown>) {
    const trigger = asRecord(flow.trigger)
    const actions = Array.isArray(flow.actions) ? flow.actions : []
    return {
      id: String(flow.id),
      name: String(flow.name ?? 'Untitled flow'),
      enabled: flow.enabled === true,
      is_draft: flow.is_draft === true,
      trigger_type: typeof trigger.type === 'string' ? trigger.type : null,
      action_types: actions
        .map((action) =>
          action && typeof action === 'object' ? (action as { type?: unknown }).type : null,
        )
        .filter((type): type is string => typeof type === 'string'),
      updated_at: stringOrNull(flow.updated_at),
    }
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function extractOptionRefs(value: unknown): FlowBuilderFieldOptionRef[] {
  if (!Array.isArray(value)) return []
  return value
    .map((option, index) => {
      if (option && typeof option === 'object') {
        const record = option as Record<string, unknown>
        const id = String(record.id ?? record.value ?? record.key ?? record.label ?? index)
        const label = String(record.label ?? record.name ?? record.title ?? record.value ?? id)
        return {
          id,
          label,
          value: stringOrNull(record.value),
          key: stringOrNull(record.key),
          color: stringOrNull(record.color),
        }
      }
      const label = String(option)
      return { id: label, label, value: label, key: null, color: null }
    })
    .filter((option) => option.label.trim().length > 0)
}
