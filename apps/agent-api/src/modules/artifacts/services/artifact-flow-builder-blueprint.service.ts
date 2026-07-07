import { Injectable } from '@nestjs/common'
import { ArtifactFlowBuilderRepository } from '../repositories/artifact-flow-builder.repository'
import { validateActionTemplate } from './artifact-flow-builder-plan.util'
import { ArtifactFlowBuilderSessionService } from './artifact-flow-builder-session.service'
import { objectValue, stringValue, type JsonRecord } from './artifact-flow-builder-values'

@Injectable()
export class ArtifactFlowBuilderBlueprintService {
  constructor(
    private readonly repository: ArtifactFlowBuilderRepository = new ArtifactFlowBuilderRepository(),
    private readonly sessionService: ArtifactFlowBuilderSessionService = new ArtifactFlowBuilderSessionService(
      repository,
    ),
  ) {}

  async listBlueprints(target: Record<string, any>, data: JsonRecord, sessionKey?: string) {
    const userId = this.sessionService.resolveUserId(target, sessionKey)
    const spaceId = stringValue(data.space_id)
    if (!spaceId) return { success: false, error: 'space_id is required' }
    const supabase = await this.sessionService.getUserClient(target, userId, sessionKey)
    const { data: rows, error } = await this.repository.listBlueprintsForSpace(supabase, {
      spaceId,
      limit: Math.min(Math.max(Number(data.limit ?? 20), 1), 50),
    })
    if (error) return { success: false, error: error.message }
    return { success: true, blueprints: rows ?? [] }
  }

  async getBlueprint(target: Record<string, any>, data: JsonRecord, sessionKey?: string) {
    const blueprint = await this.sessionService.loadBlueprint(target, data, sessionKey)
    if (!blueprint.success) return blueprint
    return { success: true, blueprint: blueprint.blueprint }
  }

  async createBlueprint(target: Record<string, any>, data: JsonRecord, sessionKey?: string) {
    const userId = this.sessionService.resolveUserId(target, sessionKey)
    const spaceId = stringValue(data.space_id)
    const name = stringValue(data.name)
    if (!spaceId || !name) return { success: false, error: 'space_id and name are required' }
    const supabase = await this.sessionService.getUserClient(target, userId, sessionKey)
    const space = await this.sessionService.getSpace(supabase, spaceId)
    const actionTemplate = objectValue(data.action_template)
    const validation = validateActionTemplate(actionTemplate)
    const { data: row, error } = await this.repository.createBlueprint(supabase, {
      org_id: space.org_id ?? null,
      space_id: spaceId,
      created_by: userId,
      name,
      description: stringValue(data.description),
      category: stringValue(data.category) ?? 'Custom',
      status: 'draft',
      input_schema: objectValue(data.input_schema),
      action_template: actionTemplate,
      required_contexts: Array.isArray(data.required_contexts) ? data.required_contexts : [],
      output_contexts: Array.isArray(data.output_contexts) ? data.output_contexts : [],
    })
    if (error) return { success: false, error: error.message }
    return { success: true, blueprint: row, validation }
  }

  async validateBlueprint(target: Record<string, any>, data: JsonRecord, sessionKey?: string) {
    const blueprint = await this.sessionService.loadBlueprint(target, data, sessionKey)
    if (!blueprint.success) return blueprint
    return {
      success: true,
      validation: validateActionTemplate(objectValue(blueprint.blueprint.action_template)),
    }
  }

  async activateBlueprint(target: Record<string, any>, data: JsonRecord, sessionKey?: string) {
    const blueprint = await this.sessionService.loadBlueprint(target, data, sessionKey)
    if (!blueprint.success) return blueprint
    const validation = validateActionTemplate(objectValue(blueprint.blueprint.action_template))
    if (!validation.valid) return { success: false, validation }
    const userId = this.sessionService.resolveUserId(target, sessionKey)
    const supabase = await this.sessionService.getUserClient(target, userId, sessionKey)
    const { data: row, error } = await this.repository.updateBlueprint(supabase, {
      blueprintId: blueprint.blueprint.id,
      updates: { status: 'active', updated_at: new Date().toISOString() },
    })
    if (error) return { success: false, error: error.message }
    return { success: true, blueprint: row, validation }
  }
}
