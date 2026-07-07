import { Injectable } from '@nestjs/common'
import { ArtifactFlowBuilderRepository } from '../repositories/artifact-flow-builder.repository'
import type { ArtifactActionHandler } from './artifact-action.registry'
import { ArtifactFlowBuilderBlueprintService } from './artifact-flow-builder-blueprint.service'
import { ArtifactFlowBuilderClarificationService } from './artifact-flow-builder-clarification.service'
import { ArtifactFlowBuilderContextService } from './artifact-flow-builder-context.service'
import { ArtifactFlowBuilderPlanService } from './artifact-flow-builder-plan.service'
import { ArtifactFlowBuilderSessionService } from './artifact-flow-builder-session.service'

@Injectable()
export class ArtifactFlowBuilderService {
  constructor(
    repository: ArtifactFlowBuilderRepository = new ArtifactFlowBuilderRepository(),
    sessionService: ArtifactFlowBuilderSessionService = new ArtifactFlowBuilderSessionService(
      repository,
    ),
    private readonly contextService: ArtifactFlowBuilderContextService = new ArtifactFlowBuilderContextService(
      repository,
      sessionService,
    ),
    private readonly clarificationService: ArtifactFlowBuilderClarificationService = new ArtifactFlowBuilderClarificationService(
      repository,
      sessionService,
    ),
    private readonly planService: ArtifactFlowBuilderPlanService = new ArtifactFlowBuilderPlanService(
      repository,
      sessionService,
    ),
    private readonly blueprintService: ArtifactFlowBuilderBlueprintService = new ArtifactFlowBuilderBlueprintService(
      repository,
      sessionService,
    ),
  ) {}

  getHandlers(target: Record<string, any>): Record<string, ArtifactActionHandler> {
    return {
      get_flow_build_context: (data, sessionKey) => this.getBuildContext(target, data, sessionKey),
      create_flow_clarification: (data, sessionKey) =>
        this.createClarification(target, data, sessionKey),
      create_flow_plan: (data, sessionKey) => this.createPlan(target, data, sessionKey),
      update_flow_plan: (data, sessionKey) => this.updatePlan(target, data, sessionKey),
      answer_flow_clarification: (data, sessionKey) =>
        this.answerClarification(target, data, sessionKey),
      validate_flow_plan: (data, sessionKey) => this.validatePlan(target, data, sessionKey),
      compile_flow_plan: (data, sessionKey) => this.compilePlan(target, data, sessionKey),
      list_flow_blueprints: (data, sessionKey) => this.listBlueprints(target, data, sessionKey),
      get_flow_blueprint: (data, sessionKey) => this.getBlueprint(target, data, sessionKey),
      create_flow_blueprint_draft: (data, sessionKey) =>
        this.createBlueprint(target, data, sessionKey),
      validate_flow_blueprint: (data, sessionKey) =>
        this.validateBlueprint(target, data, sessionKey),
      activate_flow_blueprint: (data, sessionKey) =>
        this.activateBlueprint(target, data, sessionKey),
      evaluate_flow_plan: (data, sessionKey) => this.evaluatePlan(target, data, sessionKey),
    }
  }

  private async getBuildContext(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    return this.contextService.getBuildContext(target, data, sessionKey)
  }

  private async createPlan(target: Record<string, any>, data: Record<string, unknown>, sessionKey?: string) {
    return this.planService.createPlan(target, data, sessionKey)
  }

  private async createClarification(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    return this.clarificationService.createClarification(target, data, sessionKey)
  }

  private async updatePlan(target: Record<string, any>, data: Record<string, unknown>, sessionKey?: string) {
    return this.planService.updatePlan(target, data, sessionKey)
  }

  private async answerClarification(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    return this.clarificationService.answerClarification(target, data, sessionKey)
  }

  private async validatePlan(target: Record<string, any>, data: Record<string, unknown>, sessionKey?: string) {
    return this.planService.validatePlan(target, data, sessionKey)
  }

  private async compilePlan(target: Record<string, any>, data: Record<string, unknown>, sessionKey?: string) {
    return this.planService.compilePlan(target, data, sessionKey)
  }

  private async listBlueprints(target: Record<string, any>, data: Record<string, unknown>, sessionKey?: string) {
    return this.blueprintService.listBlueprints(target, data, sessionKey)
  }

  private async getBlueprint(target: Record<string, any>, data: Record<string, unknown>, sessionKey?: string) {
    return this.blueprintService.getBlueprint(target, data, sessionKey)
  }

  private async createBlueprint(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    return this.blueprintService.createBlueprint(target, data, sessionKey)
  }

  private async validateBlueprint(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    return this.blueprintService.validateBlueprint(target, data, sessionKey)
  }

  private async activateBlueprint(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    return this.blueprintService.activateBlueprint(target, data, sessionKey)
  }

  private async evaluatePlan(target: Record<string, any>, data: Record<string, unknown>, sessionKey?: string) {
    return this.planService.evaluatePlan(target, data, sessionKey)
  }
}
