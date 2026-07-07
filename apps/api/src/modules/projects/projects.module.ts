import { Module } from '@nestjs/common'
import { OrgScopeService } from '@vibey/api-shared'
import { GitHubModule } from '../integrations/github/github.module'
import { SandboxesModule } from '../sandboxes/sandboxes.module'
import { ProjectSdkProxyController } from './controllers/project-sdk-proxy.controller'
import { ProjectsFilesController } from './controllers/projects-files.controller'
import { ProjectsPublishingController } from './controllers/projects-publishing.controller'
import { ProjectsController } from './controllers/projects.controller'
import { ProjectsRepository } from './repositories/projects.repository'
import { ProjectPublishService } from './services/project-publish.service'
import { ProjectSdkProxyService } from './services/project-sdk-proxy.service'
import { ProjectsService } from './services/projects.service'
import { VercelDeployService } from './services/vercel-deploy.service'

@Module({
  imports: [GitHubModule, SandboxesModule],
  controllers: [
    ProjectsController,
    ProjectsFilesController,
    ProjectsPublishingController,
    ProjectSdkProxyController,
  ],
  providers: [
    ProjectsService,
    ProjectsRepository,
    ProjectSdkProxyService,
    ProjectPublishService,
    OrgScopeService,
    VercelDeployService,
  ],
  exports: [ProjectsService, VercelDeployService],
})
export class ProjectsModule {}
