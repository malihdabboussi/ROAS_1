import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { IntegrationConnectionsRepository } from '../repositories/integration-connections.repository'
import { GitHubPullRequestsController } from './controllers/github-pull-requests.controller'
import { GitHubRepoChangesController } from './controllers/github-repo-changes.controller'
import { GitHubReposController } from './controllers/github-repos.controller'
import { GitHubController } from './controllers/github.controller'
import { GitHubIntegration } from './integrations/github.integration'
import { GitHubReposRepository } from './repositories/github-repos.repository'
import { GitHubApiService } from './services/github-api.service'
import { GitHubOAuthService } from './services/github-oauth.service'

@Module({
  imports: [ConfigModule],
  controllers: [
    GitHubController,
    GitHubReposController,
    GitHubRepoChangesController,
    GitHubPullRequestsController,
  ],
  providers: [
    GitHubIntegration,
    IntegrationConnectionsRepository,
    GitHubReposRepository,
    GitHubOAuthService,
    GitHubApiService,
  ],
  exports: [GitHubIntegration, GitHubOAuthService, GitHubApiService],
})
export class GitHubModule {}
