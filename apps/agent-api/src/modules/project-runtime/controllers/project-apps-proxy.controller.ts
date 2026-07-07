import { Controller, Param, Post, Res, UseGuards } from '@nestjs/common'
import type { Response } from 'express'
import {
  AuthGuard,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  type RequestScope,
} from '@vibey/api-shared'
import { ProjectAppsProxyService } from '../services/project-apps-proxy.service'

@Controller('apps')
@UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
export class ProjectAppsProxyController {
  constructor(private readonly projectAppsProxyService: ProjectAppsProxyService) {}

  @Post(':projectId/restart')
  async restart(
    @OrgContext() scope: RequestScope,
    @Param('projectId') projectId: string,
    @Res() res: Response,
  ) {
    const result = await this.projectAppsProxyService.restart(scope, projectId)
    if (result.statusCode) {
      return res.status(result.statusCode).json(result.body)
    }
    return res.json(result.body)
  }
}
