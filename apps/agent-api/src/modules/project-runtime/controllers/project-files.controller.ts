import { Controller, Get, Param, UseGuards } from '@nestjs/common'
import {
  AuthGuard,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  type RequestScope,
} from '@vibey/api-shared'
import { ProjectFilesService } from '../services/project-files.service'

@Controller('project-files')
@UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
export class ProjectFilesController {
  constructor(private readonly projectFilesService: ProjectFilesService) {}

  @Get(':projectId')
  async getAllFiles(@OrgContext() scope: RequestScope, @Param('projectId') projectId: string) {
    return this.projectFilesService.getAllFiles(scope, projectId)
  }
}
