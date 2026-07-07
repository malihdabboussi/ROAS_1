import { Injectable } from '@nestjs/common'
import {
  createFlowBuildContextHash,
  FLOW_BUILDER_TEMPLATE_TOKENS,
  type FlowBuilderFieldOptionRef,
  type FlowBuilderFieldRef,
  type FlowBuilderViewRef,
} from '@vibey/api-shared/types/flow-builder'
import {
  FLOW_CAPABILITY_CATALOG,
  searchFlowCapabilities,
} from '@vibey/api-shared/types/flow-capabilities'
import { ArtifactFlowBuilderRepository } from '../repositories/artifact-flow-builder.repository'
import { ArtifactFlowBuilderSessionService } from './artifact-flow-builder-session.service'
import { objectValue, stringValue, type JsonRecord } from './artifact-flow-builder-values'
import { searchArtifactWorkflowCapabilities } from './artifact-workflow-capability-graph'

@Injectable()
export class ArtifactFlowBuilderContextService {
  constructor(
    private readonly repository: ArtifactFlowBuilderRepository = new ArtifactFlowBuilderRepository(),
    private readonly sessionService: ArtifactFlowBuilderSessionService = new ArtifactFlowBuilderSessionService(
      repository,
    ),
  ) {}

  async getBuildContext(target: Record<string, any>, data: JsonRecord, sessionKey?: string) {
    const userId = this.sessionService.resolveUserId(target, sessionKey)
    const spaceId = stringValue(data.space_id)
    if (!spaceId) return { success: false, error: 'space_id is required' }
    const supabase = await this.sessionService.getUserClient(target, userId, sessionKey)
    const space = await this.sessionService.getSpace(supabase, spaceId)
    const { data: flows, error: flowError } = await this.repository.listSpaceAutomations(supabase, {
      spaceId,
      limit: 50,
    })
    if (flowError) return { success: false, error: flowError.message }
    const { data: blueprints, error: blueprintError } =
      await this.repository.listBlueprintsForSpace(supabase, { spaceId, limit: 20 })
    if (blueprintError) return { success: false, error: blueprintError.message }
    const workflowCapabilities = searchArtifactWorkflowCapabilities({
      query: stringValue(data.query),
      limit: 50,
    })
    return {
      success: true,
      context: {
        space,
        ...this.normalizedSpaceContext(space, flows ?? [], blueprints ?? []),
        capabilities: searchFlowCapabilities({ query: stringValue(data.query), limit: 20 }),
        capability_total: FLOW_CAPABILITY_CATALOG.length,
        workflow_capabilities: workflowCapabilities,
        flows: flows ?? [],
        blueprints: blueprints ?? [],
      },
    }
  }

  private normalizedSpaceContext(space: JsonRecord, flows: JsonRecord[], blueprints: JsonRecord[]) {
    const schema = objectValue(space.schema)
    const views = this.extractViews(schema)
    const fields = this.extractRootFields(schema, views)
    return {
      views,
      fields,
      existing_flows: flows.map((flow) => this.existingFlowRef(flow)),
      template_tokens: FLOW_BUILDER_TEMPLATE_TOKENS,
      context_hash: createFlowBuildContextHash({
        space_id: String(space.id ?? ''),
        view_count: views.length,
        field_count: fields.length,
        capability_total: FLOW_CAPABILITY_CATALOG.length,
        blueprint_count: blueprints.length,
      }),
    }
  }

  private extractViews(schema: JsonRecord): FlowBuilderViewRef[] {
    const views = Array.isArray(schema.views) ? schema.views : []
    return views
      .filter((view) => view && typeof view === 'object')
      .map((view, index) => {
        const record = view as JsonRecord
        const id = String(record.id ?? `view-${index + 1}`)
        return {
          id,
          title: String(record.title ?? record.name ?? `View ${index + 1}`),
          type: String(record.type ?? objectValue(record.custom_data)._view_type ?? 'task'),
          fields: this.extractFieldsFromContainer(record, id),
        }
      })
  }

  private extractRootFields(
    schema: JsonRecord,
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
    container: JsonRecord,
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
        const record = field as JsonRecord
        const key = String(record.key ?? record.id ?? record.name ?? `field_${index + 1}`)
        const optionRefs = this.extractOptionRefs(record.options)
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

  private extractOptionRefs(value: unknown): FlowBuilderFieldOptionRef[] {
    if (!Array.isArray(value)) return []
    return value
      .map((option, index) => {
        if (option && typeof option === 'object') {
          const record = option as JsonRecord
          const id = String(record.id ?? record.value ?? record.key ?? record.label ?? index)
          const label = String(record.label ?? record.name ?? record.title ?? record.value ?? id)
          return {
            id,
            label,
            value: stringValue(record.value),
            key: stringValue(record.key),
            color: stringValue(record.color),
          }
        }
        const label = String(option)
        return { id: label, label, value: label, key: null, color: null }
      })
      .filter((option) => option.label.trim().length > 0)
  }

  private existingFlowRef(flow: JsonRecord) {
    const trigger = objectValue(flow.trigger)
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
      updated_at: stringValue(flow.updated_at),
    }
  }
}
