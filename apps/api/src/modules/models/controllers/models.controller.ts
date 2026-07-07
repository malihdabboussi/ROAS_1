import { BadRequestException, Body, Controller, Get, Patch, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import {
  AuthGuard,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  RequireOrgRole,
  ZodValidationPipe,
  type RequestScope,
} from '@vibey/api-shared'
import {
  UpdateWorkspaceModelPreferencesSchema,
  type UpdateWorkspaceModelPreferencesInput,
} from '../models.dto'
import { ModelsService } from '../services/models.service'

@Controller('models')
@UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard, ThrottlerGuard)
export class ModelsController {
  constructor(private readonly modelsService: ModelsService) {}

  @Get()
  async list(@OrgContext() scope: RequestScope) {
    return this.modelsService.listLlmModels(scope)
  }

  @Get('strategies')
  async listStrategies(@OrgContext() _scope: RequestScope) {
    return this.modelsService.listModelStrategies()
  }

  @Get('workspace')
  async getWorkspacePreferences(@OrgContext() scope: RequestScope) {
    return this.modelsService.getWorkspaceModelPreferences(scope)
  }

  @Patch('workspace')
  @RequireOrgRole('admin')
  async updateWorkspacePreferences(
    @OrgContext() scope: RequestScope,
    @Body(new ZodValidationPipe(UpdateWorkspaceModelPreferencesSchema))
    body: UpdateWorkspaceModelPreferencesInput,
  ) {
    if (!scope.orgId) {
      throw new BadRequestException('Organization context required to update model preferences')
    }
    return this.modelsService.updateWorkspaceModelPreferences(scope.orgId, body.enabled_model_ids)
  }
}
