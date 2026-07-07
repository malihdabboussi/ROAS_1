import { Body, Controller, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import {
  AuthGuard,
  CurrentUser,
  OrgContextGuard,
  OrgRoleGuard,
  RequireOrgRole,
  ZodValidationPipe,
} from '@vibey/api-shared'
import {
  ImportAgentsSchema,
  OrgIdParamSchema,
  type ImportAgentsInput,
  type OrgIdParam,
} from '../dto'
import { OrgAgentImportService } from '../services/org-agent-import.service'

@Controller('org')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class OrgAgentImportsController {
  constructor(private readonly agentImportService: OrgAgentImportService) {}

  @Post(':orgId/agents/import')
  @RequireOrgRole('creator')
  @HttpCode(HttpStatus.OK)
  async importAgents(
    @Param(new ZodValidationPipe(OrgIdParamSchema)) params: OrgIdParam,
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(ImportAgentsSchema)) dto: ImportAgentsInput,
  ) {
    const results = await this.agentImportService.importAgents(
      params.orgId,
      user.id,
      dto.agent_keys,
      dto.include_brains,
    )
    return { success: true, imported: results }
  }
}
